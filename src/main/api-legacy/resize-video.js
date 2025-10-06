const express = require('express')
const multer = require('multer')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegStatic = require('ffmpeg-static')
const ffprobeStatic = require('ffprobe-static')
const fs = require('fs').promises
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const cors = require('cors')

// Configure ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegStatic)
ffmpeg.setFfprobePath(ffprobeStatic.path)

const app = express()

// Configure CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'] // Default for development

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions))

const upload = multer({ storage: multer.memoryStorage() })

// Ensure temp directory exists
const TEMP_DIR = '/tmp'

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating temp directory:', error)
  }
}

// Create temp directory on startup
ensureTempDir()

async function getVideoDimensions(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        reject(err)
        return
      }

      const videoStream = metadata.streams.find((s) => s.codec_type === 'video')
      if (!videoStream) {
        reject(new Error('No video stream found'))
        return
      }

      resolve({
        width: videoStream.width,
        height: videoStream.height
      })
    })
  })
}

function calculateNewDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  const widthRatio = maxWidth / originalWidth
  const heightRatio = maxHeight / originalHeight
  const scaleRatio = Math.min(widthRatio, heightRatio)

  let scaledWidth = Math.floor(originalWidth * scaleRatio)
  let scaledHeight = Math.floor(originalHeight * scaleRatio)

  // Ensure dimensions are even (required for H.264)
  let evenWidth = scaledWidth & ~1
  let evenHeight = scaledHeight & ~1

  // Check if aspect ratio is maintained
  const originalAspect = originalWidth / originalHeight
  const newAspect = evenWidth / evenHeight

  // If making both dimensions even changed the aspect ratio significantly,
  // adjust one dimension to maintain the ratio
  if (Math.abs(originalAspect - newAspect) > 0.01) {
    if (evenWidth / originalAspect < evenHeight) {
      // Adjust height to match width
      const correctHeight = Math.floor(evenWidth / originalAspect) & ~1
      evenHeight = correctHeight
    } else {
      // Adjust width to match height
      const correctWidth = Math.floor(evenHeight * originalAspect) & ~1
      evenWidth = correctWidth
    }
  }

  return { width: evenWidth, height: evenHeight }
}

async function resizeVideo(inputBuffer, maxWidth, maxHeight) {
  const tempId = uuidv4()
  const inputPath = path.join(TEMP_DIR, `input_${tempId}.mp4`)
  const outputPath = path.join(TEMP_DIR, `output_${tempId}.mp4`)

  try {
    // Write input buffer to temporary file
    await fs.writeFile(inputPath, inputBuffer)

    // Get original dimensions
    const { width: originalWidth, height: originalHeight } = await getVideoDimensions(inputPath)

    // Calculate new dimensions
    const { width: newWidth, height: newHeight } = calculateNewDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    )

    console.log(
      `Resizing video from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight} ` +
        `(aspect ratio: ${(originalWidth / originalHeight).toFixed(3)} -> ${(
          newWidth / newHeight
        ).toFixed(3)})`
    )

    // Process video with ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .size(`${newWidth}x${newHeight}`)
        .videoCodec('libx264')
        .outputOptions([
          '-profile:v baseline', // Baseline Profile for maximum compatibility
          '-level 4.0', // Level 4.0
          '-preset fast', // Faster encoding
          '-crf 23', // Compression quality
          '-movflags +faststart' // Optimize for web streaming
        ])
        .audioCodec('aac')
        .audioBitrate('128k')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`Processing: ${progress.percent.toFixed(2)}% done`)
          }
        })
        .run()
    })

    console.info('Video processing complete')

    // Read processed video
    const processedVideo = await fs.readFile(outputPath)

    // Clean up
    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})

    return processedVideo
  } catch (error) {
    // Clean up on error
    await fs.unlink(inputPath).catch(() => {})
    await fs.unlink(outputPath).catch(() => {})
    throw error
  }
}

// API endpoint
app.post('/resize-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' })
    }

    const maxWidth = parseInt(req.body.maxWidth) || 1920
    const maxHeight = parseInt(req.body.maxHeight) || 1080

    console.log(`Processing video with max dimensions: ${maxWidth}x${maxHeight}`)

    const resizedVideo = await resizeVideo(req.file.buffer, maxWidth, maxHeight)

    res.set({
      'Content-Type': 'video/mp4',
      'Content-Length': resizedVideo.length,
      'Content-Disposition': 'attachment; filename="resized_video.mp4"'
    })

    res.send(resizedVideo)
  } catch (error) {
    console.error('Error processing video:', error)
    res.status(500).json({ error: error.message })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => {
  console.log(`Video resize API listening on port ${PORT}`)
})

module.exports = app

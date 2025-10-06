import * as fs from 'fs/promises'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import { app } from 'electron'

// Configure ffmpeg paths
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic)
}
ffmpeg.setFfprobePath(ffprobeStatic.path)

// Use app temp directory for Electron
const TEMP_DIR = path.join(app.getPath('temp'), 'stunts-video-processing')

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating temp directory:', error)
  }
}

// Create temp directory on startup
ensureTempDir()

interface VideoDimensions {
  width: number
  height: number
}

async function getVideoDimensions(inputPath: string): Promise<VideoDimensions> {
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
        width: videoStream.width || 0,
        height: videoStream.height || 0
      })
    })
  })
}

function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): VideoDimensions {
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

export async function resizeVideo(
  inputBuffer: Buffer,
  maxWidth: number,
  maxHeight: number
): Promise<Buffer> {
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
    await new Promise<void>((resolve, reject) => {
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
        .on('end', () => resolve())
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

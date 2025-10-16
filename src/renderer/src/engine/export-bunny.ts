import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  VideoSampleSource, // Changed from CanvasSource
  VideoSample, // New import
  // EncodedAudioChunkSource,
  VideoEncodingConfig
} from 'mediabunny'
import { PolyfillDevice, PolyfillTexture } from './polyfill'
import { CanvasPipeline } from './pipeline'
import EditorState from './editor_state'
import { Editor, Viewport } from './editor'
import { getSequenceDuration, SavedState } from './animations'
import { WindowSize } from './camera'

export class BunnyExport {
  device: PolyfillDevice
  width: number
  height: number
  audioBuffer?: AudioBuffer
  duration: number // in seconds
  durationMs: number
  onProgress?: (progress: number) => void
  video: {
    codec?: VideoEncodingConfig['codec']
    bitrate?: number // in bits per second
  }
  audio: {
    codec?: string // e.g., 'aac'
    bitrate?: number // in bits per second
    sampleRate?: number
  }

  lastImageData: ImageData

  viewport: Viewport | null = null
  editor: Editor | null = null
  editorState: EditorState | null = null
  pipeline: CanvasPipeline | null = null
  isVertical: boolean

  constructor(device: PolyfillDevice) {
    this.device = device
    this.isVertical = false
  }

  async initialize(
    savedState: SavedState,
    onProgress?: (progress: number, currentTime?: number, totalDuration?: number) => void
  ) {
    this.onProgress = onProgress
    let windowSize: WindowSize = {
      // legacy
      // // 1x
      // // width: 800,
      // // height: 450,
      // // 2x
      // width: 1600,
      // height: 900,
      // full hd proper (2x still though)
      width: 1920,
      height: 1080
    }

    if (this.isVertical) {
      windowSize = {
        width: 450,
        height: 800
        // width: 900,
        // height: 1600,
      }
    }

    this.width = windowSize.width
    this.height = windowSize.height

    this.viewport = new Viewport(windowSize.width, windowSize.height)

    this.editor = new Editor(this.viewport)

    this.editor.isExporting = true
    this.editor.scaleMultiplier = this.isVertical ? 1.0 : 2.0 // 2x WindowSize

    this.editorState = new EditorState(savedState)

    let pipeline = new CanvasPipeline()

    this.pipeline = await pipeline.new(this.editor, false, '', windowSize, false)

    if (!this.editor.camera) {
      return
    }

    if (!windowSize?.width || !windowSize?.height) {
      return
    }

    if (!this.editor.gpuResources) {
      console.warn('No gpu resources')
      return
    }

    // // // this.editor.camera.position = vec2.fromValues(100.0, 100.0);
    // this.editor.camera.setPosition(0.1, 0.1, 0);
    // // // this.editor.camera.zoom = 2.0;
    // this.editor.cameraBinding?.update(
    //   this.editor.gpuResources?.queue!,
    //   this.editor.camera
    // );

    let targetFrameRate = 60

    this.pipeline.recreateDepthView(windowSize?.width, windowSize?.height)

    console.info('Export restore...')

    let cloned_sequences = savedState.sequences

    for (let [i, sequence] of cloned_sequences.entries()) {
      await this.editor.restore_sequence_objects(
        sequence,
        i === 0 ? false : true,
        savedState.settings
      )
    }

    // const frameEncoder = async (renderTexture: PolyfillTexture) => {
    //   if (!this.webExport) {
    //     return
    //   }

    //   // console.info("Encoding frame...");

    //   await this.webExport.encodeFrame(renderTexture)

    //   // console.info("Frame encoded.");
    // }

    // Calculate total duration from sequences (in milliseconds)
    let totalDurationMs = 0
    cloned_sequences.forEach((s) => {
      // if (s.durationMs) {
      //   totalDurationMs += s.durationMs
      // }
      totalDurationMs += getSequenceDuration(s).durationMs
    })

    let totalDurationS = totalDurationMs / 1000 // Convert to seconds

    this.duration = totalDurationS
    this.durationMs = totalDurationMs

    // this.encoder.totalDurationMs = totalDurationMs

    if (!totalDurationMs) {
      console.warn('No duration')
      return
    }

    let now = Date.now()

    this.editor.videoStartPlayingTime = now
    this.editor.videoCurrentSequenceTimeline = savedState.timeline_state
    this.editor.videoCurrentSequencesData = savedState.sequences
    this.editor.videoIsPlaying = true

    this.editor.startPlayingTime = now
    this.editor.isPlaying = true

    console.info('Begin encoding frames...', totalDurationS)

    // Frame loop
    const frameTimeS = 1 / targetFrameRate // Time per frame in seconds
    const frameTimeMs = frameTimeS * 1000 // Convert to milliseconds
    let currentTimeMs = 0
    let lastProgressUpdateMs = 0

    // TODO: start export with BunnyExport

    // Final progress update
    onProgress?.(1.0, totalDurationS, totalDurationS)
    // onProgress?.(progress, currentTimeMs / 1000, totalDurationS);

    // Finalize the export
    // if (this.webExport) {
    //   setTimeout(async () => {
    //     if (!this.webExport) {
    //       return
    //     }

    //     console.info('Finalizing export...')
    //     await this.webExport.finalize()
    //   }, 1000)
    // }
  }

  /**
   * Exports a video from programmatically rendered frames and an optional audio buffer.
   * @param options The configuration for the export.
   * @returns A Promise that resolves with a Blob of the final MP4 video.
   */
  async encodeFile() {
    const { width, height, audioBuffer, duration, onProgress, video, audio } = this
    const fps = 60 // Matching your original implementation's frame rate

    // ## 1. Setup the Output Target and Format (No change)
    const target = new BufferTarget()
    const format = new Mp4OutputFormat({
      fastStart: 'in-memory'
    })
    const output = new Output({ target, format })

    // ## 2. Setup the Video Track using VideoSampleSource
    // This source is designed to accept raw video data, frame by frame.
    const videoSource = new VideoSampleSource({
      codec: video.codec ?? 'avc',
      bitrate: video.bitrate ?? 5_000_000 // Default to 5 Mbps, matching your original
    })
    output.addVideoTrack(videoSource, { frameRate: fps })

    // ## 3. Setup the Audio Track (No change)
    // let audioSource: EncodedAudioChunkSource | null = null;
    // if (audioBuffer) {
    // 	audioSource = new EncodedAudioChunkSource();
    // 	output.addAudioTrack(audioSource);
    // }

    // ## 4. Start the Output (No change)
    await output.start()
    console.log('Mediabunny output started.')

    // ## 5. Encode and Add Media Data
    // Video and audio encoding run in parallel.

    const videoEncodingPromise = (async () => {
      const frameDuration = 1 / fps
      const totalFrames = Math.round(duration * fps)

      for (let i = 0; i < totalFrames; i++) {
        const timestamp = i * frameDuration

        // Get the raw pixel data for the current timestamp.
        const frameEncoder = async (renderTexture: PolyfillTexture) => {
          // await this.webExport.encodeFrame(renderTexture)
          this.lastImageData = await this.captureFrame(renderTexture)
        }

        await this.pipeline.renderWebglFrame(this.editor, frameEncoder, timestamp)

        // Create a VideoSample from the ImageData buffer.
        // This is the direct replacement for creating a VideoFrame.
        const sample = new VideoSample(this.lastImageData.data.buffer, {
          format: 'RGBA', // ImageData is always in RGBA format
          codedWidth: width,
          codedHeight: height,
          timestamp: timestamp, // Timestamps are in seconds
          duration: frameDuration // Duration is in seconds
        })

        // Add the sample to the source for encoding.
        await videoSource.add(sample)
        sample.close() // Release the underlying resources, same as VideoFrame.close()

        // Update progress
        if (onProgress) {
          onProgress(i / totalFrames)
        }
      }
      console.log('Video encoding complete.')
    })()

    // const audioEncodingPromise = (async () => {
    // 	// This audio encoding logic remains unchanged.
    // 	if (!audioBuffer || !audioSource) return;

    // 	const audioEncoder = new AudioEncoder({
    // 		output: (chunk) => audioSource!.add(chunk),
    // 		error: (e) => console.error('Audio encoder error:', e),
    // 	});

    // 	await audioEncoder.configure({
    // 		codec: audio.codec ?? 'mp4a.40.2',
    // 		numberOfChannels: audioBuffer.numberOfChannels,
    // 		sampleRate: audio.sampleRate ?? audioBuffer.sampleRate,
    // 		bitrate: audio.bitrate ?? 128_000,
    // 	});

    // 	const CHUNK_DURATION_SECONDS = 0.1;
    // 	const samplesPerChunk = audioEncoder.sampleRate * CHUNK_DURATION_SECONDS;
    // 	const totalChunks = Math.ceil(audioBuffer.length / samplesPerChunk);

    // 	for (let i = 0; i < totalChunks; i++) {
    // 		const offset = i * samplesPerChunk;
    // 		const sampleCount = Math.min(samplesPerChunk, audioBuffer.length - offset);
    // 		const timestamp = (offset / audioEncoder.sampleRate) * 1_000_000;

    // 		const audioData = new AudioData({
    // 			format: audioBuffer.numberOfChannels > 1 ? 'f32-planar' : 'f32',
    // 			sampleRate: audioEncoder.sampleRate,
    // 			numberOfFrames: sampleCount,
    // 			numberOfChannels: audioBuffer.numberOfChannels,
    // 			timestamp: timestamp,
    // 			data: audioBuffer.getChannelData(0).subarray(offset, offset + sampleCount) // Simplified for mono; adapt for stereo if needed
    // 		});
    // 		audioEncoder.encode(audioData);
    // 	}

    // 	await audioEncoder.flush();
    // 	audioEncoder.close();
    // 	console.log('Audio encoding complete.');
    // })();

    // Wait for both processes
    await Promise.all([
      videoEncodingPromise
      // audioEncodingPromise
    ])

    // ## 6. Finalize the Output (No change)
    console.log('Finalizing output...')
    await output.finalize()
    console.log('Output finalized.')

    const buffer = target.buffer
    if (!buffer) {
      throw new Error('Export failed: the output buffer is empty.')
    }

    onProgress?.(1)

    const finalBlob = new Blob([buffer], { type: 'video/mp4' })

    this.finalize(finalBlob)
  }

  async captureFrame(texture: PolyfillTexture): Promise<ImageData> {
    const minimumBytesPerRow = this.width * 4 // RGBA8Unorm format
    const bytesPerRow = Math.ceil(minimumBytesPerRow / 256) * 256
    const bufferSize = bytesPerRow * this.height

    const outputBuffer = this.device.createBuffer(
      {
        size: bufferSize,
        usage:
          process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      },
      '' // uniformMatrix4fv, uniform1f, UBO, etc
    )

    // Create command encoder and copy texture to buffer
    const paddedData = this.device.copyTextureToBuffer(
      {
        texture: texture,
        mipLevel: 0,
        origin: { x: 0, y: 0, z: 0 }
      },
      {
        buffer: outputBuffer,
        bytesPerRow: bytesPerRow,
        rowsPerImage: this.height
      },
      {
        width: this.width,
        height: this.height,
        depthOrArrayLayers: 1
      }
    )

    try {
      // Calculate the actual and padded bytes per row
      const minimumBytesPerRow = this.width * 4
      const alignedBytesPerRow = Math.ceil(minimumBytesPerRow / 256) * 256

      // Create an array with the correct size for the image without padding
      const unpackedData = new Uint8Array(this.width * this.height * 4)

      // Copy the data row by row, removing the padding
      for (let row = 0; row < this.height; row++) {
        const sourceStart = row * alignedBytesPerRow
        const sourceEnd = sourceStart + minimumBytesPerRow
        const targetStart = row * minimumBytesPerRow

        unpackedData.set(paddedData.slice(sourceStart, sourceEnd), targetStart)
      }

      outputBuffer.unmap()

      // Now create ImageData with the unpacked data
      const imageData = new ImageData(
        new Uint8ClampedArray(unpackedData.buffer),
        this.width,
        this.height
      )

      return imageData

      outputBuffer.destroy()
    } catch (error) {
      console.error('Error encoding frame:', error)
      // Handle the error appropriately (e.g., re-throw it)
      throw error
    }
  }

  async finalize(videoBlob: Blob) {
    if (!videoBlob) {
      return
    }

    // Save or process the video
    const url = URL.createObjectURL(videoBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `output-${new Date().toISOString()}.mp4`
    a.click()
  }
}

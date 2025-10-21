import {
  Output,
  Mp4OutputFormat,
  BufferTarget,
  VideoSampleSource,
  VideoSample,
  VideoEncodingConfig,
  AudioBufferSource,
  AudioBufferSink
} from 'mediabunny'
import { PolyfillDevice, PolyfillTexture } from './polyfill'
import { CanvasPipeline } from './pipeline'
import EditorState from './editor_state'
import { Editor, Viewport } from './editor'
import { AnimationData, getSequenceDuration, SavedState } from './animations'
import { WindowSize } from './camera'
import { SavedStVideoConfig } from './video'

export interface AudioSource {
  audioSink: AudioBufferSink // The Mediabunny AudioBufferSink - replace 'any' with actual type
  timelineStartMs: number
  durationMs: number
  trackStartMs: number // The "trim" start time within the audio
}

export class BunnyExport {
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

  outputSampleRate: number = 48000
  outputChannels: number = 2

  constructor() {
    this.isVertical = false
  }

  async initialize(
    savedState: SavedState,
    onProgress?: (progress: number, currentTime?: number, totalDuration?: number) => void
  ) {
    this.onProgress = onProgress
    let windowSize: WindowSize = {
      width: 1920,
      height: 1080
    }

    if (this.isVertical) {
      windowSize = {
        width: 450,
        height: 800
      }
    }

    this.width = windowSize.width
    this.height = windowSize.height

    this.viewport = new Viewport(windowSize.width, windowSize.height)

    this.editor = new Editor(this.viewport)

    this.editor.isExporting = true
    this.editor.scaleMultiplier = this.isVertical ? 1.0 : 2.0

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

    // Calculate total duration from sequences (in milliseconds)
    let totalDurationMs = 0
    cloned_sequences.forEach((s) => {
      totalDurationMs += getSequenceDuration(s).durationMs
    })

    let totalDurationS = totalDurationMs / 1000

    this.duration = totalDurationS
    this.durationMs = totalDurationMs

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

    const frameTimeS = 1 / targetFrameRate
    const frameTimeMs = frameTimeS * 1000
    let currentTimeMs = 0
    let lastProgressUpdateMs = 0

    onProgress?.(1.0, totalDurationS, totalDurationS)
  }

  /**
   * Exports a video from programmatically rendered frames and timeline audio.
   * @returns A Promise that resolves with a Blob of the final MP4 video.
   */
  async encodeFile() {
    const { width, height, duration, onProgress, video, audio } = this
    const fps = 60

    // Setup the Output Target and Format
    const target = new BufferTarget()
    const format = new Mp4OutputFormat({
      fastStart: 'in-memory'
    })
    const output = new Output({ target, format })

    // Setup the Video Track
    const videoSource = new VideoSampleSource({
      codec: video?.codec ?? 'avc',
      bitrate: video?.bitrate ?? 5_000_000
    })
    output.addVideoTrack(videoSource, { frameRate: fps })

    // Setup the Audio Track
    const allAudioSources = await this.getActiveAudioSources()
    console.log(`Found ${allAudioSources.length} audio sources for export.`)

    let audioSource: AudioBufferSource | null = null

    if (allAudioSources.length > 0) {
      audioSource = new AudioBufferSource({
        codec: 'aac',
        bitrate: 128_000
      })
      output.addAudioTrack(audioSource)
    }

    // Start the Output
    await output.start()
    console.log('Mediabunny output started.')

    if (allAudioSources.length > 0) {
      // Pre-mix all audio sources into a single AudioBuffer
      console.log('Pre-mixing audio sources...')
      const mixedAudioBuffer = await this.mixAudioSources(allAudioSources)

      // Add the mixed audio buffer to the source
      await audioSource.add(mixedAudioBuffer)
      console.log('Audio buffer added to source.')
    }

    // Encode video frames
    const videoEncodingPromise = async () => {
      const frameDuration = 1 / fps
      const totalFrames = Math.round(duration * fps)

      for (let i = 0; i < totalFrames; i++) {
        const timestamp = i * frameDuration

        const frameEncoder = async (renderTexture: PolyfillTexture) => {
          this.lastImageData = await this.captureFrame(renderTexture)
        }

        await this.pipeline.renderWebglFrame(this.editor, frameEncoder, timestamp)

        const sample = new VideoSample(this.lastImageData.data.buffer, {
          format: 'RGBA',
          codedWidth: width,
          codedHeight: height,
          timestamp: timestamp,
          duration: frameDuration
        })

        await videoSource.add(sample)
        sample.close()

        if (onProgress) {
          onProgress(i / totalFrames)
        }
      }
      console.log('Video encoding complete.')
    }

    // Audio encoding placeholder
    const audioEncodingPromise = async () => {
      if (!audioSource) {
        console.log('No audio to encode.')
        return
      }
      console.log('Audio encoding will be handled by AudioBufferSource.')
    }

    // Run in sequence for better performance
    await videoEncodingPromise()
    await audioEncodingPromise()

    // Finalize the Output
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

  /**
   * Pre-mixes all audio sources into a single AudioBuffer using OfflineAudioContext.
   * This handles timeline positioning, trimming, and mixing all at once.
   */
  async mixAudioSources(sources: AudioSource[]): Promise<AudioBuffer> {
    if (sources.length === 0) {
      throw new Error('No audio sources to mix')
    }

    const sampleRate = this.outputSampleRate
    const numberOfChannels = this.outputChannels
    const lengthInSamples = Math.ceil((this.durationMs / 1000) * sampleRate)

    // Create an offline context to render the mixed audio
    const offlineContext = new OfflineAudioContext(numberOfChannels, lengthInSamples, sampleRate)

    // For each source, we need to concatenate all its buffers into one
    for (const source of sources) {
      // Calculate the time range we need from this source
      // We need audio starting from trackStartMs for durationMs
      const sourceStartS = source.trackStartMs / 1000
      const sourceEndS = (source.trackStartMs + source.durationMs) / 1000

      console.log(`Loading audio source: ${sourceStartS}s to ${sourceEndS}s`)

      // Collect all buffers in the required time range
      const bufferChunks: AudioBuffer[] = []

      for await (const wrappedBuffer of source.audioSink.buffers(sourceStartS, sourceEndS)) {
        if (wrappedBuffer) {
          bufferChunks.push(wrappedBuffer.buffer)
        }
      }

      if (bufferChunks.length === 0) {
        console.warn('No audio buffers found for source, skipping')
        continue
      }

      // Concatenate all buffer chunks into a single AudioBuffer
      const concatenatedBuffer = this.concatenateAudioBuffers(bufferChunks)

      // Create a buffer source node
      const bufferSource = offlineContext.createBufferSource()
      bufferSource.buffer = concatenatedBuffer

      // Connect to destination
      bufferSource.connect(offlineContext.destination)

      // Calculate when to start playing this clip on the timeline (in seconds)
      const startTime = source.timelineStartMs / 1000

      // Since we already loaded the specific range we need (trackStartMs to trackStartMs + durationMs),
      // we start at offset 0 in our concatenated buffer
      const offset = 0

      // Play the entire concatenated buffer
      const duration = source.durationMs / 1000

      // Schedule the playback
      bufferSource.start(startTime, offset, duration)
    }

    // Render the mixed audio
    console.log('Rendering mixed audio...')
    const renderedBuffer = await offlineContext.startRendering()
    console.log('Audio mixing complete.')

    return renderedBuffer
  }

  /**
   * Concatenates multiple AudioBuffers into a single AudioBuffer.
   * All buffers must have the same sample rate and number of channels.
   */
  private concatenateAudioBuffers(buffers: AudioBuffer[]): AudioBuffer {
    if (buffers.length === 0) {
      throw new Error('No buffers to concatenate')
    }

    if (buffers.length === 1) {
      return buffers[0]
    }

    const sampleRate = buffers[0].sampleRate
    const numberOfChannels = buffers[0].numberOfChannels

    // Verify all buffers have the same format
    for (const buffer of buffers) {
      if (buffer.sampleRate !== sampleRate || buffer.numberOfChannels !== numberOfChannels) {
        throw new Error('All audio buffers must have the same sample rate and channel count')
      }
    }

    // Calculate total length
    const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0)

    // Create a new buffer with the combined length
    const concatenated = new AudioContext().createBuffer(numberOfChannels, totalLength, sampleRate)

    // Copy data from each buffer into the concatenated buffer
    let offset = 0
    for (const buffer of buffers) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = buffer.getChannelData(channel)
        concatenated.getChannelData(channel).set(channelData, offset)
      }
      offset += buffer.length
    }

    return concatenated
  }

  /**
   * Finds all audio items in the editor's timeline.
   */
  async getActiveAudioSources(): Promise<AudioSource[]> {
    if (!this.editor) {
      return []
    }

    let videoItems = [...this.editor.videoItems, ...this.editor.mockups3D.map((m) => m.videoChild)]

    console.info('get active sources', videoItems)

    // Filter items with audio first
    const itemsWithAudio = videoItems.filter((item) => item.audioContext && item.audioSink)

    // Use Promise.all to handle async operations
    const sources: AudioSource[] = await Promise.all(
      itemsWithAudio.map(async (item) => {
        let parentMockup = this.editor.mockups3D.find((m) => m?.videoChild?.id === item.id)
        let pathId = parentMockup ? parentMockup.id : item.id

        let savedItem: SavedStVideoConfig = null
        let savedAnim: AnimationData = null
        this.editorState.savedState.sequences.forEach((s) => {
          s.activeVideoItems.forEach((v) => {
            if (v.id === item.id) {
              savedItem = v
            }
          })
          s.polygonMotionPaths.forEach((v) => {
            if (v.polygonId === pathId) {
              savedAnim = v
            }
          })
        })

        const source: AudioSource = {
          audioSink: item.audioSink,
          timelineStartMs: savedAnim.startTimeMs,
          durationMs: savedAnim.duration,
          trackStartMs: 0 // TODO: Set this if you support audio trimming
        }

        return source
      })
    )

    return sources
  }

  async captureFrame(texture: PolyfillTexture): Promise<ImageData> {
    const minimumBytesPerRow = this.width * 4
    const bytesPerRow = Math.ceil(minimumBytesPerRow / 256) * 256
    const bufferSize = bytesPerRow * this.height

    const outputBuffer = this.editor.gpuResources.device.createBuffer(
      {
        size: bufferSize,
        usage:
          process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      },
      ''
    )

    const paddedData = this.editor.gpuResources.device.copyTextureToBuffer(
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
      const minimumBytesPerRow = this.width * 4
      const alignedBytesPerRow = Math.ceil(minimumBytesPerRow / 256) * 256

      const unpackedData = new Uint8Array(this.width * this.height * 4)

      for (let row = 0; row < this.height; row++) {
        const sourceStart = row * alignedBytesPerRow
        const sourceEnd = sourceStart + minimumBytesPerRow
        const targetStart = row * minimumBytesPerRow

        unpackedData.set(paddedData.slice(sourceStart, sourceEnd), targetStart)
      }

      outputBuffer.unmap()

      const imageData = new ImageData(
        new Uint8ClampedArray(unpackedData.buffer),
        this.width,
        this.height
      )

      return imageData

      outputBuffer.destroy()
    } catch (error) {
      console.error('Error encoding frame:', error)
      throw error
    }
  }

  async finalize(videoBlob: Blob) {
    if (!videoBlob) {
      return
    }

    const url = URL.createObjectURL(videoBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `output-${new Date().toISOString()}.mp4`
    a.click()
  }
}

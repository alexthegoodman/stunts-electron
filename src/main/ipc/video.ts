import { ipcMain } from 'electron'
import { resizeVideo } from '../services/video-processor'

/**
 * Register video processing IPC handlers
 */
export function registerVideoHandlers(): void {
  // Resize video
  ipcMain.handle(
    'video:resize',
    async (_event, data: { buffer: ArrayBuffer; maxWidth: number; maxHeight: number }) => {
      try {
        const inputBuffer = Buffer.from(data.buffer)
        const maxWidth = data.maxWidth || 1200
        const maxHeight = data.maxHeight || 900

        console.log(`Resizing video with max dimensions: ${maxWidth}x${maxHeight}`)

        const resizedBuffer = await resizeVideo(inputBuffer, maxWidth, maxHeight)

        return {
          success: true,
          data: {
            buffer: resizedBuffer,
            size: resizedBuffer.length
          }
        }
      } catch (error) {
        console.error('Failed to resize video:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to resize video'
        }
      }
    }
  )
}

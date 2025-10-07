import { ipcMain, dialog } from 'electron'
import { resizeVideo } from '../services/video-processor'
import path from 'path'
import fs from 'fs/promises'

/**
 * Register video processing IPC handlers
 */
export function registerVideoHandlers(): void {
  // Select video file using dialog
  ipcMain.handle('video:select', async () => {
    try {
      // Show file dialog
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'webm'] }]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }

      const filePath = result.filePaths[0]
      const stats = await fs.stat(filePath)

      return {
        success: true,
        data: {
          filePath,
          fileName: path.basename(filePath),
          size: stats.size
        }
      }
    } catch (error) {
      console.error('Failed to select video:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select video'
      }
    }
  })

  // Resize video from path
  ipcMain.handle(
    'video:resizeFromPath',
    async (
      _event,
      data: { inputPath: string; maxWidth: number; maxHeight: number; outputDir?: string }
    ) => {
      try {
        const maxWidth = data.maxWidth || 1200
        const maxHeight = data.maxHeight || 900

        console.log(`Resizing video with max dimensions: ${maxWidth}x${maxHeight}`)

        const outputPath = await resizeVideo(
          data.inputPath,
          maxWidth,
          maxHeight,
          data.outputDir
        )

        const stats = await fs.stat(outputPath)

        return {
          success: true,
          data: {
            outputPath,
            fileName: path.basename(outputPath),
            size: stats.size
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

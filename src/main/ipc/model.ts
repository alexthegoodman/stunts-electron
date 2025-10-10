import { ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs/promises'

/**
 * Register 3D model IPC handlers
 */
export function registerModelHandlers(): void {
  // Select 3D model file using dialog
  ipcMain.handle('model:select', async () => {
    try {
      // Show file dialog
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: '3D Models', extensions: ['glb', 'gltf'] }]
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
      console.error('Failed to select model:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to select model'
      }
    }
  })
}

import { ipcMain, dialog, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

// Helper to get uploads directory
function getUploadsDir(): string {
  const documentsPath = app.getPath('documents')
  return path.join(documentsPath, 'Stunts', 'uploads')
}

// Helper to ensure uploads directory exists
async function ensureUploadsDir(): Promise<void> {
  const uploadsDir = getUploadsDir()
  await fs.mkdir(path.join(uploadsDir, 'images'), { recursive: true })
  await fs.mkdir(path.join(uploadsDir, 'videos'), { recursive: true })
}

// Helper to validate file type from buffer
function getMimeTypeFromBuffer(buffer: Buffer, type: 'image' | 'video'): string | null {
  if (type === 'image') {
    if (buffer.length < 2) return null
    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg'
    // PNG
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    )
      return 'image/png'
  } else if (type === 'video') {
    if (buffer.length < 12) return null
    // MP4 (starts with ftyp)
    if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70)
      return 'video/mp4'
  }
  return null
}

/**
 * Register all upload-related IPC handlers
 */
export function registerUploadHandlers(): void {
  // Upload image from file path
  ipcMain.handle('uploads:processImage', async (_event, filePath: string) => {
    try {
      await ensureUploadsDir()

      // Read the file
      const buffer = await fs.readFile(filePath)

      // Validate file size (20MB limit)
      const MAX_SIZE = 20 * 1024 * 1024
      if (buffer.length > MAX_SIZE) {
        return { success: false, error: 'File size exceeds 20MB limit' }
      }

      // Validate file type
      const mimeType = getMimeTypeFromBuffer(buffer, 'image')
      if (!mimeType) {
        return { success: false, error: 'Invalid file type. Allowed types: JPEG, PNG' }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const originalName = path.basename(filePath)
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const extension = mimeType === 'image/jpeg' ? '.jpg' : '.png'
      const uniqueFileName = `${timestamp}-${sanitizedName}${extension}`

      // Save to uploads directory
      const uploadsDir = getUploadsDir()
      const savePath = path.join(uploadsDir, 'images', uniqueFileName)
      await fs.copyFile(filePath, savePath)

      return {
        success: true,
        data: {
          url: savePath,
          fileName: uniqueFileName,
          size: buffer.length,
          mimeType: mimeType
        }
      }
    } catch (error) {
      console.error('Failed to process image:', error)
      return { success: false, error: 'Failed to process image' }
    }
  })

  // Upload video from file path
  ipcMain.handle('uploads:processVideo', async (_event, filePath: string) => {
    try {
      await ensureUploadsDir()

      // Read the file
      const buffer = await fs.readFile(filePath)

      // Validate file size (100MB limit)
      const MAX_SIZE = 100 * 1024 * 1024
      if (buffer.length > MAX_SIZE) {
        return { success: false, error: 'File size exceeds 100MB limit' }
      }

      // Validate file type
      const mimeType = getMimeTypeFromBuffer(buffer, 'video')
      if (!mimeType) {
        return { success: false, error: 'Invalid file type. Allowed type: MP4' }
      }

      // Generate unique filename
      const timestamp = Date.now()
      const originalName = path.basename(filePath)
      const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
      const uniqueFileName = `${timestamp}-${sanitizedName}.mp4`

      // Save to uploads directory
      const uploadsDir = getUploadsDir()
      const savePath = path.join(uploadsDir, 'videos', uniqueFileName)
      await fs.copyFile(filePath, savePath)

      return {
        success: true,
        data: {
          url: savePath,
          fileName: uniqueFileName,
          size: buffer.length,
          mimeType: mimeType
        }
      }
    } catch (error) {
      console.error('Failed to process video:', error)
      return { success: false, error: 'Failed to process video' }
    }
  })

  // Select and process image using native dialog
  ipcMain.handle('uploads:selectImage', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }

      // Process the selected file
      return await ipcMain.emit('uploads:processImage', result.filePaths[0])
    } catch (error) {
      console.error('Failed to select image:', error)
      return { success: false, error: 'Failed to select image' }
    }
  })

  // Select and process video using native dialog
  ipcMain.handle('uploads:selectVideo', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Videos', extensions: ['mp4'] }]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'No file selected' }
      }

      // Process the selected file
      return await ipcMain.emit('uploads:processVideo', result.filePaths[0])
    } catch (error) {
      console.error('Failed to select video:', error)
      return { success: false, error: 'Failed to select video' }
    }
  })

  // Get uploads directory path
  ipcMain.handle('uploads:getDir', () => {
    try {
      const dir = getUploadsDir()
      return { success: true, data: dir }
    } catch (error) {
      console.error('Failed to get uploads directory:', error)
      return { success: false, error: 'Failed to get uploads directory' }
    }
  })
}

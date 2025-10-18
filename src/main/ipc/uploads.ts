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
  await fs.mkdir(path.join(uploadsDir, 'models'), { recursive: true })
}

// Helper to validate file type from buffer
function getMimeTypeFromBuffer(buffer: Buffer, type: 'image' | 'video' | 'model'): string | null {
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
  } else if (type === 'model') {
    if (buffer.length < 4) return null
    // GLB (starts with glTF magic number 0x46546C67)
    if (buffer[0] === 0x67 && buffer[1] === 0x6c && buffer[2] === 0x54 && buffer[3] === 0x46)
      return 'model/gltf-binary'
    // GLTF (JSON file, starts with '{')
    if (buffer[0] === 0x7b) return 'model/gltf+json'
  }
  return null
}

/**
 * Register all upload-related IPC handlers
 */
export function registerUploadHandlers(): void {
  // Save image from buffer (used by UI)
  ipcMain.handle(
    'uploads:saveImage',
    async (_event, data: { fileName: string; buffer: ArrayBuffer; mimeType: string }) => {
      try {
        await ensureUploadsDir()

        const buffer = Buffer.from(data.buffer)

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
        const sanitizedName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
        const extension = mimeType === 'image/jpeg' ? '.jpg' : '.png'
        const uniqueFileName = `${timestamp}-${sanitizedName}${extension}` // already has extension

        // Save to uploads directory
        const uploadsDir = getUploadsDir()
        const savePath = path.join(uploadsDir, 'images', uniqueFileName)
        await fs.writeFile(savePath, buffer)

        return {
          success: true,
          data: {
            // url: savePath,
            url: uniqueFileName,
            fileName: uniqueFileName,
            size: buffer.length,
            mimeType: mimeType
          }
        }
      } catch (error) {
        console.error('Failed to save image:', error)
        return { success: false, error: 'Failed to save image' }
      }
    }
  )

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
          // url: savePath,
          url: uniqueFileName,
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

  // Save video from path (used by UI)
  ipcMain.handle(
    'uploads:saveVideoFromPath',
    async (_event, data: { filePath: string; fileName?: string }) => {
      try {
        await ensureUploadsDir()

        // Read file to validate
        const buffer = await fs.readFile(data.filePath)

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
        const originalName = data.fileName || path.basename(data.filePath)
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
        const uniqueFileName = `${timestamp}-${sanitizedName}.mp4`

        // Save to uploads directory
        const uploadsDir = getUploadsDir()
        const savePath = path.join(uploadsDir, 'videos', uniqueFileName)
        await fs.copyFile(data.filePath, savePath)

        return {
          success: true,
          data: {
            // url: savePath,
            url: uniqueFileName,
            fileName: uniqueFileName,
            size: buffer.length,
            mimeType: mimeType
          }
        }
      } catch (error) {
        console.error('Failed to save video:', error)
        return { success: false, error: 'Failed to save video' }
      }
    }
  )

  // Save video from buffer (legacy - kept for backward compatibility)
  ipcMain.handle(
    'uploads:saveVideo',
    async (_event, data: { fileName: string; buffer: ArrayBuffer; mimeType: string }) => {
      try {
        await ensureUploadsDir()

        const buffer = Buffer.from(data.buffer)

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
        const sanitizedName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
        const uniqueFileName = `${timestamp}-${sanitizedName}.mp4`

        // Save to uploads directory
        const uploadsDir = getUploadsDir()
        const savePath = path.join(uploadsDir, 'videos', uniqueFileName)
        await fs.writeFile(savePath, buffer)

        return {
          success: true,
          data: {
            // url: savePath,
            url: uniqueFileName,
            fileName: uniqueFileName,
            size: buffer.length,
            mimeType: mimeType
          }
        }
      } catch (error) {
        console.error('Failed to save video:', error)
        return { success: false, error: 'Failed to save video' }
      }
    }
  )

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
          url: uniqueFileName,
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

  // Get image by filename (used by UI)
  ipcMain.handle('uploads:getImage', async (_event, fileName: string) => {
    try {
      const uploadsDir = getUploadsDir()
      // const imagePath = path.join(uploadsDir, 'images', fileName)
      console.info('uploads:getImage', fileName)
      const imagePath = fileName // already has full path stored

      const buffer = await fs.readFile(imagePath)
      const mimeType = getMimeTypeFromBuffer(buffer, 'image') || 'image/jpeg'

      return {
        success: true,
        data: {
          buffer: buffer,
          mimeType: mimeType
        }
      }
    } catch (error) {
      console.error('Failed to get image:', error)
      return { success: false, error: 'Failed to get image' }
    }
  })

  // Get video by filename (used by UI)
  ipcMain.handle('uploads:getVideo', async (_event, videoPath: string) => {
    try {
      console.info('reading video', videoPath)
      const buffer = await fs.readFile(videoPath)
      const mimeType = getMimeTypeFromBuffer(buffer, 'video') || 'video/mp4'

      return {
        success: true,
        data: {
          buffer: buffer,
          mimeType: mimeType
        }
      }
    } catch (error) {
      console.error('Failed to get video:', error)
      return { success: false, error: 'Failed to get video' }
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

  // Save 3D model from path (used by UI)
  ipcMain.handle(
    'uploads:saveModelFromPath',
    async (_event, data: { filePath: string; fileName?: string }) => {
      try {
        await ensureUploadsDir()

        // Read file to validate
        const buffer = await fs.readFile(data.filePath)

        // Validate file size (50MB limit)
        const MAX_SIZE = 50 * 1024 * 1024
        if (buffer.length > MAX_SIZE) {
          return { success: false, error: 'File size exceeds 50MB limit' }
        }

        // Validate file type
        const mimeType = getMimeTypeFromBuffer(buffer, 'model')
        if (!mimeType) {
          return { success: false, error: 'Invalid file type. Allowed types: GLB, GLTF' }
        }

        // Generate unique filename
        const timestamp = Date.now()
        const originalName = data.fileName || path.basename(data.filePath)
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
        const extension = mimeType === 'model/gltf-binary' ? '.glb' : '.gltf'
        const uniqueFileName = `${timestamp}-${sanitizedName}`

        // Save to uploads directory
        const uploadsDir = getUploadsDir()
        const savePath = path.join(uploadsDir, 'models', uniqueFileName)
        await fs.copyFile(data.filePath, savePath)

        return {
          success: true,
          data: {
            // url: savePath,
            url: uniqueFileName,
            fileName: uniqueFileName,
            size: buffer.length,
            mimeType: mimeType,
            dimensions: { width: 0, height: 0 }
          }
        }
      } catch (error) {
        console.error('Failed to save model:', error)
        return { success: false, error: 'Failed to save model' }
      }
    }
  )

  // Get 3D model by filename (used by UI)
  ipcMain.handle('uploads:getModel', async (_event, fileName: string) => {
    try {
      const modelPath = fileName

      console.info('reading model', modelPath)
      const buffer = await fs.readFile(modelPath)
      const mimeType = getMimeTypeFromBuffer(buffer, 'model') || 'model/gltf-binary'

      return {
        success: true,
        data: {
          buffer: buffer,
          mimeType: mimeType
        }
      }
    } catch (error) {
      console.error('Failed to get model:', error)
      return { success: false, error: 'Failed to get model' }
    }
  })
}

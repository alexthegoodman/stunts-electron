import { ipcMain } from 'electron'
import { storage } from '../services/storage'

/**
 * Register all brand kit related IPC handlers
 */
export function registerBrandHandlers(): void {
  // Get all brand kits for current user
  ipcMain.handle('brands:all', async (_event, userId: string) => {
    try {
      const brandKits = await storage.getAllBrandKits(userId)
      return { success: true, data: brandKits }
    } catch (error) {
      console.error('Failed to get brand kits:', error)
      return { success: false, error: 'Failed to retrieve brand kits' }
    }
  })

  // Get single brand kit by ID
  ipcMain.handle('brands:get', async (_event, brandKitId: string) => {
    try {
      const brandKit = await storage.getBrandKit(brandKitId)
      if (!brandKit) {
        return { success: false, error: 'Brand kit not found' }
      }
      return { success: true, data: brandKit }
    } catch (error) {
      console.error('Failed to get brand kit:', error)
      return { success: false, error: 'Failed to retrieve brand kit' }
    }
  })

  // Create new brand kit
  ipcMain.handle(
    'brands:create',
    async (
      _event,
      data: {
        userId: string
        primaryColor?: string
        secondaryColor?: string
        font?: string
      }
    ) => {
      try {
        const brandKit = await storage.createBrandKit(data.userId, {
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          font: data.font
        })
        return { success: true, data: brandKit }
      } catch (error) {
        console.error('Failed to create brand kit:', error)
        return { success: false, error: 'Failed to create brand kit' }
      }
    }
  )

  // Update brand kit
  ipcMain.handle(
    'brands:update',
    async (
      _event,
      data: {
        brandKitId: string
        primaryColor?: string
        secondaryColor?: string
        font?: string
      }
    ) => {
      try {
        const brandKit = await storage.updateBrandKit(data.brandKitId, {
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          font: data.font
        })
        if (!brandKit) {
          return { success: false, error: 'Brand kit not found' }
        }
        return { success: true, data: brandKit }
      } catch (error) {
        console.error('Failed to update brand kit:', error)
        return { success: false, error: 'Failed to update brand kit' }
      }
    }
  )

  // Delete brand kit
  ipcMain.handle('brands:delete', async (_event, brandKitId: string) => {
    try {
      const deleted = await storage.deleteBrandKit(brandKitId)
      if (!deleted) {
        return { success: false, error: 'Brand kit not found' }
      }
      return { success: true, message: 'Brand kit deleted successfully' }
    } catch (error) {
      console.error('Failed to delete brand kit:', error)
      return { success: false, error: 'Failed to delete brand kit' }
    }
  })
}

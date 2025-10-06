import { ipcMain } from 'electron'
import { storage } from '../services/storage'
import { apiKeys } from '../services/api-keys'

/**
 * Register all settings and user-related IPC handlers
 */
export function registerSettingsHandlers(): void {
  // Update user language
  ipcMain.handle(
    'settings:updateLanguage',
    async (_event, data: { userId: string; language: string }) => {
      try {
        const user = await storage.updateUser(data.userId, {
          userLanguage: data.language
        })
        if (!user) {
          return { success: false, error: 'User not found' }
        }
        return { success: true, data: user }
      } catch (error) {
        console.error('Failed to update language:', error)
        return { success: false, error: 'Failed to update language' }
      }
    }
  )

  // Get current user
  ipcMain.handle('settings:getUser', async (_event, userId: string) => {
    try {
      const user = await storage.getUser(userId)
      if (!user) {
        return { success: false, error: 'User not found' }
      }
      return { success: true, data: user }
    } catch (error) {
      console.error('Failed to get user:', error)
      return { success: false, error: 'Failed to retrieve user' }
    }
  })

  // Update user
  ipcMain.handle(
    'settings:updateUser',
    async (_event, data: { userId: string; updates: { name?: string; email?: string; userLanguage?: string } }) => {
      try {
        const user = await storage.updateUser(data.userId, data.updates)
        if (!user) {
          return { success: false, error: 'User not found' }
        }
        return { success: true, data: user }
      } catch (error) {
        console.error('Failed to update user:', error)
        return { success: false, error: 'Failed to update user' }
      }
    }
  )

  // Create user (for initial setup)
  ipcMain.handle(
    'settings:createUser',
    async (_event, data: { name: string; email?: string; role?: 'USER' | 'ADMIN' }) => {
      try {
        const user = await storage.createUser({
          name: data.name,
          email: data.email,
          role: data.role || 'USER',
          userLanguage: 'en'
        })
        return { success: true, data: user }
      } catch (error) {
        console.error('Failed to create user:', error)
        return { success: false, error: 'Failed to create user' }
      }
    }
  )

  // Get current user (gets or creates the default user)
  ipcMain.handle('settings:getCurrentUser', async () => {
    try {
      const user = await storage.getOrCreateDefaultUser()
      return { success: true, data: user }
    } catch (error) {
      console.error('Failed to get current user:', error)
      return { success: false, error: 'Failed to get current user' }
    }
  })

  // Get all users (for profile selection)
  ipcMain.handle('settings:getAllUsers', async () => {
    try {
      const users = await storage.getAllUsers()
      return { success: true, data: users }
    } catch (error) {
      console.error('Failed to get all users:', error)
      return { success: false, error: 'Failed to get all users' }
    }
  })

  // Delete user/profile
  ipcMain.handle('settings:deleteUser', async (_event, userId: string) => {
    try {
      await storage.deleteUser(userId)
      return { success: true, message: 'User deleted successfully' }
    } catch (error) {
      console.error('Failed to delete user:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete user' }
    }
  })

  // ============ API KEYS ============

  // Get all API keys
  ipcMain.handle('settings:getApiKeys', async () => {
    try {
      const keys = await apiKeys.loadKeys()
      return { success: true, data: keys }
    } catch (error) {
      console.error('Failed to get API keys:', error)
      return { success: false, error: 'Failed to retrieve API keys' }
    }
  })

  // Update specific API key
  ipcMain.handle(
    'settings:updateApiKey',
    async (_event, data: { service: 'openai' | 'replicate'; apiKey: string }) => {
      try {
        await apiKeys.updateKey(data.service, data.apiKey)
        return { success: true, message: 'API key updated successfully' }
      } catch (error) {
        console.error('Failed to update API key:', error)
        return { success: false, error: 'Failed to update API key' }
      }
    }
  )

  // Get specific API key
  ipcMain.handle('settings:getApiKey', async (_event, service: 'openai' | 'replicate') => {
    try {
      const apiKey = await apiKeys.getKey(service)
      return { success: true, data: apiKey }
    } catch (error) {
      console.error('Failed to get API key:', error)
      return { success: false, error: 'Failed to retrieve API key' }
    }
  })

  // Delete specific API key
  ipcMain.handle('settings:deleteApiKey', async (_event, service: 'openai' | 'replicate') => {
    try {
      await apiKeys.deleteKey(service)
      return { success: true, message: 'API key deleted successfully' }
    } catch (error) {
      console.error('Failed to delete API key:', error)
      return { success: false, error: 'Failed to delete API key' }
    }
  })

  // Check if API key exists
  ipcMain.handle('settings:hasApiKey', async (_event, service: 'openai' | 'replicate') => {
    try {
      const exists = await apiKeys.hasKey(service)
      return { success: true, data: exists }
    } catch (error) {
      console.error('Failed to check API key:', error)
      return { success: false, error: 'Failed to check API key' }
    }
  })

  // Get storage directory path
  ipcMain.handle('settings:getStorageDir', () => {
    try {
      const dir = storage.getStorageDir()
      return { success: true, data: dir }
    } catch (error) {
      console.error('Failed to get storage directory:', error)
      return { success: false, error: 'Failed to get storage directory' }
    }
  })

  // Export data
  ipcMain.handle('settings:exportData', async (_event, exportPath: string) => {
    try {
      await storage.exportData(exportPath)
      return { success: true, message: 'Data exported successfully' }
    } catch (error) {
      console.error('Failed to export data:', error)
      return { success: false, error: 'Failed to export data' }
    }
  })

  // Import data
  ipcMain.handle('settings:importData', async (_event, importPath: string) => {
    try {
      await storage.importData(importPath)
      return { success: true, message: 'Data imported successfully' }
    } catch (error) {
      console.error('Failed to import data:', error)
      return { success: false, error: 'Failed to import data' }
    }
  })
}

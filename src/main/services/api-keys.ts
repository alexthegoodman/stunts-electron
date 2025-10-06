import { app, safeStorage } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export interface ApiKeys {
  openai?: string
  replicate?: string
}

class ApiKeyService {
  private configDir: string
  private configFile: string

  constructor() {
    const documentsPath = app.getPath('documents')
    this.configDir = path.join(documentsPath, 'Stunts', '.config')
    this.configFile = path.join(this.configDir, 'api-keys.json')
  }

  /**
   * Initialize config directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true })

      // Create empty config if doesn't exist
      try {
        await fs.access(this.configFile)
      } catch {
        await this.saveKeys({})
      }
    } catch (error) {
      console.error('Failed to initialize API key storage:', error)
      throw error
    }
  }

  /**
   * Save API keys (encrypted if safeStorage is available)
   */
  async saveKeys(keys: ApiKeys): Promise<void> {
    try {
      const data = JSON.stringify(keys)

      // Use Electron's safeStorage if available (encrypted storage)
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(data)
        await fs.writeFile(this.configFile, encrypted)
      } else {
        // Fallback to plain JSON (development/unsupported platforms)
        console.warn('Encryption not available, storing API keys in plain text')
        await fs.writeFile(this.configFile, data, 'utf-8')
      }
    } catch (error) {
      console.error('Failed to save API keys:', error)
      throw error
    }
  }

  /**
   * Load API keys (decrypt if needed)
   */
  async loadKeys(): Promise<ApiKeys> {
    try {
      const buffer = await fs.readFile(this.configFile)

      let data: string

      // Try to decrypt if encryption is available
      if (safeStorage.isEncryptionAvailable()) {
        try {
          data = safeStorage.decryptString(buffer)
        } catch {
          // If decryption fails, treat as plain text (migration case)
          data = buffer.toString('utf-8')
        }
      } else {
        data = buffer.toString('utf-8')
      }

      return JSON.parse(data) as ApiKeys
    } catch (error) {
      console.error('Failed to load API keys:', error)
      return {}
    }
  }

  /**
   * Update specific API key
   */
  async updateKey(service: keyof ApiKeys, apiKey: string): Promise<void> {
    const keys = await this.loadKeys()
    keys[service] = apiKey
    await this.saveKeys(keys)
  }

  /**
   * Get specific API key
   */
  async getKey(service: keyof ApiKeys): Promise<string | undefined> {
    const keys = await this.loadKeys()
    return keys[service]
  }

  /**
   * Delete specific API key
   */
  async deleteKey(service: keyof ApiKeys): Promise<void> {
    const keys = await this.loadKeys()
    delete keys[service]
    await this.saveKeys(keys)
  }

  /**
   * Clear all API keys
   */
  async clearAll(): Promise<void> {
    await this.saveKeys({})
  }

  /**
   * Check if API key exists for a service
   */
  async hasKey(service: keyof ApiKeys): Promise<boolean> {
    const keys = await this.loadKeys()
    return !!keys[service]
  }
}

// Export singleton instance
export const apiKeys = new ApiKeyService()

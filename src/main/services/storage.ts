import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

// Data Models
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().default('Guest'),
  email: z.string().email().optional(),
  role: z.enum(['USER', 'ADMIN']).default('USER'),
  userLanguage: z.string().default('en'),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const ProjectSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  fileData: z.any().optional(),
  docData: z.any().optional(),
  presData: z.any().optional(),
  adData: z.any().optional(),
  gameData: z.any().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const BrandKitSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  font: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
})

export type User = z.infer<typeof UserSchema>
export type Project = z.infer<typeof ProjectSchema>
export type BrandKit = z.infer<typeof BrandKitSchema>

interface DataStore {
  users: User[]
  projects: Project[]
  brandKits: BrandKit[]
}

class StorageService {
  private dataDir: string
  private dataFile: string

  constructor() {
    // Use Documents/Stunts for data storage
    const documentsPath = app.getPath('documents')
    this.dataDir = path.join(documentsPath, 'Stunts')
    this.dataFile = path.join(this.dataDir, 'data.json')
  }

  /**
   * Initialize storage directories and files
   */
  async initialize(): Promise<void> {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true })

      // Create data file if it doesn't exist
      try {
        await fs.access(this.dataFile)
      } catch {
        const initialData: DataStore = {
          users: [],
          projects: [],
          brandKits: []
        }
        await this.writeData(initialData)
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error)
      throw error
    }
  }

  /**
   * Read data from JSON file
   */
  private async readData(): Promise<DataStore> {
    try {
      const content = await fs.readFile(this.dataFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to read data:', error)
      throw error
    }
  }

  /**
   * Write data to JSON file atomically
   */
  private async writeData(data: DataStore): Promise<void> {
    try {
      // Write to temporary file first
      const tempFile = `${this.dataFile}.tmp`
      await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8')

      // Atomic rename
      await fs.rename(tempFile, this.dataFile)
    } catch (error) {
      console.error('Failed to write data:', error)
      throw error
    }
  }

  // ============ USER OPERATIONS ============

  async getUser(userId: string): Promise<User | null> {
    const data = await this.readData()
    return data.users.find((u) => u.id === userId) || null
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const data = await this.readData()
    const now = new Date().toISOString()

    const user: User = {
      id: crypto.randomUUID(),
      ...userData,
      createdAt: now,
      updatedAt: now
    }

    UserSchema.parse(user)
    data.users.push(user)
    await this.writeData(data)

    return user
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const data = await this.readData()
    const userIndex = data.users.findIndex((u) => u.id === userId)

    if (userIndex === -1) return null

    const updatedUser = {
      ...data.users[userIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    UserSchema.parse(updatedUser)
    data.users[userIndex] = updatedUser
    await this.writeData(data)

    return updatedUser
  }

  async getAllUsers(): Promise<User[]> {
    const data = await this.readData()
    return data.users
  }

  async getOrCreateDefaultUser(): Promise<User> {
    const data = await this.readData()

    // If there's already a user, return the first one
    if (data.users.length > 0) {
      return data.users[0]
    }

    // Otherwise create a default Guest user
    return await this.createUser({
      name: 'Guest',
      email: undefined,
      role: 'USER',
      userLanguage: 'en'
    })
  }

  async deleteUser(userId: string): Promise<boolean> {
    const data = await this.readData()
    const initialLength = data.users.length

    // Don't allow deleting the last user
    if (data.users.length <= 1) {
      throw new Error('Cannot delete the last user')
    }

    data.users = data.users.filter((u) => u.id !== userId)

    if (data.users.length < initialLength) {
      await this.writeData(data)
      return true
    }

    return false
  }

  // ============ PROJECT OPERATIONS ============

  async getAllProjects(userId: string): Promise<Project[]> {
    const data = await this.readData()
    return data.projects
      .filter((p) => p.ownerId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  async getProject(projectId: string): Promise<Project | null> {
    const data = await this.readData()
    return data.projects.find((p) => p.id === projectId) || null
  }

  async createProject(
    userId: string,
    projectData: Omit<Project, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<Project> {
    const data = await this.readData()
    const now = new Date().toISOString()

    const project: Project = {
      id: crypto.randomUUID(),
      ownerId: userId,
      ...projectData,
      createdAt: now,
      updatedAt: now
    }

    ProjectSchema.parse(project)
    data.projects.push(project)
    await this.writeData(data)

    return project
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    const data = await this.readData()
    const projectIndex = data.projects.findIndex((p) => p.id === projectId)

    if (projectIndex === -1) return null

    const saveTarget = data.projects[projectIndex].fileData.saveTarget

    console.info('Update project', saveTarget)

    let updatedProject: any = {}

    switch (saveTarget) {
      case 'Videos':
        updatedProject = {
          ...data.projects[projectIndex],
          ...updates,
          fileData: {
            ...data.projects[projectIndex].fileData,
            ...updates.fileData
          },
          updatedAt: new Date().toISOString()
        }
        break

      case 'Games':
        updatedProject = {
          ...data.projects[projectIndex],
          ...updates,
          gameData: {
            ...data.projects[projectIndex].gameData,
            ...updates.fileData
          },
          updatedAt: new Date().toISOString()
        }

        // console.info('updatedProject.gameData', updatedProject.gameData)
        break
    }

    ProjectSchema.parse(updatedProject)
    data.projects[projectIndex] = updatedProject
    await this.writeData(data)

    return updatedProject
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const data = await this.readData()
    const initialLength = data.projects.length

    data.projects = data.projects.filter((p) => p.id !== projectId)

    if (data.projects.length === initialLength) return false

    await this.writeData(data)
    return true
  }

  // ============ BRAND KIT OPERATIONS ============

  async getAllBrandKits(userId: string): Promise<BrandKit[]> {
    const data = await this.readData()
    return data.brandKits
      .filter((b) => b.ownerId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  async getBrandKit(brandKitId: string): Promise<BrandKit | null> {
    const data = await this.readData()
    return data.brandKits.find((b) => b.id === brandKitId) || null
  }

  async createBrandKit(
    userId: string,
    brandKitData: Omit<BrandKit, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
  ): Promise<BrandKit> {
    const data = await this.readData()
    const now = new Date().toISOString()

    const brandKit: BrandKit = {
      id: crypto.randomUUID(),
      ownerId: userId,
      ...brandKitData,
      createdAt: now,
      updatedAt: now
    }

    BrandKitSchema.parse(brandKit)
    data.brandKits.push(brandKit)
    await this.writeData(data)

    return brandKit
  }

  async updateBrandKit(brandKitId: string, updates: Partial<BrandKit>): Promise<BrandKit | null> {
    const data = await this.readData()
    const brandKitIndex = data.brandKits.findIndex((b) => b.id === brandKitId)

    if (brandKitIndex === -1) return null

    const updatedBrandKit = {
      ...data.brandKits[brandKitIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    BrandKitSchema.parse(updatedBrandKit)
    data.brandKits[brandKitIndex] = updatedBrandKit
    await this.writeData(data)

    return updatedBrandKit
  }

  async deleteBrandKit(brandKitId: string): Promise<boolean> {
    const data = await this.readData()
    const initialLength = data.brandKits.length

    data.brandKits = data.brandKits.filter((b) => b.id !== brandKitId)

    if (data.brandKits.length === initialLength) return false

    await this.writeData(data)
    return true
  }

  // ============ UTILITY OPERATIONS ============

  /**
   * Export all data to a file
   */
  async exportData(exportPath: string): Promise<void> {
    const data = await this.readData()
    await fs.writeFile(exportPath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Import data from a file
   */
  async importData(importPath: string): Promise<void> {
    const content = await fs.readFile(importPath, 'utf-8')
    const data = JSON.parse(content) as DataStore

    // Validate data structure
    data.users.forEach((u) => UserSchema.parse(u))
    data.projects.forEach((p) => ProjectSchema.parse(p))
    data.brandKits.forEach((b) => BrandKitSchema.parse(b))

    await this.writeData(data)
  }

  /**
   * Get storage directory path
   */
  getStorageDir(): string {
    return this.dataDir
  }
}

// Export singleton instance
export const storage = new StorageService()

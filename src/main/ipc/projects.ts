import { ipcMain } from 'electron'
import { storage } from '../services/storage'

/**
 * Register all project-related IPC handlers
 */
export function registerProjectHandlers(): void {
  // Get all projects for current user
  ipcMain.handle('projects:all', async (_event, userId: string) => {
    try {
      const projects = await storage.getAllProjects(userId)
      return { success: true, data: projects }
    } catch (error) {
      console.error('Failed to get projects:', error)
      return { success: false, error: 'Failed to retrieve projects' }
    }
  })

  // Get single project by ID
  ipcMain.handle('projects:single', async (_event, projectId: string) => {
    try {
      const project = await storage.getProject(projectId)
      if (!project) {
        return { success: false, error: 'Project not found' }
      }
      return { success: true, data: project }
    } catch (error) {
      console.error('Failed to get project:', error)
      return { success: false, error: 'Failed to retrieve project' }
    }
  })

  // Create new project
  ipcMain.handle(
    'projects:create',
    async (
      _event,
      data: {
        userId: string
        name: string
        emptyVideoData?: any
        emptyDocData?: any
        emptyPresData?: any
      }
    ) => {
      try {
        const project = await storage.createProject(data.userId, {
          name: data.name,
          fileData: data.emptyVideoData,
          docData: data.emptyDocData,
          presData: data.emptyPresData
        })
        return { success: true, data: project }
      } catch (error) {
        console.error('Failed to create project:', error)
        return { success: false, error: 'Failed to create project' }
      }
    }
  )

  // Update project
  ipcMain.handle(
    'projects:update',
    async (_event, data: { projectId: string; fileData: any }) => {
      try {
        const project = await storage.updateProject(data.projectId, {
          fileData: data.fileData
        })
        if (!project) {
          return { success: false, error: 'Project not found' }
        }
        return { success: true, data: project }
      } catch (error) {
        console.error('Failed to update project:', error)
        return { success: false, error: 'Failed to update project' }
      }
    }
  )

  // Update project timeline
  ipcMain.handle(
    'projects:updateTimeline',
    async (_event, data: { projectId: string; fileData: any }) => {
      try {
        const project = await storage.updateProject(data.projectId, {
          fileData: data.fileData
        })
        if (!project) {
          return { success: false, error: 'Project not found' }
        }
        return { success: true, data: project }
      } catch (error) {
        console.error('Failed to update project timeline:', error)
        return { success: false, error: 'Failed to update project timeline' }
      }
    }
  )

  // Update project sequences
  ipcMain.handle(
    'projects:updateSequences',
    async (_event, data: { projectId: string; fileData: any }) => {
      try {
        const project = await storage.updateProject(data.projectId, {
          fileData: data.fileData
        })
        if (!project) {
          return { success: false, error: 'Project not found' }
        }
        return { success: true, data: project }
      } catch (error) {
        console.error('Failed to update project sequences:', error)
        return { success: false, error: 'Failed to update project sequences' }
      }
    }
  )

  // Update project settings
  ipcMain.handle(
    'projects:updateSettings',
    async (_event, data: { projectId: string; fileData: any }) => {
      try {
        const project = await storage.updateProject(data.projectId, {
          fileData: data.fileData
        })
        if (!project) {
          return { success: false, error: 'Project not found' }
        }
        return { success: true, data: project }
      } catch (error) {
        console.error('Failed to update project settings:', error)
        return { success: false, error: 'Failed to update project settings' }
      }
    }
  )

  // Delete project
  ipcMain.handle('projects:delete', async (_event, projectId: string) => {
    try {
      const deleted = await storage.deleteProject(projectId)
      if (!deleted) {
        return { success: false, error: 'Project not found' }
      }
      return { success: true, message: 'Project deleted successfully' }
    } catch (error) {
      console.error('Failed to delete project:', error)
      return { success: false, error: 'Failed to delete project' }
    }
  })

  // Get project templates (placeholder - implement as needed)
  ipcMain.handle('projects:templates', async () => {
    try {
      // TODO: Implement template system if needed
      return { success: true, data: [] }
    } catch (error) {
      console.error('Failed to get templates:', error)
      return { success: false, error: 'Failed to retrieve templates' }
    }
  })

  // Create demo project (placeholder - implement as needed)
  ipcMain.handle('projects:createDemo', async (_event, userId: string) => {
    try {
      // TODO: Implement demo project creation
      const project = await storage.createProject(userId, {
        name: 'Demo Project',
        fileData: {},
        docData: {},
        presData: {}
      })
      return { success: true, data: project }
    } catch (error) {
      console.error('Failed to create demo project:', error)
      return { success: false, error: 'Failed to create demo project' }
    }
  })
}

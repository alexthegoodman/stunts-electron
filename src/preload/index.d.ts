import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      projects: {
        getAll: (userId: string) => Promise<any>
        getSingle: (projectId: string) => Promise<any>
        create: (data: {
          userId: string
          name: string
          emptyVideoData?: any
          emptyDocData?: any
          emptyPresData?: any
        }) => Promise<any>
        update: (data: { projectId: string; fileData: any }) => Promise<any>
        updateTimeline: (data: { projectId: string; fileData: any }) => Promise<any>
        updateSequences: (data: { projectId: string; fileData: any }) => Promise<any>
        updateSettings: (data: { projectId: string; fileData: any }) => Promise<any>
        delete: (projectId: string) => Promise<any>
        getTemplates: () => Promise<any>
        createDemo: (userId: string) => Promise<any>
      }
      brands: {
        getAll: (userId: string) => Promise<any>
        create: (data: { userId: string; name: string; brandData: any }) => Promise<any>
        update: (data: { brandId: string; brandData: any }) => Promise<any>
        delete: (brandId: string) => Promise<any>
      }
      uploads: {
        saveImage: (data: {
          fileName: string
          buffer: ArrayBuffer
          mimeType: string
        }) => Promise<any>
        saveVideo: (data: {
          fileName: string
          buffer: ArrayBuffer
          mimeType: string
        }) => Promise<any>
        getImage: (fileName: string) => Promise<any>
        getVideo: (fileName: string) => Promise<any>

        saveVideoFromPath: (data: { filePath: string; fileName?: string }) => Promise<any>
      }
      settings: {
        get: (userId: string) => Promise<any>
        update: (data: { userId: string; settings: any }) => Promise<any>
        getUser: (userId: string) => Promise<any>
        createUser: (data: {
          name: string
          email?: string
          role?: 'USER' | 'ADMIN'
        }) => Promise<any>
        updateUser: (data: {
          userId: string
          updates: { name?: string; email?: string; userLanguage?: string }
        }) => Promise<any>
        deleteUser: (userId: string) => Promise<any>
        getCurrentUser: () => Promise<any>
        getAllUsers: () => Promise<any>
      }
      aiGeneration: {
        generateImages: (data: { prompts: string[]; userId: string }) => Promise<any>
        generateContent: (data: { prompt: string; links: any[]; questions: any }) => Promise<any>
      }
      video: {
        resize: (data: { buffer: ArrayBuffer; maxWidth: number; maxHeight: number }) => Promise<any>
        select: () => Promise<any>
        resizeFromPath: (data: {
          inputPath: string
          maxWidth: number
          maxHeight: number
          outputDir?: string
        }) => Promise<any>
      }
      screenCapture: {
        getSources: () => Promise<
          Array<{
            id: string
            name: string
            thumbnail: string
            appIcon?: string
            hwnd?: string
          }>
        >
      }
    }
  }
}

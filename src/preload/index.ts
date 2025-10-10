import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // Project APIs
  projects: {
    getAll: (userId: string) => ipcRenderer.invoke('projects:all', userId),
    getSingle: (projectId: string) => ipcRenderer.invoke('projects:single', projectId),
    create: (data: { userId: string; name: string; emptyVideoData?: any; emptyDocData?: any; emptyPresData?: any }) =>
      ipcRenderer.invoke('projects:create', data),
    update: (data: { projectId: string; fileData: any }) => ipcRenderer.invoke('projects:update', data),
    updateTimeline: (data: { projectId: string; fileData: any }) => ipcRenderer.invoke('projects:updateTimeline', data),
    updateSequences: (data: { projectId: string; fileData: any }) => ipcRenderer.invoke('projects:updateSequences', data),
    updateSettings: (data: { projectId: string; fileData: any }) => ipcRenderer.invoke('projects:updateSettings', data),
    delete: (projectId: string) => ipcRenderer.invoke('projects:delete', projectId),
    getTemplates: () => ipcRenderer.invoke('projects:templates'),
    createDemo: (userId: string) => ipcRenderer.invoke('projects:createDemo', userId),
  },

  // Brand APIs
  brands: {
    getAll: (userId: string) => ipcRenderer.invoke('brands:all', userId),
    create: (data: { userId: string; name: string; brandData: any }) => ipcRenderer.invoke('brands:create', data),
    update: (data: { brandId: string; brandData: any }) => ipcRenderer.invoke('brands:update', data),
    delete: (brandId: string) => ipcRenderer.invoke('brands:delete', brandId),
  },

  // Upload APIs
  uploads: {
    saveImage: (data: { fileName: string; buffer: ArrayBuffer; mimeType: string }) =>
      ipcRenderer.invoke('uploads:saveImage', data),
    saveVideo: (data: { fileName: string; buffer: ArrayBuffer; mimeType: string }) =>
      ipcRenderer.invoke('uploads:saveVideo', data),
    saveVideoFromPath: (data: { filePath: string; fileName?: string }) =>
      ipcRenderer.invoke('uploads:saveVideoFromPath', data),
    getImage: (fileName: string) => ipcRenderer.invoke('uploads:getImage', fileName),
    getVideo: (fileName: string) => ipcRenderer.invoke('uploads:getVideo', fileName),
    saveModelFromPath: (data: { filePath: string; fileName?: string }) =>
      ipcRenderer.invoke('uploads:saveModelFromPath', data),
    getModel: (fileName: string) => ipcRenderer.invoke('uploads:getModel', fileName),
  },

  // Settings APIs
  settings: {
    get: (userId: string) => ipcRenderer.invoke('settings:get', userId),
    update: (data: { userId: string; settings: any }) => ipcRenderer.invoke('settings:update', data),
    getUser: (userId: string) => ipcRenderer.invoke('settings:getUser', userId),
    createUser: (data: { name: string; email?: string; role?: 'USER' | 'ADMIN' }) => ipcRenderer.invoke('settings:createUser', data),
    updateUser: (data: { userId: string; updates: { name?: string; email?: string; userLanguage?: string } }) =>
      ipcRenderer.invoke('settings:updateUser', data),
    deleteUser: (userId: string) => ipcRenderer.invoke('settings:deleteUser', userId),
    getCurrentUser: () => ipcRenderer.invoke('settings:getCurrentUser'),
    getAllUsers: () => ipcRenderer.invoke('settings:getAllUsers'),
    getApiKeys: () => ipcRenderer.invoke('settings:getApiKeys'),
    updateApiKey: (data: { service: 'openai' | 'replicate'; apiKey: string }) =>
      ipcRenderer.invoke('settings:updateApiKey', data),
    getApiKey: (service: 'openai' | 'replicate') => ipcRenderer.invoke('settings:getApiKey', service),
    deleteApiKey: (service: 'openai' | 'replicate') => ipcRenderer.invoke('settings:deleteApiKey', service),
    hasApiKey: (service: 'openai' | 'replicate') => ipcRenderer.invoke('settings:hasApiKey', service),
  },

  // AI Generation APIs
  ai: {
    generateImage: (prompt: string) => ipcRenderer.invoke('ai:generateImage', prompt),
    generateImageBulk: (prompts: string[]) => ipcRenderer.invoke('ai:generateImageBulk', prompts),
    generateContent: (data: { context: string; language: string }) =>
      ipcRenderer.invoke('ai:generateContent', data),
    generateQuestions: (context: string) => ipcRenderer.invoke('ai:generateQuestions', context),
    scrapeLink: (url: string) => ipcRenderer.invoke('ai:scrapeLink', url),
    extractData: (content: string) => ipcRenderer.invoke('ai:extractData', content),
    generateAnimation: (data: {
      prompt: string
      duration: number
      style: string
      objectsData: Array<{
        id: string
        objectType: string
        dimensions: { width: number; height: number }
        position: { x: number; y: number }
      }>
      canvasSize: { width: number; height: number }
    }) => ipcRenderer.invoke('ai:generateAnimation', data),
  },

  // Video Processing APIs
  video: {
    resize: (data: { buffer: ArrayBuffer; maxWidth: number; maxHeight: number }) =>
      ipcRenderer.invoke('video:resize', data),
    select: () => ipcRenderer.invoke('video:select'),
    resizeFromPath: (data: { inputPath: string; maxWidth: number; maxHeight: number; outputDir?: string }) =>
      ipcRenderer.invoke('video:resizeFromPath', data),
  },

  // 3D Model APIs
  model: {
    select: () => ipcRenderer.invoke('model:select'),
  },

  // Screen Capture APIs
  screenCapture: {
    getSources: () => ipcRenderer.invoke('screen-capture:getSources'),
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

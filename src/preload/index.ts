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
    getImage: (fileName: string) => ipcRenderer.invoke('uploads:getImage', fileName),
    getVideo: (fileName: string) => ipcRenderer.invoke('uploads:getVideo', fileName),
  },

  // Settings APIs
  settings: {
    get: (userId: string) => ipcRenderer.invoke('settings:get', userId),
    update: (data: { userId: string; settings: any }) => ipcRenderer.invoke('settings:update', data),
  },

  // AI Generation APIs
  aiGeneration: {
    generateImages: (data: { prompts: string[]; userId: string }) => ipcRenderer.invoke('ai:generateImages', data),
    generateContent: (data: { prompt: string; links: any[]; questions: any }) =>
      ipcRenderer.invoke('ai:generateContent', data),
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

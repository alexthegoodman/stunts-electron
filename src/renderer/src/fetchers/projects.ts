import {
  ProjectSettings,
  SavedState,
  SavedTimelineStateConfig,
  Sequence
} from '../engine/animations'
import { DocState } from '../engine/data'
import { SaveTarget } from '../engine/editor_state'
import { DateTime } from 'luxon'
import { getCurrentUserId } from '../lib/getCurrentUserId'

export interface AuthToken {
  token: string
  expiry: number
}

export interface SingleProjectResponse {
  project: {
    id: string
    name: string
    fileData: SavedState
    docData: SavedState
    presData: SavedState
    updatedAt: DateTime
    createdAt: DateTime
  } | null
}

export interface ProjectsResponse {
  projects: ProjectData[]
}

export interface ProjectInfo {
  project_id: string
  project_name: string
  created: DateTime
  modified: DateTime
}

export interface CreateProjectRequest {
  name: string
  empty_file_data: SavedState
}

export interface ProjectData {
  id: string
  name: string
  updatedAt: string
  createdAt: string
}

export interface CreateProjectResponse {
  newProject: ProjectData
}

export interface UpdateSequencesResponse {
  updatedProject: ProjectData
}
export interface UpdateTimelineResponse {
  updatedProject: ProjectData
}
export interface UploadResponse {
  url: string
  fileName: string
  size: number
  mimeType: string
  dimensions: {
    width: number
    height: number
  }
}

export const getSingleProject = async (
  authToken: string | null,
  project_id: string
): Promise<SingleProjectResponse> => {
  const result = await window.api.projects.getSingle(project_id)

  if (!result.success) {
    throw new Error(result.error || 'Failed to get project')
  }

  return {
    project: result.data
      ? {
          id: result.data.id,
          name: result.data.name,
          fileData: result.data.fileData,
          docData: result.data.docData,
          presData: result.data.presData,
          updatedAt: result.data.updatedAt,
          createdAt: result.data.createdAt
        }
      : null
  }
}

export const getProjects = async (authToken: AuthToken | null): Promise<ProjectInfo[]> => {
  const userId = await getCurrentUserId()
  const result = await window.api.projects.getAll(userId)

  if (!result.success) {
    throw new Error(result.error || 'Failed to get projects')
  }

  const projects: ProjectInfo[] = result.data.map((data) => ({
    project_id: data.id,
    project_name: data.name,
    created: DateTime.fromISO(data.createdAt),
    modified: DateTime.fromISO(data.updatedAt)
  }))

  return projects.sort((a, b) => b.modified.diff(a.modified).milliseconds)
}

export const createProject = async (
  token: string,
  name: string,
  emptyVideoData: SavedState,
  emptyDocData: SavedState,
  emptyPresData: SavedState
): Promise<CreateProjectResponse> => {
  const userId = await getCurrentUserId()

  const result = await window.api.projects.create({
    userId,
    name,
    emptyVideoData,
    emptyDocData,
    emptyPresData
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to create project')
  }

  return { newProject: result.data }
}

export async function saveSequencesData(
  sequences: Sequence[],
  saveTarget: SaveTarget
): Promise<UpdateSequencesResponse | null> {
  if (process.env.NODE_ENV === 'test') {
    return null
  }

  try {
    // Get stored-project from local storage
    const storedProjectString = localStorage.getItem('stored-project')

    if (!storedProjectString) {
      throw new Error("Couldn't get stored project from local storage")
    }

    const storedProject = JSON.parse(storedProjectString)

    // Call the updateSequences function
    return await updateSequences(
      '', // No longer need token
      storedProject.project_id,
      sequences,
      saveTarget
    )
  } catch (error) {
    console.error('Error saving sequences data:', error)
    throw error
  }
}

export const updateSequences = async (
  token: string,
  projectId: string,
  sequences: Sequence[],
  saveTarget: SaveTarget
): Promise<UpdateSequencesResponse> => {
  const result = await window.api.projects.updateSequences({
    projectId,
    fileData: { sequences, saveTarget }
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to update sequences')
  }

  return { updatedProject: result.data }
}

export async function saveSettingsData(
  settings: ProjectSettings,
  saveTarget: SaveTarget
): Promise<UpdateSequencesResponse | null> {
  if (process.env.NODE_ENV === 'test') {
    return null
  }

  try {
    // Get stored-project from local storage
    const storedProjectString = localStorage.getItem('stored-project')

    if (!storedProjectString) {
      throw new Error("Couldn't get stored project from local storage")
    }

    const storedProject = JSON.parse(storedProjectString)

    // Call the updateSettings function
    return await updateSettings(
      '', // No longer need token
      storedProject.project_id,
      settings,
      saveTarget
    )
  } catch (error) {
    console.error('Error saving settings data:', error)
    throw error
  }
}

export const updateSettings = async (
  token: string,
  projectId: string,
  settings: ProjectSettings,
  saveTarget: SaveTarget
): Promise<UpdateSequencesResponse> => {
  const result = await window.api.projects.updateSettings({
    projectId,
    fileData: { settings, saveTarget }
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to update settings')
  }

  return { updatedProject: result.data }
}

export const updateTimeline = async (
  token: string,
  projectId: string,
  // timelineState: SavedTimelineStateConfig
  state: any // now just saves whole fileData rather just timeline. sigh
): Promise<UpdateTimelineResponse> => {
  const result = await window.api.projects.updateTimeline({
    projectId,
    fileData: state
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to update timeline')
  }

  return { updatedProject: result.data }
}

export async function saveTimelineData(
  timelineState: SavedTimelineStateConfig
): Promise<UpdateSequencesResponse | null> {
  if (process.env.NODE_ENV === 'test') {
    return null
  }

  try {
    // Get stored-project from local storage
    const storedProjectString = localStorage.getItem('stored-project')

    if (!storedProjectString) {
      throw new Error("Couldn't get stored project from local storage")
    }

    const storedProject = JSON.parse(storedProjectString)

    // Call the updateTimeline function
    return await updateTimeline(
      '', // No longer need token
      storedProject.project_id,
      timelineState
    )
  } catch (error) {
    console.error('Error saving timeline data:', error)
    throw error
  }
}

export const saveImage = async (
  token: string,
  fileName: string,
  data: Blob
): Promise<UploadResponse> => {
  const buffer = await data.arrayBuffer()

  const result = await window.api.uploads.saveImage({
    fileName,
    buffer,
    mimeType: data.type
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to save image')
  }

  return result.data
}

export const getUploadedImage = async (token: string, filename: string): Promise<Blob> => {
  const result = await window.api.uploads.getImage(filename)

  if (!result.success) {
    throw new Error(result.error || 'Failed to get image')
  }

  // Convert buffer back to Blob
  return new Blob([result.data.buffer], {
    type: result.data.mimeType || 'image/jpeg'
  })
}

export async function getUploadedImageData(filename: string): Promise<Blob | null> {
  if (process.env.NODE_ENV === 'test') {
    return null
  }

  try {
    // Call the getUploadedImage function
    return await getUploadedImage('', filename)
  } catch (error) {
    console.error('Error getting image data:', error)
    throw error
  }
}

export const saveVideo = async (
  token: string,
  fileName: string,
  data: Blob
): Promise<UploadResponse> => {
  const buffer = await data.arrayBuffer()

  const result = await window.api.uploads.saveVideo({
    fileName,
    buffer,
    mimeType: data.type
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to save video')
  }

  return result.data
}

export const saveVideoFromPath = async (
  filePath: string,
  fileName?: string
): Promise<UploadResponse> => {
  const result = await window.api.uploads.saveVideoFromPath({
    filePath,
    fileName
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to save video')
  }

  return result.data
}

export const getUploadedVideo = async (token: string, filename: string): Promise<Blob> => {
  const result = await window.api.uploads.getVideo(filename)

  if (!result.success) {
    throw new Error(result.error || 'Failed to get video')
  }

  const blob = new Blob([result.data.buffer], {
    type: result.data.mimeType || 'video/mp4'
  })

  console.info('blob details', blob.size)

  return blob
}

export async function getUploadedVideoData(filename: string): Promise<Blob | null> {
  if (process.env.NODE_ENV === 'test') {
    return null
  }

  try {
    // Call the getUploadedVideo function
    return await getUploadedVideo('', filename)
  } catch (error) {
    console.error('Error getting video data:', error)
    throw error
  }
}

export const deleteProject = async (
  token: string,
  projectId: string
): Promise<{ message: string }> => {
  const result = await window.api.projects.delete(projectId)

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete project')
  }

  return { message: result.message }
}

export const createDemoProject = async (token: string): Promise<CreateProjectResponse> => {
  const userId = await getCurrentUserId()

  const result = await window.api.projects.createDemo(userId)

  if (!result.success) {
    throw new Error(result.error || 'Failed to create demo project')
  }

  return { newProject: result.data }
}

export const resizeVideo = async (
  videoFile: File | Blob,
  maxWidth = 1200,
  maxHeight = 900
): Promise<Blob> => {
  // Convert video file to ArrayBuffer
  const buffer = await videoFile.arrayBuffer()

  const result = await window.api.video.resize({
    buffer,
    maxWidth,
    maxHeight
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to resize video')
  }

  // Convert buffer back to Blob
  return new Blob([result.data.buffer], {
    type: 'video/mp4'
  })
}

/**
 * Select a video using native file dialog
 * Returns the file path without processing
 */
export const selectVideo = async (): Promise<{
  filePath: string
  fileName: string
  size: number
}> => {
  const result = await window.api.video.select()

  if (!result.success) {
    throw new Error(result.error || 'Failed to select video')
  }

  return result.data
}

/**
 * Resize a video from a file path
 */
export const resizeVideoFromPath = async (
  inputPath: string,
  maxWidth = 1200,
  maxHeight = 900,
  outputDir?: string
): Promise<{ outputPath: string; fileName: string; size: number }> => {
  const result = await window.api.video.resizeFromPath({
    inputPath,
    maxWidth,
    maxHeight,
    outputDir
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to resize video')
  }

  return result.data
}

/**
 * Resize and save a video from File/Blob (for browser file inputs)
 * This is a convenience wrapper that handles the temp file creation
 */
export const resizeAndSaveVideo = async (
  videoFile: File | Blob,
  fileName: string,
  maxWidth = 1200,
  maxHeight = 900
): Promise<UploadResponse> => {
  // For Electron, we need to write the blob to a temp file first
  // then use path-based operations
  const arrayBuffer = await videoFile.arrayBuffer()
  const tempFileName = `temp_${Date.now()}_${fileName}`

  // Save to temp location first
  const tempResult = await window.api.uploads.saveVideo({
    fileName: tempFileName,
    buffer: arrayBuffer,
    mimeType: 'video/mp4'
  })

  if (!tempResult.success) {
    throw new Error(tempResult.error || 'Failed to save temp video')
  }

  // Now resize from that path
  const { outputPath } = await resizeVideoFromPath(tempResult.data.url, maxWidth, maxHeight)

  // Save the resized version
  return await saveVideoFromPath(outputPath, fileName)
}

/**
 * Select a 3D model file (GLB/GLTF) using native file dialog
 * Returns the file path without processing
 */
export const selectModel = async (): Promise<{
  filePath: string
  fileName: string
  size: number
}> => {
  const result = await window.api.model.select()

  if (!result.success) {
    throw new Error(result.error || 'Failed to select model')
  }

  return result.data
}

/**
 * Save a 3D model file from a path to the uploads directory
 */
export const saveModelFromPath = async (
  filePath: string,
  fileName?: string
): Promise<UploadResponse> => {
  const result = await window.api.uploads.saveModelFromPath({
    filePath,
    fileName
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to save model')
  }

  return result.data
}

/**
 * Get uploaded model data
 */
export const getUploadedModelData = async (url: string): Promise<ArrayBuffer> => {
  const result = await window.api.uploads.getModel(url)

  if (!result.success) {
    throw new Error(result.error || 'Failed to get model data')
  }

  return result.data.buffer
}

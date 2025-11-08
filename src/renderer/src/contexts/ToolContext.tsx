'use client'

import { VoxelType } from '@renderer/engine/voxel'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface ToolContextType {
  voxelType
  setVoxelType
  voxelSize
  setVoxelSize
  voxelColor
  setVoxelColor
  isVoxelPainting
  setVoxelPainting
  isCapturing
  setIsCapturing
  isSourceModalOpen
  setIsSourceModalOpen
  selectedSourceId
  setSelectedSourceId
  selectedSourceData
  setSelectedSourceData
  uploadProgress
  setUploadProgress
  generateImageModalOpen
  setGenerateImageModalOpen
  generateImagePrompt
  setGenerateImagePrompt
  isGeneratingImage
  setIsGeneratingImage
  userMessage
  setUserMessage
  stickerModalOpen
  setStickerModalOpen
  textRollModalOpen
  setTextRollModalOpen
  voxelContinuous
  setVoxelContinuous
}

const ToolContext = createContext<ToolContextType | undefined>(undefined)

export function ToolProvider({ children }: { children: React.ReactNode }) {
  const [voxelType, setVoxelType] = useState<VoxelType>(VoxelType.StandardVoxel)
  const [voxelSize, setVoxelSize] = useState<number>(1) // Default voxel size
  const [voxelColor, setVoxelColor] = useState<string>('#FFFFFF') // Default voxel color (white)
  const [isVoxelPainting, setVoxelPainting] = useState(false)
  const [voxelContinuous, setVoxelContinuous] = useState(false)

  const [isCapturing, setIsCapturing] = useState(false)
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedSourceData, setSelectedSourceData] = useState<any | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [generateImageModalOpen, setGenerateImageModalOpen] = useState(false)
  const [generateImagePrompt, setGenerateImagePrompt] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [userMessage, setUserMessage] = useState('')

  const [stickerModalOpen, setStickerModalOpen] = useState(false)
  const [textRollModalOpen, setTextRollModalOpen] = useState(false)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <ToolContext.Provider
      value={{
        voxelType,
        setVoxelType,
        voxelSize,
        setVoxelSize,
        voxelColor,
        setVoxelColor,
        isVoxelPainting,
        setVoxelPainting,
        isCapturing,
        setIsCapturing,
        isSourceModalOpen,
        setIsSourceModalOpen,
        selectedSourceId,
        setSelectedSourceId,
        selectedSourceData,
        setSelectedSourceData,
        uploadProgress,
        setUploadProgress,
        generateImageModalOpen,
        setGenerateImageModalOpen,
        generateImagePrompt,
        setGenerateImagePrompt,
        isGeneratingImage,
        setIsGeneratingImage,
        userMessage,
        setUserMessage,
        stickerModalOpen,
        setStickerModalOpen,
        textRollModalOpen,
        setTextRollModalOpen,
        voxelContinuous,
        setVoxelContinuous
      }}
    >
      {children}
    </ToolContext.Provider>
  )
}

export function useTools() {
  const context = useContext(ToolContext)
  if (context === undefined) {
    throw new Error('useTools must be used within a ToolProvider')
  }
  return context
}

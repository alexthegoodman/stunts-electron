import React, { useState } from 'react'
import { X } from '@phosphor-icons/react'
import { DEFAULT_PAINTING, PaintingScene, SceneShaderType } from '@renderer/engine/scene_shaders'

interface SceneShaderModalProps {
  shaderType: SceneShaderType
  onClose: () => void
  onConfirm: (params: PaintingScene) => void
}

export const SceneShaderModal: React.FC<SceneShaderModalProps> = ({
  shaderType,
  onClose,
  onConfirm
}) => {
  // Initialize with default params based on shader type
  const getDefaultParams = (): PaintingScene => {
    switch (shaderType) {
      case SceneShaderType.Painting:
        return { ...DEFAULT_PAINTING }
    }
  }

  const [params, setParams] = useState<PaintingScene>(getDefaultParams())

  const updateParam = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  const updateColor = (key: string, index: number, value: number) => {
    setParams((prev) => {
      const color = [...(prev as any)[key]]
      color[index] = value / 255 // Convert to 0-1 range
      return { ...prev, [key]: color }
    })
  }

  const renderPaintingControls = () => {
    const p = params as PaintingScene
    return (
      <>
        <div className="mb-3">
          <label className="block text-sm mb-1">Intensity: {p.intensity.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={p.intensity}
            onChange={(e) => updateParam('intensity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Brush Scale: {p.brush_scale.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={p.brush_scale}
            onChange={(e) => updateParam('brush_scale', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">
            Noise Strength: {p.noise_strength.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={p.noise_strength}
            onChange={(e) => updateParam('noise_strength', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black">{shaderType} Configuration</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="mb-6 text-black">
          {shaderType === SceneShaderType.Painting && renderPaintingControls()}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(params)}
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Confirm
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

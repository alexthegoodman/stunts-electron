import React, { useState } from 'react'
import { X } from '@phosphor-icons/react'
import {
  ShaderThemeType,
  NightSkyParams,
  NetworkParams,
  DaySkyParams,
  RingsBlurParams,
  ShaderThemeParams,
  DEFAULT_NIGHT_SKY,
  DEFAULT_NETWORK,
  DEFAULT_DAY_SKY,
  DEFAULT_RINGS_BLUR
} from '../../engine/shader_themes'

interface ShaderThemeModalProps {
  shaderType: ShaderThemeType
  onClose: () => void
  onConfirm: (params: ShaderThemeParams) => void
}

export const ShaderThemeModal: React.FC<ShaderThemeModalProps> = ({
  shaderType,
  onClose,
  onConfirm
}) => {
  // Initialize with default params based on shader type
  const getDefaultParams = (): ShaderThemeParams => {
    switch (shaderType) {
      case ShaderThemeType.NightSky:
        return { ...DEFAULT_NIGHT_SKY }
      case ShaderThemeType.Network:
        return { ...DEFAULT_NETWORK }
      case ShaderThemeType.DaySky:
        return { ...DEFAULT_DAY_SKY }
      case ShaderThemeType.RingsBlur:
        return { ...DEFAULT_RINGS_BLUR }
    }
  }

  const [params, setParams] = useState<ShaderThemeParams>(getDefaultParams())

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

  const renderNightSkyControls = () => {
    const p = params as NightSkyParams
    return (
      <>
        <div className="mb-3">
          <label className="block text-sm mb-1">Star Density: {p.starDensity.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.starDensity}
            onChange={(e) => updateParam('starDensity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">
            Star Brightness: {p.starBrightness.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.starBrightness}
            onChange={(e) => updateParam('starBrightness', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Nebula Density: {p.nebulaDensity.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.nebulaDensity}
            onChange={(e) => updateParam('nebulaDensity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Twinkle Speed: {p.twinkleSpeed.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={p.twinkleSpeed}
            onChange={(e) => updateParam('twinkleSpeed', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-2">Nebula Color</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              max="255"
              value={Math.round(p.nebulaColor[0] * 255)}
              onChange={(e) => updateColor('nebulaColor', 0, parseInt(e.target.value))}
              className="w-16 px-2 py-1 text-sm"
              placeholder="R"
            />
            <input
              type="number"
              min="0"
              max="255"
              value={Math.round(p.nebulaColor[1] * 255)}
              onChange={(e) => updateColor('nebulaColor', 1, parseInt(e.target.value))}
              className="w-16 px-2 py-1 text-sm"
              placeholder="G"
            />
            <input
              type="number"
              min="0"
              max="255"
              value={Math.round(p.nebulaColor[2] * 255)}
              onChange={(e) => updateColor('nebulaColor', 2, parseInt(e.target.value))}
              className="w-16 px-2 py-1 text-sm"
              placeholder="B"
            />
          </div>
        </div>
      </>
    )
  }

  const renderNetworkControls = () => {
    const p = params as NetworkParams
    return (
      <>
        <div className="mb-3">
          <label className="block text-sm mb-1">Node Count: {p.nodeCount}</label>
          <input
            type="range"
            min="10"
            max="200"
            step="5"
            value={p.nodeCount}
            onChange={(e) => updateParam('nodeCount', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">
            Connection Distance: {p.connectionDistance.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={p.connectionDistance}
            onChange={(e) => updateParam('connectionDistance', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">
            Animation Speed: {p.animationSpeed.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={p.animationSpeed}
            onChange={(e) => updateParam('animationSpeed', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Node Size: {p.nodeSize.toFixed(3)}</label>
          <input
            type="range"
            min="0.001"
            max="0.05"
            step="0.001"
            value={p.nodeSize}
            onChange={(e) => updateParam('nodeSize', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </>
    )
  }

  const renderDaySkyControls = () => {
    const p = params as DaySkyParams
    return (
      <>
        <div className="mb-3">
          <label className="block text-sm mb-1">Cloud Density: {p.cloudDensity.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.cloudDensity}
            onChange={(e) => updateParam('cloudDensity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Cloud Speed: {p.cloudSpeed.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={p.cloudSpeed}
            onChange={(e) => updateParam('cloudSpeed', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Sun Intensity: {p.sunIntensity.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.sunIntensity}
            onChange={(e) => updateParam('sunIntensity', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">
            Sun Position X: {p.sunPosition[0].toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.sunPosition[0]}
            onChange={(e) =>
              updateParam('sunPosition', [parseFloat(e.target.value), p.sunPosition[1]])
            }
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">
            Sun Position Y: {p.sunPosition[1].toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.sunPosition[1]}
            onChange={(e) =>
              updateParam('sunPosition', [p.sunPosition[0], parseFloat(e.target.value)])
            }
            className="w-full"
          />
        </div>
      </>
    )
  }

  const renderRingsBlurControls = () => {
    const p = params as RingsBlurParams
    return (
      <>
        <div className="mb-3">
          <label className="block text-sm mb-1">Ring Count: {p.ringCount}</label>
          <input
            type="range"
            min="3"
            max="20"
            step="1"
            value={p.ringCount}
            onChange={(e) => updateParam('ringCount', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Blur Amount: {p.blurAmount.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={p.blurAmount}
            onChange={(e) => updateParam('blurAmount', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Rotation Speed: {p.rotationSpeed.toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={p.rotationSpeed}
            onChange={(e) => updateParam('rotationSpeed', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Radius: {p.radius.toFixed(2)}</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={p.radius}
            onChange={(e) => updateParam('radius', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm mb-1">Thickness: {p.thickness.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="0.2"
            step="0.01"
            value={p.thickness}
            onChange={(e) => updateParam('thickness', parseFloat(e.target.value))}
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
          {shaderType === ShaderThemeType.NightSky && renderNightSkyControls()}
          {shaderType === ShaderThemeType.Network && renderNetworkControls()}
          {shaderType === ShaderThemeType.DaySky && renderDaySkyControls()}
          {shaderType === ShaderThemeType.RingsBlur && renderRingsBlurControls()}
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

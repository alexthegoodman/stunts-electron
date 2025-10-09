import React, { useState } from 'react'
import { ShaderThemeModal } from './ShaderThemeModal'
import { ShaderThemeType, ShaderThemeParams, ShaderThemeConfig } from '../../engine/shader_themes'
import { BackgroundFill } from '../../engine/animations'
import { Editor } from '../../engine/editor'
import EditorState, { SaveTarget } from '../../engine/editor_state'
import { saveSequencesData } from '../../fetchers/projects'
import { OptionButton } from './items'

interface ShaderThemePickerProps {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  saveTarget: SaveTarget
}

export const ShaderThemePicker: React.FC<ShaderThemePickerProps> = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  saveTarget
}) => {
  const [selectedShader, setSelectedShader] = useState<ShaderThemeType | null>(null)

  const handleShaderConfirm = (params: ShaderThemeParams) => {
    if (!selectedShader) return

    const editor = editorRef.current
    const editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    // Create shader theme config
    const shaderConfig: ShaderThemeConfig = {
      type: selectedShader,
      params: params
    }

    // Create BackgroundFill with shader
    const backgroundFill: BackgroundFill = {
      type: 'Shader',
      value: shaderConfig
    }

    // Update background in editor
    editor.update_background(currentSequenceId, backgroundFill)

    // Update in saved state
    editorState.savedState.sequences.forEach((s) => {
      if (s.id === currentSequenceId) {
        s.backgroundFill = backgroundFill
      }
    })

    // Save
    saveSequencesData(editorState.savedState.sequences, saveTarget)

    // Close modal
    setSelectedShader(null)
  }

  const shaderThemes = [
    {
      type: ShaderThemeType.NightSky,
      label: 'Night Sky',
      description: 'Starfield with twinkling stars and nebula',
      gradient: 'linear-gradient(to bottom, #000428, #004e92)'
    },
    {
      type: ShaderThemeType.Network,
      label: 'Network',
      description: 'Animated network of connected nodes',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      type: ShaderThemeType.DaySky,
      label: 'Day Sky',
      description: 'Blue sky with clouds and sun',
      gradient: 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)'
    },
    {
      type: ShaderThemeType.RingsBlur,
      label: 'Rings + Blur',
      description: 'Concentric rotating rings with blur',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
  ]

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-semibold mb-2">Shader Themes</p>
        <div className="grid grid-cols-7 gap-2">
          {shaderThemes.map((theme) => (
            <OptionButton
              key={theme.type}
              callback={() => setSelectedShader(theme.type)}
              // className="relative p-4 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-all overflow-hidden group"
              icon="brush"
              style={{ background: theme.gradient }}
              label={theme.label}
            ></OptionButton>
          ))}
        </div>
      </div>

      {selectedShader && (
        <ShaderThemeModal
          shaderType={selectedShader}
          onClose={() => setSelectedShader(null)}
          onConfirm={handleShaderConfirm}
        />
      )}
    </>
  )
}

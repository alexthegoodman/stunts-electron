import React, { useState } from 'react'
import { BackgroundFill } from '../../engine/animations'
import { Editor } from '../../engine/editor'
import EditorState, { SaveTarget } from '../../engine/editor_state'
import { saveSequencesData } from '../../fetchers/projects'
import { OptionButton } from './items'
import { PaintingScene, SceneShaderType } from '@renderer/engine/scene_shaders'
import { SceneShaderModal } from './SceneShaderModal'

interface SceneShaderPickerProps {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  saveTarget: SaveTarget
}

export const SceneShaderPicker: React.FC<SceneShaderPickerProps> = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  saveTarget
}) => {
  const [selectedShader, setSelectedShader] = useState<SceneShaderType | null>(null)

  const handleShaderConfirm = (params: PaintingScene) => {
    if (!selectedShader) return

    const editor = editorRef.current
    const editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    editor.setSceneShader(params.type, params.intensity, params.brush_scale, params.noise_strength)

    // Update in saved state
    // editorState.savedState.sequences.forEach((s) => {
    //   if (s.id === currentSequenceId) {
    //     s.backgroundFill = backgroundFill
    //   }
    // })

    // Save
    saveSequencesData(editorState.savedState.sequences, saveTarget)

    // Close modal
    setSelectedShader(null)
  }

  const SceneShaders = [
    {
      type: SceneShaderType.Painting,
      label: 'Painting',
      description: 'Transform your scene into a real-time painting',
      gradient: 'linear-gradient(to bottom, #e03930, #425cf2ff)'
    }
  ]

  return (
    <>
      <div className="mb-6">
        <p className="text-sm font-semibold mb-2">Scene Shaders</p>
        <div className="grid grid-cols-7 gap-2">
          {SceneShaders.map((theme) => (
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
        <SceneShaderModal
          shaderType={selectedShader}
          onClose={() => setSelectedShader(null)}
          onConfirm={handleShaderConfirm}
        />
      )}
    </>
  )
}

'use client'

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { DebouncedInput, DebouncedTextarea } from '../items'
import { Editor, TEXT_BACKGROUNDS_DEFAULT_HIDDEN } from '../../../engine/editor'
import {
  colorToWgpu,
  getRandomNumber,
  InputValue,
  rgbToWgpu,
  wgpuToHuman
} from '../../../engine/editor/helpers'

import EditorState, { SaveTarget } from '../../../engine/editor_state'
import {
  BackgroundFill,
  GradientStop,
  ObjectType,
  UIKeyframe,
  EasingType
} from '../../../engine/animations'
import { CreateIcon } from '../icon'
import { RepeatAnimationType, RepeatPattern } from '@renderer/engine/repeater'
import { saveSequencesData } from '@renderer/fetchers/projects'

let defaultRepeatPattern: RepeatPattern = {
  count: 5,
  spacing: 20,
  direction: 'horizontal',
  rotation: 0,
  scale: 1,
  fadeOut: false
}

export const RepeatProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentObjectId,
  objectType
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentObjectId: string
  objectType: ObjectType
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultCount, setDefaultCount] = useState(defaultRepeatPattern.count)
  const [defaultDirection, setDefaultDirection] = useState(defaultRepeatPattern.direction)
  const [defaultSpacing, setDefaultSpacing] = useState(defaultRepeatPattern.spacing)
  const [defaultScale, setDefaultScale] = useState(defaultRepeatPattern.scale * 100)
  const [defaultRotation, setDefaultRotation] = useState(defaultRepeatPattern.rotation)
  const [defaultAnimation, setDefaultAnimation] = useState('')
  const [is_repeat, set_is_repeat] = useState(false)

  useEffect(() => {
    let editor = editorRef.current

    if (!editor) {
      return
    }

    let currentObject = editor.repeatManager.getRepeatObject(currentObjectId)

    if (!currentObject) {
      set_is_repeat(false)
      setDefaultsSet(true)
      return
    }

    let currentPattern = currentObject?.pattern

    setDefaultCount(currentPattern.count)
    setDefaultDirection(currentPattern.direction)
    setDefaultSpacing(currentPattern.spacing)

    if (currentPattern.scale) {
      setDefaultScale(currentPattern.scale)
    }

    if (currentPattern.rotation) {
      setDefaultRotation(currentPattern.rotation)
    }

    set_is_repeat(true)
    setDefaultsSet(true)
  }, [currentObjectId])

  let set_prop = (partialPattern: Partial<RepeatPattern>) => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let gpuResources = editor.gpuResources
    let camera = editor.camera

    if (!gpuResources || !editor.modelBindGroupLayout || !camera) {
      return
    }

    editor.repeatManager.updateRepeatObject(
      gpuResources.device!,
      gpuResources.queue!,
      camera.windowSize,
      editor.modelBindGroupLayout,
      currentObjectId,
      partialPattern
    )

    let saved_state = editorState.savedState

    saved_state.sequences.forEach((s) => {
      if (s.id == currentSequenceId) {
        s.activePolygons.forEach((p) => {
          if (p.id === currentObjectId) {
            p.repeatPattern = { ...p.repeatPattern, ...partialPattern }
          }
        })
      }
    })

    let sequences = saved_state.sequences

    saveSequencesData(sequences, editorState.saveTarget)
  }

  if (!defaultsSet) {
    return <></>
  }

  return (
    <>
      <input
        type="checkbox"
        id="is_repeat"
        name="is_repeat"
        checked={is_repeat}
        onChange={async (ev) => {
          let editor = editorRef.current
          let editorState = editorStateRef.current

          if (!editor || !editorState) {
            return
          }

          let gpuResources = editor.gpuResources
          let camera = editor.camera

          let sourceObject: any = null
          switch (objectType) {
            case ObjectType.Polygon:
              sourceObject = editor.polygons.find((p) => p.id === currentObjectId)
              break
            case ObjectType.TextItem:
              sourceObject = editor.textItems.find((p) => p.id === currentObjectId)
              break
            case ObjectType.ImageItem:
              sourceObject = editor.imageItems.find((p) => p.id === currentObjectId)
              break
            default:
              break
          }

          if (!sourceObject || !gpuResources || !editor.modelBindGroupLayout || !camera) {
            return
          }

          let checked = ev.target.checked

          set_is_repeat(checked)

          if (checked) {
            editor.repeatManager.createRepeatObject(
              gpuResources?.device!,
              gpuResources?.queue!,
              camera.windowSize,
              editor.modelBindGroupLayout,
              editor.groupBindGroupLayout,
              sourceObject,
              defaultRepeatPattern
            )

            let saved_state = editorState.savedState

            saved_state.sequences.forEach((s) => {
              if (s.id == currentSequenceId) {
                s.activePolygons.forEach((p) => {
                  if (p.id === sourceObject.id) {
                    p.repeatPattern = defaultRepeatPattern
                  }
                })
              }
            })

            let sequences = saved_state.sequences

            await saveSequencesData(sequences, editorState.saveTarget)
          } else {
            editor.repeatManager.deleteRepeatObject(sourceObject.id)

            let saved_state = editorState.savedState

            saved_state.sequences.forEach((s) => {
              if (s.id == currentSequenceId) {
                s.activePolygons.forEach((p) => {
                  if (p.id === sourceObject.id) {
                    p.repeatPattern = null
                  }
                })
              }
            })

            let sequences = saved_state.sequences

            await saveSequencesData(sequences, editorState.saveTarget)
          }
        }}
      />
      <label htmlFor="is_repeat" className="text-xs">
        Is Repeated
      </label>
      {is_repeat && (
        <>
          <DebouncedInput
            id="repeat_count"
            label="Count"
            placeholder="Count"
            initialValue={defaultCount.toString()}
            onDebounce={(value) => {
              let partialPattern: Partial<RepeatPattern> = {
                count: parseInt(value)
              }

              set_prop(partialPattern)
            }}
          />
          <label htmlFor="repeat_direction" className="text-xs">
            Choose direction
          </label>
          <select
            id="repeat_direction"
            name="repeat_direction"
            className="text-xs"
            value={defaultDirection}
            onChange={(ev) => {
              let partialPattern: Partial<RepeatPattern> = {
                direction: ev.target.value as 'horizontal' | 'vertical' | 'circular' | 'grid'
              }

              setDefaultDirection(ev.target.value as any)

              set_prop(partialPattern)
            }}
          >
            {/* "horizontal" | "vertical" | "circular" | "grid" */}
            <option value="horizontal">horizontal</option>
            <option value="vertical">vertical</option>
            <option value="circular">circular</option>
            <option value="grid">grid</option>
          </select>
          <DebouncedInput
            id="repeat_spacing"
            label="Spacing"
            placeholder="Spacing"
            initialValue={defaultSpacing.toString()}
            onDebounce={(value) => {
              let partialPattern: Partial<RepeatPattern> = {
                spacing: parseFloat(value)
              }

              set_prop(partialPattern)
            }}
          />
          <DebouncedInput
            id="repeat_scale"
            label="Scale (out of 100%)"
            placeholder="Scale"
            initialValue={defaultScale.toString()}
            onDebounce={(value) => {
              let partialPattern: Partial<RepeatPattern> = {
                scale: parseInt(value) / 100
              }

              set_prop(partialPattern)
            }}
          />
          <DebouncedInput
            id="repeat_rotation"
            label="Rotation (degrees)"
            placeholder="Rotation"
            initialValue={defaultRotation.toString()}
            onDebounce={(value) => {
              let partialPattern: Partial<RepeatPattern> = {
                rotation: parseInt(value)
              }

              set_prop(partialPattern)
            }}
          />
          <label htmlFor="repeat_direction" className="text-xs">
            Choose animation
          </label>
          <select
            id="repeat_direction"
            name="repeat_direction"
            className="text-xs"
            value={defaultAnimation}
            onChange={(ev) => {
              let value = ev.target.value

              if (!value) {
                return
              }

              let partialPattern: Partial<RepeatPattern> = {
                animation: value as RepeatAnimationType
              }

              setDefaultAnimation(value as any)

              set_prop(partialPattern)
            }}
          >
            {/* "horizontal" | "vertical" | "circular" | "grid" */}
            <option value="">Select preset</option>
            <option value="LightlyFloating">Lightly Floating</option>
            <option value="OrganicChimes">Organic Chimes</option>
          </select>
        </>
      )}
    </>
  )
}

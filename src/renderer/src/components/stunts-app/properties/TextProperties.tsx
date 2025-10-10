'use client'

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { DebouncedInput, DebouncedTextarea } from '../items'
import {
  colorToWgpu,
  Editor,
  rgbToWgpu,
  TEXT_BACKGROUNDS_DEFAULT_HIDDEN,
  wgpuToHuman
} from '../../../engine/editor'
import EditorState, { SaveTarget } from '../../../engine/editor_state'
import {
  BackgroundFill,
  GradientStop,
  ObjectType,
  UIKeyframe,
  EasingType
} from '../../../engine/animations'
import { CreateIcon } from '../icon'

import {
  updateBackground,
  updateBorderRadius,
  updateFontFamily,
  updateFontSize,
  updateHeight,
  updateHiddenBackground,
  updateIsCircle,
  updatePositionX,
  updatePositionY,
  updatePositionZ,
  updateTextContent,
  updateTextColor,
  updateWidth,
  updateTextAnimation,
  removeTextAnimation
} from '../../../engine/state/properties'
import { FontFamilySelector } from '../FontFamilySelector'
import { TextAnimationManager } from '@renderer/engine/textAnimationManager'
import { AnimationOptions } from './KeyframeProperties'
import { RepeatProperties } from './RepeatProperties'
import { ColorProperties } from './ColorProperties'
import { ColorService, useColor } from 'react-color-palette'
import { ColorPicker } from '../ColorPicker'

export const TextProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentTextId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentTextId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultWidth, setDefaultWidth] = useState(0)
  const [defaultHeight, setDefaultHeight] = useState(0)
  const [defaultContent, setDefaultContent] = useState('')
  const [is_circle, set_is_circle] = useState(false)
  const [hidden_background, set_hidden_background] = useState(TEXT_BACKGROUNDS_DEFAULT_HIDDEN)
  const [defaultFill, setDefaultFill] = useState<BackgroundFill | null>(null)
  const [fontSize, setFontSize] = useState(28)
  const [fontFamily, setFontFamily] = useState('Aleo')
  const [showTextProps, setShowTextProps] = useState(false)
  const [textColor, setTextColor] = useState<[number, number, number, number]>([255, 255, 255, 255])
  const [color, setColor] = useColor('rgba(255, 255, 255, 1)')
  const [colorSet, setColorSet] = useState(false)
  const [positionX, setPositionX] = useState(0)
  const [positionY, setPositionY] = useState(0)
  const [positionZ, setPositionZ] = useState(0)

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let currentSequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)
    let currentObject = currentSequence?.activeTextItems.find((p) => p.id === currentTextId)

    let width = currentObject?.dimensions[0]
    let height = currentObject?.dimensions[1]
    let content = currentObject?.text
    let isCircle = currentObject?.isCircle
    let hiddenBackground = currentObject?.hiddenBackground
    let backgroundFill = currentObject?.backgroundFill
    let fontSize = currentObject?.fontSize
    let fontFamily = currentObject?.fontFamily
    let color = currentObject?.color
    let posX = currentObject?.position.x
    let posY = currentObject?.position.y
    let posZ = currentObject?.position.z ?? 0

    if (width) {
      setDefaultWidth(width)
    }
    if (height) {
      setDefaultHeight(height)
    }
    if (content) {
      setDefaultContent(content)
    }
    if (typeof isCircle !== 'undefined' && isCircle !== null) {
      set_is_circle(isCircle)
    }
    if (typeof hiddenBackground !== 'undefined' && hiddenBackground !== null) {
      set_hidden_background(hiddenBackground)
    }
    if (backgroundFill) {
      setDefaultFill(backgroundFill)
    }
    if (fontSize) {
      setFontSize(fontSize)
    }
    if (fontFamily) {
      setFontFamily(fontFamily)
    }
    if (color) {
      setTextColor(color)
    }
    if (posX) {
      setPositionX(posX)
    }
    if (posY) {
      setPositionY(posY)
    }
    if (typeof posZ !== 'undefined' && posZ !== null) {
      setPositionZ(posZ)
    }

    setDefaultsSet(true)
  }, [currentTextId])

  // // Initialize color picker from text color
  useEffect(() => {
    if (textColor) {
      setColor(
        ColorService.convert('rgb', {
          r: textColor[0],
          g: textColor[1],
          b: textColor[2],
          a: textColor[3]
        })
      )
    }
  }, [textColor])

  // Update text color when color picker changes
  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState || !color || !colorSet) {
      return
    }

    const newColor: [number, number, number, number] = [
      color.rgb.r,
      color.rgb.g,
      color.rgb.b,
      color.rgb.a
    ]

    // Only update if color actually changed
    if (
      textColor[0] !== color.rgb.r ||
      textColor[1] !== color.rgb.g ||
      textColor[2] !== color.rgb.b ||
      textColor[3] !== color.rgb.a
    ) {
      updateTextColor(editorState, editor, currentTextId, newColor)
    }
  }, [color])

  if (!defaultsSet) {
    return <></>
  }

  let aside_width = 260.0
  let quarters = aside_width / 4.0 + 5.0 * 4.0
  let thirds = aside_width / 3.0 + 5.0 * 3.0
  let halfs = aside_width / 2.0 + 5.0 * 2.0

  return (
    <>
      <div className="w-full">
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            // disabled={loading}
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update Text</h5>
        </div>

        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="text_x"
                label="X"
                placeholder="X"
                initialValue={positionX.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updatePositionX(
                    editorState,
                    editor,
                    currentTextId,
                    ObjectType.TextItem,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="text_y"
                label="Y"
                placeholder="Y"
                initialValue={positionY.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updatePositionY(
                    editorState,
                    editor,
                    currentTextId,
                    ObjectType.TextItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="text_z"
                label="Z"
                placeholder="Z"
                initialValue={positionZ.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updatePositionZ(
                    editorState,
                    editor,
                    currentTextId,
                    ObjectType.TextItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <button
          className="text-xs rounded-md text-white stunts-gradient px-2 py-1 w-full mb-3"
          onClick={() => setShowTextProps(!showTextProps)}
        >
          Show Text Properties
        </button>
        {showTextProps ? (
          <section>
            <details open={false} className="border border-gray-300 rounded">
              <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
                Text Content
              </summary>
              <div className="p-2 space-y-1">
                <DebouncedInput
                  id="text_font_size"
                  label="Font Size"
                  placeholder="Font Size"
                  initialValue={fontSize.toString()}
                  onDebounce={(value) => {
                    let editor = editorRef.current
                    let editorState = editorStateRef.current

                    if (!editorState || !editor) {
                      return
                    }

                    console.info('double call?')

                    updateFontSize(
                      editorState,
                      editor,
                      currentTextId,
                      ObjectType.TextItem,
                      parseInt(value)
                    )
                  }}
                />
                <div className="flex flex-col gap-1 mb-2">
                  <label htmlFor="font_family" className="text-xs">
                    Font Family
                  </label>
                  <FontFamilySelector
                    value={fontFamily}
                    onChange={async (ev) => {
                      let editor = editorRef.current
                      let editorState = editorStateRef.current

                      if (!editorState || !editor) {
                        return
                      }

                      const newFontFamily = ev.target.value
                      setFontFamily(newFontFamily)

                      await updateFontFamily(editorState, editor, currentTextId, newFontFamily)
                    }}
                    style={{ fontFamily: fontFamily }}
                  />
                </div>
                <DebouncedTextarea
                  id="text_content"
                  label="Content"
                  placeholder="Content"
                  initialValue={defaultContent.toString()}
                  onDebounce={(value) => {
                    let editor = editorRef.current
                    let editorState = editorStateRef.current

                    if (!editorState || !editor) {
                      return
                    }

                    updateTextContent(editorState, editor, currentTextId, value)
                  }}
                />
              </div>
            </details>
            <details open={false} className="border border-gray-300 rounded">
              <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
                Text Color
              </summary>
              <div className="p-2 space-y-1">
                <ColorPicker
                  label="Select Text Color"
                  color={color}
                  setColor={(c) => {
                    setColorSet(true)
                    setColor(c)
                  }}
                />
              </div>
            </details>
            <details open={false} className="border border-gray-300 rounded">
              <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
                Size & Shape
              </summary>
              <div className="p-2 space-y-1">
                <div className="flex flex-row gap-2">
                  <DebouncedInput
                    id="text_width"
                    label="Width"
                    placeholder="Width"
                    initialValue={defaultWidth.toString()}
                    onDebounce={(value) => {
                      let editor = editorRef.current
                      let editorState = editorStateRef.current

                      if (!editorState || !editor) {
                        return
                      }

                      console.info('double call?')

                      updateWidth(
                        editorState,
                        editor,
                        currentTextId,
                        ObjectType.TextItem,
                        parseInt(value)
                      )
                    }}
                  />
                  <DebouncedInput
                    id="text_height"
                    label="Height"
                    placeholder="height"
                    initialValue={defaultHeight.toString()}
                    onDebounce={(value) => {
                      let editor = editorRef.current
                      let editorState = editorStateRef.current

                      if (!editorState || !editor) {
                        return
                      }

                      console.info('height debounce')

                      updateHeight(
                        editorState,
                        editor,
                        currentTextId,
                        ObjectType.TextItem,
                        parseInt(value)
                      )
                    }}
                  />
                </div>
                <div>
                  <input
                    type="checkbox"
                    id="is_circle"
                    name="is_circle"
                    checked={is_circle}
                    onChange={(ev) => {
                      let editor = editorRef.current
                      let editorState = editorStateRef.current

                      if (!editorState || !editor) {
                        return
                      }

                      updateIsCircle(
                        editorState,
                        editor,
                        currentTextId,
                        ObjectType.TextItem,
                        ev.target.checked
                      )

                      set_is_circle(ev.target.checked)
                    }}
                  />
                  <label htmlFor="is_circle" className="text-xs">
                    Is Circle
                  </label>
                </div>
              </div>
            </details>
            <details open={false} className="border border-gray-300 rounded">
              <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
                Background Color
              </summary>
              <div className="p-2 space-y-1">
                <div>
                  <input
                    type="checkbox"
                    id="hidden_background"
                    name="hidden_background"
                    checked={hidden_background}
                    onChange={(ev) => {
                      let editor = editorRef.current
                      let editorState = editorStateRef.current

                      if (!editorState || !editor) {
                        return
                      }

                      updateHiddenBackground(editorState, editor, currentTextId, ev.target.checked)

                      set_hidden_background(ev.target.checked)
                    }}
                  />
                  <label htmlFor="hidden_background" className="text-xs">
                    Hide Background
                  </label>
                </div>
                <ColorProperties
                  editorRef={editorRef}
                  editorStateRef={editorStateRef}
                  currentSequenceId={currentSequenceId}
                  currentObjectId={currentTextId}
                  objectType={ObjectType.Polygon}
                  defaultColor={defaultFill as BackgroundFill}
                />
              </div>
            </details>
            <details open={false} className="border border-gray-300 rounded">
              <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
                Repeat
              </summary>
              <div className="p-2 space-y-1">
                <RepeatProperties
                  editorRef={editorRef}
                  editorStateRef={editorStateRef}
                  currentSequenceId={currentSequenceId}
                  currentObjectId={currentTextId}
                  objectType={ObjectType.TextItem}
                />
              </div>
            </details>
          </section>
        ) : (
          <></>
        )}
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentTextId}
          objectType={ObjectType.TextItem}
        />
        <TextAnimationProperties
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentTextId={currentTextId}
        />
      </div>
    </>
  )
}

const TextAnimationProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentTextId
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentTextId: string
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(true)

  const animationManager = new TextAnimationManager()
  const categories = ['Viral', 'Professional', 'Stylish', 'Dynamic', 'Colorful']

  useEffect(() => {
    const editor = editorRef.current
    const editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    const currentSequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)
    const currentObject = currentSequence?.activeTextItems.find((p) => p.id === currentTextId)

    const textAnimation = currentObject?.textAnimation

    if (textAnimation?.id) {
      // Extract template ID from the animation config ID
      // Animation IDs are like "viral-typewriter-1234567890"
      const templateId = textAnimation.id.split('-').slice(0, -1).join('-')
      setSelectedTemplate(templateId)
    } else {
      setSelectedTemplate(null)
    }
  }, [currentTextId, currentSequenceId])

  const getTemplatesByCategory = (category: string) => {
    switch (category) {
      case 'Viral':
        return animationManager.getViralTemplates()
      case 'Professional':
        return animationManager.getProfessionalTemplates()
      case 'Stylish':
        return animationManager.getStylishTemplates()
      case 'Dynamic':
        return animationManager.getDynamicTemplates()
      case 'Colorful':
        return animationManager.getColorfulTemplates()
      default:
        return animationManager.getTemplates()
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const editor = editorRef.current
    const editorState = editorStateRef.current

    if (!editor || !editorState) return

    setSelectedTemplate(templateId)
    updateTextAnimation(editorState, editor, currentTextId, templateId)
  }

  const handleRemove = () => {
    const editor = editorRef.current
    const editorState = editorStateRef.current

    if (!editor || !editorState) return

    setSelectedTemplate(null)
    removeTextAnimation(editorState, editor, currentTextId)
  }

  return (
    <div className="mt-4 pt-4">
      <div className="flex items-center justify-between mb-2">
        <h6 className="text-sm font-medium">Text Animations</h6>
        <div className="flex gap-2">
          {selectedTemplate && (
            <button
              onClick={handleRemove}
              className="text-xs px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Remove
            </button>
          )}
          {/* <button
            onClick={() => setShowPanel(!showPanel)}
            className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
          >
            {showPanel ? "Hide" : "Show"}
          </button> */}
        </div>
      </div>

      {showPanel && (
        <div className="space-y-2">
          <div className="space-y-2">
            {categories.map((category) => (
              <details key={category} className="border border-gray-300 rounded">
                <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
                  {category}
                </summary>
                <div className="p-2 space-y-1">
                  {getTemplatesByCategory(category).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                        selectedTemplate === template.id
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs opacity-75">{template.description}</div>
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

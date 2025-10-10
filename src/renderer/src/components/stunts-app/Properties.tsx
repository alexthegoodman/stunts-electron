'use client'

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { DebouncedInput, DebouncedTextarea } from './items'
import { Editor } from '../../engine/editor'
import { getRandomNumber, InputValue, rgbToWgpu, wgpuToHuman } from '../../engine/editor/helpers'
import EditorState, { SaveTarget } from '../../engine/editor_state'
import {
  BackgroundFill,
  GradientStop,
  ObjectType,
  UIKeyframe,
  EasingType
} from '../../engine/animations'
import { CreateIcon } from './icon'
import { RepeatPattern } from '../../engine/repeater'
import { saveSequencesData } from '../../fetchers/projects'
import { ColorPicker } from './ColorPicker'
import { ColorService, IColor, useColor } from 'react-color-palette'
import { update_keyframe } from './VideoEditor'
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
  updateWidth,
  updateTextAnimation,
  removeTextAnimation,
  updateCube3DWidth,
  updateCube3DHeight,
  updateCube3DDepth,
  updateCube3DRotationX,
  updateCube3DRotationY,
  updateCube3DRotationZ,
  updateSphere3DRadius,
  updateSphere3DRotationX,
  updateSphere3DRotationY,
  updateSphere3DRotationZ,
  updateMockup3DWidth,
  updateMockup3DHeight,
  updateMockup3DDepth,
  updateMockup3DRotationX,
  updateMockup3DRotationY,
  updateMockup3DRotationZ,
  updateModel3DScaleX,
  updateModel3DScaleY,
  updateModel3DScaleZ,
  updateModel3DRotationX,
  updateModel3DRotationY,
  updateModel3DRotationZ
} from '../../engine/state/properties'
import { AnimationOptions } from './properties/KeyframeProperties'
import { ColorProperties } from './properties/ColorProperties'
import { RepeatProperties } from './properties/RepeatProperties'

export const PolygonProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentPolygonId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentPolygonId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultWidth, setDefaultWidth] = useState(0)
  const [defaultHeight, setDefaultHeight] = useState(0)
  const [defaultBorderRadius, setDefaultBorderRadius] = useState(0)
  const [positionX, setPositionX] = useState(0)
  const [positionY, setPositionY] = useState(0)
  const [positionZ, setPositionZ] = useState(0)
  const [is_circle, set_is_circle] = useState(false)
  const [defaultFill, setDefaultFill] = useState<BackgroundFill | null>(null)

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let currentSequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)
    let currentObject = currentSequence?.activePolygons.find((p) => p.id === currentPolygonId)

    let width = currentObject?.dimensions[0]
    let height = currentObject?.dimensions[1]
    let borderRadius = currentObject?.borderRadius
    let isCircle = currentObject?.isCircle
    let positionX = currentObject?.position.x
    let positionY = currentObject?.position.y
    let positionZ = currentObject?.position.z ?? 0
    let backgroundFill = currentObject?.backgroundFill

    if (width) {
      setDefaultWidth(width)
    }
    if (height) {
      setDefaultHeight(height)
    }
    if (borderRadius) {
      setDefaultBorderRadius(borderRadius)
    }
    if (typeof isCircle !== 'undefined' && isCircle !== null) {
      set_is_circle(isCircle)
    }
    if (positionX) {
      setPositionX(positionX)
    }
    if (positionY) {
      setPositionY(positionY)
    }
    if (typeof positionZ !== 'undefined' && positionZ !== null) {
      setPositionZ(positionZ)
    }
    if (backgroundFill) {
      setDefaultFill(backgroundFill)
    }

    setDefaultsSet(true)
  }, [currentPolygonId])

  if (!defaultsSet) {
    return <></>
  }

  let aside_width = 260.0
  let quarters = aside_width / 4.0 + 5.0 * 4.0
  let thirds = aside_width / 3.0 + 5.0 * 3.0
  let halfs = aside_width / 2.0 + 5.0 * 2.0

  return (
    <>
      <div>
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            // disabled={loading}
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update Polygon</h5>
        </div>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="polygon_x"
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
                    currentPolygonId,
                    ObjectType.Polygon,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="polygon_y"
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
                    currentPolygonId,
                    ObjectType.Polygon,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="polygon_z"
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
                    currentPolygonId,
                    ObjectType.Polygon,
                    parseInt(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Size & Shape
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="polygon_width"
                label="Width"
                placeholder="Width"
                initialValue={defaultWidth.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateWidth(
                    editorState,
                    editor,
                    currentPolygonId,
                    ObjectType.Polygon,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="polygon_height"
                label="Height"
                placeholder="Height"
                initialValue={defaultHeight.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateHeight(
                    editorState,
                    editor,
                    currentPolygonId,
                    ObjectType.Polygon,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <DebouncedInput
              id="polygon_border_radius"
              label="Border Radius"
              placeholder="Border Radius"
              initialValue={defaultBorderRadius.toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                updateBorderRadius(
                  editorState,
                  editor,
                  currentPolygonId,
                  ObjectType.Polygon,
                  parseInt(value)
                )
              }}
            />
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
                    currentPolygonId,
                    ObjectType.Polygon,
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
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentPolygonId}
          objectType={ObjectType.Polygon}
        />
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Color
          </summary>
          <div className="p-2 space-y-1">
            <ColorProperties
              editorRef={editorRef}
              editorStateRef={editorStateRef}
              currentSequenceId={currentSequenceId}
              currentObjectId={currentPolygonId}
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
              currentObjectId={currentPolygonId}
              objectType={ObjectType.Polygon}
            />
          </div>
        </details>
      </div>
    </>
  )
}

export const ImageProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentImageId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentImageId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultWidth, setDefaultWidth] = useState(0)
  const [defaultHeight, setDefaultHeight] = useState(0)
  const [is_circle, set_is_circle] = useState(false)
  const [defaultBorderRadius, setDefaultBorderRadius] = useState(0)
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
    let currentObject = currentSequence?.activeImageItems.find((p) => p.id === currentImageId)

    let width = currentObject?.dimensions[0]
    let height = currentObject?.dimensions[1]
    let isCircle = currentObject?.isCircle
    let borderRadius = currentObject?.borderRadius
    let posX = currentObject.position.x
    let posY = currentObject.position.y
    let posZ = currentObject.position.z ?? 0

    if (width) {
      setDefaultWidth(width)
    }
    if (height) {
      setDefaultHeight(height)
    }
    if (typeof isCircle !== 'undefined' && isCircle !== null) {
      set_is_circle(isCircle)
    }
    if (typeof borderRadius !== 'undefined' && borderRadius !== null) {
      setDefaultBorderRadius(borderRadius)
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
  }, [currentImageId])

  if (!defaultsSet) {
    return <></>
  }

  let aside_width = 260.0
  let quarters = aside_width / 4.0 + 5.0 * 4.0
  let thirds = aside_width / 3.0 + 5.0 * 3.0
  let halfs = aside_width / 2.0 + 5.0 * 2.0

  return (
    <>
      <div>
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            // disabled={loading}
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update Image</h5>
        </div>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Size & Shape
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="image_width"
                label="Width"
                placeholder="Width"
                initialValue={defaultWidth.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateWidth(
                    editorState,
                    editor,
                    currentImageId,
                    ObjectType.ImageItem,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="image_height"
                label="Height"
                placeholder="Height"
                initialValue={defaultHeight.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateHeight(
                    editorState,
                    editor,
                    currentImageId,
                    ObjectType.ImageItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="image_border_radius"
                label="Border Radius"
                placeholder="Border Radius"
                initialValue={defaultBorderRadius.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateBorderRadius(
                    editorState,
                    editor,
                    currentImageId,
                    ObjectType.ImageItem,
                    parseFloat(value)
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
                    currentImageId,
                    ObjectType.ImageItem,
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
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="image_x"
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
                    currentImageId,
                    ObjectType.ImageItem,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="image_y"
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
                    currentImageId,
                    ObjectType.ImageItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="image_z"
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
                    currentImageId,
                    ObjectType.ImageItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentImageId}
          objectType={ObjectType.ImageItem}
        />
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Repeat
          </summary>
          <div className="p-2 space-y-1">
            <RepeatProperties
              editorRef={editorRef}
              editorStateRef={editorStateRef}
              currentSequenceId={currentSequenceId}
              currentObjectId={currentImageId}
              objectType={ObjectType.ImageItem}
            />
          </div>
        </details>
      </div>
    </>
  )
}

export const VideoProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentVideoId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentVideoId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultWidth, setDefaultWidth] = useState(0)
  const [defaultHeight, setDefaultHeight] = useState(0)
  const [defaultBorderRadius, setDefaultBorderRadius] = useState(0)
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
    let currentObject = currentSequence?.activeVideoItems.find((p) => p.id === currentVideoId)

    let width = currentObject?.dimensions[0]
    let height = currentObject?.dimensions[1]
    let borderRadius = currentObject?.borderRadius
    let posX = currentObject?.position.x
    let posY = currentObject?.position.y
    let posZ = currentObject?.position.z ?? 0

    if (width) {
      setDefaultWidth(width)
    }
    if (height) {
      setDefaultHeight(height)
    }
    if (typeof borderRadius !== 'undefined' && borderRadius !== null) {
      setDefaultBorderRadius(borderRadius)
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
  }, [currentVideoId])

  if (!defaultsSet) {
    return <></>
  }

  let aside_width = 260.0
  let quarters = aside_width / 4.0 + 5.0 * 4.0
  let thirds = aside_width / 3.0 + 5.0 * 3.0
  let halfs = aside_width / 2.0 + 5.0 * 2.0

  return (
    <>
      <div>
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            // disabled={loading}
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update Video</h5>
        </div>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Size & Border
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="video_width"
                label="Width"
                placeholder="Width"
                initialValue={defaultWidth.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateWidth(
                    editorState,
                    editor,
                    currentVideoId,
                    ObjectType.VideoItem,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="video_height"
                label="Height"
                placeholder="height"
                initialValue={defaultHeight.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateHeight(
                    editorState,
                    editor,
                    currentVideoId,
                    ObjectType.VideoItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="video_border_radius"
                label="Border Radius"
                placeholder="Border Radius"
                initialValue={defaultBorderRadius.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  updateBorderRadius(
                    editorState,
                    editor,
                    currentVideoId,
                    ObjectType.VideoItem,
                    parseFloat(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="video_x"
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
                    currentVideoId,
                    ObjectType.VideoItem,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="video_y"
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
                    currentVideoId,
                    ObjectType.VideoItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="video_z"
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
                    currentVideoId,
                    ObjectType.VideoItem,
                    parseInt(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentVideoId}
          objectType={ObjectType.VideoItem}
        />
      </div>
    </>
  )
}

export const Cube3DProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentCubeId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentCubeId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultWidth, setDefaultWidth] = useState(0)
  const [defaultHeight, setDefaultHeight] = useState(0)
  const [defaultDepth, setDefaultDepth] = useState(0)
  const [positionX, setPositionX] = useState(0)
  const [positionY, setPositionY] = useState(0)
  const [positionZ, setPositionZ] = useState(0)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [rotationZ, setRotationZ] = useState(0)
  const [defaultFill, setDefaultFill] = useState<BackgroundFill | null>(null)

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let currentSequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)
    let currentObject = currentSequence?.activeCubes3D?.find((c) => c.id === currentCubeId)

    console.info('currentCubeId', currentObject, currentSequence)

    if (currentObject) {
      setDefaultWidth(currentObject.dimensions[0])
      setDefaultHeight(currentObject.dimensions[1])
      setDefaultDepth(currentObject.dimensions[2])
      setPositionX(currentObject.position.x)
      setPositionY(currentObject.position.y)
      setPositionZ(currentObject.position.z ?? 0)
      setRotationX(currentObject.rotation[0])
      setRotationY(currentObject.rotation[1])
      setRotationZ(currentObject.rotation[2])
      setDefaultFill(currentObject.backgroundFill)
      console.info('alert ', currentObject)
    }

    setDefaultsSet(true)
  }, [currentCubeId])

  if (!defaultsSet) {
    return <></>
  }

  return (
    <>
      <div>
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update 3D Cube</h5>
        </div>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="cube_x"
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
                    currentCubeId,
                    ObjectType.Cube3D,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="cube_y"
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
                    currentCubeId,
                    ObjectType.Cube3D,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="cube_z"
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
                    currentCubeId,
                    ObjectType.Cube3D,
                    parseInt(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Size
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="cube_width"
                label="Width"
                placeholder="Width"
                initialValue={defaultWidth.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateCube3DWidth(editorState, editor, currentCubeId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="cube_height"
                label="Height"
                placeholder="Height"
                initialValue={defaultHeight.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateCube3DHeight(editorState, editor, currentCubeId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="cube_depth"
                label="Depth"
                placeholder="Depth"
                initialValue={defaultDepth.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateCube3DDepth(editorState, editor, currentCubeId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Rotation
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2 mt-2">
              <DebouncedInput
                id="cube_rotation_x"
                label="Rotation X"
                placeholder="Rotation X"
                initialValue={rotationX.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateCube3DRotationX(editorState, editor, currentCubeId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="cube_rotation_y"
                label="Rotation Y"
                placeholder="Rotation Y"
                initialValue={rotationY.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateCube3DRotationY(editorState, editor, currentCubeId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="cube_rotation_z"
                label="Rotation Z"
                placeholder="Rotation Z"
                initialValue={rotationZ.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateCube3DRotationZ(editorState, editor, currentCubeId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentCubeId}
          objectType={ObjectType.Cube3D}
        />
      </div>
    </>
  )
}

export const Sphere3DProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentSphereId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentSphereId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultRadius, setDefaultRadius] = useState(0)
  const [positionX, setPositionX] = useState(0)
  const [positionY, setPositionY] = useState(0)
  const [positionZ, setPositionZ] = useState(0)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [rotationZ, setRotationZ] = useState(0)
  const [defaultFill, setDefaultFill] = useState<BackgroundFill | null>(null)

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let currentSequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)
    let currentObject = currentSequence?.activeSpheres3D?.find((s) => s.id === currentSphereId)

    if (currentObject) {
      setDefaultRadius(currentObject.radius)
      setPositionX(currentObject.position.x)
      setPositionY(currentObject.position.y)
      setPositionZ(currentObject.position.z ?? 0)
      setRotationX(currentObject.rotation[0])
      setRotationY(currentObject.rotation[1])
      setRotationZ(currentObject.rotation[2])
      setDefaultFill(currentObject.backgroundFill)
    }

    setDefaultsSet(true)
  }, [currentSphereId])

  if (!defaultsSet) {
    return <></>
  }

  return (
    <>
      <div>
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update 3D Sphere</h5>
        </div>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="sphere_x"
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
                    currentSphereId,
                    ObjectType.Sphere3D,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="sphere_y"
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
                    currentSphereId,
                    ObjectType.Sphere3D,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="sphere_z"
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
                    currentSphereId,
                    ObjectType.Sphere3D,
                    parseInt(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Size
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="sphere_radius"
                label="Radius"
                placeholder="Radius"
                initialValue={defaultRadius.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateSphere3DRadius(editorState, editor, currentSphereId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Rotation
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2 mt-2">
              <DebouncedInput
                id="sphere_rotation_x"
                label="Rotation X"
                placeholder="Rotation X"
                initialValue={rotationX.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateSphere3DRotationX(editorState, editor, currentSphereId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="sphere_rotation_y"
                label="Rotation Y"
                placeholder="Rotation Y"
                initialValue={rotationY.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateSphere3DRotationY(editorState, editor, currentSphereId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="sphere_rotation_z"
                label="Rotation Z"
                placeholder="Rotation Z"
                initialValue={rotationZ.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateSphere3DRotationZ(editorState, editor, currentSphereId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentSphereId}
          objectType={ObjectType.Sphere3D}
        />
      </div>
    </>
  )
}

export const Mockup3DProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentMockupId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentMockupId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [defaultWidth, setDefaultWidth] = useState(0)
  const [defaultHeight, setDefaultHeight] = useState(0)
  const [defaultDepth, setDefaultDepth] = useState(0)
  const [positionX, setPositionX] = useState(0)
  const [positionY, setPositionY] = useState(0)
  const [positionZ, setPositionZ] = useState(0)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [rotationZ, setRotationZ] = useState(0)
  const [defaultFill, setDefaultFill] = useState<BackgroundFill | null>(null)

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let currentSequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)
    let currentObject = currentSequence?.activeMockups3D?.find((m) => m.id === currentMockupId)

    console.info('currentMockupId', currentObject, currentSequence)

    if (currentObject) {
      setDefaultWidth(currentObject.dimensions[0])
      setDefaultHeight(currentObject.dimensions[1])
      setDefaultDepth(currentObject.dimensions[2])
      setPositionX(currentObject.position.x)
      setPositionY(currentObject.position.y)
      setPositionZ(currentObject.position.z ?? 0)
      setRotationX(currentObject.rotation[0])
      setRotationY(currentObject.rotation[1])
      setRotationZ(currentObject.rotation[2])
      setDefaultFill(currentObject.backgroundFill)
      console.info('mockup loaded', currentObject)
    }

    setDefaultsSet(true)
  }, [currentMockupId])

  if (!defaultsSet) {
    return <></>
  }

  return (
    <>
      <div>
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update Laptop Mockup</h5>
        </div>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="mockup_x"
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
                    currentMockupId,
                    ObjectType.Mockup3D,
                    parseInt(value)
                  )
                }}
              />
              <DebouncedInput
                id="mockup_y"
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
                    currentMockupId,
                    ObjectType.Mockup3D,
                    parseInt(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="mockup_z"
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
                    currentMockupId,
                    ObjectType.Mockup3D,
                    parseInt(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Size
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="mockup_width"
                label="Width"
                placeholder="Width"
                initialValue={defaultWidth.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateMockup3DWidth(editorState, editor, currentMockupId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="mockup_height"
                label="Height"
                placeholder="Height"
                initialValue={defaultHeight.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateMockup3DHeight(editorState, editor, currentMockupId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="mockup_depth"
                label="Depth"
                placeholder="Depth"
                initialValue={defaultDepth.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateMockup3DDepth(editorState, editor, currentMockupId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Rotation
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2 mt-2">
              <DebouncedInput
                id="mockup_rotation_x"
                label="Rotation X"
                placeholder="Rotation X"
                initialValue={rotationX.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateMockup3DRotationX(editorState, editor, currentMockupId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="mockup_rotation_y"
                label="Rotation Y"
                placeholder="Rotation Y"
                initialValue={rotationY.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateMockup3DRotationY(editorState, editor, currentMockupId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="mockup_rotation_z"
                label="Rotation Z"
                placeholder="Rotation Z"
                initialValue={rotationZ.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateMockup3DRotationZ(editorState, editor, currentMockupId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentMockupId}
          objectType={ObjectType.Mockup3D}
        />
      </div>
    </>
  )
}

export const Model3DProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentModelId,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentModelId: string
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [scaleZ, setScaleZ] = useState(1)
  const [positionX, setPositionX] = useState(0)
  const [positionY, setPositionY] = useState(0)
  const [positionZ, setPositionZ] = useState(0)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [rotationZ, setRotationZ] = useState(0)
  const [defaultFill, setDefaultFill] = useState<BackgroundFill | null>(null)
  const [modelName, setModelName] = useState('')

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let currentSequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)
    let currentObject = currentSequence?.activeModels3D?.find((m) => m.id === currentModelId)

    if (currentObject) {
      setScaleX(currentObject.scale[0])
      setScaleY(currentObject.scale[1])
      setScaleZ(currentObject.scale[2])
      setPositionX(currentObject.position.x)
      setPositionY(currentObject.position.y)
      setPositionZ(currentObject.position.z ?? 0)
      setRotationX(currentObject.rotation[0])
      setRotationY(currentObject.rotation[1])
      setRotationZ(currentObject.rotation[2])
      setDefaultFill(currentObject.backgroundFill)
      setModelName(currentObject.name || '')
    }

    setDefaultsSet(true)
  }, [currentModelId])

  if (!defaultsSet) {
    return <></>
  }

  return (
    <>
      <div>
        <div className="flex flex-row items-center">
          <button
            className="flex flex-col justify-center items-center text-xs w-[35px] h-[35px] text-center rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors mr-2"
            onClick={() => handleGoBack()}
          >
            <CreateIcon icon="arrow-left" size="24px" />
          </button>
          <h5>Update 3D Model{modelName ? `: ${modelName}` : ''}</h5>
        </div>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Position
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="model_x"
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
                    currentModelId,
                    ObjectType.Model3D,
                    parseFloat(value)
                  )
                }}
              />
              <DebouncedInput
                id="model_y"
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
                    currentModelId,
                    ObjectType.Model3D,
                    parseFloat(value)
                  )
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="model_z"
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
                    currentModelId,
                    ObjectType.Model3D,
                    parseFloat(value)
                  )
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Scale
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="model_scale_x"
                label="Scale X"
                placeholder="Scale X"
                initialValue={scaleX.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateModel3DScaleX(editorState, editor, currentModelId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="model_scale_y"
                label="Scale Y"
                placeholder="Scale Y"
                initialValue={scaleY.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateModel3DScaleY(editorState, editor, currentModelId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="model_scale_z"
                label="Scale Z"
                placeholder="Scale Z"
                initialValue={scaleZ.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateModel3DScaleZ(editorState, editor, currentModelId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <details open={false} className="border border-gray-300 rounded">
          <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
            Rotation
          </summary>
          <div className="p-2 space-y-1">
            <div className="flex flex-row gap-2 mt-2">
              <DebouncedInput
                id="model_rotation_x"
                label="Rotation X"
                placeholder="Rotation X"
                initialValue={rotationX.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateModel3DRotationX(editorState, editor, currentModelId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="model_rotation_y"
                label="Rotation Y"
                placeholder="Rotation Y"
                initialValue={rotationY.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateModel3DRotationY(editorState, editor, currentModelId, parseFloat(value))
                }}
              />
              <DebouncedInput
                id="model_rotation_z"
                label="Rotation Z"
                placeholder="Rotation Z"
                initialValue={rotationZ.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current
                  if (!editorState || !editor) {
                    return
                  }
                  updateModel3DRotationZ(editorState, editor, currentModelId, parseFloat(value))
                }}
              />
            </div>
          </div>
        </details>
        <AnimationOptions
          editorRef={editorRef}
          editorStateRef={editorStateRef}
          currentSequenceId={currentSequenceId}
          currentObjectId={currentModelId}
          objectType={ObjectType.Model3D}
        />
      </div>
    </>
  )
}

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

import { updateBackground } from '../../../engine/state/properties'
import { ColorService, useColor } from 'react-color-palette'
import { ColorPicker } from '../ColorPicker'

export const ColorProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  currentObjectId,
  objectType,
  defaultColor
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  currentObjectId: string
  objectType: ObjectType
  defaultColor: BackgroundFill
}) => {
  const [color, setColor] = useColor('rgba(255, 255, 255, 1)')
  const [colorSecondary, setColorSecondary] = useColor('rgba(255, 255, 255, 1)')
  const [is_white, set_is_white] = useState(false)
  const [is_transparent, set_is_transparent] = useState(false)
  const [is_gradient, set_is_gradient] = useState(false)

  useEffect(() => {
    if (!color) {
      return
    }

    if (is_gradient) {
    } else {
      if (color.rgb.a === 0.0) {
        set_is_transparent(true)
      }

      if (color.rgb.r === 255 && color.rgb.g === 255 && color.rgb.b === 255) {
        set_is_white(true)
      }
    }
  }, [currentObjectId, color])

  useEffect(() => {
    if (!defaultColor) {
      return
    }

    if (defaultColor.type === 'Color') {
      setColor(
        ColorService.convert('rgb', {
          r: wgpuToHuman(defaultColor.value[0]),
          g: wgpuToHuman(defaultColor.value[1]),
          b: wgpuToHuman(defaultColor.value[2]),
          a: wgpuToHuman(defaultColor.value[3])
        })
      )
    } else if (defaultColor.type === 'Gradient') {
      set_is_gradient(true)

      setColor(
        ColorService.convert('rgb', {
          r: wgpuToHuman(defaultColor.value.stops[0].color[0]),
          g: wgpuToHuman(defaultColor.value.stops[0].color[1]),
          b: wgpuToHuman(defaultColor.value.stops[0].color[2]),
          a: wgpuToHuman(defaultColor.value.stops[0].color[3])
        })
      )
      setColorSecondary(
        ColorService.convert('rgb', {
          r: wgpuToHuman(defaultColor.value.stops[1].color[0]),
          g: wgpuToHuman(defaultColor.value.stops[1].color[1]),
          b: wgpuToHuman(defaultColor.value.stops[1].color[2]),
          a: wgpuToHuman(defaultColor.value.stops[1].color[3])
        })
      )
    }
  }, [defaultColor])

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    if (defaultColor.type === 'Color') {
      // console.info("check ", wgpuToHuman(defaultColor.value[3]), color.rgb.a);
      if (
        wgpuToHuman(defaultColor.value[0]) !== color.rgb.r ||
        wgpuToHuman(defaultColor.value[1]) !== color.rgb.g ||
        wgpuToHuman(defaultColor.value[2]) !== color.rgb.b ||
        defaultColor.value[3] !== color.rgb.a
      ) {
        if (is_gradient) {
          let stops: GradientStop[] = [
            {
              offset: 0,
              // color: rgbToWgpu(
              //   color.rgb.r,
              //   color.rgb.g,
              //   color.rgb.b,
              //   color.rgb.a
              // ),
              color: [
                colorToWgpu(color.rgb.r),
                colorToWgpu(color.rgb.g),
                colorToWgpu(color.rgb.b),
                color.rgb.a
              ]
            },
            {
              offset: 1,
              // color: rgbToWgpu(
              //   colorSecondary.rgb.r,
              //   colorSecondary.rgb.g,
              //   colorSecondary.rgb.b,
              //   colorSecondary.rgb.a
              // ),
              color: [
                colorToWgpu(colorSecondary.rgb.r),
                colorToWgpu(colorSecondary.rgb.g),
                colorToWgpu(colorSecondary.rgb.b),
                colorSecondary.rgb.a
              ]
            }
          ]

          let value: BackgroundFill = {
            type: 'Gradient',
            value: {
              stops: stops,
              numStops: stops.length, // numStops
              type: 'linear', // gradientType (0 is linear, 1 is radial)
              startPoint: [0, 0], // startPoint
              endPoint: [1, 0], // endPoint
              center: [0.5, 0.5], // center
              radius: 1.0, // radius
              timeOffset: 0, // timeOffset
              animationSpeed: 1, // animationSpeed
              enabled: 1 // enabled
            }
          }

          if (objectType === ObjectType.Polygon) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.Polygon, value)
          } else if (objectType === ObjectType.TextItem) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.TextItem, value)
          }
        } else {
          let value: BackgroundFill = {
            type: 'Color',
            // value: rgbToWgpu(color.rgb.r, color.rgb.g, color.rgb.b, color.rgb.a),
            value: [
              colorToWgpu(color.rgb.r),
              colorToWgpu(color.rgb.g),
              colorToWgpu(color.rgb.b),
              color.rgb.a
            ]
          }

          if (objectType === ObjectType.Polygon) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.Polygon, value)
          } else if (objectType === ObjectType.TextItem) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.Polygon, value)
          }
        }
      }
    } else if (defaultColor.type === 'Gradient') {
      // console.info(
      //   "check also ",
      //   wgpuToHuman(defaultColor.value.stops[0].color[3]),
      //   color.rgb.a,
      //   wgpuToHuman(defaultColor.value.stops[1].color[3]),
      //   colorSecondary.rgb.a
      // );
      if (
        wgpuToHuman(defaultColor.value.stops[0].color[0]) !== color.rgb.r ||
        wgpuToHuman(defaultColor.value.stops[0].color[1]) !== color.rgb.g ||
        wgpuToHuman(defaultColor.value.stops[0].color[2]) !== color.rgb.b ||
        defaultColor.value.stops[0].color[3] !== color.rgb.a ||
        wgpuToHuman(defaultColor.value.stops[1].color[0]) !== colorSecondary.rgb.r ||
        wgpuToHuman(defaultColor.value.stops[1].color[1]) !== colorSecondary.rgb.g ||
        wgpuToHuman(defaultColor.value.stops[1].color[2]) !== colorSecondary.rgb.b ||
        defaultColor.value.stops[1].color[3] !== colorSecondary.rgb.a
      ) {
        if (is_gradient) {
          let stops: GradientStop[] = [
            {
              offset: 0,
              // color: rgbToWgpu(
              //   color.rgb.r,
              //   color.rgb.g,
              //   color.rgb.b,
              //   color.rgb.a
              // ),
              color: [
                colorToWgpu(color.rgb.r),
                colorToWgpu(color.rgb.g),
                colorToWgpu(color.rgb.b),
                color.rgb.a
              ]
            },
            {
              offset: 1,
              // color: rgbToWgpu(
              //   colorSecondary.rgb.r,
              //   colorSecondary.rgb.g,
              //   colorSecondary.rgb.b,
              //   colorSecondary.rgb.a
              // ),
              color: [
                colorToWgpu(colorSecondary.rgb.r),
                colorToWgpu(colorSecondary.rgb.g),
                colorToWgpu(colorSecondary.rgb.b),
                colorSecondary.rgb.a
              ]
            }
          ]

          let value: BackgroundFill = {
            type: 'Gradient',
            value: {
              stops: stops,
              numStops: stops.length, // numStops
              type: 'linear', // gradientType (0 is linear, 1 is radial)
              startPoint: [0, 0], // startPoint
              endPoint: [1, 0], // endPoint
              center: [0.5, 0.5], // center
              radius: 1.0, // radius
              timeOffset: 0, // timeOffset
              animationSpeed: 1, // animationSpeed
              enabled: 1 // enabled
            }
          }

          if (objectType === ObjectType.Polygon) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.Polygon, value)
          } else if (objectType === ObjectType.TextItem) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.TextItem, value)
          }
        } else {
          let value: BackgroundFill = {
            type: 'Color',
            // value: rgbToWgpu(color.rgb.r, color.rgb.g, color.rgb.b, color.rgb.a),
            value: [
              colorToWgpu(color.rgb.r),
              colorToWgpu(color.rgb.g),
              colorToWgpu(color.rgb.b),
              color.rgb.a
            ]
          }

          if (objectType === ObjectType.Polygon) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.Polygon, value)
          } else if (objectType === ObjectType.TextItem) {
            updateBackground(editorState, editor, currentObjectId, ObjectType.Polygon, value)
          }
        }
      }
    }
  }, [color, colorSecondary])

  let aside_width = 260.0
  let quarters = aside_width / 4.0 + 5.0 * 4.0
  let thirds = aside_width / 3.0 + 5.0 * 3.0
  let halfs = aside_width / 2.0 + 5.0 * 2.0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <input
          type="checkbox"
          id="is_gradient"
          name="is_gradient"
          checked={is_gradient}
          onChange={(ev) => {
            set_is_gradient(true)
          }}
        />
        <label htmlFor="is_gradient" className="text-xs">
          Is Gradient
        </label>
      </div>

      <ColorPicker label="Select Color" color={color} setColor={setColor} />

      {is_gradient && (
        <ColorPicker
          label="Select Secondary Color"
          color={colorSecondary}
          setColor={setColorSecondary}
        />
      )}

      <div className="flex flex-row gap-2">
        <input
          type="checkbox"
          id="is_white"
          name="is_white"
          checked={is_white}
          onChange={(ev) => {
            let editor = editorRef.current
            let editorState = editorStateRef.current
            if (!editorState || !editor) {
              return
            }

            if (ev.target.checked) {
              let value: BackgroundFill = {
                type: 'Color',
                value: rgbToWgpu(255, 255, 255, 255)
              }

              updateBackground(editorState, editor, currentObjectId, objectType, value)
            } else {
              let value: BackgroundFill = {
                type: 'Color',
                value: rgbToWgpu(200, 200, 200, 255)
              }

              updateBackground(editorState, editor, currentObjectId, objectType, value)
            }

            set_is_white(ev.target.checked)
          }}
        />
        <label htmlFor="is_white" className="text-xs">
          Is White
        </label>
        <input
          type="checkbox"
          id="is_transparent"
          name="is_transparent"
          checked={is_transparent}
          onChange={(ev) => {
            let editor = editorRef.current
            let editorState = editorStateRef.current
            if (!editorState || !editor) {
              return
            }

            if (ev.target.checked) {
              let value: BackgroundFill = {
                type: 'Color',
                value: rgbToWgpu(255, 255, 255, 0)
              }

              updateBackground(editorState, editor, currentObjectId, objectType, value)
            } else {
              let value: BackgroundFill = {
                type: 'Color',
                value: rgbToWgpu(200, 200, 200, 255)
              }

              updateBackground(editorState, editor, currentObjectId, objectType, value)
            }

            set_is_white(ev.target.checked)
          }}
        />
        <label htmlFor="is_transparent" className="text-xs">
          Is Transparent
        </label>
      </div>
    </div>
  )
}

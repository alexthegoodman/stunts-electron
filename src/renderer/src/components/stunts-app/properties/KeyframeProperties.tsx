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
  remove_position_keyframes,
  save_bouncing_ball_keyframes,
  save_circular_motion_keyframes,
  save_configurable_perspective_keyframes,
  save_figure_eight_keyframes,
  save_floating_bubbles_keyframes,
  save_pendulum_swing_keyframes,
  save_ripple_effect_keyframes,
  save_scale_fade_pulse_keyframes,
  save_spin_keyframes,
  save_spiral_motion_keyframes,
  ScaleFadePulseConfig
} from '@renderer/engine/state/keyframes'
import { saveSequencesData } from '@renderer/fetchers/projects'
import { update_keyframe } from '../VideoEditor'

export const AnimationOptions = ({
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
  const [circularRadius, setCircularRadius] = useState<number>(100)
  const [circularRotation, setCircularRotation] = useState<number>(0)

  // Scale Fade Pulse animation state
  const [pulseStartScale, setPulseStartScale] = useState<number>(150)
  const [pulseTargetScale, setPulseTargetScale] = useState<number>(100)
  const [pulseRippleCount, setPulseRippleCount] = useState<number>(0)
  const [pulseRippleIntensity, setPulseRippleIntensity] = useState<number>(10)
  const [pulseDuration, setPulseDuration] = useState<number>(5000)
  const [pulseFadeIn, setPulseFadeIn] = useState<boolean>(true)
  const [pulseFadeOut, setPulseFadeOut] = useState<boolean>(false)

  // Pendulum swing animation state
  const [pendulumWidth, setPendulumWidth] = useState<number>(200)
  const [pendulumPeriods, setPendulumPeriods] = useState<number>(2)

  // Figure-8 infinity animation state
  const [figureEightWidth, setFigureEightWidth] = useState<number>(200)
  const [figureEightHeight, setFigureEightHeight] = useState<number>(100)
  const [figureEightLoops, setFigureEightLoops] = useState<number>(1)

  // Ripple effect animation state
  const [rippleMaxScale, setRippleMaxScale] = useState<number>(3)
  const [rippleCount, setRippleCount] = useState<number>(2)

  // Spiral motion animation state
  const [spiralMaxRadius, setSpiralMaxRadius] = useState<number>(150)
  const [spiralTurns, setSpiralTurns] = useState<number>(3)
  const [spiralExpanding, setSpiralExpanding] = useState<boolean>(true)

  // Bouncing ball animation state
  const [bounceHeight, setBounceHeight] = useState<number>(200)
  const [bounceCount, setBounceCount] = useState<number>(3)
  const [bounceDamping, setBounceDamping] = useState<number>(0.8)

  // Floating bubbles animation state
  const [bubbleRiseHeight, setBubbleRiseHeight] = useState<number>(300)
  const [bubbleDriftWidth, setBubbleDriftWidth] = useState<number>(50)
  const [bubbleFloatiness, setBubbleFloatiness] = useState<number>(2)

  // Perspective animation state
  const [perspectiveX, setPerspectiveX] = useState<boolean>(true)
  const [perspectiveY, setPerspectiveY] = useState<boolean>(false)
  const [perspectiveDegrees, setPerspectiveDegrees] = useState<number>(20)
  const [perspectiveFadeIn, setPerspectiveFadeIn] = useState<boolean>(true)
  const [perspectiveFadeOut, setPerspectiveFadeOut] = useState<boolean>(true)
  const [perspectiveAnimateTo, setPerspectiveAnimateTo] = useState<boolean>(false)

  // Spin animation state
  const [spinAxisX, setSpinAxisX] = useState<boolean>(false)
  const [spinAxisY, setSpinAxisY] = useState<boolean>(false)
  const [spinAxisZ, setSpinAxisZ] = useState<boolean>(true)
  const [spinRotations, setSpinRotations] = useState<number>(1)
  const [spinDuration, setSpinDuration] = useState<number>(5000)

  const [showProceduralAnimations, setShowProceduralAnimations] = useState<boolean>(false)

  return (
    <div className="flex flex-col gap-2">
      <p>Apply Animations</p>

      <button
        className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
        onClick={() => setShowProceduralAnimations(!showProceduralAnimations)}
      >
        View Procedural Animations
      </button>
      {showProceduralAnimations ? (
        <section className="flex flex-col gap-2 p-2 border rounded">
          <button
            className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
            onClick={async () => {
              let editor = editorRef.current
              let editorState = editorStateRef.current

              if (!editorState || !editor) {
                return
              }

              let currentSequence = editorState.savedState.sequences.find(
                (s) => s.id === currentSequenceId
              )

              if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                return
              }

              let current_animation_data = currentSequence?.polygonMotionPaths.find(
                (p) => p.polygonId === currentObjectId
              )

              if (!current_animation_data) {
                return
              }

              let newAnimationData = remove_position_keyframes(
                editorState,
                currentObjectId,
                objectType,
                current_animation_data
              )

              let sequence_cloned: any = null

              editorState.savedState.sequences.forEach((s) => {
                if (s.id == currentSequenceId) {
                  sequence_cloned = s

                  if (s.polygonMotionPaths) {
                    let currentIndex = s.polygonMotionPaths.findIndex(
                      (p) => p.id === current_animation_data.id
                    )
                    s.polygonMotionPaths[currentIndex] = newAnimationData
                  }
                }
              })

              if (!sequence_cloned) {
                return
              }

              let sequences = editorState.savedState.sequences

              await saveSequencesData(sequences, editorState.saveTarget)

              // update motion path preview
              editor.updateMotionPaths(sequence_cloned)
            }}
          >
            Remove Position Keyframes
          </button>

          {/** Perspective Animation Panel */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Perspective
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={perspectiveX}
                    onChange={(e) => setPerspectiveX(e.target.checked)}
                  />
                  X Axis (top/bottom)
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={perspectiveY}
                    onChange={(e) => setPerspectiveY(e.target.checked)}
                  />
                  Y Axis (left/right)
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Degrees:</label>
                <input
                  type="number"
                  value={perspectiveDegrees}
                  onChange={(e) => setPerspectiveDegrees(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1"
                  min="0"
                  max="90"
                />
              </div>

              <div className="flex flex-row gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={perspectiveFadeIn}
                    onChange={(e) => setPerspectiveFadeIn(e.target.checked)}
                  />
                  Fade In
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={perspectiveFadeOut}
                    onChange={(e) => setPerspectiveFadeOut(e.target.checked)}
                  />
                  Fade Out
                </label>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-xs text-gray-600">Animation Direction:</p>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="perspectiveDirection"
                    checked={!perspectiveAnimateTo}
                    onChange={() => setPerspectiveAnimateTo(false)}
                  />
                  Animate FROM perspective
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="perspectiveDirection"
                    checked={perspectiveAnimateTo}
                    onChange={() => setPerspectiveAnimateTo(true)}
                  />
                  Animate TO perspective
                </label>
              </div>

              <div className="flex flex-row gap-2">
                <button
                  className="text-xs rounded-md text-white stunts-gradient px-2 py-1 flex-1"
                  onClick={async () => {
                    let editor = editorRef.current
                    let editorState = editorStateRef.current

                    if (!editorState || !editor) {
                      return
                    }

                    let currentSequence = editorState.savedState.sequences.find(
                      (s) => s.id === currentSequenceId
                    )

                    if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                      return
                    }

                    let current_animation_data = currentSequence?.polygonMotionPaths.find(
                      (p) => p.polygonId === currentObjectId
                    )

                    if (!current_animation_data) {
                      return
                    }

                    let newAnimationData = save_configurable_perspective_keyframes(
                      editorState,
                      currentObjectId,
                      objectType,
                      current_animation_data,
                      {
                        applyX: perspectiveX,
                        applyY: perspectiveY,
                        degrees: perspectiveDegrees,
                        fadeIn: perspectiveFadeIn,
                        fadeOut: perspectiveFadeOut,
                        animateTo: perspectiveAnimateTo
                      }
                    )

                    editorState.savedState.sequences.forEach((s) => {
                      if (s.id == currentSequenceId) {
                        if (s.polygonMotionPaths) {
                          let currentIndex = s.polygonMotionPaths.findIndex(
                            (p) => p.id === current_animation_data.id
                          )
                          s.polygonMotionPaths[currentIndex] = newAnimationData
                        }
                      }
                    })

                    let sequences = editorState.savedState.sequences

                    await saveSequencesData(sequences, editorState.saveTarget)
                  }}
                >
                  Apply Perspective Animation
                </button>
                <button
                  className="text-xs rounded-md bg-gray-500 hover:bg-gray-600 text-white px-2 py-1"
                  onClick={async () => {
                    let editor = editorRef.current
                    let editorState = editorStateRef.current

                    if (!editorState || !editor) {
                      return
                    }

                    let currentSequence = editorState.savedState.sequences.find(
                      (s) => s.id === currentSequenceId
                    )

                    if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                      return
                    }

                    let current_animation_data = currentSequence?.polygonMotionPaths.find(
                      (p) => p.polygonId === currentObjectId
                    )

                    if (!current_animation_data) {
                      return
                    }

                    // Remove perspectiveX and perspectiveY properties
                    let properties = current_animation_data.properties.filter(
                      (p) => p.propertyPath !== 'perspectiveX' && p.propertyPath !== 'perspectiveY'
                    )

                    let newAnimationData = {
                      ...current_animation_data,
                      properties: properties
                    }

                    editorState.savedState.sequences.forEach((s) => {
                      if (s.id == currentSequenceId) {
                        if (s.polygonMotionPaths) {
                          let currentIndex = s.polygonMotionPaths.findIndex(
                            (p) => p.id === current_animation_data.id
                          )
                          s.polygonMotionPaths[currentIndex] = newAnimationData
                        }
                      }
                    })

                    let sequences = editorState.savedState.sequences

                    await saveSequencesData(sequences, editorState.saveTarget)
                  }}
                >
                  Clear Perspective
                </button>
              </div>
            </div>
          </details>

          {/** Spin Animation Panel */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Spin
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-600">Spin Axes:</p>
                <div className="flex flex-row gap-3">
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={spinAxisX}
                      onChange={(e) => setSpinAxisX(e.target.checked)}
                    />
                    X Axis (vertical)
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={spinAxisY}
                      onChange={(e) => setSpinAxisY(e.target.checked)}
                    />
                    Y Axis (horizontal)
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={spinAxisZ}
                      onChange={(e) => setSpinAxisZ(e.target.checked)}
                    />
                    Z Axis (roll)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Rotations:</label>
              <input
                type="number"
                value={spinRotations}
                onChange={(e) => setSpinRotations(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1"
                min="0.25"
                max="10"
                step="0.25"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-600">Duration (ms):</label>
              <input
                type="number"
                value={spinDuration}
                onChange={(e) => setSpinDuration(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1"
                min="500"
                max="20000"
                step="100"
              />
            </div>

            <div className="flex flex-row gap-2">
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1 flex-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_spin_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    {
                      spinX: spinAxisX,
                      spinY: spinAxisY,
                      spinZ: spinAxisZ,
                      rotations: spinRotations,
                      duration: spinDuration
                    }
                  )

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)
                }}
              >
                Create Spin
              </button>
              <button
                className="text-xs rounded-md bg-gray-500 hover:bg-gray-600 text-white px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  // Remove spin-related properties
                  let properties = current_animation_data.properties.filter(
                    (p) =>
                      p.propertyPath !== 'perspectiveX' &&
                      p.propertyPath !== 'perspectiveY' &&
                      p.propertyPath !== 'rotation'
                  )

                  let newAnimationData = {
                    ...current_animation_data,
                    properties: properties
                  }

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)
                }}
              >
                Clear Spin
              </button>
            </div>
          </details>

          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Scale & Fade Pulse
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600 w-24">Start Scale:</label>
                <input
                  type="number"
                  value={pulseStartScale}
                  onChange={(e) => setPulseStartScale(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="10"
                  max="500"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600 w-24">Target Scale:</label>
                <input
                  type="number"
                  value={pulseTargetScale}
                  onChange={(e) => setPulseTargetScale(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="10"
                  max="500"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600 w-24">Ripples:</label>
                <input
                  type="number"
                  value={pulseRippleCount}
                  onChange={(e) => setPulseRippleCount(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="0"
                  max="5"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600 w-24">Ripple Intensity:</label>
                <input
                  type="number"
                  value={pulseRippleIntensity}
                  onChange={(e) => setPulseRippleIntensity(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="0"
                  max="50"
                />
                <span className="text-xs text-gray-500">%</span>
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600 w-24">Duration:</label>
                <input
                  type="number"
                  value={pulseDuration}
                  onChange={(e) => setPulseDuration(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-20"
                  min="500"
                  max="20000"
                  step="500"
                />
                <span className="text-xs text-gray-500">ms</span>
              </div>
              <div className="flex flex-row items-center gap-4">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={pulseFadeIn}
                    onChange={(e) => setPulseFadeIn(e.target.checked)}
                    className="rounded"
                  />
                  Fade In
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={pulseFadeOut}
                    onChange={(e) => setPulseFadeOut(e.target.checked)}
                    className="rounded"
                  />
                  Fade Out
                </label>
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  const config: ScaleFadePulseConfig = {
                    startScale: pulseStartScale,
                    targetScale: pulseTargetScale,
                    rippleCount: pulseRippleCount,
                    rippleIntensity: pulseRippleIntensity,
                    durationMs: pulseDuration,
                    fadeIn: pulseFadeIn,
                    fadeOut: pulseFadeOut
                  }

                  let newAnimationData = save_scale_fade_pulse_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    config
                  )

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)
                }}
              >
                Apply Scale & Fade Pulse
              </button>
            </div>
          </details>

          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Circular Motion
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Radius:</label>
                <input
                  type="number"
                  value={circularRadius}
                  onChange={(e) => setCircularRadius(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1"
                  max="1000"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Rotation:</label>
                <input
                  type="number"
                  value={circularRotation}
                  onChange={(e) => setCircularRotation(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="0"
                  max="360"
                />
                <span className="text-xs text-gray-500">°</span>
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let currentObject: any = null
                  switch (objectType) {
                    case ObjectType.Polygon:
                      currentObject = currentSequence.activePolygons.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.TextItem:
                      currentObject = currentSequence.activeTextItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.ImageItem:
                      currentObject = currentSequence.activeImageItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.VideoItem:
                      currentObject = currentSequence.activeVideoItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_circular_motion_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    [currentObject?.position.x || 0, currentObject?.position.y || 0],
                    circularRadius,
                    circularRotation
                  )

                  let sequence_cloned: any = null

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      sequence_cloned = s

                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  if (!sequence_cloned) {
                    return
                  }

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)

                  // update motion path preview
                  editor.updateMotionPaths(sequence_cloned)
                }}
              >
                Transform Motion Path to Circle
              </button>
            </div>
          </details>

          {/* Pendulum Swing Animation */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Pendulum Swing
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Swing Width:</label>
                <input
                  type="number"
                  value={pendulumWidth}
                  onChange={(e) => setPendulumWidth(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="10"
                  max="500"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Periods:</label>
                <input
                  type="number"
                  value={pendulumPeriods}
                  onChange={(e) => setPendulumPeriods(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1"
                  max="10"
                  step="0.5"
                />
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let currentObject: any = null
                  switch (objectType) {
                    case ObjectType.Polygon:
                      currentObject = currentSequence.activePolygons.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.TextItem:
                      currentObject = currentSequence.activeTextItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.ImageItem:
                      currentObject = currentSequence.activeImageItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.VideoItem:
                      currentObject = currentSequence.activeVideoItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_pendulum_swing_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    [currentObject?.position.x || 0, currentObject?.position.y || 0],
                    pendulumWidth,
                    pendulumPeriods
                  )

                  let sequence_cloned: any = null

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      sequence_cloned = s

                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  if (!sequence_cloned) {
                    return
                  }

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)

                  // update motion path preview
                  editor.updateMotionPaths(sequence_cloned)
                }}
              >
                Transform Motion Path to Pendulum Swing
              </button>
            </div>
          </details>

          {/* Figure-8 Infinity Animation */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Figure-8 Infinity
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Width:</label>
                <input
                  type="number"
                  value={figureEightWidth}
                  onChange={(e) => setFigureEightWidth(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="50"
                  max="500"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Height:</label>
                <input
                  type="number"
                  value={figureEightHeight}
                  onChange={(e) => setFigureEightHeight(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="25"
                  max="300"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Loops:</label>
                <input
                  type="number"
                  value={figureEightLoops}
                  onChange={(e) => setFigureEightLoops(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1"
                  max="5"
                />
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let currentObject: any = null
                  switch (objectType) {
                    case ObjectType.Polygon:
                      currentObject = currentSequence.activePolygons.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.TextItem:
                      currentObject = currentSequence.activeTextItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.ImageItem:
                      currentObject = currentSequence.activeImageItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.VideoItem:
                      currentObject = currentSequence.activeVideoItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_figure_eight_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    [currentObject?.position.x || 0, currentObject?.position.y || 0],
                    figureEightWidth,
                    figureEightHeight,
                    figureEightLoops
                  )

                  let sequence_cloned: any = null

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      sequence_cloned = s

                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  if (!sequence_cloned) {
                    return
                  }

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)

                  // update motion path preview
                  editor.updateMotionPaths(sequence_cloned)
                }}
              >
                Transform Motion Path to Figure-8 Infinity
              </button>
            </div>
          </details>

          {/* Ripple Effect Animation */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Ripple Effect
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Max Scale:</label>
                <input
                  type="number"
                  value={rippleMaxScale}
                  onChange={(e) => setRippleMaxScale(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1.5"
                  max="10"
                  step="0.5"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Ripples:</label>
                <input
                  type="number"
                  value={rippleCount}
                  onChange={(e) => setRippleCount(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1"
                  max="5"
                />
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let currentObject: any = null
                  switch (objectType) {
                    case ObjectType.Polygon:
                      currentObject = currentSequence.activePolygons.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.TextItem:
                      currentObject = currentSequence.activeTextItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.ImageItem:
                      currentObject = currentSequence.activeImageItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.VideoItem:
                      currentObject = currentSequence.activeVideoItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_ripple_effect_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    [currentObject?.position.x || 0, currentObject?.position.y || 0],
                    rippleMaxScale,
                    rippleCount
                  )

                  let sequence_cloned: any = null

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      sequence_cloned = s

                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  if (!sequence_cloned) {
                    return
                  }

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)

                  // update motion path preview
                  editor.updateMotionPaths(sequence_cloned)
                }}
              >
                Transform Motion Path to Ripple Effect
              </button>
            </div>
          </details>

          {/* Spiral Motion Animation */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Spiral Motion
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Max Radius:</label>
                <input
                  type="number"
                  value={spiralMaxRadius}
                  onChange={(e) => setSpiralMaxRadius(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="50"
                  max="400"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Turns:</label>
                <input
                  type="number"
                  value={spiralTurns}
                  onChange={(e) => setSpiralTurns(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1"
                  max="10"
                  step="0.5"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Type:</label>
                <select
                  value={spiralExpanding ? 'expanding' : 'contracting'}
                  onChange={(e) => setSpiralExpanding(e.target.value === 'expanding')}
                  className="text-xs border rounded px-2 py-1 w-24"
                >
                  <option value="expanding">Expanding</option>
                  <option value="contracting">Contracting</option>
                </select>
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let currentObject: any = null
                  switch (objectType) {
                    case ObjectType.Polygon:
                      currentObject = currentSequence.activePolygons.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.TextItem:
                      currentObject = currentSequence.activeTextItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.ImageItem:
                      currentObject = currentSequence.activeImageItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.VideoItem:
                      currentObject = currentSequence.activeVideoItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_spiral_motion_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    [currentObject?.position.x || 0, currentObject?.position.y || 0],
                    spiralMaxRadius,
                    spiralTurns,
                    spiralExpanding ? 'outward' : 'inward'
                  )

                  let sequence_cloned: any = null

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      sequence_cloned = s

                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  if (!sequence_cloned) {
                    return
                  }

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)

                  // update motion path preview
                  editor.updateMotionPaths(sequence_cloned)
                }}
              >
                Transform Motion Path to Spiral Motion
              </button>
            </div>
          </details>

          {/* Bouncing Ball Animation */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Bouncing Ball
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Bounce Height:</label>
                <input
                  type="number"
                  value={bounceHeight}
                  onChange={(e) => setBounceHeight(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="50"
                  max="500"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Bounces:</label>
                <input
                  type="number"
                  value={bounceCount}
                  onChange={(e) => setBounceCount(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1"
                  max="10"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Damping:</label>
                <input
                  type="number"
                  value={bounceDamping}
                  onChange={(e) => setBounceDamping(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                />
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let currentObject: any = null
                  switch (objectType) {
                    case ObjectType.Polygon:
                      currentObject = currentSequence.activePolygons.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.TextItem:
                      currentObject = currentSequence.activeTextItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.ImageItem:
                      currentObject = currentSequence.activeImageItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.VideoItem:
                      currentObject = currentSequence.activeVideoItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_bouncing_ball_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    [currentObject?.position.x || 0, currentObject?.position.y || 0],
                    bounceHeight,
                    bounceCount,
                    bounceDamping
                  )

                  let sequence_cloned: any = null

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      sequence_cloned = s

                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  if (!sequence_cloned) {
                    return
                  }

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)

                  // update motion path preview
                  editor.updateMotionPaths(sequence_cloned)
                }}
              >
                Transform Motion Path to Bouncing Ball
              </button>
            </div>
          </details>

          {/* Floating Bubbles Animation */}
          <details open={false} className="border border-gray-300 rounded">
            <summary className="cursor-pointer px-2 py-1 text-xs font-medium bg-gray-600 hover:bg-gray-200">
              Floating Bubbles
            </summary>
            <div className="p-2 space-y-1">
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Rise Height:</label>
                <input
                  type="number"
                  value={bubbleRiseHeight}
                  onChange={(e) => setBubbleRiseHeight(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="100"
                  max="600"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Drift Width:</label>
                <input
                  type="number"
                  value={bubbleDriftWidth}
                  onChange={(e) => setBubbleDriftWidth(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="10"
                  max="200"
                />
              </div>
              <div className="flex flex-row items-center gap-2">
                <label className="text-xs text-gray-600">Floatiness:</label>
                <input
                  type="number"
                  value={bubbleFloatiness}
                  onChange={(e) => setBubbleFloatiness(Number(e.target.value))}
                  className="text-xs border rounded px-2 py-1 w-16"
                  min="1"
                  max="5"
                  step="0.5"
                />
              </div>
              <button
                className="text-xs rounded-md text-white stunts-gradient px-2 py-1"
                onClick={async () => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let currentSequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!currentSequence || !currentSequence?.polygonMotionPaths) {
                    return
                  }

                  let currentObject: any = null
                  switch (objectType) {
                    case ObjectType.Polygon:
                      currentObject = currentSequence.activePolygons.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.TextItem:
                      currentObject = currentSequence.activeTextItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.ImageItem:
                      currentObject = currentSequence.activeImageItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                    case ObjectType.VideoItem:
                      currentObject = currentSequence.activeVideoItems.find(
                        (p) => p.id === currentObjectId
                      )
                      break
                  }

                  let current_animation_data = currentSequence?.polygonMotionPaths.find(
                    (p) => p.polygonId === currentObjectId
                  )

                  if (!current_animation_data) {
                    return
                  }

                  let newAnimationData = save_floating_bubbles_keyframes(
                    editorState,
                    currentObjectId,
                    objectType,
                    current_animation_data,
                    [currentObject?.position.x || 0, currentObject?.position.y || 0],
                    bubbleRiseHeight,
                    bubbleDriftWidth
                    // bubbleFloatiness
                  )

                  let sequence_cloned: any = null

                  editorState.savedState.sequences.forEach((s) => {
                    if (s.id == currentSequenceId) {
                      sequence_cloned = s

                      if (s.polygonMotionPaths) {
                        let currentIndex = s.polygonMotionPaths.findIndex(
                          (p) => p.id === current_animation_data.id
                        )
                        s.polygonMotionPaths[currentIndex] = newAnimationData
                      }
                    }
                  })

                  if (!sequence_cloned) {
                    return
                  }

                  let sequences = editorState.savedState.sequences

                  await saveSequencesData(sequences, editorState.saveTarget)

                  // update motion path preview
                  editor.updateMotionPaths(sequence_cloned)
                }}
              >
                Transform Motion Path to Floating Bubbles
              </button>
            </div>
          </details>
        </section>
      ) : (
        <></>
      )}
    </div>
  )
}

export const KeyframeProperties = ({
  editorRef,
  editorStateRef,
  currentSequenceId,
  selectedKeyframe,
  setRefreshTimeline,
  handleGoBack
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  currentSequenceId: string
  selectedKeyframe: string
  setRefreshTimeline: Dispatch<SetStateAction<number>>
  handleGoBack: () => void
}) => {
  const [defaultsSet, setDefaultsSet] = useState(false)
  const [data, setData] = useState<UIKeyframe | null>(null)

  useEffect(() => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let sequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)

    if (!sequence || !sequence.polygonMotionPaths) {
      return
    }

    let keyframeData = sequence.polygonMotionPaths
      .flatMap((p) => p.properties)
      .flatMap((p) => p.keyframes)
      .find((k) => k.id === selectedKeyframe)

    if (!keyframeData) {
      return
    }

    setData(keyframeData)
    // setTime(keyframeData.time);
    // keyframeData.value.type

    setDefaultsSet(true)
  }, [selectedKeyframe])

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
          <h5>Update Keyframe</h5>
        </div>
        <DebouncedInput
          id="keyframe_time"
          label="Time"
          placeholder="Time"
          key={'keyframe_time' + data?.time.toString()}
          initialValue={data ? data.time.toString() : ''}
          onDebounce={async (value) => {
            let editor = editorRef.current
            let editorState = editorStateRef.current

            if (!editor || !editorState) {
              return
            }

            let sequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)

            if (!sequence || !sequence.polygonMotionPaths) {
              return
            }

            let keyframeData = sequence.polygonMotionPaths
              .flatMap((p) => p.properties)
              .flatMap((p) => p.keyframes)
              .find((k) => k.id === selectedKeyframe)

            if (!keyframeData) {
              return
            }

            keyframeData.time = parseInt(value)

            await saveSequencesData(editorState.savedState.sequences, editorState.saveTarget)

            setRefreshTimeline(Date.now())
          }}
        />
        <div className="mt-2">
          <label htmlFor="keyframe_easing" className="text-xs font-medium">
            Easing
          </label>
          <select
            id="keyframe_easing"
            name="keyframe_easing"
            className="text-xs w-full p-1 border rounded"
            value={data?.easing || EasingType.Linear}
            onChange={async (ev) => {
              let editor = editorRef.current
              let editorState = editorStateRef.current

              if (!editor || !editorState) {
                return
              }

              let sequence = editorState.savedState.sequences.find(
                (s) => s.id === currentSequenceId
              )

              if (!sequence || !sequence.polygonMotionPaths) {
                return
              }

              let keyframeData = sequence.polygonMotionPaths
                .flatMap((p) => p.properties)
                .flatMap((p) => p.keyframes)
                .find((k) => k.id === selectedKeyframe)

              if (!keyframeData) {
                return
              }

              keyframeData.easing = ev.target.value as EasingType

              await saveSequencesData(editorState.savedState.sequences, editorState.saveTarget)

              setRefreshTimeline(Date.now())
            }}
          >
            <option value={EasingType.Linear}>Linear</option>
            <option value={EasingType.EaseIn}>Ease In</option>
            <option value={EasingType.EaseOut}>Ease Out</option>
            <option value={EasingType.EaseInOut}>Ease In Out</option>
          </select>
        </div>
        {data?.value.type === 'Position' && (
          <div className="flex flex-row gap-2">
            <DebouncedInput
              id="keyframe_x"
              label="X"
              placeholder="X"
              initialValue={data?.value.value[0].toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'Position') {
                  data.value.value[0] = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
            <DebouncedInput
              id="keyframe_y"
              label="Y"
              placeholder="Y"
              initialValue={data?.value.value[1].toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'Position') {
                  data.value.value[1] = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
          </div>
        )}
        {data?.value.type === 'Rotation' && (
          <div className="flex flex-row gap-2">
            <DebouncedInput
              id="keyframe_rotation"
              label="Rotation (degrees)"
              placeholder="Rotation"
              initialValue={data?.value.value.toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'Rotation') {
                  data.value.value = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
          </div>
        )}
        {data?.value.type === 'ScaleX' && (
          <div className="flex flex-row gap-2">
            <DebouncedInput
              id="keyframe_scale_x"
              label="Scale X (out of 100%)"
              placeholder="Scale X"
              initialValue={data?.value.value.toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'ScaleX') {
                  data.value.value = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
          </div>
        )}
        {data?.value.type === 'ScaleY' && (
          <div className="flex flex-row gap-2">
            <DebouncedInput
              id="keyframe_scale_y"
              label="Scale Y (out of 100%)"
              placeholder="Scale Y"
              initialValue={data?.value.value.toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'ScaleY') {
                  data.value.value = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
          </div>
        )}
        {data?.value.type === 'Opacity' && (
          <div className="flex flex-row gap-2">
            <DebouncedInput
              id="keyframe_opacity"
              label="Opacity (out of 100%)"
              placeholder="Opacity"
              initialValue={data?.value.value.toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'Opacity') {
                  data.value.value = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
          </div>
        )}
        {data?.value.type === 'Zoom' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="keyframe_zoom_x"
                label="Zoom X"
                placeholder="Zoom X"
                initialValue={data?.value.value.position[0].toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let sequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!sequence) {
                    return
                  }

                  if (data.value.type === 'Zoom') {
                    data.value.value.position[0] = parseInt(value)
                  }

                  update_keyframe(editorState, data, sequence, [selectedKeyframe])
                }}
              />
              <DebouncedInput
                id="keyframe_zoom_y"
                label="Zoom Y"
                placeholder="Zoom Y"
                initialValue={data?.value.value.position[1].toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let sequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!sequence) {
                    return
                  }

                  if (data.value.type === 'Zoom') {
                    data.value.value.position[1] = parseInt(value)
                  }

                  update_keyframe(editorState, data, sequence, [selectedKeyframe])
                }}
              />
            </div>
            <div className="flex flex-row gap-2">
              <DebouncedInput
                id="keyframe_zoom"
                label="Zoom Level (out of 100%)"
                placeholder="Zoom Level"
                initialValue={data?.value.value.toString()}
                onDebounce={(value) => {
                  let editor = editorRef.current
                  let editorState = editorStateRef.current

                  if (!editorState || !editor) {
                    return
                  }

                  let sequence = editorState.savedState.sequences.find(
                    (s) => s.id === currentSequenceId
                  )

                  if (!sequence) {
                    return
                  }

                  if (data.value.type === 'Zoom') {
                    data.value.value.zoomLevel = parseInt(value)
                  }

                  update_keyframe(editorState, data, sequence, [selectedKeyframe])
                }}
              />
            </div>
          </div>
        )}
        {data?.value.type === 'PerspectiveX' && (
          <div className="flex flex-row gap-2">
            <DebouncedInput
              id="keyframe_perspective_x"
              label="Perspective X (out of 100%)"
              placeholder="Perspective X"
              initialValue={data?.value.value.toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'PerspectiveX') {
                  data.value.value = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
          </div>
        )}
        {data?.value.type === 'PerspectiveY' && (
          <div className="flex flex-row gap-2">
            <DebouncedInput
              id="keyframe_perspective_y"
              label="Perspective Y (out of 100%)"
              placeholder="Perspective Y"
              initialValue={data?.value.value.toString()}
              onDebounce={(value) => {
                let editor = editorRef.current
                let editorState = editorStateRef.current

                if (!editorState || !editor) {
                  return
                }

                let sequence = editorState.savedState.sequences.find(
                  (s) => s.id === currentSequenceId
                )

                if (!sequence) {
                  return
                }

                if (data.value.type === 'PerspectiveY') {
                  data.value.value = parseInt(value)
                }

                update_keyframe(editorState, data, sequence, [selectedKeyframe])
              }}
            />
          </div>
        )}
        <button
          className="p-2 bg-red-500 text-white"
          onClick={async () => {
            let editor = editorRef.current
            let editorState = editorStateRef.current

            if (!editor || !editorState) {
              return
            }

            let sequence = editorState.savedState.sequences.find((s) => s.id === currentSequenceId)

            if (!sequence || !sequence.polygonMotionPaths) {
              return
            }

            sequence.polygonMotionPaths.forEach((pm) => {
              pm.properties.forEach((p) => {
                let updatedKeyframes: UIKeyframe[] = []
                p.keyframes.forEach((kf) => {
                  if (kf.id !== selectedKeyframe) {
                    updatedKeyframes.push(kf)
                  }
                })

                p.keyframes = updatedKeyframes
              })
            })

            setRefreshTimeline(Date.now())

            await saveSequencesData(editorState.savedState.sequences, editor.target)

            handleGoBack()
          }}
        >
          Delete Keyframe
        </button>
      </div>
    </>
  )
}

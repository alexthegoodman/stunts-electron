import React, { useState } from 'react'
import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react'
import { TextAnimationType, TextAnimationTiming } from '../../engine/textAnimator'
import { EasingType } from '../../engine/animations'
import { useTranslation } from 'react-i18next'
import { FontFamilySelector } from './FontFamilySelector'

export interface TextRollConfig {
  text: string
  pace: number // duration per text block in ms
  staggerDelay: number // delay between text blocks in ms
  animationType: TextAnimationType
  animationTiming: TextAnimationTiming
  fontFamily: string
  fontSize: number
  color: [number, number, number, number]
  easing: EasingType
  yOffset: number // vertical offset from center
  intensity: number // animation intensity 0-1
  exitAnimation: boolean // whether to play exit animation
  exitAnimationDuration: number // duration of exit animation in ms
  // Style Punch properties
  stylePunchEnabled?: boolean
  punchWeights?: number[] // e.g., [400, 700, 900]
  punchSizeMultipliers?: number[] // e.g., [1.2, 1.5, 2.0]
  punchColors?: [number, number, number, number][] // array of RGBA colors
  punchItalic?: boolean // enable/disable italic
  punchDelay?: number // delay before punch starts (ms)
  punchDuration?: number // transition duration (ms)
}

interface TextRollModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (config: TextRollConfig) => void
}

export const TextRollModal: React.FC<TextRollModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation('common')

  const [text, setText] = useState('')
  const [pace, setPace] = useState(1000) // 1 second default
  const [staggerDelay, setStaggerDelay] = useState(200) // 200ms default
  const [animationType, setAnimationType] = useState<TextAnimationType>(TextAnimationType.FadeIn)
  const [animationTiming, setAnimationTiming] = useState<TextAnimationTiming>(
    TextAnimationTiming.CharByChar
  )
  const [fontFamily, setFontFamily] = useState('Aleo')
  const [fontSize, setFontSize] = useState(48)
  const [color, setColor] = useState<[number, number, number, number]>([255, 255, 255, 255])
  const [easing, setEasing] = useState<EasingType>(EasingType.EaseOut)
  const [yOffset, setYOffset] = useState(0)
  const [intensity, setIntensity] = useState(1.0)
  const [exitAnimation, setExitAnimation] = useState(true)
  const [exitAnimationDuration, setExitAnimationDuration] = useState(800)

  // Style Punch state
  const [stylePunchEnabled, setStylePunchEnabled] = useState(false)
  const [punchWeights, setPunchWeights] = useState<number[]>([700])
  const [punchSizeMultipliers, setPunchSizeMultipliers] = useState<number[]>([1.5])
  const [punchColors, setPunchColors] = useState<[number, number, number, number][]>([
    [255, 255, 0, 255]
  ])
  const [punchItalic, setPunchItalic] = useState(false)
  const [punchDelay, setPunchDelay] = useState(300)
  const [punchDuration, setPunchDuration] = useState(500)

  const handleConfirm = () => {
    if (!text.trim()) {
      return
    }

    const config: TextRollConfig = {
      text,
      pace,
      staggerDelay,
      animationType,
      animationTiming,
      fontFamily,
      fontSize,
      color,
      easing,
      yOffset,
      intensity,
      exitAnimation,
      exitAnimationDuration,
      stylePunchEnabled,
      punchWeights,
      punchSizeMultipliers,
      punchColors,
      punchItalic,
      punchDelay,
      punchDuration
    }

    onConfirm(config)
    handleClose()
  }

  const handleClose = () => {
    // Reset to defaults
    setText('')
    setPace(1000)
    setStaggerDelay(200)
    setAnimationType(TextAnimationType.FadeIn)
    setAnimationTiming(TextAnimationTiming.CharByChar)
    setFontFamily('Aleo')
    setFontSize(48)
    setColor([255, 255, 255, 255])
    setEasing(EasingType.EaseOut)
    setYOffset(0)
    setIntensity(1.0)
    setExitAnimation(true)
    setExitAnimationDuration(800)
    setStylePunchEnabled(false)
    setPunchWeights([700])
    setPunchSizeMultipliers([1.5])
    setPunchColors([[255, 255, 0, 255]])
    setPunchItalic(false)
    setPunchDelay(300)
    setPunchDuration(500)
    onClose()
  }

  const availableFonts = [
    'Aleo',
    'Arial',
    'Courier New',
    'Georgia',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana'
  ]

  const animationTypes = Object.values(TextAnimationType)
  const animationTimings = Object.values(TextAnimationTiming)
  const easingTypes = Object.values(EasingType)

  // Convert RGB to hex for color picker
  const rgbToHex = (r: number, g: number, b: number) => {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16)
          return hex.length === 1 ? '0' + hex : hex
        })
        .join('')
    )
  }

  // Convert hex to RGB
  const hexToRgb = (hex: string): [number, number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255]
      : [255, 255, 255, 255]
  }

  const lineCount = text.split('\n').filter((line) => line.trim()).length
  const totalDuration = lineCount > 0 ? (lineCount - 1) * staggerDelay + pace : 0

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/25" />
      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel className="max-w-3xl w-full space-y-4 border bg-white p-8 rounded-lg max-h-[90vh] overflow-y-auto">
          <DialogTitle className="font-bold text-gray-600 text-2xl">Text Roll</DialogTitle>
          <Description className="text-gray-600">
            Create a series of animated text blocks that appear with staggered timing. Enter one
            phrase per line.
          </Description>

          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Text (one line per block)
            </label>
            <textarea
              placeholder="Welcome&#10;to our&#10;amazing&#10;presentation"
              rows={6}
              className="w-full p-3 border border-gray-300 rounded-md resize-none font-mono text-gray-600"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              {lineCount} text block{lineCount !== 1 ? 's' : ''} • Total duration:{' '}
              {(totalDuration / 1000).toFixed(1)}s
            </p>
          </div>

          {/* Pro Options */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-3">Pro Options</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Pace */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Duration (ms)
                </label>
                <input
                  type="range"
                  min="100"
                  max="3000"
                  step="50"
                  value={pace}
                  onChange={(e) => setPace(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>100ms</span>
                  <span className="font-semibold">{pace}ms</span>
                  <span>3000ms</span>
                </div>
              </div>

              {/* Stagger Delay */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stagger Delay (ms)
                </label>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={staggerDelay}
                  onChange={(e) => setStaggerDelay(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>50ms</span>
                  <span className="font-semibold">{staggerDelay}ms</span>
                  <span>1000ms</span>
                </div>
              </div>

              {/* Animation Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Animation Type
                </label>
                <select
                  value={animationType}
                  onChange={(e) => setAnimationType(e.target.value as TextAnimationType)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {animationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Animation Timing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Animation Timing
                </label>
                <select
                  value={animationTiming}
                  onChange={(e) => setAnimationTiming(e.target.value as TextAnimationTiming)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {animationTimings.map((timing) => (
                    <option key={timing} value={timing}>
                      {timing}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Font Family</label>
                <FontFamilySelector
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  style={{ fontFamily: fontFamily }}
                />
                {/* <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {availableFonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select> */}
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Font Size (px)
                </label>
                <input
                  type="number"
                  min="12"
                  max="120"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Text Color</label>
                <input
                  type="color"
                  value={rgbToHex(color[0], color[1], color[2])}
                  onChange={(e) => setColor(hexToRgb(e.target.value))}
                  className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                />
              </div>

              {/* Easing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Easing</label>
                <select
                  value={easing}
                  onChange={(e) => setEasing(e.target.value as EasingType)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {easingTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Intensity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Animation Intensity
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0</span>
                  <span className="font-semibold">{intensity.toFixed(1)}</span>
                  <span>1</span>
                </div>
              </div>

              {/* Y Offset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vertical Offset (px)
                </label>
                <input
                  type="number"
                  min="-500"
                  max="500"
                  step="10"
                  value={yOffset}
                  onChange={(e) => setYOffset(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Exit Animation Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Exit Animation</h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exitAnimation}
                    onChange={(e) => setExitAnimation(e.target.checked)}
                    className="mr-2 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Enable</span>
                </label>
              </div>

              {exitAnimation && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Exit Duration (ms)
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={exitAnimationDuration}
                    onChange={(e) => setExitAnimationDuration(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>100ms</span>
                    <span className="font-semibold">{exitAnimationDuration}ms</span>
                    <span>2000ms</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    The exit animation will play in reverse of the entrance animation
                  </p>
                </div>
              )}
            </div>

            {/* Style Punch Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg text-gray-700">Style Punch (Last Word)</h3>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stylePunchEnabled}
                    onChange={(e) => setStylePunchEnabled(e.target.checked)}
                    className="mr-2 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Enable</span>
                </label>
              </div>

              {stylePunchEnabled && (
                <div className="space-y-4">
                  {/* Font Weights */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Weights (select multiple)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[300, 400, 700, 900].map((weight) => (
                        <label key={weight} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={punchWeights.includes(weight)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPunchWeights([...punchWeights, weight])
                              } else {
                                setPunchWeights(punchWeights.filter((w) => w !== weight))
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            {weight === 300
                              ? 'Light'
                              : weight === 400
                                ? 'Regular'
                                : weight === 700
                                  ? 'Bold'
                                  : 'Black'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Size Multipliers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size Multipliers (select multiple)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1.2, 1.5, 2.0, 2.5].map((multiplier) => (
                        <label key={multiplier} className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={punchSizeMultipliers.includes(multiplier)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPunchSizeMultipliers([...punchSizeMultipliers, multiplier])
                              } else {
                                setPunchSizeMultipliers(
                                  punchSizeMultipliers.filter((m) => m !== multiplier)
                                )
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">{multiplier}x</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Punch Colors
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {punchColors.map((punchColor, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={rgbToHex(punchColor[0], punchColor[1], punchColor[2])}
                            onChange={(e) => {
                              const newColors = [...punchColors]
                              newColors[index] = hexToRgb(e.target.value)
                              setPunchColors(newColors)
                            }}
                            className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
                          />
                          {punchColors.length > 1 && (
                            <button
                              onClick={() =>
                                setPunchColors(punchColors.filter((_, i) => i !== index))
                              }
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setPunchColors([...punchColors, [255, 0, 0, 255]])}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        + Add Color
                      </button>
                    </div>
                  </div>

                  {/* Italic Toggle */}
                  <div>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={punchItalic}
                        onChange={(e) => setPunchItalic(e.target.checked)}
                        className="mr-2 w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">Apply Italic</span>
                    </label>
                  </div>

                  {/* Timing Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Punch Delay (ms)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="50"
                        value={punchDelay}
                        onChange={(e) => setPunchDelay(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0ms</span>
                        <span className="font-semibold">{punchDelay}ms</span>
                        <span>2000ms</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Punch Duration (ms)
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="2000"
                        step="50"
                        value={punchDuration}
                        onChange={(e) => setPunchDuration(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>100ms</span>
                        <span className="font-semibold">{punchDuration}ms</span>
                        <span>2000ms</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    The last word of each text block will randomly receive one style from each
                    selected category
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!text.trim()}
              className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Text Roll
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

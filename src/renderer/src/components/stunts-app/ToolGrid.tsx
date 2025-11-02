'use client'

import { CANVAS_HORIZ_OFFSET, CANVAS_VERT_OFFSET, Editor } from '../../engine/editor'
import { getRandomNumber, InputValue, rgbToWgpu, wgpuToHuman } from '../../engine/editor/helpers'
import { OptionButton } from './items'
import EditorState from '../../engine/editor_state'
import React, { useCallback, useRef, useState } from 'react'
import { WebCapture, MousePosition } from '../../engine/capture'
import { v4 as uuidv4 } from 'uuid'
import { fileToBlob, StImageConfig } from '../../engine/image'
import {
  AuthToken,
  getUploadedVideoData,
  resizeVideoFromPath,
  saveVideoFromPath,
  selectVideo,
  saveImage,
  selectModel,
  saveModelFromPath,
  getUploadedModelData
} from '../../fetchers/projects'
import { Sequence } from '../../engine/animations'
import { PolygonConfig } from '../../engine/polygon'
import { useLocalStorage } from '@uidotdev/usehooks'
import { TextRendererConfig } from '../../engine/text'
import { Cube3DConfig } from '../../engine/cube3d'
import { Sphere3DConfig } from '../../engine/sphere3d'
import { Mockup3DConfig } from '../../engine/mockup3d'
import { Model3DConfig } from '../../engine/model3d'
import { PageSequence } from '../../engine/data'
import { Layer, LayerFromConfig } from './layers'
import { StVideoConfig } from '../../engine/video'
import { Description, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { SourceSelectionModal } from './SourceSelectionModal'
import { TextRollModal, TextRollConfig } from './TextRollModal'
import { TextAnimationConfig, createTextAnimationPreset } from '../../engine/textAnimator'
import { BrushConfig, BrushType, SavedBrushConfig } from '@renderer/engine/brush'

export const ToolGrid = ({
  editorRef,
  editorStateRef,
  webCaptureRef,
  currentSequenceId,
  set_sequences,
  options,
  on_create_sequence,
  layers,
  setLayers,
  update
}: {
  editorRef: React.RefObject<Editor | null>
  editorStateRef: React.RefObject<EditorState | null>
  webCaptureRef: React.RefObject<WebCapture | null>
  currentSequenceId: string | null
  set_sequences?: React.Dispatch<React.SetStateAction<Sequence[]>>
  options: string[]
  on_create_sequence?: () => void
  layers: Layer[]
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>
  update: () => void
}) => {
  const { t } = useTranslation('common')

  const [authToken] = useLocalStorage<AuthToken | null>('auth-token', null)

  const [isCapturing, setIsCapturing] = useState(false)
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [selectedSourceData, setSelectedSourceData] = useState<any | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [generateImageModalOpen, setGenerateImageModalOpen] = useState(false)
  const [generateImagePrompt, setGenerateImagePrompt] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [userMessage, setUserMessage] = useState('')

  const [stickerModalOpen, setStickerModalOpen] = useState(false)
  const [textRollModalOpen, setTextRollModalOpen] = useState(false)

  const availableStickers = [
    'airplane1.png',
    'balloon1.png',
    'candles1.png',
    'cloud1.png',
    'compass1.png',
    'fireworks1.png',
    'fireworks2.png',
    'flower1.png',
    'flower2.png',
    'heart1.png',
    'leaf1.png',
    'leaf2.png',
    'lightbulb1.png',
    'lotus1.png',
    'lotus2.png',
    'rangoli1.png',
    'rangoli2.png',
    'smiley1.png',
    'star1.png'
  ]

  const handleSourceSelected = async (source: any) => {
    setSelectedSourceId(source.id)
    setSelectedSourceData(source)

    let webCapture = webCaptureRef.current

    if (!webCapture || !currentSequenceId) {
      toast.error('No web capture or sequence id available!')
      return
    }

    setIsCapturing(true)

    try {
      await webCapture.startScreenCapture(source.id)

      const blob = await webCapture.startRecording()

      // For screen capture, we need to save blob to temp file first
      const fileName = uuidv4() + '.mp4'
      const arrayBuffer = await blob.arrayBuffer()
      const tempFileName = `temp_${Date.now()}_${fileName}`

      try {
        const tempResult = await window.api.uploads.saveVideo({
          fileName: tempFileName,
          buffer: arrayBuffer,
          mimeType: 'video/mp4'
        })

        if (!tempResult.success) {
          throw new Error(tempResult.error || 'Failed to save temp video')
        }

        // Get mouse positions from webCapture and pass to import_video
        const mousePositions = webCapture.mousePositions
        await import_video(currentSequenceId, tempResult.data.url, fileName, mousePositions, source)
      } catch (error: any) {
        console.error('Screen capture error:', error)
        toast.error(error.message || 'Failed to capture screen')
        setIsCapturing(false)
      }
    } catch (error: any) {
      console.error('Screen capture initialization error:', error)
      toast.error(error.message || 'Failed to start screen capture')
      setIsCapturing(false)
    }
  }

  const handleStartCapture = () => {
    // Open the source selection modal
    setIsSourceModalOpen(true)
  }

  const handleStopCapture = () => {
    let webCapture = webCaptureRef.current

    if (!webCapture) {
      return
    }

    webCapture.stopRecording()

    setIsCapturing(false)
  }

  let on_add_square = (sequence_id: string, isCircle = false) => {
    console.info('Adding Square...')

    let editor = editorRef.current
    let editor_state = editorStateRef.current

    if (!editor || !editor_state) {
      return
    }

    if (!editor.settings) {
      console.error('Editor settings are not defined.')
      return
    }

    // let mut rng = rand::thread_rng();
    // let random_number_800 = rng.gen_range(0..=800);
    // let random_number_450 = rng.gen_range(0..=450);
    let random_number_800 = getRandomNumber(100, editor.settings?.dimensions.width)
    let random_number_450 = getRandomNumber(100, editor.settings?.dimensions.height)

    let new_id = uuidv4()

    let polygon_config: PolygonConfig = {
      id: new_id,
      name: isCircle ? 'Circle' : 'Square',
      points: [
        { x: 0.0, y: 0.0 },
        { x: 1.0, y: 0.0 },
        { x: 1.0, y: 1.0 },
        { x: 0.0, y: 1.0 }
      ],
      dimensions: [100.0, 100.0],
      position: {
        x: random_number_800,
        y: random_number_450
      },
      rotation: 0,
      borderRadius: 0.0,
      // fill: [1.0, 1.0, 1.0, 1.0],
      backgroundFill: {
        type: 'Color',
        value: [1.0, 1.0, 1.0, 1.0]
      },
      stroke: {
        fill: [1.0, 1.0, 1.0, 1.0],
        thickness: 2.0
      },
      layer: layers.length,
      isCircle
    }

    editor.add_polygon(polygon_config, 'Polygon', new_id, sequence_id)

    editor_state.add_saved_polygon(sequence_id, {
      id: polygon_config.id,
      name: polygon_config.name,
      dimensions: [polygon_config.dimensions[0], polygon_config.dimensions[1]],
      backgroundFill: polygon_config.backgroundFill,
      borderRadius: polygon_config.borderRadius,
      position: {
        x: polygon_config.position.x,
        y: polygon_config.position.y
      },
      stroke: {
        thickness: polygon_config.stroke.thickness,
        fill: [
          polygon_config.stroke.fill[0],
          polygon_config.stroke.fill[1],
          polygon_config.stroke.fill[2],
          polygon_config.stroke.fill[3]
        ]
      },
      layer: polygon_config.layer,
      isCircle: polygon_config.isCircle
    })

    let saved_state = editor_state.savedState

    let updated_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

    let sequence_cloned = updated_sequence

    if (!sequence_cloned) {
      throw Error('Sequence does not exist')
    }

    if (set_sequences) {
      set_sequences(saved_state.sequences)
    }

    editor.currentSequenceData = sequence_cloned

    editor.updateMotionPaths(sequence_cloned)

    editor.polygons.forEach((polygon) => {
      if (!polygon.hidden && polygon.id === polygon_config.id) {
        let polygon_config: PolygonConfig = polygon.toConfig(editor.camera.windowSize)
        let new_layer: Layer = LayerFromConfig.fromPolygonConfig(polygon_config)
        layers.push(new_layer)
      }
    })

    setLayers(layers)

    update()

    console.info('Square added!')
  }

  let on_add_image = async (
    sequence_id: string,
    file: File,
    isSticker: boolean = false,
    replicateUrl?: string
  ) => {
    let editor = editorRef.current
    let editor_state = editorStateRef.current

    if (!editor || !editor_state) {
      return
    }

    let blob = await fileToBlob(file)

    if (!blob) {
      return
    }

    try {
      // Use Vercel blob client-side upload for images
      // const newBlob = await upload(file.name, blob, {
      //   access: "public",
      //   handleUploadUrl: "/api/image/upload",
      //   clientPayload: JSON.stringify({
      //     token: "",
      //   }),
      // });

      // let response = {
      //   url: newBlob.url,
      //   fileName: file.name,
      //   size: file.size,
      //   mimeType: file.type,
      //   dimensions: { width: 100, height: 100 },
      // };

      let response = await saveImage('', file.name, blob)

      if (response) {
        let url = response.url

        console.info('File url:', url)

        // let mut rng = rand::thread_rng();
        // let random_number_800 = rng.gen_range(0..=800);
        // let random_number_450 = rng.gen_range(0..=450);

        if (!editor.settings) {
          console.error('Editor settings are not defined.')
          return
        }

        let random_number_800 = getRandomNumber(100, editor.settings?.dimensions.width)
        let random_number_450 = getRandomNumber(100, editor.settings?.dimensions.height)

        let new_id = uuidv4()

        let position = {
          x: random_number_800 + CANVAS_HORIZ_OFFSET,
          y: random_number_450 + CANVAS_VERT_OFFSET
        }

        let image_config = {
          id: new_id,
          name: isSticker ? 'New Sticker' : 'New Image Item',
          dimensions: [100, 100] as [number, number],
          position,
          // path: new_path.clone(),
          url: url,
          replicateUrl: replicateUrl,
          layer: layers.length,
          isCircle: false,
          isSticker: isSticker
        }

        editor.add_image_item(image_config, url, blob, new_id, sequence_id)

        console.info('Adding image: {:?}', new_id)

        editor_state.add_saved_image_item(sequence_id, {
          id: image_config.id,
          name: image_config.name,
          // path: new_path.clone(),
          url: url,
          replicateUrl: replicateUrl,
          dimensions: [image_config.dimensions[0], image_config.dimensions[1]],
          position: {
            x: position.x,
            y: position.y
          },
          layer: image_config.layer,
          isCircle: image_config.isCircle,
          isSticker: image_config.isSticker
        })

        console.info('Saved image!')

        let saved_state = editor_state.savedState
        let updated_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

        let sequence_cloned = updated_sequence

        if (!sequence_cloned) {
          return
        }

        if (set_sequences) {
          set_sequences(saved_state.sequences)
        }

        editor.currentSequenceData = sequence_cloned
        editor.updateMotionPaths(sequence_cloned)

        editor.imageItems.forEach((image) => {
          if (!image.hidden && image.id === image_config.id) {
            let image_config: StImageConfig = image.toConfig(editor.camera.windowSize)
            let new_layer: Layer = LayerFromConfig.fromImageConfig(image_config)
            layers.push(new_layer)
          }
        })

        setLayers(layers)

        update()

        console.info('Image added!')
      }
    } catch (error: any) {
      console.error('add image error', error)
      toast.error(error.message || 'An error occurred')
    }
  }

  let on_add_text = async (sequence_id: string) => {
    let editor = editorRef.current
    let editor_state = editorStateRef.current

    if (!editor || !editor_state) {
      return
    }

    if (!editor.settings) {
      console.error('Editor settings are not defined.')
      return
    }

    // let mut rng = rand::thread_rng();
    // let random_number_800 = rng.gen_range(0..=800);
    // let random_number_450 = rng.gen_range(0..=450);
    let random_number_800 = getRandomNumber(100, editor.settings?.dimensions.width)
    let random_number_450 = getRandomNumber(100, editor.settings?.dimensions.height)

    let new_id = uuidv4()
    let new_text = 'New text'
    let font_family = 'Aleo'

    let position = {
      x: random_number_800 + CANVAS_HORIZ_OFFSET,
      y: random_number_450 + CANVAS_VERT_OFFSET
    }

    let text_config: TextRendererConfig = {
      id: new_id,
      name: 'New Text Item',
      text: new_text,
      fontFamily: font_family,
      dimensions: [100.0, 100.0] as [number, number],
      position,
      layer: layers.length,
      // color: rgbToWgpu(20, 20, 200, 255) as [number, number, number, number],
      color: [20, 20, 200, 255] as [number, number, number, number],
      fontSize: 28,
      // backgroundFill: rgbToWgpu(200, 200, 200, 255) as [
      //   number,
      //   number,
      //   number,
      //   number
      // ],
      backgroundFill: { type: 'Color', value: rgbToWgpu(200, 200, 200, 255) },
      isCircle: false
    }

    await editor.add_text_item(text_config, new_text, new_id, sequence_id)

    // Find the created text renderer and save with animation data
    const textRenderer = editor.textItems.find((t) => t.id === text_config.id)
    const savedConfig = textRenderer
      ? textRenderer.toSavedConfig(editor.camera.windowSize)
      : {
          id: text_config.id,
          name: text_config.name,
          text: new_text,
          fontFamily: text_config.fontFamily,
          dimensions: [text_config.dimensions[0], text_config.dimensions[1]] as [number, number],
          position: {
            x: position.x,
            y: position.y
          },
          layer: text_config.layer,
          color: text_config.color,
          fontSize: text_config.fontSize,
          backgroundFill: text_config.backgroundFill,
          isCircle: text_config.isCircle,
          textAnimation: null
        }

    editor_state.add_saved_text_item(sequence_id, savedConfig)

    let saved_state = editor_state.savedState
    let updated_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

    let sequence_cloned = updated_sequence

    if (!sequence_cloned) {
      return
    }

    if (set_sequences) {
      set_sequences(saved_state.sequences)
    }

    // let mut editor = editor_m.lock().unwrap();

    editor.currentSequenceData = sequence_cloned
    editor.updateMotionPaths(sequence_cloned)

    editor.textItems.forEach((text) => {
      if (!text.hidden && text.id === text_config.id) {
        let text_config: TextRendererConfig = text.toConfig(editor.camera.windowSize)
        let new_layer: Layer = LayerFromConfig.fromTextConfig(text_config)
        layers.push(new_layer)
      }
    })

    setLayers(layers)

    update()

    // drop(editor);
  }

  const on_add_text_roll = async (sequence_id: string, config: TextRollConfig) => {
    let editor = editorRef.current
    let editor_state = editorStateRef.current

    if (!editor || !editor_state) {
      return
    }

    if (!editor.settings) {
      console.error('Editor settings are not defined.')
      return
    }

    // Parse text lines
    const lines = config.text.split('\n').filter((line) => line.trim())

    if (lines.length === 0) {
      toast.error('Please enter at least one line of text')
      return
    }

    // Get center position
    const centerX = editor.settings.dimensions.width / 2 + CANVAS_HORIZ_OFFSET
    const centerY = editor.settings.dimensions.height / 2 + CANVAS_VERT_OFFSET + config.yOffset

    const createdTextIds: string[] = []

    // Create each text block
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      const animationStartTime = i * (config.staggerDelay + config.pace)
      const new_id = uuidv4()

      const position = {
        x: centerX,
        y: centerY
      }

      const text_config: TextRendererConfig = {
        id: new_id,
        name: `Text Roll ${i + 1}`,
        text: line,
        fontFamily: config.fontFamily,
        dimensions: [editor.camera?.windowSize.width! / 2.0, 100.0] as [number, number],
        position,
        layer: layers.length + i,
        color: config.color,
        fontSize: config.fontSize,
        backgroundFill: { type: 'Color', value: rgbToWgpu(0, 0, 0, 0) }, // Transparent background
        isCircle: false,
        hiddenBackground: true
      }

      await editor.add_text_item(text_config, line, new_id, sequence_id)

      // Find the created text renderer
      const textRenderer = editor.textItems.find((t) => t.id === text_config.id)

      if (textRenderer) {
        // Calculate animation start time

        // Create animation config for entrance
        const animConfig: TextAnimationConfig = {
          id: `text-roll-anim-${new_id}`,
          type: config.animationType, // Use selected animation type (StylePunch is now a modifier)
          timing: config.animationTiming,
          duration: config.pace,
          delay: 50,
          intensity: config.intensity,
          easing: config.easing,
          // startTime: animationStartTime, // TODO: let's use startTimeMs on AnimationData instead of this, so in saved text item
          startTime: 0,
          loop: false,
          reverse: false,
          customParams: {
            ...(config.exitAnimation
              ? {
                  hasExitAnimation: true,
                  exitAnimationDuration: config.exitAnimationDuration,
                  holdDuration: 0 // No hold, text displays during pace
                }
              : {}),
            ...(config.stylePunchEnabled
              ? {
                  stylePunchEnabled: true,
                  punchWeights: config.punchWeights,
                  punchSizeMultipliers: config.punchSizeMultipliers,
                  punchColors: config.punchColors,
                  punchItalic: config.punchItalic,
                  punchDelay: config.punchDelay,
                  punchDuration: config.punchDuration
                }
              : {})
          }
        }

        // Apply animation
        textRenderer.setTextAnimation(animConfig)
        textRenderer.startTextAnimation(animationStartTime)

        // Calculate total duration including exit animation if enabled
        const totalDuration = config.exitAnimation
          ? config.pace + config.exitAnimationDuration
          : config.pace

        // Save with animation data
        const savedConfig = textRenderer.toSavedConfig(editor.camera.windowSize)
        editor_state.add_saved_text_item(
          sequence_id,
          savedConfig,
          animationStartTime,
          totalDuration
        )

        let cloned_sequence = editor_state.savedState.sequences.find(
          (seq) => seq.id === sequence_id
        )
        editor.currentSequenceData = cloned_sequence!

        // Add to layers
        editor.textItems.forEach((text) => {
          if (!text.hidden && text.id === text_config.id) {
            let text_config_layer: TextRendererConfig = text.toConfig(editor.camera.windowSize)
            let new_layer: Layer = LayerFromConfig.fromTextConfig(text_config_layer)
            layers.push(new_layer)
          }
        })

        createdTextIds.push(new_id)
      }
    }

    // Update editor state
    let saved_state = editor_state.savedState
    let updated_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

    let sequence_cloned = updated_sequence

    if (!sequence_cloned) {
      return
    }

    if (set_sequences) {
      set_sequences(saved_state.sequences)
    }

    editor.currentSequenceData = sequence_cloned
    editor.updateMotionPaths(sequence_cloned)

    setLayers([...layers])

    update()

    toast.success(`Created ${lines.length} text blocks!`)
  }

  let import_video = useCallback(
    async (
      sequence_id: string,
      filePath: string,
      fileName: string,
      mousePositions?: any[],
      sourceData?: any
    ) => {
      let editor = editorRef.current
      let editor_state = editorStateRef.current

      if (!editor || !editor_state) {
        return
      }

      try {
        setUserMessage(`Saving video: ${fileName}...`)
        console.info(`Saving video: ${fileName}...`, filePath)

        // Resize video from path
        // const { outputPath } = await resizeVideoFromPath(filePath, 1200, 900)

        // Save the resized video
        const response = await saveVideoFromPath(filePath, fileName)

        setUserMessage('')

        if (response.url) {
          let url = response.url

          console.info('File url:', url)

          // Get the resized video blob
          // const resizedVideoBlob = await getUploadedVideoData(url)

          // if (!resizedVideoBlob) {
          //   throw new Error('Failed to get resized video blob')
          // }

          if (!editor.settings) {
            console.error('Editor settings are not defined.')
            return
          }

          // let mut rng = rand::thread_rng();
          // let random_number_800 = rng.gen_range(0..=800);
          // let random_number_450 = rng.gen_range(0..=450);

          let random_number_800 = getRandomNumber(100, editor.settings?.dimensions.width)
          let random_number_450 = getRandomNumber(100, editor.settings?.dimensions.height)

          let new_id = uuidv4()

          // let position = {
          //   x: random_number_800 + CANVAS_HORIZ_OFFSET,
          //   y: random_number_450 + CANVAS_VERT_OFFSET
          // }

          let position = {
            x: 400 + CANVAS_HORIZ_OFFSET,
            y: 400 + CANVAS_VERT_OFFSET
          }

          let video_config = {
            id: new_id,
            name: 'New Video Item',
            dimensions: [800, 500] as [number, number],
            position,
            // path: new_path.clone(),
            path: url,
            mousePath: '',
            layer: layers.length
          }

          // Convert source data to SourceData format if available
          let stored_source_data = null
          if (sourceData) {
            stored_source_data = {
              id: sourceData.id,
              name: sourceData.name,
              width: sourceData.bounds?.width || 0,
              height: sourceData.bounds?.height || 0,
              x: sourceData.bounds?.x || 0,
              y: sourceData.bounds?.y || 0,
              scaleFactor: sourceData.scaleFactor || 1
            }
          }

          await editor.add_video_item(
            video_config,
            url,
            new_id,
            sequence_id,
            mousePositions || [],
            stored_source_data
          )

          console.info('Adding video: {:?}', new_id)

          let new_video_item = editor.videoItems.find((v) => v.id === new_id)

          if (!new_video_item || !new_video_item.sourceDurationMs) {
            return
          }

          // set sequence duration to video duration automatically, better ux
          let saved_state1 = editor_state.savedState
          let updated_sequence1 = saved_state1.sequences.find((s) => s.id == sequence_id)

          // updated_sequence1!.durationMs = new_video_item.sourceDurationMs

          await editor_state.add_saved_video_item(
            sequence_id,
            {
              id: video_config.id,
              name: video_config.name,
              // path: new_path.clone(),
              path: url,
              dimensions: [video_config.dimensions[0], video_config.dimensions[1]],
              position: {
                x: position.x,
                y: position.y
              },
              layer: video_config.layer
              // mousePath: video_config.mousePath,
            },
            new_video_item.sourceDurationMs,
            mousePositions,
            sourceData
          )

          console.info('Saved video!')

          let saved_state = editor_state.savedState
          let updated_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

          let sequence_cloned = updated_sequence

          if (!sequence_cloned) {
            return
          }

          if (set_sequences) {
            set_sequences(saved_state.sequences)
          }

          editor.currentSequenceData = sequence_cloned
          editor.updateMotionPaths(sequence_cloned)

          editor.videoItems.forEach((video) => {
            if (!video.hidden && video.id === video_config.id) {
              let video_config: StVideoConfig = video.toConfig(editor.camera.windowSize)
              let new_layer: Layer = LayerFromConfig.fromVideoConfig(video_config)
              layers.push(new_layer)
            }
          })

          setLayers(layers)

          update()

          console.info('video added!')
        }
      } catch (error: any) {
        console.error('add video error', error)
        toast.error(error.message || 'An error occurred')
      }
    },
    [authToken, setUploadProgress, getRandomNumber, set_sequences, setLayers, layers]
  )

  let on_add_video = useCallback(
    async (sequence_id: string) => {
      try {
        const { filePath, fileName } = await selectVideo()
        console.info('on_add_video', sequence_id, filePath, fileName)
        await import_video(sequence_id, filePath, fileName)
      } catch (error: any) {
        if (error.message !== 'No file selected') {
          console.error('Video selection error:', error)
          toast.error(error.message || 'Failed to select video')
        }
      }
    },
    [import_video]
  )

  const handleStickerSelect = async (stickerFileName: string) => {
    if (!currentSequenceId) {
      return
    }

    try {
      const stickerUrl = `/stickers/${stickerFileName}`
      const response = await fetch(stickerUrl)
      const blob = await response.blob()

      const file = new File([blob], stickerFileName, {
        type: 'image/png'
      })

      await on_add_image(currentSequenceId, file, true)
      setStickerModalOpen(false)
      toast.success('Sticker added successfully!')
    } catch (error: any) {
      console.error('Sticker selection error:', error)
      toast.error('Failed to add sticker')
    }
  }

  const handleGenerateImage = async () => {
    if (!generateImagePrompt.trim() || !currentSequenceId) {
      return
    }

    setIsGeneratingImage(true)

    try {
      // Use Electron IPC to generate image
      const result = await window.api.ai.generateImage(generateImagePrompt)

      if (!result.success) {
        // Check if it's an API key error
        if (result.error?.includes('API key')) {
          toast.error('Replicate API key not configured. Please add your API key in Settings.', {
            duration: 5000
          })
        } else {
          throw new Error(result.error || 'Failed to generate image')
        }
        return
      }

      // The result contains the file path, get the image data using uploads API
      const imageData = await window.api.uploads.getImage(result.data.url)

      if (!imageData.success) {
        throw new Error('Failed to load generated image')
      }

      // Create a File from the buffer
      const file = new File([imageData.data.buffer], result.data.fileName, {
        type: imageData.data.mimeType
      })

      await on_add_image(currentSequenceId, file, false, result.data.replicateUrl)

      setGenerateImageModalOpen(false)
      setGenerateImagePrompt('')
      toast.success('Image generated and added successfully!')
    } catch (error: any) {
      console.error('Image generation error:', error)
      toast.error(error.message || 'Failed to generate image')
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const on_add_mockup3d = useCallback(
    async (sequence_id: string) => {
      let editor = editorRef.current
      let editor_state = editorStateRef.current

      if (!editor || !editor_state) {
        return
      }

      if (!editor.settings) {
        console.error('Editor settings are not defined.')
        return
      }

      try {
        const { filePath, fileName } = await selectVideo()

        setUserMessage(`Processing mockup video: ${fileName}...`)

        // Resize video from path
        const { outputPath } = await resizeVideoFromPath(filePath, 1200, 900)

        // Save the resized video
        const response = await saveVideoFromPath(outputPath, fileName)

        setUserMessage('')

        if (response) {
          let url = response.url

          console.info('Mockup video url:', url)

          // Get the resized video blob
          const resizedVideoBlob = await getUploadedVideoData(url)

          if (!resizedVideoBlob) {
            throw new Error('Failed to get resized video blob')
          }

          const random_number_800 = getRandomNumber(100, editor.settings.dimensions.width)
          const random_number_450 = getRandomNumber(100, editor.settings.dimensions.height)

          const new_mockup_id = uuidv4()
          const new_video_id = uuidv4()

          // const mockupPosition = {
          //   x: random_number_800 + CANVAS_HORIZ_OFFSET,
          //   y: random_number_450 + CANVAS_VERT_OFFSET,
          // };

          const mockupPosition = {
            x: 100,
            y: 100
          }

          let mockupDimensions = [1.5, 1.5, 0.3] as [number, number, number]

          const dimensionsWorld = [500.0, 300.0]

          // Create video config for the child video
          const videoConfig: StVideoConfig = {
            id: new_video_id,
            name: 'Mockup Screen Video',
            dimensions: [dimensionsWorld[0], dimensionsWorld[1]] as [number, number], // Will be adjusted by mockup
            position: {
              x: 0,
              y: 0
            },
            path: url,
            layer: layers.length + 1 // Video is above mockup
          }

          // Create mockup config with required video child
          const mockupConfig: Mockup3DConfig = {
            id: new_mockup_id,
            name: 'Laptop Mockup',
            dimensions: mockupDimensions, // width, height, depth
            position: mockupPosition,
            rotation: [15, 0, 0], // Slight tilt
            backgroundFill: {
              type: 'Color',
              value: [0.7, 0.7, 0.75, 1.0] // Silver gray
            },
            layer: layers.length,
            videoChild: videoConfig,
            tiltAngle: 45
          }

          // First add the video item (the mockup will reference it)
          let new_video_item = await editor.create_video_item(
            videoConfig,
            url,
            new_video_id,
            sequence_id,
            [],
            null,
            7
          )

          if (!new_video_item || !new_video_item.sourceDurationMs) {
            return
          }

          // Add the mockup
          editor.add_mockup3d(mockupConfig, new_mockup_id, sequence_id)

          // Link the video to the mockup
          const mockup = editor.mockups3D.find((m) => m.id === new_mockup_id)
          if (mockup) {
            mockup.videoChild = new_video_item
            // Update video child transform to match mockup's screen
            if (editor.gpuResources?.queue && editor.camera?.windowSize) {
              mockup.videoChild.transform.layer = mockup.videoChild.transform.layer + 0.02
              mockup.updateVideoChildTransform(editor.gpuResources.queue, editor.camera.windowSize)
            }
          }

          // Save mockup to state (video is stored as child, not separately)
          await editor_state.add_saved_mockup3d(sequence_id, mockupConfig)

          console.info('Saved mockup!')

          let saved_state = editor_state.savedState
          let updated_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

          let sequence_cloned = updated_sequence

          if (!sequence_cloned) {
            return
          }

          if (set_sequences) {
            set_sequences(saved_state.sequences)
          }

          editor.currentSequenceData = sequence_cloned
          editor.updateMotionPaths(sequence_cloned)

          // Add layer only for the mockup (video is a child, not a separate layer)
          editor.mockups3D.forEach((mockup) => {
            if (!mockup.hidden && mockup.id === mockupConfig.id) {
              let mockup_config: Mockup3DConfig = mockup.toConfig()
              let new_layer: Layer = LayerFromConfig.fromMockup3DConfig(mockup_config)
              layers.push(new_layer)
            }
          })

          setLayers(layers)

          update()

          console.info('Mockup3D added!')
          toast.success('Laptop mockup added successfully!')
        }
      } catch (error: any) {
        console.error('add mockup error', error)
        toast.error(error.message || 'An error occurred')
      }
    },
    [authToken, setUploadProgress, getRandomNumber, set_sequences, setLayers, layers]
  )

  const on_add_model3d = useCallback(
    async (sequence_id: string) => {
      let editor = editorRef.current
      let editor_state = editorStateRef.current

      if (!editor || !editor_state) {
        return
      }

      if (!editor.settings) {
        console.error('Editor settings are not defined.')
        return
      }

      try {
        const { filePath, fileName } = await selectModel()

        setUserMessage(`Processing 3D model: ${fileName}...`)

        // Save the model file
        const response = await saveModelFromPath(filePath, fileName)

        setUserMessage('')

        if (response) {
          let url = response.url

          console.info('Model file url:', url)

          // Get the model data
          const modelData = await getUploadedModelData(url)

          if (!modelData) {
            throw new Error('Failed to get model data')
          }

          const random_number_800 = getRandomNumber(100, editor.settings.dimensions.width)
          const random_number_450 = getRandomNumber(100, editor.settings.dimensions.height)

          const new_model_id = uuidv4()

          // const modelPosition = {
          //   x: random_number_800 + CANVAS_HORIZ_OFFSET,
          //   y: random_number_450 + CANVAS_VERT_OFFSET
          // }

          const modelPosition = {
            x: 0 + CANVAS_HORIZ_OFFSET,
            y: 0 + CANVAS_VERT_OFFSET
          }

          // Create model config
          const modelConfig: Model3DConfig = {
            id: new_model_id,
            name: fileName,
            path: url,
            position: modelPosition,
            rotation: [0, 0, 0],
            scale: [10, 10, 10],
            backgroundFill: {
              type: 'Color',
              value: [0.7, 0.7, 0.75, 1.0] // Silver gray
            },
            layer: layers.length
          }

          // Add the model
          await editor.add_model3d(modelConfig, new_model_id, sequence_id, modelData)

          // Save model to state
          await editor_state.add_saved_model3d(sequence_id, modelConfig)

          console.info('Saved model!')

          let saved_state = editor_state.savedState
          let updated_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

          let sequence_cloned = updated_sequence

          if (!sequence_cloned) {
            return
          }

          if (set_sequences) {
            set_sequences(saved_state.sequences)
          }

          editor.currentSequenceData = sequence_cloned
          editor.updateMotionPaths(sequence_cloned)

          // Add layer only for the model
          editor.models3D.forEach((model) => {
            if (!model.hidden && model.id === modelConfig.id) {
              let model_config: Model3DConfig = model.toConfig()
              let new_layer: Layer = LayerFromConfig.fromModel3DConfig(model_config)
              layers.push(new_layer)
            }
          })

          setLayers(layers)

          update()

          console.info('Model3D added!')
          toast.success('3D model imported successfully!')
        }
      } catch (error: any) {
        if (error.message !== 'No file selected') {
          console.error('add model error', error)
          toast.error(error.message || 'An error occurred')
        }
        setUserMessage('')
      }
    },
    [authToken, setUploadProgress, getRandomNumber, set_sequences, setLayers, layers]
  )

  const on_add_player_character = useCallback(
    async (sequence_id: string) => {
      let editor = editorRef.current
      let editor_state = editorStateRef.current

      if (!editor || !editor_state) {
        return
      }

      if (!editor.settings) {
        console.error('Editor settings are not defined.')
        return
      }

      try {
        const new_id = uuidv4()

        const playerConfig: Cube3DConfig = {
          id: new_id,
          name: 'PlayerCharacter',
          dimensions: [25, 25, 25],
          position: { x: 0, y: 100, z: 0 },
          rotation: [0, 0, 0],
          backgroundFill: {
            type: 'Color',
            value: [0.8, 0.2, 0.2, 1.0]
          },
          layer: layers.length
        }

        editor.add_cube3d(playerConfig, new_id, sequence_id)

        editor_state.add_saved_cube3d(sequence_id, playerConfig)

        const dynamicBody = editor.physics.createVirtualCharacter(
          new editor.physics.jolt.RVec3(0, 100, 0),
          new editor.physics.jolt.Quat(0, 0, 0, 1),
          2,
          1
        )
        editor.characters.set(new_id, dynamicBody)

        let saved_state = editor_state.savedState

        let updated_sequence = saved_state.sequences.find((s) => s.id == currentSequenceId)

        let sequence_cloned = updated_sequence

        if (!sequence_cloned) {
          throw Error('Sequence does not exist')
        }

        if (set_sequences) {
          set_sequences(saved_state.sequences)
        }

        editor.currentSequenceData = sequence_cloned

        editor.updateMotionPaths(sequence_cloned)

        editor.cubes3D.forEach((cube) => {
          if (!cube.hidden && cube.id === playerConfig.id) {
            let cube_config: Cube3DConfig = cube.toConfig()
            let new_layer: Layer = LayerFromConfig.fromCube3DConfig(cube_config)
            layers.push(new_layer)
          }
        })

        setLayers(layers)

        update()

        toast.success('Player Character added!')
      } catch (error: any) {
        console.error('add player character error', error)
        toast.error(error.message || 'An error occurred')
      }
    },
    [set_sequences, setLayers, layers]
  )

  const brushClick = async (brushType: BrushType) => {
    let editor = editorRef.current
    let editor_state = editorStateRef.current

    if (!editor || !editor_state || !currentSequenceId) {
      return
    }

    // Toggle brush drawing mode
    editor.brushDrawingMode = !editor.brushDrawingMode

    if (editor.brushDrawingMode) {
      // Create new brush with default config

      const new_id = uuidv4()

      const random_number_800 = getRandomNumber(100, editor.settings?.dimensions.width || 900)
      const random_number_450 = getRandomNumber(100, editor.settings?.dimensions.height || 550)

      const defaultBrushConfig: SavedBrushConfig = {
        id: new_id,
        name: 'New Brush',
        brushType,
        size: 20.0,
        opacity: 0.7,
        flow: 0.5,
        spacing: 0.25,
        primaryColor: [255, 255, 255, 255] as [number, number, number, number],
        secondaryColor: [0, 0, 0, 0] as [number, number, number, number],
        noiseScale: 0.01,
        octaves: 4,
        persistence: 0.5,
        randomSeed: Math.random() * 1000,
        // position: {
        //   x: random_number_800,
        //   y: random_number_450
        // },
        position: {
          x: 0,
          y: 0
        },
        dimensions: [1, 1] as [number, number],
        layer: layers.length,
        rotation: 0,
        // defaults
        dotDensity: 10,
        lineAngle: 15,
        lineSpacing: 1.5,
        cellSize: 50.0,
        strokes: []
      }

      editor.add_brush(defaultBrushConfig, new_id, currentSequenceId)

      update()

      toast.success(`Brush (type ${brushType}) mode enabled!`)
    } else {
      toast.success('Brush mode disabled!')
    }
  }

  return (
    <>
      {userMessage && (
        <div className="bg-blue-100 text-blue-800 p-2 rounded mb-4">
          {userMessage}
          {uploadProgress > 0 && uploadProgress < 99 ? <span> {uploadProgress}%</span> : <></>}
        </div>
      )}

      <div className="flex flex-col ">
        {options.includes('square') && (
          <span className="block mb-2 text-white text-xs">2D Elements</span>
        )}
        <div className="flex flex-row flex-wrap gap-2 mb-4">
          {options.includes('page') && (
            <OptionButton
              style={{}}
              label={t('Add Page')}
              icon="file-plus"
              callback={() => {
                if (!currentSequenceId || !on_create_sequence) {
                  return
                }

                on_create_sequence()
              }}
            />
          )}

          {options.includes('square') && (
            <OptionButton
              style={{}}
              label={t('Add Square')}
              icon="square"
              aria-label="Add a square shape to the canvas"
              callback={() => {
                if (!currentSequenceId) {
                  return
                }

                on_add_square(currentSequenceId)
              }}
            />
          )}

          {options.includes('circle') && (
            <OptionButton
              style={{}}
              label={t('Add Circle')}
              icon="circle"
              aria-label="Add a circle shape to the canvas"
              callback={() => {
                if (!currentSequenceId) {
                  return
                }

                on_add_square(currentSequenceId, true) // true for isCircle
              }}
            />
          )}

          {options.includes('text') && (
            <OptionButton
              style={{}}
              label={t('Add Text')}
              icon="text"
              aria-label="Add a text element to the canvas"
              callback={() => {
                if (!currentSequenceId) {
                  return
                }

                on_add_text(currentSequenceId)
              }}
            />
          )}

          {options.includes('textRoll') && (
            <OptionButton
              style={{}}
              label={t('Add Text Roll')}
              icon="text"
              aria-label="Create animated text roll with multiple text blocks"
              callback={() => {
                setTextRollModalOpen(true)
              }}
            />
          )}
        </div>
        {options.includes('image') && <span className="block mb-2 text-white text-xs">Media</span>}
        <div className="flex flex-row flex-wrap gap-2 mb-4">
          {options.includes('image') && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                aria-label="Select image file to upload"
                onChange={(e) => {
                  // Handle the selected file here
                  if (!e.target.files || !currentSequenceId) {
                    return
                  }

                  const file = e.target.files[0]
                  if (file) {
                    // Do something with the file
                    console.log('Selected file:', file)
                    on_add_image(currentSequenceId, file)
                  }
                }}
              />
              <OptionButton
                style={{}}
                label={t('Add Image')}
                icon="image"
                aria-label="Browse and add an image file to the canvas"
                callback={() => fileInputRef.current?.click()}
              />
            </>
          )}

          {options.includes('video') && (
            <OptionButton
              style={{}}
              label={t('Add Video')}
              icon="video"
              aria-label="Browse and add a video file to the canvas"
              callback={() => {
                if (!currentSequenceId) {
                  return
                }
                on_add_video(currentSequenceId)
              }}
            />
          )}

          {options.includes('capture') && (
            <OptionButton
              redHot={isCapturing}
              style={{}}
              label={isCapturing ? 'Stop Capture' : 'Screen Capture'}
              icon={isCapturing ? 'pause' : 'video'}
              aria-label={isCapturing ? 'Stop screen recording' : 'Start screen recording'}
              callback={() => {
                if (isCapturing) {
                  handleStopCapture()
                } else {
                  handleStartCapture()
                }
              }}
            />
          )}

          {options.includes('stickers') && (
            <>
              <OptionButton
                style={{}}
                label={t('Add Sticker')}
                icon="sticker"
                callback={() => {
                  setStickerModalOpen(true)
                }}
              />
              <Dialog
                open={stickerModalOpen}
                onClose={() => setStickerModalOpen(false)}
                className="relative z-50"
              >
                <div className="fixed inset-0 bg-black/25" />
                <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
                  <DialogPanel className="max-w-4xl space-y-4 border bg-white p-8 rounded-lg">
                    <DialogTitle className="font-bold text-xl">Choose a Sticker</DialogTitle>
                    <Description>Select a sticker to add to your project.</Description>
                    <div className="grid grid-cols-6 gap-4 max-h-96 overflow-y-auto">
                      {availableStickers.map((sticker) => (
                        <button
                          key={sticker}
                          onClick={() => handleStickerSelect(sticker)}
                          className="aspect-square border-2 border-gray-200 rounded-lg p-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <img
                            src={`/stickers/${sticker}`}
                            alt={sticker.replace('.png', '')}
                            className="w-full h-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setStickerModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </DialogPanel>
                </div>
              </Dialog>
            </>
          )}

          {options.includes('imageGeneration') && (
            <>
              <OptionButton
                style={{}}
                label={t('Generate Image')}
                icon="image"
                callback={() => {
                  setGenerateImageModalOpen(true)
                }}
              />
              <Dialog
                open={generateImageModalOpen}
                onClose={() => setGenerateImageModalOpen(false)}
                className="relative z-50"
              >
                <div className="fixed inset-0 bg-black/25" />
                <div className="text-black fixed inset-0 flex w-screen items-center justify-center p-4">
                  <DialogPanel className="max-w-lg space-y-4 border bg-white p-12 rounded-lg">
                    <DialogTitle className="font-bold">Generate New Image</DialogTitle>
                    <Description>
                      This will enable you to create images which you can use freely in your
                      projects.
                    </Description>
                    <div>
                      <textarea
                        placeholder="A dog eating food with delight..."
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-md resize-none"
                        value={generateImagePrompt}
                        onChange={(e) => setGenerateImagePrompt(e.target.value)}
                        disabled={isGeneratingImage}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setGenerateImageModalOpen(false)}
                        disabled={isGeneratingImage}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || !generateImagePrompt.trim()}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingImage ? 'Generating...' : 'Generate'}
                      </button>
                    </div>
                  </DialogPanel>
                </div>
              </Dialog>
            </>
          )}
        </div>

        <span className="block mb-2 text-white text-xs">3D Elements</span>
        <div className="flex flex-row flex-wrap gap-2 mb-4">
          {options.includes('cube3d') && (
            <OptionButton
              style={{}}
              label={t('Add 3D Cube')}
              icon="cube"
              aria-label="Add a 3D cube to the canvas"
              callback={() => {
                if (!editorRef.current || !currentSequenceId) {
                  return
                }

                const editor = editorRef.current
                const editor_state = editorStateRef.current

                if (!editor || !editor_state || !editor.settings) {
                  return
                }

                const random_number_800 = getRandomNumber(100, editor.settings.dimensions.width)
                const random_number_450 = getRandomNumber(100, editor.settings.dimensions.height)

                const new_id = uuidv4()

                const cubeConfig: Cube3DConfig = {
                  id: new_id,
                  name: '3D Cube',
                  dimensions: [0.5, 0.5, 0.2],
                  position: {
                    x: 0,
                    y: 0
                  },
                  rotation: [0, 0, 0],
                  backgroundFill: {
                    type: 'Color',
                    value: [0.5, 0.7, 1.0, 1.0]
                  },
                  layer: layers.length
                }

                editor.add_cube3d(cubeConfig, new_id, currentSequenceId)

                editor_state.add_saved_cube3d(currentSequenceId, cubeConfig)

                let saved_state = editor_state.savedState

                let updated_sequence = saved_state.sequences.find((s) => s.id == currentSequenceId)

                let sequence_cloned = updated_sequence

                if (!sequence_cloned) {
                  throw Error('Sequence does not exist')
                }

                if (set_sequences) {
                  set_sequences(saved_state.sequences)
                }

                editor.currentSequenceData = sequence_cloned

                editor.updateMotionPaths(sequence_cloned)

                editor.cubes3D.forEach((cube) => {
                  if (!cube.hidden && cube.id === cubeConfig.id) {
                    let cube_config: Cube3DConfig = cube.toConfig()
                    let new_layer: Layer = LayerFromConfig.fromCube3DConfig(cube_config)
                    layers.push(new_layer)
                  }
                })

                setLayers(layers)

                update()
              }}
            />
          )}

          {options.includes('sphere3d') && (
            <OptionButton
              style={{}}
              label={t('Add 3D Sphere')}
              icon="circle"
              aria-label="Add a 3D sphere to the canvas"
              callback={() => {
                if (!editorRef.current || !currentSequenceId) {
                  return
                }

                const editor = editorRef.current
                const editor_state = editorStateRef.current

                if (!editor || !editor_state || !editor.settings) {
                  return
                }

                const random_number_800 = getRandomNumber(100, editor.settings.dimensions.width)
                const random_number_450 = getRandomNumber(100, editor.settings.dimensions.height)

                const new_id = uuidv4()

                const sphereConfig: Sphere3DConfig = {
                  id: new_id,
                  name: '3D Sphere',
                  radius: 0.5,
                  position: {
                    x: 0,
                    y: 0
                  },
                  rotation: [0, 0, 0],
                  backgroundFill: {
                    type: 'Color',
                    value: [1.0, 0.5, 0.7, 1.0]
                  },
                  layer: layers.length
                }

                editor.add_sphere3d(sphereConfig, new_id, currentSequenceId)

                editor_state.add_saved_sphere3d(currentSequenceId, sphereConfig)

                let saved_state = editor_state.savedState

                let updated_sequence = saved_state.sequences.find((s) => s.id == currentSequenceId)

                let sequence_cloned = updated_sequence

                if (!sequence_cloned) {
                  throw Error('Sequence does not exist')
                }

                if (set_sequences) {
                  set_sequences(saved_state.sequences)
                }

                editor.currentSequenceData = sequence_cloned

                editor.updateMotionPaths(sequence_cloned)

                editor.spheres3D.forEach((sphere) => {
                  if (!sphere.hidden && sphere.id === sphereConfig.id) {
                    let sphere_config: Sphere3DConfig = sphere.toConfig()
                    let new_layer: Layer = LayerFromConfig.fromSphere3DConfig(sphere_config)
                    layers.push(new_layer)
                  }
                })

                setLayers(layers)

                update()
              }}
            />
          )}
          {options.includes('mockup3d') && (
            <OptionButton
              style={{}}
              label={t('Add Laptop Mockup')}
              icon="laptop"
              aria-label="Add a laptop mockup with video screen"
              callback={() => {
                if (!currentSequenceId) {
                  return
                }
                on_add_mockup3d(currentSequenceId)
              }}
            />
          )}
          {options.includes('model3d') && (
            <>
              <OptionButton
                style={{}}
                label={t('Import 3D Model')}
                icon="cube"
                aria-label="Import a 3D model (GLB/GLTF)"
                callback={() => {
                  if (!currentSequenceId) {
                    return
                  }
                  on_add_model3d(currentSequenceId)
                }}
              />
              <OptionButton
                style={{}}
                label={t('Add Player Character')}
                icon="user"
                aria-label="Add a player character to the scene"
                callback={() => {
                  if (!currentSequenceId) {
                    return
                  }
                  on_add_player_character(currentSequenceId)
                }}
              />
            </>
          )}
        </div>
        {options.includes('brush') && (
          <>
            <span className="block mb-2 text-white text-xs">Brushes</span>
            <div className="flex flex-row flex-wrap gap-2 mb-4">
              <>
                {/* <option value={BrushType.Noise}>Noise</option>
                        <option value={BrushType.Dots}>Dots</option>
                        <option value={BrushType.Lines}>Lines</option>
                        <option value={BrushType.Voronoi}>Voronoi</option>
                        <option value={BrushType.Fractal}>Fractal</option>
                        <option value={BrushType.Gradient}>Gradient</option>
                        <option value={BrushType.Splatter}>Splatter</option> */}
                <OptionButton
                  style={{}}
                  label={t('Noise Brush')}
                  icon="brush"
                  aria-label="Enable procedural brush drawing mode"
                  callback={() => brushClick(BrushType.Noise)}
                />
                <OptionButton
                  style={{}}
                  label={t('Dots Brush')}
                  icon="brush"
                  aria-label="Enable procedural brush drawing mode"
                  callback={() => brushClick(BrushType.Dots)}
                />
                <OptionButton
                  style={{}}
                  label={t('Lines Brush')}
                  icon="brush"
                  aria-label="Enable procedural brush drawing mode"
                  callback={() => brushClick(BrushType.Lines)}
                />
                <OptionButton
                  style={{}}
                  label={t('Voronoi Brush')}
                  icon="brush"
                  aria-label="Enable procedural brush drawing mode"
                  callback={() => brushClick(BrushType.Voronoi)}
                />
                <OptionButton
                  style={{}}
                  label={t('Fractal Brush')}
                  icon="brush"
                  aria-label="Enable procedural brush drawing mode"
                  callback={() => brushClick(BrushType.Fractal)}
                />
                <OptionButton
                  style={{}}
                  label={t('Gradient Brush')}
                  icon="brush"
                  aria-label="Enable procedural brush drawing mode"
                  callback={() => brushClick(BrushType.Gradient)}
                />
                <OptionButton
                  style={{}}
                  label={t('Splatter Brush')}
                  icon="brush"
                  aria-label="Enable procedural brush drawing mode"
                  callback={() => brushClick(BrushType.Splatter)}
                />
              </>
            </div>
          </>
        )}
        {options.includes('repeat') && (
          <>
            <span className="block mb-2 text-white text-xs">Repeat FX</span>
            <div className="flex flex-row flex-wrap gap-2 mb-4">
              <OptionButton
                style={{}}
                label={t('Matrix Polygons')}
                icon="cube"
                aria-label="Create Matrix-style animated Polygons"
                callback={() => {
                  if (!currentSequenceId) {
                    return
                  }
                  // on_add_model3d(currentSequenceId)
                }}
              />
              <OptionButton
                style={{}}
                label={t('Floating Speheres')}
                icon="sphere"
                aria-label="Create animated floating spheres"
                callback={() => {
                  if (!currentSequenceId) {
                    return
                  }
                  // on_add_model3d(currentSequenceId)
                }}
              />
            </div>
          </>
        )}
      </div>

      <SourceSelectionModal
        isOpen={isSourceModalOpen}
        setIsOpen={setIsSourceModalOpen}
        onSourceSelected={handleSourceSelected}
      />

      <TextRollModal
        isOpen={textRollModalOpen}
        onClose={() => setTextRollModalOpen(false)}
        onConfirm={(config) => {
          if (!currentSequenceId) {
            return
          }
          on_add_text_roll(currentSequenceId, config)
        }}
      />
    </>
  )
}

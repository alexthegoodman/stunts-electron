'use client'

import React, { useEffect, useRef, useState } from 'react'
import { quat, vec2 } from 'gl-matrix'
import {
  DebouncedInput,
  ExportVideoButton,
  MiniSquareButton,
  NavButton,
  OptionButton,
  PlaySequenceButton,
  PlayVideoButton
} from './items'
import { CreateIcon } from './icon'
import {
  AnimationData,
  AnimationProperty,
  BackgroundFill,
  findObjectType,
  GradientStop,
  ObjectType,
  ProjectSettings,
  SavedState,
  Sequence,
  TimelineSequence,
  TrackType,
  UIKeyframe,
  KeyframeValue,
  EasingType,
  PathType,
  getSequenceDuration,
  SavedGridStateConfig
} from '../../engine/animations'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from '../../hooks/useRouter'
import { useLocalStorage } from '@uidotdev/usehooks'
import {
  AuthToken,
  getSingleProject,
  getUploadedImageData,
  saveImage,
  saveSequencesData,
  saveSettingsData,
  saveTimelineData,
  saveVideo,
  updateSequences,
  updateTimeline
} from '../../fetchers/projects'
import { useDevEffectOnce } from '../../hooks/useDevOnce'
import {
  CANVAS_HORIZ_OFFSET,
  CANVAS_VERT_OFFSET,
  Editor,
  Point,
  Viewport
} from '../../engine/editor'
import { getRandomNumber, InputValue, rgbToWgpu, wgpuToHuman } from '../../engine/editor/helpers'
import { fileToBlob, StImageConfig } from '../../engine/image'
import { TextRendererConfig } from '../../engine/text'
import { PolygonConfig } from '../../engine/polygon'
import EditorState, { SaveTarget } from '../../engine/editor_state'
import LayerPanel, { Layer, LayerFromConfig } from './layers'
import { CanvasPipeline } from '../../engine/pipeline'
import { WebCapture } from '../../engine/capture'
import { ToolGrid } from './ToolGrid'
import { WindowSize } from '../../engine/camera'
import { ThemePicker } from './ThemePicker'
import { ShaderThemePicker } from './ShaderThemePicker'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import useSWR from 'swr'
import { getCurrentUser } from '../../hooks/useCurrentUser'
import { ProjectSelector } from '../ProjectSelector'
import Container from '@renderer/engine/container'

const DEFAULT_AD_SIZE = 200

export const AdEditor: React.FC<any> = ({ projectId }) => {
  const { t } = useTranslation('common')

  const router = useRouter()
  const [authToken] = useLocalStorage<AuthToken | null>('auth-token', null)

  const { data: user } = useSWR('currentUser', () => getCurrentUser(''))

  let [settings, set_settings] = useState<ProjectSettings | undefined | null>(null)
  let [sequences, set_sequences] = useState<Sequence[]>([])
  let [error, set_error] = useState<string | null>(null)
  let [loading, set_loading] = useState(false)
  let [section, set_section] = useState('SequenceList')
  let [grid, set_grid] = useState<SavedGridStateConfig | null>(null)

  let [layers, set_layers] = useState<Layer[]>([])
  let [dragger_id, set_dragger_id] = useState(null)
  let [current_sequence_id, set_current_sequence_id] = useState<string | null>(null)

  let [toolbarTab, setToolbarTab] = useState('none')

  // Text Animation state
  let [selectedTextId, setSelectedTextId] = useState<string | null>(null)

  let [selected_polygon_id, set_selected_polygon_id] = useState<string | null>(null)
  let [selected_image_id, set_selected_image_id] = useState<string | null>(null)
  let [selected_text_id, set_selected_text_id] = useState<string | null>(null)
  let [selected_video_id, set_selected_video_id] = useState<string | null>(null)

  const editorRef = useRef<Container | null>(null)
  const editorStateRef = useRef<EditorState | null>(null)
  // const canvasPipelineRef = useRef<CanvasPipeline | null>(null)
  // const webCaptureRef = useRef<WebCapture | null>(null)
  const [editorIsSet, setEditorIsSet] = useState(false)
  const [editorStateSet, setEditorStateSet] = useState(false)
  const [refreshUINow, setRefreshUINow] = useState(Date.now())
  const [project_name, set_project_name] = useState('Loading...')

  let setupCanvasMouseTracking = (editor: Editor, canvas: HTMLCanvasElement) => {
    // let editor = editorRef.current

    if (!editor) {
      return
    }

    function getCanvasCoordinates(canvas: HTMLCanvasElement, event: PointerEvent) {
      const rect = canvas.getBoundingClientRect()

      // Get mouse position relative to the scaled canvas
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      // Convert to canvas internal coordinates
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height

      return {
        x: mouseX * scaleX,
        y: mouseY * scaleY
      }
    }

    canvas.addEventListener('pointermove', (event: PointerEvent) => {
      const coords = getCanvasCoordinates(canvas, event)
      editor.handle_mouse_move(coords.x, coords.y)
    })

    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId)
      const coords = getCanvasCoordinates(canvas, event)
      editor.handle_mouse_down(coords.x, coords.y)
    })

    canvas.addEventListener('pointerup', (event) => {
      console.info('handle mouse up')
      canvas.releasePointerCapture(event.pointerId)
      editor.handle_mouse_up()
    })

    canvas.addEventListener('pointercancel', (event) => {
      console.info('pointer cancelled - treating as mouse up')
      canvas.releasePointerCapture(event.pointerId)
      editor.handle_mouse_up()
    })
  }

  let select_polygon = (polygon_id: string) => {
    set_selected_polygon_id(polygon_id)
    set_selected_text_id(null)
    set_selected_image_id(null)
    set_selected_video_id(null)
  }

  let select_text = (text_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(text_id)
    set_selected_image_id(null)
    set_selected_video_id(null)
    // Also set for text animations
    setSelectedTextId(text_id)
  }

  let select_image = (image_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(null)
    set_selected_image_id(image_id)
    set_selected_video_id(null)
  }

  let handle_polygon_click = (polygon_id: string) => {
    select_polygon(polygon_id)
  }

  let handle_text_click = (
    text_id: string
    // polygon_config: PolygonConfig
  ) => {
    select_text(text_id)
  }

  let handle_image_click = (
    image_id: string
    // polygon_config: PolygonConfig
  ) => {
    select_image(image_id)
  }

  useDevEffectOnce(() => {
    if (editorIsSet) {
      return
    }

    console.info('Starting Editor...')

    setEditorIsSet(true)
  })

  useEffect(() => {
    console.info('remount')
  }, [])

  let fetch_data = async () => {
    try {
      set_loading(true)

      console.info('fetch data ', projectId)

      let response = await getSingleProject('', projectId)

      localStorage.setItem('stored-project', JSON.stringify({ project_id: projectId }))

      let fileName = response.project?.name || ''
      let fileData = response.project?.adData

      console.info('savedState', fileData)

      if (!fileData) {
        toast.error('No file data')

        return
      }

      let cloned_sequences = fileData?.sequences
      let cloned_settings = fileData?.settings
      let cloned_grid = fileData?.grid_state

      if (!cloned_settings) {
        cloned_settings = {
          dimensions: {
            width: DEFAULT_AD_SIZE,
            height: DEFAULT_AD_SIZE
          }
        }
      }

      if (!cloned_sequences) {
        return
      }

      console.info('cloned_settings', cloned_settings)

      set_settings(cloned_settings)
      set_sequences(cloned_sequences)
      set_grid(cloned_grid)
      set_project_name(fileName)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch project data')
      set_loading(false)
      set_error(error.message || 'Unknown error')
      return
    }
  }

  useEffect(() => {
    if (editorIsSet) {
      console.info('Fetch data...')

      fetch_data()
    }
  }, [editorIsSet])

  let set_data = async () => {
    let viewport = new Viewport(settings.dimensions.width, settings.dimensions.height)

    let initializers = await sequences.map(async (sequence, i) => {
      let editor = new Editor(viewport)

      editor.currentSequenceData = sequence
      editor.settings = settings

      let pipeline = new CanvasPipeline()

      await pipeline.new(
        editor,
        true,
        `ad-canvas-${sequence.id}`,
        // {
        //   width: 900,
        //   height: 550,
        // },
        settings.dimensions,
        false // NOTE: important so that ads aren't re rendered on every frame, since there are many canvases, will want to only render when changes occur
      )

      await pipeline.beginRendering(editor)

      return [editor, pipeline] as [Editor, CanvasPipeline]
    })

    let editors = await Promise.all(initializers)
    editorRef.current = new Container(editors)

    let effectiveFileData = {
      sequences: sequences,
      settings: settings,
      timeline_state: null,
      grid_state: grid
    }

    editorStateRef.current = new EditorState(effectiveFileData)

    console.info('Restoring objects...')

    let i = 0
    for (let pair of editors) {
      await pair[0].restore_sequence_objects(pair[0].currentSequenceData, false, settings)

      // // set handlers
      const canvas = document.getElementById(
        `ad-canvas-${pair[0].currentSequenceData.id}`
      ) as HTMLCanvasElement
      setupCanvasMouseTracking(pair[0], canvas)

      on_open_sequence(pair[0], pair[0].currentSequenceData.id)

      i++
    }

    console.info('Setting event handlers!')

    // set handlers that rely on state
    editorRef.current.editors.forEach(([editor, pipeline]) => {
      editor.handlePolygonClick = handle_polygon_click
      editor.handleTextClick = handle_text_click
      editor.handleImageClick = handle_image_click
    })

    set_loading(false)
    setEditorStateSet(true)
  }

  useEffect(() => {
    if (!project_name) {
      return
    }

    set_data()
  }, [project_name])

  let on_open_sequence = (editor: Editor, sequence_id: string) => {
    try {
      set_section('SequenceView')

      console.info('Open Sequence...')

      let editor_state = editorStateRef.current

      if (!editor || !editor_state) {
        toast.error('Your editor or editor state failed to initialize')
        return
      }

      let saved_state = editor_state?.savedState

      if (!saved_state) {
        toast.error('No saved state found')
        return
      }

      let saved_sequence = saved_state.sequences.find((s) => s.id == sequence_id)

      if (!saved_sequence) {
        toast.error('Sequence not found')
        return
      }

      let background_fill = {
        type: 'Color',
        value: [
          wgpuToHuman(0.8) as number,
          wgpuToHuman(0.8) as number,
          wgpuToHuman(0.8) as number,
          255
        ]
      } as BackgroundFill

      if (saved_sequence?.backgroundFill) {
        background_fill = saved_sequence.backgroundFill
      }

      // for the background polygon and its signal
      editor_state.selected_polygon_id = saved_sequence.id

      // drop(editor_state);

      console.info('Opening Sequence...')

      // let mut editor = editor.lock().unwrap();

      // let camera = editor.camera.expect("Couldn't get camera");
      // let viewport = editor.viewport.lock().unwrap();

      // let window_size = WindowSize {
      //     width: viewport.width as u32,
      //     height: viewport.height as u32,
      // };

      // drop(viewport);

      // let mut rng = rand::thread_rng();

      // set hidden to false based on sequence
      // also reset all objects to hidden=true beforehand
      editor.polygons.forEach((p) => {
        p.hidden = true
      })
      editor?.imageItems.forEach((i) => {
        i.hidden = true
      })
      editor?.textItems.forEach((t) => {
        t.hidden = true
      })

      saved_sequence.activePolygons.forEach((ap) => {
        let polygon = editor.polygons.find((p) => p.id == ap.id)

        if (!polygon) {
          return
        }

        polygon.hidden = false
      })
      saved_sequence.activeImageItems.forEach((si) => {
        let image = editor.imageItems.find((i) => i.id == si.id)

        if (!image) {
          return
        }

        image.hidden = false
      })
      saved_sequence.activeTextItems.forEach((tr) => {
        let text = editor.textItems.find((t) => t.id == tr.id)

        if (!text) {
          return
        }

        text.hidden = false
      })

      if (!editor.camera) {
        toast.error('No camera found in editor')
        return
      }

      let backgroundSize: WindowSize = {
        width: editor.camera?.windowSize.width - 50,
        height: editor.camera?.windowSize.height - 50
      }

      // if (background_fill.type === "Color") {
      editor.replace_background(
        saved_sequence.id,
        // rgbToWgpu(
        //   background_fill.value[0],
        //   background_fill.value[1],
        //   background_fill.value[2],
        //   background_fill.value[3]
        // )
        background_fill,
        backgroundSize
      )
      // }

      console.info('Objects restored!', saved_sequence.id)

      editor?.updateMotionPaths(saved_sequence)

      console.info('Motion Paths restored!')

      console.info('Restoring layers...')

      let new_layers: Layer[] = []
      editor.polygons.forEach((polygon) => {
        if (!polygon.hidden) {
          let polygon_config: PolygonConfig = polygon.toConfig(editor.camera.windowSize)
          let new_layer: Layer = LayerFromConfig.fromPolygonConfig(polygon_config)
          new_layers.push(new_layer)
        }
      })
      editor.textItems.forEach((text) => {
        if (!text.hidden) {
          let text_config: TextRendererConfig = text.toConfig(editor.camera.windowSize)
          let new_layer: Layer = LayerFromConfig.fromTextConfig(text_config)
          new_layers.push(new_layer)
        }
      })
      editor.imageItems.forEach((image) => {
        if (!image.hidden) {
          let image_config: StImageConfig = image.toConfig(editor.camera.windowSize)
          let new_layer: Layer = LayerFromConfig.fromImageConfig(image_config)
          new_layers.push(new_layer)
        }
      })

      // console.info("new_layers", new_layers);

      // sort layers by layer_index property, lower values should come first in the list
      // but reverse the order because the UI outputs the first one first, thus it displays last
      new_layers.sort((a, b) => b.initial_layer_index - a.initial_layer_index)

      set_layers(new_layers)
      console.info('set current', sequence_id)
      set_current_sequence_id(sequence_id)

      toast.success(`Opened sequence ${saved_sequence.name}`)
    } catch (error: any) {
      console.error('Error opening sequence:', error)
      toast.error('Failed to open sequence')
      set_loading(false)
      set_error(error.message || 'Unknown error')
      return
    }

    // set_quick_access();

    // drop(editor);
  }

  const handleObjectDragEnd = (animation: AnimationData, newStartTimeMs: number) => {
    let editor = editorRef.current
    let editor_state = editorStateRef.current

    if (!editor || !editor_state) {
      return
    }

    editor_state.savedState.sequences.forEach((s) => {
      if (s.id === current_sequence_id) {
        s.polygonMotionPaths?.forEach((pm) => {
          if (pm.id === animation.id) {
            pm.startTimeMs = newStartTimeMs
          }
        })
      }
    })

    console.info('animation updated', animation, newStartTimeMs)

    saveSequencesData(editor_state.savedState.sequences, SaveTarget.Videos)
  }

  return (
    <>
      {error ? (
        <div>
          <span>
            {t('Error')}: {error}
          </span>
        </div>
      ) : (
        <></>
      )}
      {loading ? (
        <div>
          <span>{t('Loading')}...</span>
        </div>
      ) : (
        <></>
      )}

      <div className="flex flex-row mb-2 gap-4 justify-between w-full">
        <div className="flex flex-row gap-4 items-center">
          <ProjectSelector currentProjectId={projectId} currentProjectName={project_name} />
        </div>
        {/* {editorStateSet && (
          <ExportVideoButton editorRef={editorRef} editorStateRef={editorStateRef} />
        )} */}
      </div>

      <div className="flex flex-col w-full">
        <div className="flex md:flex-row flex-col justify-between items-top w-full gap-2 md:h-full">
          <div className="md:h-full">
            <div className={`w-full md:mx-auto overflow-hidden`}>
              <div className="flex flex-row gap-2 p-3">
                <MiniSquareButton
                  onClick={() => {
                    if (toolbarTab === 'tools') {
                      setToolbarTab('none')
                    } else {
                      setToolbarTab('tools')
                    }
                  }}
                  icon={'toolbox'}
                  label={'Tools'}
                />
                <MiniSquareButton
                  onClick={() => {
                    if (toolbarTab === 'themes') {
                      setToolbarTab('none')
                    } else {
                      setToolbarTab('themes')
                    }
                  }}
                  icon={'palette'}
                  label={'Themes'}
                />
              </div>
            </div>

            <div className="px-3 max-w-96">
              {toolbarTab === 'tools' && (
                <div>
                  {/* <ToolGrid
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    webCaptureRef={null}
                    currentSequenceId={current_sequence_id}
                    set_sequences={set_sequences}
                    options={[
                      'square',
                      'circle',
                      'text',
                      'image',
                      'imageGeneration',
                      'stickers',
                      'brush',
                    ]}
                    layers={layers}
                    setLayers={set_layers}
                    update={() => {
                      setRefreshUINow(Date.now())
                    }}
                  /> */}
                </div>
              )}

              {toolbarTab === 'themes' && current_sequence_id && (
                <div className="max-h-[35vh] md:max-h-full overflow-y-scroll overflow-x-hidden">
                  {/* <ThemePicker
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    currentSequenceId={current_sequence_id}
                    saveTarget={SaveTarget.Videos}
                    userLanguage={user?.userLanguage || 'en'}
                  /> */}
                </div>
              )}
            </div>
          </div>

          <section className="flex flex-row flex-wrap gap-4 justify-center items-center w-[75vw]">
            {grid?.columns?.map((column, i) => {
              return (
                <section key={column.id} className="flex flex-col gap-4 items-center">
                  <span className="font-medium">{column.name}</span>
                  {column.adIds.map((adId) => {
                    let adData = sequences.find((seq) => seq.id === adId)

                    return (
                      <div
                        key={`ad-canvas-wrap-${adId}`}
                        className="flex flex-col gap-4 items-center"
                      >
                        <span>{adData.name}</span>
                        <div
                          id={`ad-canvas-wrapper-${adId}`}
                          style={{
                            aspectRatio:
                              (settings?.dimensions.width || DEFAULT_AD_SIZE) /
                              (settings?.dimensions.height || DEFAULT_AD_SIZE),
                            maxWidth: settings?.dimensions.width || DEFAULT_AD_SIZE
                          }}
                        >
                          <canvas
                            id={`ad-canvas-${adId}`}
                            className={`w-[${settings?.dimensions.width || DEFAULT_AD_SIZE}px] h-[${settings?.dimensions.height || DEFAULT_AD_SIZE}px] border border-black rounded-[15px] shadow-[0_0_15px_4px_rgba(0,0,0,0.16)]`}
                            width={settings?.dimensions.width || DEFAULT_AD_SIZE}
                            height={settings?.dimensions.height || DEFAULT_AD_SIZE}
                          />
                        </div>
                      </div>
                    )
                  })}
                </section>
              )
            })}
          </section>
        </div>
      </div>
    </>
  )
}

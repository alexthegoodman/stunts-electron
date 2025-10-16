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
  getSequenceDuration
} from '../../engine/animations'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from '../../hooks/useRouter'
import { useLocalStorage } from '@uidotdev/usehooks'
import {
  AuthToken,
  getSingleProject,
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
import { StVideoConfig } from '../../engine/video'
import { fileToBlob, StImageConfig } from '../../engine/image'
import { TextRendererConfig } from '../../engine/text'
import { PolygonConfig } from '../../engine/polygon'
import { Cube3DConfig } from '../../engine/cube3d'
import { Sphere3DConfig } from '../../engine/sphere3d'
import EditorState, { SaveTarget } from '../../engine/editor_state'
import LayerPanel, { Layer, LayerFromConfig } from './layers'
import { CanvasPipeline } from '../../engine/pipeline'
import {
  ImageProperties,
  PolygonProperties,
  VideoProperties,
  Cube3DProperties,
  Sphere3DProperties,
  Mockup3DProperties,
  Model3DProperties
} from './Properties'
import BrushProperties from './BrushProperties'
import { callMotionInference } from '../../fetchers/inference'
import KeyframeTimeline from './KeyframeTimeline'
import { TimelineTrack } from './SequenceTimeline'
import { WebCapture } from '../../engine/capture'
import { ToolGrid } from './ToolGrid'
import { PageSequence } from '../../engine/data'
import { WindowSize } from '../../engine/camera'
import { Camera3D } from '../../engine/3dcamera'
import { ThemePicker } from './ThemePicker'
import { ShaderThemePicker } from './ShaderThemePicker'
import { ObjectTrack } from './ObjectTimeline'
import { TimelineTicks } from './TimelineTicks'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  CameraRotate,
  Check,
  Hamburger,
  MagicWand,
  Palette,
  Stack,
  Toolbox,
  WaveSawtooth,
  ArrowDown,
  X
} from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { FlowArrow } from '@phosphor-icons/react/dist/ssr'
import useSWR from 'swr'
import { getCurrentUser } from '../../hooks/useCurrentUser'
import TextAnimationPanel from './TextAnimationPanel'
import { Disclosure } from '@headlessui/react'

import AnimationTab from './AnimationTab'
import { Mockup3DConfig } from '../../engine/mockup3d'
import { TextProperties } from './properties/TextProperties'
import { KeyframeProperties } from './properties/KeyframeProperties'
import { Model3DConfig } from '@renderer/engine/model3d'
import { ProjectSelector } from '../ProjectSelector'

export function update_keyframe(
  editor_state: EditorState,
  // mut current_animation_data: AnimationData,
  // mut current_keyframe: &mut UIKeyframe,
  current_keyframe: UIKeyframe,
  current_sequence: Sequence,
  selected_keyframes: string[] | null,
  set_selected_keyframes?: React.Dispatch<React.SetStateAction<string[] | null>>
  // animation_data: RwSignal<Option<AnimationData>>,
  // selected_sequence_data: RwSignal<Sequence>,
  // selected_sequence_id: string
  // sequence_selected: RwSignal<bool>,
) {
  if (!current_sequence.polygonMotionPaths) {
    return
  }

  if (selected_keyframes && set_selected_keyframes) {
    let selected_keyframe = selected_keyframes[0]
    if (current_keyframe.id != selected_keyframe) {
      let new_keyframes: any = []
      new_keyframes.push(current_keyframe.id)

      set_selected_keyframes(new_keyframes)
    }
  } else if (set_selected_keyframes) {
    let new_keyframes: any = []
    new_keyframes.push(current_keyframe.id)

    set_selected_keyframes(new_keyframes)
  }

  // update animation data
  // current_animation_data.properties.iter_mut().for_each(|p| {
  //     p.keyframes.iter_mut().for_each(|mut k| {
  //         if k.id == current_keyframe.id {
  //             *k = current_keyframe.to_owned();
  //         }
  //     });
  // });

  // animation_data.set(Some(current_animation_data));

  // update sequence
  current_sequence.polygonMotionPaths.forEach((pm) => {
    pm.properties.forEach((p) => {
      p.keyframes.forEach((k) => {
        if (k.id == current_keyframe.id) {
          k = current_keyframe
        }
      })
    })
  })

  // set_selected_sequence_data(current_sequence);

  // sequence_selected.set(true);

  // save to file
  // let last_saved_state = editor_state
  //     .saved_state;

  // last_saved_state.sequences.forEach((s) => {
  //     if s.id == selected_sequence_id {
  current_sequence.polygonMotionPaths.forEach((pm) => {
    pm.properties.forEach((p) => {
      p.keyframes.forEach((k) => {
        if (k.id == current_keyframe.id) {
          k = current_keyframe
        }
      })
    })
  })
  // }
  // });

  // TODO: probably perf hit with larger files, or does it get released?
  // let new_saved_state = last_saved_state.to_owned();

  editor_state.savedState.sequences.forEach((s) => {
    if (s.id == current_sequence.id) {
      s = current_sequence
    }
  })

  saveSequencesData(editor_state.savedState.sequences, SaveTarget.Videos)
}

export const VideoEditor: React.FC<any> = ({ projectId }) => {
  const { t } = useTranslation('common')

  const router = useRouter()
  const [authToken] = useLocalStorage<AuthToken | null>('auth-token', null)

  const { data: user } = useSWR('currentUser', () => getCurrentUser(''))

  let [settings, set_settings] = useState<ProjectSettings | undefined | null>(null)
  let [sequences, set_sequences] = useState<Sequence[]>([])
  let [error, set_error] = useState<string | null>(null)
  let [loading, set_loading] = useState(false)
  let [section, set_section] = useState('SequenceList')
  let [keyframe_count, set_keyframe_count] = useState(0)
  let [is_curved, set_is_curved] = useState(false)
  let [auto_choreograph, set_auto_choreograph] = useState(true)
  let [auto_fade, set_auto_fade] = useState(true)

  let [layers, set_layers] = useState<Layer[]>([])
  let [dragger_id, set_dragger_id] = useState(null)
  let [current_sequence_id, set_current_sequence_id] = useState<string | null>(null)

  let [toolbarTab, setToolbarTab] = useState('none')

  // Camera orbit state
  let [orbitX, setOrbitX] = useState(0)
  let [orbitY, setOrbitY] = useState(0)

  // Camera pan state
  let [panX, setPanX] = useState(0)
  let [panY, setPanY] = useState(0)

  let [rotateX, setRotateX] = useState(0)
  let [rotateY, setRotateY] = useState(0)

  let [zoom, setZoom] = useState(0)

  // Text Animation state
  let [selectedTextId, setSelectedTextId] = useState<string | null>(null)

  let [selected_polygon_id, set_selected_polygon_id] = useState<string | null>(null)
  let [selected_image_id, set_selected_image_id] = useState<string | null>(null)
  let [selected_text_id, set_selected_text_id] = useState<string | null>(null)
  let [selected_video_id, set_selected_video_id] = useState<string | null>(null)
  let [selected_cube3d_id, set_selected_cube3d_id] = useState<string | null>(null)
  let [selected_sphere3d_id, set_selected_sphere3d_id] = useState<string | null>(null)
  let [selected_mockup3d_id, set_selected_mockup3d_id] = useState<string | null>(null)
  let [selected_model3d_id, set_selected_model3d_id] = useState<string | null>(null)
  let [selected_keyframes, set_selected_keyframes] = useState<string[] | null>(null)

  let [tSequences, setTSequences] = useState<TimelineSequence[]>([])
  let [sequenceDurations, setSequenceDurations] = useState<Record<string, number>>({})
  let [sequenceQuickAccess, setSequenceQuickAccess] = useState<Record<string, string>>({})

  let [refreshTimeline, setRefreshTimeline] = useState(Date.now())

  const editorRef = useRef<Editor | null>(null)
  const editorStateRef = useRef<EditorState | null>(null)
  const canvasPipelineRef = useRef<CanvasPipeline | null>(null)
  const webCaptureRef = useRef<WebCapture | null>(null)
  const [editorIsSet, setEditorIsSet] = useState(false)
  const [editorStateSet, setEditorStateSet] = useState(false)
  const [refreshUINow, setRefreshUINow] = useState(Date.now())
  const [project_name, set_project_name] = useState('Loading...')
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempProjectName, setTempProjectName] = useState('')

  let setupCanvasMouseTracking = (canvas: HTMLCanvasElement) => {
    let editor = editorRef.current

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
    set_selected_cube3d_id(null)
    set_selected_sphere3d_id(null)
    set_selected_mockup3d_id(null)
    set_selected_model3d_id(null)
  }

  let select_text = (text_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(text_id)
    set_selected_image_id(null)
    set_selected_video_id(null)
    set_selected_cube3d_id(null)
    set_selected_sphere3d_id(null)
    // Also set for text animations
    setSelectedTextId(text_id)
    set_selected_mockup3d_id(null)
  }

  let select_image = (image_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(null)
    set_selected_image_id(image_id)
    set_selected_video_id(null)
    set_selected_cube3d_id(null)
    set_selected_sphere3d_id(null)
    set_selected_mockup3d_id(null)
    set_selected_model3d_id(null)
  }

  let select_video = (video_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(null)
    set_selected_image_id(null)
    set_selected_video_id(video_id)
    set_selected_cube3d_id(null)
    set_selected_sphere3d_id(null)
    set_selected_mockup3d_id(null)
    set_selected_model3d_id(null)
  }

  let select_cube3d = (cube_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(null)
    set_selected_image_id(null)
    set_selected_video_id(null)
    set_selected_cube3d_id(cube_id)
    set_selected_sphere3d_id(null)
    set_selected_mockup3d_id(null)
    set_selected_model3d_id(null)
  }

  let select_sphere3d = (sphere_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(null)
    set_selected_image_id(null)
    set_selected_video_id(null)
    set_selected_cube3d_id(null)
    set_selected_sphere3d_id(sphere_id)
    set_selected_mockup3d_id(null)
    set_selected_model3d_id(null)
  }

  let select_mockup3d = (mockup_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(null)
    set_selected_image_id(null)
    set_selected_video_id(null)
    set_selected_cube3d_id(null)
    set_selected_sphere3d_id(null)
    set_selected_mockup3d_id(mockup_id)
    set_selected_model3d_id(null)
  }

  let select_model3d = (model_id: string) => {
    set_selected_polygon_id(null)
    set_selected_text_id(null)
    set_selected_image_id(null)
    set_selected_video_id(null)
    set_selected_cube3d_id(null)
    set_selected_sphere3d_id(null)
    set_selected_mockup3d_id(null)
    set_selected_model3d_id(model_id)
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

  let handle_video_click = (
    video_id: string
    // polygon_config: PolygonConfig
  ) => {
    select_video(video_id)
  }

  let handle_cube3d_click = (cube_id: string) => {
    select_cube3d(cube_id)
  }

  let handle_sphere3d_click = (sphere_id: string) => {
    select_sphere3d(sphere_id)
  }

  let handle_mockup3d_click = (mockup_id: string) => {
    select_mockup3d(mockup_id)
  }

  let handle_model3d_click = (model_id: string) => {
    select_model3d(model_id)
  }

  let handle_mouse_up = (object_id: string, point: Point): [Sequence, string[]] | null => {
    let editor = editorRef.current

    if (!editor) {
      console.warn('Editor not initialized')
      return null
    }

    let last_saved_state = editorStateRef.current?.savedState

    if (!last_saved_state) {
      return null
    }

    let object_type = findObjectType(last_saved_state, object_id)

    console.info('see type', object_type, 'id', object_id, 'id2', current_sequence_id)

    last_saved_state.sequences.forEach((s) => {
      if (s.id == current_sequence_id) {
        // let hasAssociatedPath = s.polygonMotionPaths?.some(
        //   (motionPath) => motionPath.polygonId === object_id
        // );

        switch (object_type) {
          case ObjectType.Polygon: {
            s.activePolygons.forEach((ap) => {
              if (ap.id == object_id) {
                console.info('updating position...')
                ap.position = {
                  x: point.x,
                  y: point.y
                }
              }
            })
            break
          }
          case ObjectType.TextItem: {
            s.activeTextItems.forEach((tr) => {
              if (tr.id == object_id) {
                console.info('update text pos', point)
                tr.position = {
                  x: point.x,
                  y: point.y
                }
              }
            })
            break
          }
          case ObjectType.ImageItem: {
            s.activeImageItems.forEach((si) => {
              if (si.id == object_id) {
                si.position = {
                  x: point.x,
                  y: point.y
                }
              }
            })
            break
          }
          case ObjectType.VideoItem: {
            console.info('saving point', point)
            let videoDimesions = [0, 0]
            s.activeVideoItems.forEach((si) => {
              if (si.id == object_id) {
                si.position = {
                  x: point.x,
                  y: point.y
                }
                videoDimesions = si.dimensions
              }
            })
            s.polygonMotionPaths?.forEach((si) => {
              if (si.polygonId == object_id) {
                si.position = [point.x - videoDimesions[0] / 2, point.y - videoDimesions[1] / 2]
              }
            })
            break
          }
          case ObjectType.Cube3D: {
            console.info('saving point', point)
            s.activeCubes3D?.forEach((si) => {
              if (si.id == object_id) {
                si.position = {
                  x: point.x,
                  y: point.y
                }
              }
            })
            break
          }
          case ObjectType.Sphere3D: {
            console.info('saving point', point)
            s.activeSpheres3D?.forEach((si) => {
              if (si.id == object_id) {
                si.position = {
                  x: point.x,
                  y: point.y
                }
              }
            })
            break
          }
          case ObjectType.Model3D: {
            console.info('saving point', point)
            s.activeModels3D?.forEach((si) => {
              if (si.id == object_id) {
                si.position = {
                  x: point.x,
                  y: point.y,
                  z: si.position.z ?? 0
                }
              }
            })
            break
          }
        }

        // Update motion path positions when objects are moved
        if (s.polygonMotionPaths) {
          s.polygonMotionPaths.forEach((motionPath) => {
            // if (object_type === ObjectType.VideoItem) {
            //   console.info('getting there....')
            //   let si = editor.videoItems.find((si) => {
            //     if (si.id == object_id) {
            //       return si
            //     }
            //   })

            //   if (si?.mousePath) {
            //     console.info('setting it!!!!', si?.mousePath.transform.position)
            //     motionPath.position = [
            //       si?.mousePath.transform.position[0],
            //       si?.mousePath.transform.position[1]
            //     ]
            //   }
            // } else
            if (motionPath.polygonId === object_id) {
              let livePath = editor.motionPaths.find((mp) => mp.associatedPolygonId === object_id)

              let pathPosition = livePath?.transform.position

              if (pathPosition) {
                // Update the motion path position
                motionPath.position = [pathPosition[0] || 0, pathPosition[1] || 0]
              }
            }
          })
        }
      }
    })

    // last_saved_state.sequences = updatedSequences;

    saveSequencesData(last_saved_state.sequences, SaveTarget.Videos)

    console.info('Position updated!')

    let current_sequence_data = last_saved_state.sequences.find((s) => s.id === current_sequence_id)

    editor?.updateMotionPaths(current_sequence_data!)

    editor.currentSequenceData = current_sequence_data!

    if (!current_sequence_data || !selected_keyframes) {
      return null
    }

    return [current_sequence_data, selected_keyframes]
  }

  let on_handle_mouse_up = (keyframeId: string, objectId: string, point: Point) => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return [null, null] as [Sequence | null, string[] | null]
    }

    let selected_sequence = editorState.savedState.sequences.find(
      (s) => s.id === current_sequence_id
    )

    // if (!selected_keyframes) {
    //   console.warn("Keyframe not found");
    //   return [null, null] as [Sequence | null, string[] | null];
    // }

    if (!selected_sequence || !current_sequence_id) {
      console.warn('Sequence not found')
      return [null, null] as [Sequence | null, string[] | null]
    }

    let is_polygon = selected_sequence?.activePolygons.find((p) => p.id === objectId)
    let is_text = selected_sequence?.activeTextItems.find((p) => p.id === objectId)
    let is_image = selected_sequence?.activeImageItems.find((p) => p.id === objectId)
    let is_video = selected_sequence?.activeVideoItems.find((p) => p.id === objectId)

    if (is_polygon) {
      select_polygon(objectId)
    }
    if (is_text) {
      select_text(objectId)
    }
    if (is_image) {
      select_image(objectId)
    }
    if (is_video) {
      select_video(objectId)
    }

    if (!selected_sequence?.polygonMotionPaths) {
      return
    }

    const currentKf =
      selected_sequence?.polygonMotionPaths
        .find((p) => p.polygonId === objectId)
        ?.properties.flatMap((p) => p.keyframes)
        .find((k) => k.id === keyframeId) ?? null

    if (!currentKf) {
      console.warn('Keyframe not found')
      return [null, null] as [Sequence | null, string[] | null]
    }

    if (currentKf.value.type === 'Position') {
      currentKf.value.value[0] = point.x
      currentKf.value.value[1] = point.y
    } else if (currentKf.value.type === 'Zoom') {
      currentKf.value.value.position[0] = point.x
      currentKf.value.value.position[1] = point.y
    }

    update_keyframe(
      editorState,
      currentKf,
      selected_sequence,
      selected_keyframes,
      set_selected_keyframes
      // current_sequence_id
    )

    return [selected_sequence, selected_keyframes] as [Sequence, string[]]
  }

  useDevEffectOnce(() => {
    if (editorIsSet) {
      return
    }

    console.info('Starting Editor...')

    let viewport = new Viewport(900, 550)

    editorRef.current = new Editor(viewport)

    webCaptureRef.current = new WebCapture()

    setEditorIsSet(true)
  })

  useEffect(() => {
    console.info('remount')
  }, [])

  let fetch_data = async () => {
    try {
      if (!editorRef.current) {
        toast.error('You must have matching device to access this project')

        return
      }

      set_loading(true)

      console.info('fetch data ', projectId)

      let response = await getSingleProject('', projectId)

      localStorage.setItem('stored-project', JSON.stringify({ project_id: projectId }))

      let fileName = response.project?.name || ''
      let fileData = response.project?.fileData

      console.info('savedState', fileData)

      if (!fileData) {
        toast.error('No file data')

        return
      }

      editorStateRef.current = new EditorState(fileData)

      let cloned_sequences = fileData?.sequences
      let cloned_settings = fileData?.settings

      if (!cloned_settings) {
        cloned_settings = {
          dimensions: {
            width: 900,
            height: 550
          }
        }
      }

      if (!cloned_sequences) {
        return
      }

      console.info('cloned_settings', cloned_settings)

      set_settings(cloned_settings)
      set_sequences(cloned_sequences)
      set_project_name(fileName)
      // set_timeline_state(response.project?.fileData.timeline_state);

      // drop(editor_state);

      editorRef.current.settings = cloned_settings

      console.info('Initializing pipeline...')

      let pipeline = new CanvasPipeline()

      canvasPipelineRef.current = await pipeline.new(
        editorRef.current,
        true,
        'scene-canvas',
        // {
        //   width: 900,
        //   height: 550,
        // },
        cloned_settings.dimensions,
        true
      )

      let windowSize = editorRef.current.camera?.windowSize

      if (!windowSize?.width || !windowSize?.height) {
        return
      }

      canvasPipelineRef.current.recreateDepthView(windowSize?.width, windowSize?.height)

      console.info('Beginning rendering...')

      await canvasPipelineRef.current.beginRendering(editorRef.current)

      // console.info("Restoring objects...");

      for (let sequence of cloned_sequences) {
        await editorRef.current.restore_sequence_objects(sequence, true, cloned_settings)
      }

      // set handlers
      const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement
      setupCanvasMouseTracking(canvas)

      set_quick_access()

      let firstSequenceId = cloned_sequences[0].id

      on_open_sequence(firstSequenceId)

      set_loading(false)
      setEditorStateSet(true)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast.error('Failed to fetch project data')
      set_loading(false)
      set_error(error.message || 'Unknown error')
      return
    }
  }

  const [onboarding1Visible, setOnboard1Visible] = useLocalStorage<boolean>(
    'video-onboarding-1-visible',
    true
  )

  useEffect(() => {
    if (editorIsSet) {
      console.info('Fetch data...')

      fetch_data()
    }
  }, [editorIsSet])

  useEffect(() => {
    if (editorIsSet) {
      if (!editorRef.current) {
        return
      }

      console.info('Setting event handlers!')

      // set handlers that rely on state
      editorRef.current.handlePolygonClick = handle_polygon_click
      editorRef.current.handleTextClick = handle_text_click
      editorRef.current.handleImageClick = handle_image_click
      editorRef.current.handleVideoClick = handle_video_click
      editorRef.current.handleCube3DClick = handle_cube3d_click
      editorRef.current.handleSphere3DClick = handle_sphere3d_click
      editorRef.current.handleMockup3DClick = handle_mockup3d_click
      editorRef.current.onMouseUp = handle_mouse_up
      editorRef.current.onHandleMouseUp = on_handle_mouse_up
    }
  }, [editorIsSet, current_sequence_id])

  let on_create_sequence = async () => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      toast.error('Your editor or editor state failed to initialize')

      return
    }

    // if (!authToken) {
    //   toast.error('You must have an auth token')

    //   return
    // }

    set_loading(true)

    let new_sequences = sequences as Sequence[]

    let newId = uuidv4().toString()

    new_sequences.push({
      id: newId,
      name: 'New Sequence',
      backgroundFill: { type: 'Color', value: [200, 200, 200, 255] },
      // durationMs: 20000,
      activePolygons: [],
      polygonMotionPaths: [],
      activeTextItems: [],
      activeImageItems: [],
      activeVideoItems: []
    })

    set_sequences(new_sequences)

    editorState.savedState.sequences = new_sequences

    let response = await updateSequences('', projectId, new_sequences, SaveTarget.Videos)

    let new_timeline = tSequences
    let tId = uuidv4().toString()
    new_timeline.push({
      id: tId,
      sequenceId: newId,
      trackType: TrackType.Video
    })

    setTSequences(new_timeline)
    editorState.savedState.timeline_state.timeline_sequences = new_timeline

    let response2 = await updateTimeline('', projectId, editorState.savedState)

    set_quick_access()

    on_open_sequence(newId)

    set_loading(false)
  }

  let set_quick_access = () => {
    let editor = editorRef.current
    let editorState = editorStateRef.current

    if (!editor || !editorState) {
      return
    }

    let durations = {} as Record<string, number>
    editorState.savedState.sequences.forEach((s) => {
      // if (s.durationMs) {
      //   durations[s.id] = s.durationMs
      // }
      durations[s.id] = getSequenceDuration(s).durationMs
    })

    setSequenceDurations(durations)

    let quickAccess = {} as Record<string, string>
    editorState.savedState.sequences.forEach((s) => {
      if (s.name) {
        quickAccess[s.id] = s.name
      }
    })

    setSequenceQuickAccess(quickAccess)

    if (editorState.savedState.timeline_state) {
      setTSequences(editorState.savedState.timeline_state.timeline_sequences)
    }
  }

  let on_open_sequence = (sequence_id: string) => {
    try {
      set_section('SequenceView')

      console.info('Open Sequence...')

      let editor = editorRef.current
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
      editor?.videoItems.forEach((t) => {
        t.hidden = true
      })
      editor?.cubes3D.forEach((t) => {
        t.hidden = true
      })
      editor?.spheres3D.forEach((t) => {
        t.hidden = true
      })
      editor?.mockups3D.forEach((t) => {
        t.hidden = true
      })
      editor?.models3D.forEach((t) => {
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
      saved_sequence.activeVideoItems.forEach((tr) => {
        let video = editor.videoItems.find((t) => t.id == tr.id)

        if (!video) {
          return
        }

        video.hidden = false

        console.info('Video restored!')
      })
      saved_sequence.activeCubes3D?.forEach((ap) => {
        let cube = editor.cubes3D.find((p) => p.id == ap.id)

        if (!cube) {
          return
        }

        cube.hidden = false
      })
      saved_sequence.activeSpheres3D?.forEach((ap) => {
        let sphere = editor.spheres3D.find((p) => p.id == ap.id)

        if (!sphere) {
          return
        }

        sphere.hidden = false
      })
      saved_sequence.activeMockups3D?.forEach((ap) => {
        let mockup = editor.mockups3D.find((p) => p.id == ap.id)

        if (!mockup) {
          return
        }

        mockup.hidden = false
      })
      saved_sequence.activeModels3D?.forEach((ap) => {
        let model = editor.models3D.find((p) => p.id == ap.id)

        if (!model) {
          return
        }

        model.hidden = false
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
      editor.brushes.forEach((brush) => {
        if (!brush.hidden) {
          let brush_config = brush.toConfig()
          let new_layer: Layer = LayerFromConfig.fromBrushConfig(brush_config)
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
      editor.videoItems.forEach((video) => {
        if (!video.hidden) {
          let video_config: StVideoConfig = video.toConfig(editor.camera.windowSize)
          let new_layer: Layer = LayerFromConfig.fromVideoConfig(video_config)
          new_layers.push(new_layer)
        }
      })
      editor.cubes3D.forEach((cube) => {
        if (!cube.hidden) {
          let cube_config: Cube3DConfig = cube.toConfig()
          let new_layer: Layer = LayerFromConfig.fromCube3DConfig(cube_config)
          new_layers.push(new_layer)
        }
      })
      editor.spheres3D.forEach((sphere) => {
        if (!sphere.hidden) {
          let sphere_config: Sphere3DConfig = sphere.toConfig()
          let new_layer: Layer = LayerFromConfig.fromSphere3DConfig(sphere_config)
          new_layers.push(new_layer)
        }
      })
      editor.mockups3D.forEach((mockup) => {
        if (!mockup.hidden) {
          let mockup_config: Mockup3DConfig = mockup.toConfig()
          let new_layer: Layer = LayerFromConfig.fromMockup3DConfig(mockup_config)
          new_layers.push(new_layer)
        }
      })
      editor.models3D.forEach((model) => {
        if (!model.hidden) {
          let model_config: Model3DConfig = model.toConfig()
          let new_layer: Layer = LayerFromConfig.fromModel3DConfig(model_config)
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

  let on_generate_animation = async () => {
    let editor = editorRef.current
    let editor_state = editorStateRef.current

    if (!editor || !editor_state) {
      return
    }

    set_loading(true)

    console.info('create prompt')

    let prompt = editor.createInferencePrompt()
    let predictions = await callMotionInference(prompt)

    console.info('predictions', predictions)

    let current_positions = editor.getCurrentPositions()

    let animation = editor.createMotionPathsFromPredictions(predictions, current_positions, editor)

    editor_state.savedState.sequences.forEach((s) => {
      if (s.id === current_sequence_id) {
        s.polygonMotionPaths = animation
      }
    })

    let updatedSequence = editor_state.savedState.sequences.find(
      (s) => s.id === current_sequence_id
    )

    if (!updatedSequence) {
      return
    }

    console.info('update paths')

    editor.updateMotionPaths(updatedSequence)

    saveSequencesData(editor_state.savedState.sequences, SaveTarget.Videos)

    set_loading(false)
  }

  let on_open_capture = () => {}

  let on_items_updated = () => {}

  let on_item_duplicated = () => {}

  let on_item_deleted = () => {}

  const handleSequenceDragEnd = (sequence: TimelineSequence, newStartTimeMs: number) => {
    setTSequences((prev) =>
      prev.map((seq) => (seq.id === sequence.id ? { ...seq, startTimeMs: newStartTimeMs } : seq))
    )
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

  let [background_red, set_background_red] = useState(0)
  let [background_green, set_background_green] = useState(0)
  let [background_blue, set_background_blue] = useState(0)

  let aside_width = 260.0
  let quarters = aside_width / 4.0 + 5.0 * 4.0
  let thirds = aside_width / 3.0 + 5.0 * 3.0
  let halfs = aside_width / 2.0 + 5.0 * 2.0

  // need hamburger menu for mobile to toggle sidebar
  let [showSidebar, setShowSidebar] = useState(false)
  let toggleSidebar = () => {
    setShowSidebar((prev) => !prev)
  }

  return (
    <>
      {/* Alert explaining hub */}
      {/* {onboarding1Visible && (
        <section className="max-w-[300px] bg-yellow-100 text-yellow-800 p-4 rounded-lg mb-6 w-full md:w-[600px]">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Welcome to Stunts!</h2>

            <button
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setOnboard1Visible(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center">
            <Check className="mr-2" />
            <span className="text-sm">
              Are you ready to create beautiful videos? Simply open up the
              Actions sidebar, create a New Sequence, and then open it up to
              start adding content and generating animations.
            </span>
          </div>
        </section>
      )} */}

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
          {/* {isEditingName ? (
            <input
              type="text"
              value={tempProjectName}
              onChange={(e) => setTempProjectName(e.target.value)}
              onBlur={() => {
                if (tempProjectName.trim()) {
                  set_project_name(tempProjectName.trim())
                  // TODO: Save to backend/database here
                }
                setIsEditingName(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (tempProjectName.trim()) {
                    set_project_name(tempProjectName.trim())
                    // TODO: Save to backend/database here
                  }
                  setIsEditingName(false)
                } else if (e.key === 'Escape') {
                  setIsEditingName(false)
                }
              }}
              autoFocus
              className="block text-md py-1 px-4"
            />
          ) : (
            <h1
              onClick={() => {
                setTempProjectName(project_name)
                setIsEditingName(true)
              }}
              className="cursor-pointer hover:bg-gray-600 transition-colors py-1 px-4 block rounded"
              title="Click to edit project name"
            >
              {project_name}
            </h1>
          )} */}
          {/* <div className="flex flex-row items-center gap-2">
            <label htmlFor="layer-spacing" className="text-xs text-gray-300">
              Layer Spacing:
            </label>
            {settings && (
              <DebouncedInput
                id="layer-spacing"
                // type="number"
                // step="0.001"
                // min="0"
                // value={settings?.layerSpacing ?? 0.001}
                initialValue={(settings?.layerSpacing as unknown as string) ?? '0.001'}
                onDebounce={async (value) => {
                  const newSpacing = parseFloat(value) || 0.001
                  let new_settings = {
                    ...settings,
                    layerSpacing: newSpacing
                  }
                  set_settings(new_settings)

                  // Update all objects with new layer spacing
                  if (editorRef.current && current_sequence_id) {
                    const editor = editorRef.current
                    let gpuResources = editor.gpuResources
                    // Update all object types
                    editor.textItems.forEach((textItem) => {
                      textItem.layerSpacing = newSpacing
                      textItem.updateLayer(
                        gpuResources.device,
                        gpuResources.queue,
                        editor.camera.windowSize,
                        textItem.layer
                      )
                    })
                    editor.imageItems.forEach((imageItem) => {
                      imageItem.layerSpacing = newSpacing
                      imageItem.updateLayer(imageItem.layer)
                      imageItem.transform.updateUniformBuffer(
                        gpuResources.queue,
                        editor.camera.windowSize
                      )
                    })
                    editor.videoItems.forEach((videoItem) => {
                      videoItem.layerSpacing = newSpacing
                      videoItem.updateLayer(videoItem.layer)
                      videoItem.transform.updateUniformBuffer(
                        gpuResources.queue,
                        editor.camera.windowSize
                      )
                    })
                    editor.polygons.forEach((polygon) => {
                      polygon.layerSpacing = newSpacing
                      polygon.updateLayer(polygon.layer)
                      polygon.transform.updateUniformBuffer(
                        gpuResources.queue,
                        editor.camera.windowSize
                      )
                    })
                    // editor.brushes.forEach((brush) => {
                    //   brush.layerSpacing = newSpacing
                    //   brush.updateLayer(brush.layer)
                    // })
                    // editor.cubes3d.forEach((cube) => {
                    //   cube.layerSpacing = newSpacing
                    //   cube.updateLayer(cube.layer)
                    // })
                    // editor.spheres3d.forEach((sphere) => {
                    //   sphere.layerSpacing = newSpacing
                    //   sphere.updateLayer(sphere.layer)
                    // })
                    // editor.mockups3d.forEach((mockup) => {
                    //   mockup.layerSpacing = newSpacing
                    //   mockup.updateLayer(mockup.layer)
                    // })
                  }

                  await saveSettingsData(new_settings, SaveTarget.Videos)
                }}
                // className="w-24 px-2 py-1 text-sm bg-gray-700 text-white border border-gray-600 rounded"
                label=""
                placeholder="0.01"
              />
            )}
          </div> */}
        </div>
        {editorStateSet && (
          <ExportVideoButton editorRef={editorRef} editorStateRef={editorStateRef} />
        )}
      </div>

      <div className="flex flex-col w-full">
        <div className="flex md:flex-row flex-col justify-between items-top w-full gap-2 md:h-full">
          <div className="md:h-full">
            <div
              className={`w-full md:w-[${
                (settings?.dimensions.width || 0) + 100
              }px] md:mx-auto overflow-hidden`}
            >
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
                    if (toolbarTab === 'animations') {
                      setToolbarTab('none')
                    } else {
                      setToolbarTab('animations')
                    }
                  }}
                  icon="wave"
                  label={'Animations'}
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
                {/* <MiniSquareButton
                  onClick={() => {
                    if (toolbarTab === 'layers') {
                      setToolbarTab('none')
                    } else {
                      setToolbarTab('layers')
                    }
                  }}
                  icon={'stack'}
                  label={'Layers'}
                /> */}
                <MiniSquareButton
                  onClick={() => {
                    if (toolbarTab === 'sequences') {
                      setToolbarTab('none')
                    } else {
                      setToolbarTab('sequences')
                    }
                  }}
                  icon="flow-arrow"
                  label={'Sequences'}
                />
                <MiniSquareButton
                  onClick={() => {
                    if (toolbarTab === 'camera') {
                      setToolbarTab('none')
                    } else {
                      setToolbarTab('camera')
                    }
                  }}
                  icon="camera"
                  label={'Camera'}
                />
              </div>
            </div>

            <div className="px-3 max-w-96">
              {toolbarTab === 'tools' && (
                <div>
                  <ToolGrid
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    webCaptureRef={webCaptureRef}
                    currentSequenceId={current_sequence_id}
                    set_sequences={set_sequences}
                    options={[
                      'square',
                      'circle',
                      'text',
                      'textRoll',
                      'image',
                      'video',
                      'capture',
                      'imageGeneration',
                      'stickers',
                      'brush',
                      'cube3d',
                      'sphere3d',
                      'mockup3d',
                      'model3d'
                    ]}
                    layers={layers}
                    setLayers={set_layers}
                    update={() => {
                      setRefreshUINow(Date.now())
                    }}
                  />
                </div>
              )}

              {toolbarTab === 'animations' && (
                <div className="max-h-[55vh] md:max-h-full overflow-hidden">
                  <AnimationTab
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    current_sequence_id={current_sequence_id!}
                    saveTarget={SaveTarget.Videos}
                    userLanguage={user?.userLanguage || 'en'}
                    setRefreshTimeline={setRefreshTimeline}
                    selectedTextId={selectedTextId!}
                    setSelectedTextId={setSelectedTextId}
                  />
                </div>
              )}

              {toolbarTab === 'themes' && current_sequence_id && (
                <div className="max-h-[35vh] md:max-h-full overflow-y-scroll overflow-x-hidden">
                  <ShaderThemePicker
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    currentSequenceId={current_sequence_id}
                    saveTarget={SaveTarget.Videos}
                  />

                  <ThemePicker
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    currentSequenceId={current_sequence_id}
                    saveTarget={SaveTarget.Videos}
                    userLanguage={user?.userLanguage || 'en'}
                  />

                  <label className="text-sm">Background Color</label>
                  <div className="flex flex-row gap-2 mb-4">
                    <DebouncedInput
                      id="background_red"
                      label="Red"
                      placeholder="Red"
                      initialValue={background_red.toString()}
                      onDebounce={(value) => {
                        set_background_red(parseInt(value))
                      }}
                    />
                    <DebouncedInput
                      id="background_green"
                      label="Green"
                      placeholder="Green"
                      initialValue={background_green.toString()}
                      onDebounce={(value) => {
                        set_background_green(parseInt(value))
                      }}
                    />
                    <DebouncedInput
                      id="background_blue"
                      label="Blue"
                      placeholder="Blue"
                      initialValue={background_blue.toString()}
                      onDebounce={(value) => {
                        set_background_blue(parseInt(value))
                      }}
                    />
                  </div>
                </div>
              )}

              {toolbarTab === 'layers' && current_sequence_id && (
                <div>
                  <LayerPanel
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    currentSequenceId={current_sequence_id}
                    layers={layers}
                    setLayers={set_layers}
                  />
                </div>
              )}

              {toolbarTab === 'sequences' && (
                <div>
                  <div className="flex flex-col w-full">
                    <div className="flex flex-row justify-between align-center w-full mt-2">
                      <h5>{t('Sequences')}</h5>
                      <a
                        className="text-xs rounded-md text-white stunts-gradient px-2 py-1 cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                        href="#"
                        // disabled={loading}
                        onClick={on_create_sequence}
                      >
                        {t('New Sequence')}
                      </a>
                    </div>
                    <div className="flex flex-col w-full mt-2">
                      {(sequences as Sequence[]).map((sequence: Sequence) => {
                        let showAddButton = false
                        if (
                          sequence.activePolygons.length > 0 ||
                          sequence.activeImageItems.length > 0 ||
                          sequence.activeTextItems.length > 0 ||
                          sequence.activeVideoItems.length > 0
                        ) {
                          showAddButton = true
                        }

                        return (
                          <div className="flex flex-row" key={sequence.id}>
                            <button
                              className="flex flex-row justify-start gap-1 text-xs w-full text-left p-2 rounded hover:bg-gray-200 hover:cursor-pointer active:bg-[#edda4] transition-colors"
                              disabled={loading}
                              onClick={() => on_open_sequence(sequence.id)}
                            >
                              <span>
                                {t('Open')} {sequence.name}
                              </span>
                              <ArrowRight />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {toolbarTab === 'camera' && (
                <div className="text-white">
                  <h5 className="text-lg font-semibold mb-4">Camera Controls</h5>

                  <div className="">
                    <label className="block text-sm font-medium">Zoom</label>
                    <input
                      type="range"
                      min="-25"
                      max="25"
                      step="0.1"
                      value={zoom}
                      className="w-full"
                      onChange={(e) => {
                        const editor = editorRef.current
                        if (editor && editor.camera) {
                          const newValue = parseFloat(e.target.value)
                          const delta = newValue - zoom
                          editor.camera.update_zoom(delta)
                          editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)
                          setZoom(newValue)
                        }
                      }}
                    />

                    {/* <div>
                      <label className="block text-sm font-medium mb-2">Orbit Horizontal</label>
                      <input
                        type="range"
                        min="-3.14159"
                        max="3.14159"
                        step="0.01"
                        value={orbitX}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)
                            const deltaX = newValue - orbitX
                            ;(editor.camera as Camera3D).orbit(deltaX, 0)
                            editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)
                            setOrbitX(newValue)
                          }
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Rotate camera around target (horizontal)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Orbit Vertical</label>
                      <input
                        type="range"
                        min="-1.57"
                        max="1.57"
                        step="0.01"
                        value={orbitY}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)
                            const deltaY = newValue - orbitY
                            ;(editor.camera as Camera3D).orbit(0, deltaY)
                            editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)
                            setOrbitY(newValue)
                          }
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Rotate camera around target (vertical)
                      </div>
                    </div> */}

                    {/* <h6 className="text-sm font-medium mb-3">Pan Camera</h6> */}

                    <div>
                      <label className="block text-sm font-medium mb-2">Pan Horizontal (X)</label>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={panX}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)
                            const deltaX = newValue - panX
                            editor.camera.pan(vec2.fromValues(deltaX, 0))
                            editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)
                            setPanX(newValue)
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Pan Vertical (Y)</label>
                      <input
                        type="range"
                        min="-10"
                        max="10"
                        step="0.1"
                        value={panY}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)
                            const deltaY = newValue - panY
                            editor.camera.pan(vec2.fromValues(0, deltaY))
                            editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)
                            setPanY(newValue)
                          }
                        }}
                      />
                    </div>

                    <hr className="invisible py-2" />

                    <div>
                      <label className="block text-sm font-medium mb-2">Rotate (X)</label>
                      <input
                        type="range"
                        min="-360"
                        max="360"
                        step="5"
                        value={rotateX}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)
                            const deltaX = newValue - rotateX
                            editor.camera.rotate('x', deltaX)
                            editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)
                            setRotateX(newValue)
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Rotate (Y)</label>
                      <input
                        type="range"
                        min="-360"
                        max="360"
                        step="5"
                        value={rotateY}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)
                            const deltaY = newValue - rotateY
                            editor.camera.rotate('y', deltaY)
                            editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)
                            setRotateY(newValue)
                          }
                        }}
                      />
                    </div>

                    <hr className="invisible py-2" />

                    <button
                      className="block w-full stunts-gradient py-1 mt-4 text-xs rounded"
                      onClick={() => {
                        const editor = editorRef.current
                        if (editor && editor.camera) {
                          // Reset zoom
                          editor.camera.reset_zoom()

                          editor.camera.rotation = quat.create()

                          // Reset orbit
                          const orbitDeltaX = -orbitX
                          const orbitDeltaY = -orbitY
                          editor.camera.orbit(orbitDeltaX, orbitDeltaY)

                          // Reset pan
                          const panDeltaX = -panX
                          const panDeltaY = -panY
                          editor.camera.pan(vec2.fromValues(panDeltaX, panDeltaY))

                          editor.cameraBinding?.update(editor.gpuResources?.queue!, editor.camera)

                          // Reset state
                          setOrbitX(0)
                          setOrbitY(0)
                          setPanX(0)
                          setPanY(0)
                          setRotateX(0)
                          setRotateY(0)
                          setZoom(0)
                        }
                      }}
                    >
                      Reset Camera
                    </button>
                  </div>
                </div>
              )}

              {current_sequence_id ? (
                <div className="flex flex-col gap-4 w-full max-h-[300px] md:max-h-[80vh] overflow-y-scroll overflow-x-hidden md:w-[315px] md:max-w-[315px]">
                  {selected_keyframes && selected_keyframes?.length > 0 ? (
                    <>
                      <KeyframeProperties
                        key={'props' + selected_keyframes[0]}
                        editorRef={editorRef}
                        editorStateRef={editorStateRef}
                        currentSequenceId={current_sequence_id}
                        selectedKeyframe={selected_keyframes[0]}
                        setRefreshTimeline={setRefreshTimeline}
                        handleGoBack={() => {
                          set_selected_keyframes(null)
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {selected_polygon_id && (
                        <PolygonProperties
                          key={'props' + selected_polygon_id}
                          editorRef={editorRef}
                          editorStateRef={editorStateRef}
                          currentSequenceId={current_sequence_id}
                          currentPolygonId={selected_polygon_id}
                          handleGoBack={() => {
                            set_selected_polygon_id(null)
                          }}
                        />
                      )}

                      {selected_image_id && (
                        <>
                          <ImageProperties
                            key={'props' + selected_image_id}
                            editorRef={editorRef}
                            editorStateRef={editorStateRef}
                            currentSequenceId={current_sequence_id}
                            currentImageId={selected_image_id}
                            handleGoBack={() => {
                              set_selected_image_id(null)
                            }}
                          />
                        </>
                      )}

                      {selected_text_id && (
                        <>
                          <TextProperties
                            key={'props' + selected_text_id}
                            editorRef={editorRef}
                            editorStateRef={editorStateRef}
                            currentSequenceId={current_sequence_id}
                            currentTextId={selected_text_id}
                            handleGoBack={() => {
                              set_selected_text_id(null)
                            }}
                          />
                        </>
                      )}

                      {selected_cube3d_id && (
                        <>
                          <Cube3DProperties
                            key={'props' + selected_cube3d_id}
                            editorRef={editorRef}
                            editorStateRef={editorStateRef}
                            currentSequenceId={current_sequence_id}
                            currentCubeId={selected_cube3d_id}
                            handleGoBack={() => {
                              set_selected_cube3d_id(null)
                            }}
                          />
                        </>
                      )}

                      {selected_sphere3d_id && (
                        <>
                          <Sphere3DProperties
                            key={'props' + selected_sphere3d_id}
                            editorRef={editorRef}
                            editorStateRef={editorStateRef}
                            currentSequenceId={current_sequence_id}
                            currentSphereId={selected_sphere3d_id}
                            handleGoBack={() => {
                              set_selected_sphere3d_id(null)
                            }}
                          />
                        </>
                      )}

                      {selected_mockup3d_id && (
                        <>
                          <Mockup3DProperties
                            key={'props' + selected_mockup3d_id}
                            editorRef={editorRef}
                            editorStateRef={editorStateRef}
                            currentSequenceId={current_sequence_id}
                            currentMockupId={selected_mockup3d_id}
                            handleGoBack={() => {
                              set_selected_mockup3d_id(null)
                            }}
                          />
                        </>
                      )}

                      {selected_model3d_id && (
                        <>
                          <Model3DProperties
                            key={'props' + selected_model3d_id}
                            editorRef={editorRef}
                            editorStateRef={editorStateRef}
                            currentSequenceId={current_sequence_id}
                            currentModelId={selected_model3d_id}
                            handleGoBack={() => {
                              set_selected_model3d_id(null)
                            }}
                          />
                        </>
                      )}

                      {editorRef.current?.brushDrawingMode && refreshUINow && (
                        <>
                          <BrushProperties
                            editorRef={editorRef}
                            onClose={() => {
                              if (editorRef.current) {
                                editorRef.current.brushDrawingMode = false
                                setRefreshUINow(Date.now())
                              }
                            }}
                          />
                        </>
                      )}

                      {selected_video_id && (
                        <>
                          <VideoProperties
                            key={'props' + selected_video_id}
                            editorRef={editorRef}
                            editorStateRef={editorStateRef}
                            currentSequenceId={current_sequence_id}
                            currentVideoId={selected_video_id}
                            handleGoBack={() => {
                              set_selected_video_id(null)
                            }}
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>

          <section className="flex flex-col">
            <div
              style={
                settings?.dimensions.width === 960
                  ? { aspectRatio: 960 / 540, minWidth: '960px' }
                  : { aspectRatio: 540 / 960, minWidth: '540px' }
              }
            >
              <div
                id="scene-canvas-wrapper"
                style={
                  settings?.dimensions.width === 960
                    ? { aspectRatio: 960 / 540, maxWidth: '960px' }
                    : { aspectRatio: 540 / 960, maxWidth: '540px' }
                }
              >
                <canvas
                  id="scene-canvas"
                  className={`w-[${settings?.dimensions.width}px] h-[${settings?.dimensions.height}px] border border-black rounded-[15px] shadow-[0_0_15px_4px_rgba(0,0,0,0.16)]`}
                  width={settings?.dimensions.width}
                  height={settings?.dimensions.height}
                />
              </div>
              <div className="flex flex-row justify-center w-full">
                {current_sequence_id && (
                  <PlaySequenceButton
                    editorRef={editorRef}
                    editorStateRef={editorStateRef}
                    selected_sequence_id={current_sequence_id}
                  />
                )}
                {editorStateSet && !current_sequence_id && (
                  <PlayVideoButton editorRef={editorRef} editorStateRef={editorStateRef} />
                )}
              </div>
            </div>
            <div className="flex w-full align-start justify-start">
              {current_sequence_id &&
                !selected_polygon_id &&
                !selected_text_id &&
                !selected_image_id &&
                !selected_video_id && (
                  <>
                    <div
                      className={`flex flex-col justify-end w-full mx-auto md:self-end md:m-0 md:overflow-x-scroll`}
                      style={{
                        maxWidth: `${(settings?.dimensions.width || 0) + 100}px`
                      }}
                    >
                      {sequences
                        .filter((s) => s.id === current_sequence_id)
                        .map((sequence) => {
                          if (sequence.polygonMotionPaths) {
                            return (
                              <div key={`trackSequence${sequence.id}`}>
                                {/* Timeline tick marks */}
                                <TimelineTicks
                                  trackWidth={settings?.dimensions.width || 960}
                                  pixelsPerSecond={15}
                                  durationMs={getSequenceDuration(sequence).durationMs}
                                />

                                {sequence.polygonMotionPaths.map((animation) => {
                                  let objectName: any = null
                                  if (animation.objectType === ObjectType.Polygon) {
                                    objectName = sequence.activePolygons.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  } else if (animation.objectType === ObjectType.ImageItem) {
                                    objectName = sequence.activeImageItems.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  } else if (animation.objectType === ObjectType.TextItem) {
                                    objectName = sequence.activeTextItems.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  } else if (animation.objectType === ObjectType.VideoItem) {
                                    objectName = sequence.activeVideoItems.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  } else if (animation.objectType === ObjectType.Cube3D) {
                                    objectName = sequence.activeCubes3D?.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  } else if (animation.objectType === ObjectType.Sphere3D) {
                                    objectName = sequence.activeSpheres3D?.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  } else if (animation.objectType === ObjectType.Mockup3D) {
                                    objectName = sequence.activeMockups3D?.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  } else if (animation.objectType === ObjectType.Model3D) {
                                    objectName = sequence.activeModels3D?.find(
                                      (pol) => pol.id === animation.polygonId
                                    )?.name
                                  }

                                  return (
                                    <ObjectTrack
                                      key={`objectTrack${animation.id}`}
                                      type={TrackType.Video}
                                      trackWidth={settings?.dimensions.width || 960}
                                      objectName={objectName}
                                      objectData={animation}
                                      pixelsPerSecond={15}
                                      onSequenceDragEnd={handleObjectDragEnd}
                                      onDeleteObject={async (id: string, kind: ObjectType) => {
                                        let editor = editorRef.current
                                        let editorState = editorStateRef.current

                                        if (!editor || !editorState) {
                                          return
                                        }

                                        let sequence = editorState.savedState.sequences.find(
                                          (s) => s.id === current_sequence_id
                                        )

                                        if (!sequence) {
                                          return
                                        }

                                        switch (kind) {
                                          case ObjectType.Polygon:
                                            editor.polygons = editor.polygons.filter(
                                              (p) => p.id !== id
                                            )
                                            sequence.activePolygons =
                                              sequence.activePolygons.filter((p) => p.id !== id)
                                            break
                                          case ObjectType.ImageItem:
                                            editor.imageItems = editor.imageItems.filter(
                                              (i) => i.id !== id
                                            )
                                            sequence.activeImageItems =
                                              sequence.activeImageItems.filter((i) => i.id !== id)
                                            break

                                          case ObjectType.TextItem:
                                            editor.textItems = editor.textItems.filter(
                                              (t) => t.id !== id
                                            )
                                            sequence.activeTextItems =
                                              sequence.activeTextItems.filter((t) => t.id !== id)
                                            break

                                          case ObjectType.VideoItem:
                                            editor.videoItems = editor.videoItems.filter(
                                              (v) => v.id !== id
                                            )
                                            sequence.activeVideoItems =
                                              sequence.activeVideoItems.filter((v) => v.id !== id)
                                            break

                                          case ObjectType.Cube3D:
                                            editor.cubes3D = editor.cubes3D.filter(
                                              (v) => v.id !== id
                                            )
                                            sequence.activeCubes3D = sequence.activeCubes3D?.filter(
                                              (v) => v.id !== id
                                            )
                                            break

                                          case ObjectType.Sphere3D:
                                            editor.spheres3D = editor.spheres3D.filter(
                                              (v) => v.id !== id
                                            )
                                            sequence.activeSpheres3D =
                                              sequence.activeSpheres3D?.filter((v) => v.id !== id)
                                            break

                                          case ObjectType.Mockup3D:
                                            editor.mockups3D = editor.mockups3D.filter(
                                              (v) => v.id !== id
                                            )
                                            sequence.activeMockups3D =
                                              sequence.activeMockups3D?.filter((v) => v.id !== id)
                                            break

                                          default:
                                            break
                                        }

                                        sequence.polygonMotionPaths =
                                          sequence.polygonMotionPaths?.filter(
                                            (pm) => pm.polygonId !== id
                                          )

                                        await saveSequencesData(
                                          editorState.savedState.sequences,
                                          editor.target
                                        )

                                        // update_layer_list()
                                      }}
                                      onSelectObject={(
                                        objectType: ObjectType,
                                        objectId: string
                                      ) => {
                                        switch (objectType) {
                                          case ObjectType.Polygon:
                                            handle_polygon_click(objectId)
                                            break

                                          case ObjectType.TextItem:
                                            handle_text_click(objectId)
                                            break

                                          case ObjectType.ImageItem:
                                            handle_image_click(objectId)
                                            break

                                          case ObjectType.VideoItem:
                                            handle_video_click(objectId)
                                            break

                                          case ObjectType.Cube3D:
                                            handle_cube3d_click(objectId)
                                            break

                                          case ObjectType.Sphere3D:
                                            handle_sphere3d_click(objectId)
                                            break

                                          case ObjectType.Mockup3D:
                                            handle_mockup3d_click(objectId)
                                            break

                                          case ObjectType.Model3D:
                                            handle_model3d_click(objectId)
                                            break

                                          default:
                                            break
                                        }
                                      }}
                                    />
                                  )
                                })}
                              </div>
                            )
                          }
                        })}
                    </div>
                  </>
                )}
              {/* {!current_sequence_id &&
            !selected_polygon_id &&
            !selected_text_id &&
            !selected_image_id &&
            !selected_video_id && (
              <TimelineTrack
                type={TrackType.Video}
                trackWidth={settings?.dimensions.width || 900}
                pixelsPerSecond={25}
                tSequences={tSequences}
                sequenceDurations={sequenceDurations}
                sequenceQuickAccess={sequenceQuickAccess}
                onSequenceDragEnd={handleSequenceDragEnd}
              />
            )} */}
              {selected_polygon_id && current_sequence_id && (
                <KeyframeTimeline
                  editorRef={editorRef}
                  editorStateRef={editorStateRef}
                  objectId={selected_polygon_id}
                  objectType={ObjectType.Polygon}
                  sequenceId={current_sequence_id}
                  width={settings?.dimensions.width || 960}
                  height={400}
                  headerHeight={40}
                  propertyWidth={50}
                  rowHeight={50}
                  selectedKeyframes={selected_keyframes}
                  setSelectedKeyframes={set_selected_keyframes}
                  onKeyframeChanged={() => {}}
                  refreshTimeline={refreshTimeline}
                  onKeyframeAdded={(propertyPath, time, prevKeyframe, nextKeyframe) => {
                    if (!editorStateRef.current) {
                      return
                    }

                    editorStateRef.current.addKeyframe(
                      selected_polygon_id,
                      current_sequence_id,
                      propertyPath,
                      time,
                      prevKeyframe,
                      nextKeyframe
                    )
                  }}
                />
              )}
              {selected_text_id && current_sequence_id && (
                <KeyframeTimeline
                  editorRef={editorRef}
                  editorStateRef={editorStateRef}
                  objectId={selected_text_id}
                  objectType={ObjectType.TextItem}
                  sequenceId={current_sequence_id}
                  width={settings?.dimensions.width || 960}
                  height={400}
                  headerHeight={40}
                  propertyWidth={50}
                  rowHeight={50}
                  selectedKeyframes={selected_keyframes}
                  setSelectedKeyframes={set_selected_keyframes}
                  onKeyframeChanged={() => {}}
                  refreshTimeline={refreshTimeline}
                  onKeyframeAdded={(propertyPath, time, prevKeyframe, nextKeyframe) => {
                    if (!editorStateRef.current) {
                      return
                    }

                    editorStateRef.current.addKeyframe(
                      selected_text_id,
                      current_sequence_id,
                      propertyPath,
                      time,
                      prevKeyframe,
                      nextKeyframe
                    )
                  }}
                />
              )}
              {selected_image_id && current_sequence_id && (
                <KeyframeTimeline
                  editorRef={editorRef}
                  editorStateRef={editorStateRef}
                  objectId={selected_image_id}
                  objectType={ObjectType.ImageItem}
                  sequenceId={current_sequence_id}
                  width={settings?.dimensions.width || 960}
                  height={400}
                  headerHeight={40}
                  propertyWidth={50}
                  rowHeight={50}
                  selectedKeyframes={selected_keyframes}
                  setSelectedKeyframes={set_selected_keyframes}
                  onKeyframeChanged={() => {}}
                  refreshTimeline={refreshTimeline}
                  onKeyframeAdded={(propertyPath, time, prevKeyframe, nextKeyframe) => {
                    if (!editorStateRef.current) {
                      return
                    }

                    editorStateRef.current.addKeyframe(
                      selected_image_id,
                      current_sequence_id,
                      propertyPath,
                      time,
                      prevKeyframe,
                      nextKeyframe
                    )
                  }}
                />
              )}
              {selected_video_id && current_sequence_id && (
                <KeyframeTimeline
                  editorRef={editorRef}
                  editorStateRef={editorStateRef}
                  objectId={selected_video_id}
                  objectType={ObjectType.VideoItem}
                  sequenceId={current_sequence_id}
                  width={settings?.dimensions.width || 960}
                  height={400}
                  headerHeight={40}
                  propertyWidth={50}
                  rowHeight={50}
                  selectedKeyframes={selected_keyframes}
                  setSelectedKeyframes={set_selected_keyframes}
                  onKeyframeChanged={() => {}}
                  refreshTimeline={refreshTimeline}
                  onKeyframeAdded={(propertyPath, time, prevKeyframe, nextKeyframe) => {
                    if (!editorStateRef.current) {
                      return
                    }

                    editorStateRef.current.addKeyframe(
                      selected_video_id,
                      current_sequence_id,
                      propertyPath,
                      time,
                      prevKeyframe,
                      nextKeyframe
                    )
                  }}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

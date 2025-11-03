'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { quat, vec2, vec3 } from 'gl-matrix'
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
import { Cube3D, Cube3DConfig } from '../../engine/cube3d'
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
import Jolt from 'jolt-physics/debug-wasm-compat'
import { Physics } from '../../engine/physics'
import { CameraAnimation } from '@renderer/engine/3dcamera'
import GameLogicEditor from './GameLogic'
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react'
import { degreesToRadians } from '@renderer/engine/transform'
import { GameLogic } from '../../engine/GameLogic'
import { Sphere3DConfig } from '@renderer/engine/sphere3d'
import HealthBar from './HealthBar'

export interface GameNode {
  id: string
  data: {
    label: string
    pressed?: boolean
    value?: number | string
    health?: number
    fireRate?: number
  }
  position: {
    x: number
    y: number
  }
}

const initialNodes: GameNode[] = [
  { id: '1', data: { label: 'PlayerController', health: 100 }, position: { x: 250, y: 5 } },
  { id: '2', data: { label: 'Input' }, position: { x: 100, y: 100 } },
  { id: '3', data: { label: 'Forward', pressed: false }, position: { x: 400, y: 100 } },
  { id: '4', data: { label: 'Backward', pressed: false }, position: { x: 400, y: 150 } },
  { id: '5', data: { label: 'Left', pressed: false }, position: { x: 400, y: 200 } },
  { id: '6', data: { label: 'Right', pressed: false }, position: { x: 400, y: 250 } },
  {
    id: '7',
    data: { label: 'EnemyController', health: 100, fireRate: 1000 },
    position: { x: 850, y: 5 }
  },
  { id: '8', data: { label: 'RandomWalk' }, position: { x: 700, y: 100 } },
  { id: '9', data: { label: 'ShootProjectile' }, position: { x: 1000, y: 100 } },
  { id: '10', data: { label: 'Health', value: 100 }, position: { x: 850, y: 200 } }
]

const initialEdges = [
  { id: 'e2-1', source: '2', target: '1' },
  { id: 'e3-2', source: '3', target: '2' },
  { id: 'e3-3', source: '4', target: '2' },
  { id: 'e3-4', source: '5', target: '2' },
  { id: 'e3-5', source: '6', target: '2' },
  { id: 'e8-7', source: '8', target: '7' },
  { id: 'e9-7', source: '9', target: '7' },
  { id: 'e10-7', source: '10', target: '7' }
]

const DEFAULT_GAME_WIDTH = 1200
const DEFAULT_GAME_HEIGHT = 800

export const GameEditor: React.FC<any> = ({ projectId }) => {
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

  // Camera orbit state
  let [orbitX, setOrbitX] = useState(0)
  let [orbitY, setOrbitY] = useState(0)

  // Camera pan state
  let [panX, setPanX] = useState(0)
  let [panY, setPanY] = useState(0)

  let [rotateX, setRotateX] = useState(0)
  let [rotateY, setRotateY] = useState(0)

  let [zoom, setZoom] = useState(0)
  let [zoomMax, setZoomMax] = useState(250)
  let [zoomMin, setZoomMin] = useState(-250)

  // Text Animation state
  let [selectedTextId, setSelectedTextId] = useState<string | null>(null)

  let [selected_polygon_id, set_selected_polygon_id] = useState<string | null>(null)
  let [selected_image_id, set_selected_image_id] = useState<string | null>(null)
  let [selected_text_id, set_selected_text_id] = useState<string | null>(null)
  let [selected_video_id, set_selected_video_id] = useState<string | null>(null)

  const editorRef = useRef<Editor | null>(null)
  const editorStateRef = useRef<EditorState | null>(null)
  const canvasPipelineRef = useRef<CanvasPipeline | null>(null)
  // const canvasPipelineRef = useRef<CanvasPipeline | null>(null)
  // const webCaptureRef = useRef<WebCapture | null>(null)
  const [editorIsSet, setEditorIsSet] = useState(false)
  const [editorStateSet, setEditorStateSet] = useState(false)
  const [refreshUINow, setRefreshUINow] = useState(Date.now())
  const [project_name, set_project_name] = useState('Loading...')
  const [physicsReady, setPhysicsReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const [playerHealths, setPlayerHealths] = useState<number[]>([])
  const [enemyHealths, setEnemyHealths] = useState<number[]>([])

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  useEffect(() => {
    const canvas = document.getElementById(`game-canvas`) as HTMLCanvasElement
    if (!canvas) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // console.info('keydown', event)
      setNodes((nds) =>
        nds.map((node) => {
          if (node.data.label === 'Forward' && event.key === 'w') {
            node.data = { ...node.data, pressed: true }
          } else if (node.data.label === 'Backward' && event.key === 's') {
            node.data = { ...node.data, pressed: true }
          } else if (node.data.label === 'Left' && event.key === 'a') {
            node.data = { ...node.data, pressed: true }
          } else if (node.data.label === 'Right' && event.key === 'd') {
            node.data = { ...node.data, pressed: true }
          }
          return node
        })
      )
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.data.label === 'Forward' && event.key === 'w') {
            node.data = { ...node.data, pressed: false }
          } else if (node.data.label === 'Backward' && event.key === 's') {
            node.data = { ...node.data, pressed: false }
          } else if (node.data.label === 'Left' && event.key === 'a') {
            node.data = { ...node.data, pressed: false }
          } else if (node.data.label === 'Right' && event.key === 'd') {
            node.data = { ...node.data, pressed: false }
          }
          return node
        })
      )
    }

    console.info('attach key listeners in editor')

    canvas.addEventListener('keydown', handleKeyDown)
    canvas.addEventListener('keyup', handleKeyUp)
    canvas.setAttribute('tabindex', '0') // Make canvas focusable

    return () => {
      canvas.removeEventListener('keydown', handleKeyDown)
      canvas.removeEventListener('keyup', handleKeyUp)
    }
  }, [setNodes])

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
      let fileData = response.project?.gameData

      console.info('savedState', fileData)

      if (!fileData) {
        toast.error('No game data')

        return
      }

      let cloned_sequences = fileData?.sequences
      let cloned_settings = fileData?.settings
      let cloned_grid = fileData?.grid_state

      if (!cloned_settings) {
        cloned_settings = {
          dimensions: {
            width: DEFAULT_GAME_WIDTH,
            height: DEFAULT_GAME_HEIGHT
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
    let effectiveFileData = {
      sequences: sequences,
      settings: settings,
      timeline_state: null,
      grid_state: grid
    }

    editorStateRef.current = new EditorState(effectiveFileData)
    setEditorStateSet(true)
    set_loading(false)

    if (sequences.length > 0) {
      set_current_sequence_id(sequences[0].id)
    }
  }

  useEffect(() => {
    if (!project_name) {
      return
    }

    set_data()
  }, [project_name])

  useEffect(() => {
    if (current_sequence_id) {
      on_open_sequence(current_sequence_id)
    }
  }, [current_sequence_id])

  let on_open_sequence = async (sequence_id: string) => {
    try {
      console.info('Open Sequence...', sequence_id)

      let editor_state = editorStateRef.current
      if (!editor_state) {
        toast.error('Editor state failed to initialize')
        return
      }

      let saved_sequence = editor_state.savedState.sequences.find((s) => s.id == sequence_id)
      if (!saved_sequence) {
        toast.error('Sequence not found')
        return
      }

      let viewport = new Viewport(settings.dimensions.width, settings.dimensions.height)
      let editor = new Editor(viewport)
      editor.currentSequenceData = saved_sequence
      editor.settings = settings

      let pipeline = new CanvasPipeline()
      await pipeline.new(
        editor,
        true,
        `game-canvas`,
        settings.dimensions,
        true // Set to true for continuous rendering, suitable for a game editor
      )

      canvasPipelineRef.current = pipeline

      await pipeline.beginRendering(editor)

      editorRef.current = editor
      editor.gameLogic = new GameLogic(editor, setNodes)
      editorRef.current.target = SaveTarget.Games
      editorStateRef.current.saveTarget = SaveTarget.Games

      editor.camera.setPosition(5, 50, 5)
      // quat.fromEuler(editor.camera.rotation, -45, 0, -45)
      editor.cameraBinding.update(editor.gpuResources.queue, editor.camera)

      await editor.restore_sequence_objects(saved_sequence, false, settings)

      const canvas = document.getElementById(`game-canvas`) as HTMLCanvasElement
      setupCanvasMouseTracking(editor, canvas)

      editor.handlePolygonClick = handle_polygon_click
      editor.handleTextClick = handle_text_click
      editor.handleImageClick = handle_image_click

      // The rest of the on_open_sequence logic for setting up the scene
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

      editor_state.selected_polygon_id = saved_sequence.id

      editor.polygons.forEach((p) => {
        p.hidden = true
      })
      editor.imageItems.forEach((i) => {
        i.hidden = true
      })
      editor.textItems.forEach((t) => {
        t.hidden = true
      })
      editor.cubes3D.forEach((t) => {
        t.hidden = true
      })

      saved_sequence.activePolygons.forEach((ap) => {
        let polygon = editor.polygons.find((p) => p.id == ap.id)
        if (polygon) polygon.hidden = false
      })
      saved_sequence.activeImageItems.forEach((si) => {
        let image = editor.imageItems.find((i) => i.id == si.id)
        if (image) image.hidden = false
      })
      saved_sequence.activeTextItems.forEach((tr) => {
        let text = editor.textItems.find((t) => t.id == tr.id)
        if (text) text.hidden = false
      })
      saved_sequence.activeCubes3D.forEach((tr) => {
        let cube = editor.cubes3D.find((t) => t.id == tr.id)
        if (cube) cube.hidden = false
      })

      if (!editor.camera) {
        toast.error('No camera found in editor')
        return
      }

      let backgroundSize: WindowSize = {
        width: editor.camera.windowSize.width - 50,
        height: editor.camera.windowSize.height - 50
      }

      editor.replace_background(saved_sequence.id, background_fill, backgroundSize)

      editor.updateMotionPaths(saved_sequence)

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
      editor.cubes3D.forEach((cube) => {
        if (!cube.hidden) {
          let cube_config: Cube3DConfig = cube.toConfig()
          let new_layer: Layer = LayerFromConfig.fromCube3DConfig(cube_config)
          new_layers.push(new_layer)
        }
      })

      new_layers.sort((a, b) => b.initial_layer_index - a.initial_layer_index)
      set_layers(new_layers)

      // Add a default landscape cube
      const landscapeConfig: Cube3DConfig = {
        id: 'landscape-cube',
        name: 'Landscape',
        // dimensions: [1000, 10, 1000],
        dimensions: [100, 2, 100],
        position: { x: 0, y: -5, z: 0 },
        rotation: [0, 0, 0],
        backgroundFill: {
          type: 'Color',
          value: [0.5, 0.35, 0.25, 1.0]
        },
        layer: 0
      }

      const landscapeCube = new Cube3D(
        editor.camera.windowSize,
        editor.gpuResources.device,
        editor.gpuResources.queue,
        editor.modelBindGroupLayout,
        editor.groupBindGroupLayout,
        editor.camera,
        landscapeConfig,
        sequence_id
      )

      if (!editor.cubes3D) {
        editor.cubes3D = []
      }
      editor.cubes3D.push(landscapeCube)

      // Create a dynamic cube
      // const dynamicCubeConfig: Cube3DConfig = {
      //   id: 'dynamic-cube',
      //   name: 'Dynamic Cube',
      //   dimensions: [50, 50, 50],
      //   position: { x: 0, y: 200, z: 0 },
      //   rotation: [0, 0, 0],
      //   backgroundFill: {
      //     type: 'Color',
      //     value: [0.2, 0.4, 0.8, 1.0]
      //   },
      //   layer: 1
      // }

      // const dynamicCube = new Cube3D(
      //   editor.camera.windowSize,
      //   editor.gpuResources.device,
      //   editor.gpuResources.queue,
      //   editor.modelBindGroupLayout,
      //   editor.groupBindGroupLayout,
      //   editor.camera,
      //   dynamicCubeConfig,
      //   sequence_id
      // )

      // editor.cubes3D.push(dynamicCube)

      // Initialize physics
      // const physics = new Physics()
      // await physics.initialize()
      // editor.physics = physics

      // Create physics bodies
      // console.info('Jolt', Jolt, Jolt.RVec3)

      const landscapeBody = editor.physics.createStaticBox(
        new editor.physics.jolt.RVec3(
          landscapeConfig.position.x,
          landscapeConfig.position.y,
          landscapeConfig.position.z
        ),
        new editor.physics.jolt.Quat(0, 0, 0, 1),
        new editor.physics.jolt.Vec3(
          landscapeConfig.dimensions[0] / 2,
          landscapeConfig.dimensions[1] / 2,
          landscapeConfig.dimensions[2] / 2
        )
      )
      editor.bodies.set('landscape-cube', landscapeBody)

      // const dynamicBody = editor.physics.createDynamicBox(
      //   new editor.physics.jolt.RVec3(0, 200, 0),
      //   new editor.physics.jolt.Quat(0, 0, 0, 1),
      //   new editor.physics.jolt.Vec3(25, 25, 25)
      // )
      // editor.bodies.set('dynamic-cube', dynamicBody)

      setPhysicsReady(true)

      toast.success(`Opened level ${saved_sequence.name}`)
    } catch (error: any) {
      console.error('Error opening sequence:', error)
      toast.error('Failed to open sequence')
      set_loading(false)
      set_error(error.message || 'Unknown error')
    }
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

    saveSequencesData(editor_state.savedState.sequences, SaveTarget.Games)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (editorRef.current) {
        const currentPlayerHealths: number[] = []
        const currentEnemyHealths: number[] = []

        editorRef.current.nodes.forEach((node) => {
          if (node.data.label === 'PlayerController' && typeof node.data.health === 'number') {
            currentPlayerHealths.push(node.data.health)
          } else if (
            node.data.label === 'EnemyController' &&
            typeof node.data.health === 'number'
          ) {
            currentEnemyHealths.push(node.data.health)
          }
        })
        setPlayerHealths(currentPlayerHealths)
        setEnemyHealths(currentEnemyHealths)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [nodes])

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

      <section className="flex flex-col">
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
                  <MiniSquareButton
                    onClick={() => {
                      if (toolbarTab === 'logic') {
                        setToolbarTab('none')
                      } else {
                        setToolbarTab('logic')
                      }
                    }}
                    icon="grid"
                    label={'Logic'}
                  />
                  <MiniSquareButton
                    onClick={() => {
                      if (toolbarTab === 'layers') {
                        setToolbarTab('none')
                      } else {
                        setToolbarTab('layers')
                      }
                    }}
                    icon={'stack'}
                    label={'Scene'}
                  />
                </div>
              </div>

              <div className="px-3 w-128">
                {toolbarTab === 'tools' && (
                  <div>
                    <ToolGrid
                      editorRef={editorRef}
                      editorStateRef={editorStateRef}
                      webCaptureRef={null}
                      currentSequenceId={current_sequence_id}
                      set_sequences={set_sequences}
                      options={[
                        // 'square',
                        // 'circle',
                        // 'text',
                        // 'image',
                        // 'imageGeneration',
                        // 'stickers',
                        // 'brush'
                        'model3d'
                      ]}
                      layers={layers}
                      setLayers={set_layers}
                      update={() => {
                        setRefreshUINow(Date.now())
                      }}
                      setNodes={setNodes}
                    />
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

                {toolbarTab === 'logic' && (
                  <div className="text-white">
                    <h5 className="text-lg font-semibold mb-4">Game Logic</h5>
                    <GameLogicEditor
                      nodes={nodes}
                      edges={edges}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      onConnect={onConnect}
                    />
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

                {toolbarTab === 'camera' && (
                  <div className="text-white">
                    <h5 className="text-lg font-semibold mb-4">Camera Controls</h5>

                    <div className="">
                      <label className="block text-sm font-medium">Zoom Range</label>
                      <input
                        type="number"
                        min="-1000"
                        max="1000"
                        step="0.1"
                        value={zoomMin}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)

                            setZoomMin(newValue)
                          }
                        }}
                      />
                      <input
                        type="number"
                        min="-1000"
                        max="1000"
                        step="0.1"
                        value={zoomMax}
                        className="w-full"
                        onChange={(e) => {
                          const editor = editorRef.current
                          if (editor && editor.camera) {
                            const newValue = parseFloat(e.target.value)
                            setZoomMax(newValue)
                          }
                        }}
                      />
                      <label className="block text-sm font-medium">Zoom</label>
                      <input
                        type="range"
                        min={zoomMin}
                        max={zoomMax}
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

                      {/* <h6 className="text-sm font-medium mb-3">Pan Camera</h6> */}

                      <div>
                        <label className="block text-sm font-medium mb-2">Pan Horizontal (X)</label>
                        <input
                          type="range"
                          min="-1000"
                          max="1000"
                          step="10"
                          value={panX}
                          className="w-full"
                          onChange={(e) => {
                            const editor = editorRef.current
                            if (editor && editor.camera) {
                              const newValue = parseFloat(e.target.value)
                              const deltaX = newValue - panX
                              editor.camera.pan(vec2.fromValues(deltaX, 0))
                              editor.cameraBinding?.update(
                                editor.gpuResources?.queue!,
                                editor.camera
                              )
                              setPanX(newValue)
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Pan Vertical (Y)</label>
                        <input
                          type="range"
                          min="-1000"
                          max="1000"
                          step="10"
                          value={panY}
                          className="w-full"
                          onChange={(e) => {
                            const editor = editorRef.current
                            if (editor && editor.camera) {
                              const newValue = parseFloat(e.target.value)
                              const deltaY = newValue - panY
                              editor.camera.pan(vec2.fromValues(0, deltaY))
                              editor.cameraBinding?.update(
                                editor.gpuResources?.queue!,
                                editor.camera
                              )
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
                              editor.cameraBinding?.update(
                                editor.gpuResources?.queue!,
                                editor.camera
                              )
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
                              editor.cameraBinding?.update(
                                editor.gpuResources?.queue!,
                                editor.camera
                              )
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

                            editor.camera.setPosition(0, 0, editor.camera.resetZ)

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
              </div>
            </div>

            <section className="flex-grow flex flex-col justify-center items-center">
              <div className="mb-4">
                <label htmlFor="level-select" className="mr-2">
                  Select Level:
                </label>
                <select
                  id="level-select"
                  value={current_sequence_id || ''}
                  onChange={(e) => set_current_sequence_id(e.target.value)}
                  className="p-2 border rounded"
                >
                  {sequences.map((seq) => (
                    <option key={seq.id} value={seq.id}>
                      {seq.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const editor = editorRef.current
                    const pipeline = canvasPipelineRef.current
                    if (editor && pipeline) {
                      pipeline.isPlaying = !pipeline.isPlaying
                      editor.nodes = nodes
                      editor.edges = edges
                      setIsPlaying(pipeline.isPlaying)
                    } else {
                      toast.error("Couldn't play!")
                    }
                  }}
                  className="p-2 border rounded"
                >
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
              </div>
              <div className="relative">
                {playerHealths.map((health, index) => (
                  <HealthBar
                    key={`player-health-${index}`}
                    health={health}
                    position={{ top: 10 + index * 30, left: 10 }}
                  />
                ))}
                {enemyHealths.map((health, index) => (
                  <HealthBar
                    key={`enemy-health-${index}`}
                    health={health}
                    position={{ top: 10 + index * 30, right: 10 }}
                  />
                ))}

                <canvas
                  id={`game-canvas`}
                  className={`border border-black rounded-[15px] shadow-[0_0_15px_4px_rgba(0,0,0,0.16)]`}
                  style={{
                    width: settings?.dimensions.width || DEFAULT_GAME_WIDTH,
                    height: settings?.dimensions.height || DEFAULT_GAME_HEIGHT
                  }}
                  width={settings?.dimensions.width || DEFAULT_GAME_WIDTH}
                  height={settings?.dimensions.height || DEFAULT_GAME_HEIGHT}
                />
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  )
}

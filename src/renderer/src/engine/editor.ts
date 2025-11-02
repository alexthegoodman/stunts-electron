import { Buffer } from 'buffer'
// import { ControlMode, PolygonClickHandler, TextItemClickHandler, ImageItemClickHandler, VideoItemClickHandler, OnMouseUp, OnHandleMouseUp, OnPathMouseUp } from './control-types';
import { FontManager } from './font'
import { MotionPath } from './motionpath'
import { Camera, CameraBinding, WindowSize } from './camera'
import { StImage, StImageConfig } from './image'
import { MousePosition, SourceData, StVideo, StVideoConfig } from './video'
import { vec2, vec3 } from 'gl-matrix'
import { getUploadedImage, getUploadedImageData, getUploadedVideoData } from '../fetchers/projects'
import { RepeatManager } from './repeater'
import { DocumentSize, FormattedPage, loadFonts, MultiPageEditor, RenderItem } from './rte'
import EditorState, { SaveTarget } from './editor_state'
import { Camera3D, CameraAnimation } from './3dcamera'
import {
  GPUPolyfill,
  PolyfillBindGroup,
  PolyfillBindGroupLayout,
  PolyfillBuffer,
  PolyfillDevice,
  PolyfillQueue,
  PolyfillRenderPipeline,
  WebGpuResources
} from './polyfill'
import { UnifiedRichTextEditor } from './rte-one'
import { ProceduralBrush, BrushConfig, SavedBrushConfig } from './brush'
import { Cube3D, Cube3DConfig } from './cube3d'
import { Sphere3D, Sphere3DConfig } from './sphere3d'
import { Mockup3D, Mockup3DConfig } from './mockup3d'
import { processVideoZoom } from './state/animations/zoom'
import { Model3D, Model3DConfig } from './model3d'
import { Physics } from './physics'
import Jolt from 'jolt-physics/debug-wasm-compat'
// import * as fontkit from "fontkit";
import { v4 as uuidv4 } from 'uuid'
import { Polygon, PolygonConfig } from './polygon'
import { TextRenderer, TextRendererConfig } from './text'
import {
  AnimationData,
  AnimationProperty,
  BackgroundFill,
  calculateDefaultCurve,
  EasingType,
  getSequenceDuration,
  getSequencesDuration,
  ObjectType,
  PathType,
  ProjectSettings,
  RangeData,
  SavedTimelineStateConfig,
  Sequence,
  TrackType,
  UIKeyframe
} from './animations'
import {
  roundUp,
  roundToGrid,
  interpolatePosition,
  Ray,
  visualize_ray_intersection,
  InteractionTarget,
  getColor,
  getFullColor,
  InputValue,
  getRandomNumber,
  sizeToNormal,
  pointToNdc,
  rgbToWgpu,
  colorToWgpu,
  wgpuToHuman,
  stringToF32,
  stringToU32,
  toRadians,
  resolveOverlaps,
  checkRayPlaneIntersection,
  getCameraForward
} from './editor/helpers'
import { fromNDC, toNDC, toSystemScale } from './vertex'
import { radiansToDegrees } from './transform'

export const TEXT_BACKGROUNDS_DEFAULT_HIDDEN = true

export interface BBox {
  id: string
  width: number
  height: number
  x: number
  y: number
}

// // Example usage
// const objects: BoundingBox[] = [
//   { id: "obj1", width: 100, height: 150, x: 100, y: 100 },
//   { id: "obj2", width: 200, height: 100, x: 120, y: 130 },
//   { id: "obj3", width: 120, height: 180, x: 150, y: 160 },
// ];

// const resolvedObjects = resolveOverlaps(objects);
// console.log(resolvedObjects);

const NUM_INFERENCE_FEATURES: number = 7
export const CANVAS_HORIZ_OFFSET: number = 0.0
export const CANVAS_VERT_OFFSET: number = 0.0

export class Viewport {
  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
  }

  toNdc(x: number, y: number): [number, number] {
    const ndcX = (x / this.width) * 2.0 - 1.0
    const ndcY = -((y / this.height) * 2.0 - 1.0) // Flip Y-axis
    return [ndcX, ndcY]
  }

  clone(): Viewport {
    return new Viewport(this.width, this.height)
  }
}

// Assuming windowSize is defined elsewhere
export interface windowSize {
  width: number
  height: number
}

// Assuming Point is defined elsewhere
export interface Point {
  x: number
  y: number
  z?: number
}

export interface BoundingBox {
  min: Point
  max: Point
}

// Define all possible edit operations
export enum ObjectProperty {
  Width = 'Width',
  Height = 'Height',
  Red = 'Red',
  Green = 'Green',
  Blue = 'Blue',
  FillRed = 'FillRed',
  FillGreen = 'FillGreen',
  FillBlue = 'FillBlue',
  BorderRadius = 'BorderRadius',
  StrokeThickness = 'StrokeThickness',
  StrokeRed = 'StrokeRed',
  StrokeGreen = 'StrokeGreen',
  StrokeBlue = 'StrokeBlue'
  // Points = 'Points',
}

export interface ObjectEditConfig {
  objectId: string // Using string for UUID
  objectType: ObjectType
  fieldName: string
  oldValue: { type: ObjectProperty; value: number }
  newValue: { type: ObjectProperty; value: number }
}

// Type definitions for handlers
export type PolygonClickHandler = (polygon_id: string, polygon_config: PolygonConfig) => void | null
export type TextItemClickHandler = (text_id: string) => void | null
export type ImageItemClickHandler = (image_id: string) => void | null
export type VideoItemClickHandler = (video_id: string) => void | null
export type Cube3DClickHandler = (cube_id: string, cube_config: Cube3DConfig) => void | null
export type Sphere3DClickHandler = (sphere_id: string, sphere_config: Sphere3DConfig) => void | null
export type Mockup3DClickHandler = (mockup_id: string, mockup_config: Mockup3DConfig) => void | null
export type OnMouseUp = (id: string, point: Point) => [Sequence, string[]] | null
export type OnHandleMouseUp = (
  objectId: string,
  handleId: string,
  point: Point
) => [Sequence | null, string[] | null] | undefined
export type OnPathMouseUp = () => ((id: string, point: Point) => [Sequence, UIKeyframe[]]) | null

export enum ControlMode {
  Select,
  Pan
}

export interface windowSize {
  width: number
  height: number
}

export class Editor {
  kind: 'editor' | 'state' = 'editor'

  // visual
  selectedPolygonId: string | null
  polygons: Polygon[]
  draggingPolygon: string | null
  staticPolygons: (Polygon | Sphere3D)[]
  projectSelected: string | null
  textItems: TextRenderer[]
  draggingText: string | null
  imageItems: StImage[]
  draggingImage: string | null
  fontManager: FontManager
  draggingPath: string | null
  draggingPathHandle: string | null
  draggingPathObject: string | null
  draggingPathKeyframe: string | null
  draggingPathAssocPath: string | null
  //   cursorDot: RingDot | null;
  videoItems: StVideo[]
  draggingVideo: string | null
  brushes: ProceduralBrush[]
  brushDrawingMode: boolean
  currentBrush: ProceduralBrush | null
  cubes3D: Cube3D[] = []
  spheres3D: Sphere3D[] = []
  mockups3D: Mockup3D[] = []
  models3D: Model3D[] = []
  projectiles: { id: string; creationTime: number }[] = []
  projectileLifetime: number = 5000 // 5 seconds

  draggingCube3D: string | null
  draggingSphere3D: string | null
  draggingMockup3D: string | null
  motionPaths: MotionPath[]
  repeatManager: RepeatManager
  physics: Physics | null
  bodies: Map<string, Jolt.Body>
  characters: Map<string, Jolt.CharacterVirtual> = new Map()
  nodes: any[] = []
  edges: any[] = []

  // multiPageEditor: MultiPageEditor | null = null;
  multiPageEditor: UnifiedRichTextEditor | null = null
  textArea: TextRenderer | null = null
  textAreaActive: boolean = false
  target: SaveTarget = SaveTarget.Videos

  // viewport
  viewport: Viewport
  handlePolygonClick: PolygonClickHandler | null
  handleTextClick: TextItemClickHandler | null
  handleImageClick: ImageItemClickHandler | null
  handleVideoClick: VideoItemClickHandler | null
  handleCube3DClick: Cube3DClickHandler | null
  handleSphere3DClick: Sphere3DClickHandler | null
  handleMockup3DClick: Mockup3DClickHandler | null
  scaleMultiplier: number = 1.0

  window: Window | null
  camera: Camera3D | null
  cameraBinding: CameraBinding | null

  // WebGPU resources
  // gpuResources: WebGpuResources | null;
  // modelBindGroupLayout: PolyfillBindGroupLayout | null;
  // groupBindGroupLayout: PolyfillBindGroupLayout | null;
  // windowSizeBindGroupLayout: PolyfillBindGroupLayout | null;
  // windowSizeBindGroup: PolyfillBindGroup | null;
  // windowSizeBuffer: GPUBuffer | null;
  // renderPipeline: GPURenderPipeline | null;
  gpuResources: GPUPolyfill | null = null
  modelBindGroupLayout: PolyfillBindGroupLayout | null = null
  groupBindGroupLayout: PolyfillBindGroupLayout | null = null
  windowSizeBindGroupLayout: PolyfillBindGroupLayout | null = null
  windowSizeBindGroup: PolyfillBindGroup | null = null
  windowSizeBuffer: PolyfillBuffer | null = null
  renderPipeline: PolyfillRenderPipeline | null = null
  sceneShaderBuffer: PolyfillBuffer | null = null
  sceneShaderBindGroupLayout: PolyfillBindGroupLayout | null = null
  sceneShaderBindGroup: PolyfillBindGroup | null = null

  // Events
  onMouseUp: OnMouseUp | null
  onHandleMouseUp: OnHandleMouseUp | null
  onPathMouseUp: OnPathMouseUp | null
  onBrushStrokeUp?: (brushId: string) => void
  currentView: string
  // interactiveBounds: BoundingBox;

  // state
  isPlaying: boolean
  currentSequenceData: Sequence | null
  lastFrameTime: number | null
  startPlayingTime: number | null
  videoIsPlaying: boolean
  videoStartPlayingTime: number | null
  videoCurrentSequenceTimeline: SavedTimelineStateConfig | null
  videoCurrentSequencesData: Sequence[] | null
  controlMode: ControlMode
  isPanning: boolean
  isExporting: boolean = false

  // points
  lastMousePos: Point | null
  dragStart: Point | null
  lastScreen: Point // last mouse position from input event top-left origin
  lastWorld: Point
  lastTopLeft: Point // for inside the editor zone
  globalTopLeft: Point // for when recording mouse positions outside the editor zone
  dsNdcPos: Point // double-width sized ndc-style positioning (screen-oriented)
  ndc: Point
  previousTopLeft: Point
  // gridSnap: number = 10 // screen
  gridSnap: number = 0.001 // world
  lastRay?: Ray

  // ai
  generationCount: number
  generationCurved: boolean
  generationChoreographed: boolean
  generationFade: boolean

  settings: ProjectSettings | null = null

  constructor(viewport: Viewport) {
    const windowSize = {
      width: viewport.width,
      height: viewport.height
    }

    this.fontManager = new FontManager()
    this.repeatManager = new RepeatManager()

    const physics = new Physics()
    this.physics = physics

    this.selectedPolygonId = null // nil UUID
    this.polygons = []
    this.draggingPolygon = null
    this.draggingPathAssocPath = null
    this.dragStart = null
    this.viewport = viewport
    this.handlePolygonClick = null
    this.handleTextClick = null
    this.handleImageClick = null
    this.handleVideoClick = null
    this.handleCube3DClick = null
    this.handleSphere3DClick = null
    this.handleMockup3DClick = null
    this.gpuResources = null
    this.renderPipeline = null
    this.window = null
    this.camera = null
    this.cameraBinding = null
    this.lastMousePos = null
    this.lastScreen = { x: 0.0, y: 0.0 }
    this.lastWorld = { x: 0.0, y: 0.0 }
    this.dsNdcPos = { x: 0.0, y: 0.0 }
    this.lastTopLeft = { x: 0.0, y: 0.0 }
    this.globalTopLeft = { x: 0.0, y: 0.0 }
    this.ndc = { x: 0.0, y: 0.0 }
    this.previousTopLeft = { x: 0.0, y: 0.0 }
    this.isPlaying = false
    this.currentSequenceData = null
    this.lastFrameTime = null
    this.startPlayingTime = null
    this.modelBindGroupLayout = null
    this.groupBindGroupLayout = null
    this.windowSizeBindGroupLayout = null
    // this.gradientBindGroupLayout = null;
    this.windowSizeBindGroup = null
    this.windowSizeBuffer = null
    this.staticPolygons = []
    this.onMouseUp = null
    this.currentView = 'manage_projects'
    this.projectSelected = null
    this.textItems = []
    this.draggingText = null
    this.imageItems = []
    this.draggingImage = null
    this.videoIsPlaying = false
    this.videoStartPlayingTime = null
    this.videoCurrentSequenceTimeline = null
    this.videoCurrentSequencesData = null
    this.draggingPath = null
    this.draggingPathHandle = null
    this.onHandleMouseUp = null
    this.onPathMouseUp = null
    this.draggingPathObject = null
    this.draggingPathKeyframe = null
    // this.cursorDot = null;
    this.controlMode = ControlMode.Select
    this.isPanning = false
    this.videoItems = []
    this.draggingVideo = null
    this.brushes = []
    this.brushDrawingMode = false
    this.currentBrush = null
    this.cubes3D = []
    this.spheres3D = []
    this.mockups3D = []
    this.draggingCube3D = null
    this.draggingSphere3D = null
    this.draggingMockup3D = null
    this.motionPaths = []
    this.bodies = new Map()
    this.generationCount = 4
    this.generationCurved = false
    this.generationChoreographed = true
    this.generationFade = true
    this.models3D = []

    // TODO: update interactive bounds on window resize?
    // this.interactiveBounds = {
    //   min: { x: 0.0, y: 0.0 }, // account for aside width, allow for some off-canvas positioning
    //   max: {
    //     x: windowSize.width,
    //     // y: windowSize.height - 350.0, // 350.0 for timeline space
    //     y: 550.0, // allow for 50.0 padding below and above the canvas
    //   },
    // };
  }

  setSceneShader(type: number, intensity: number, brush_scale: number, noise_strength: number) {
    console.info('setSceneShader', type, intensity, brush_scale, noise_strength)
    this.gpuResources.queue.writeBuffer(
      this.sceneShaderBuffer,
      0,
      new Float32Array([type, intensity, brush_scale, noise_strength]).buffer
    )

    // this.sceneShaderBuffer.data = new Float32Array([
    //   type,
    //   intensity,
    //   brush_scale,
    //   noise_strength
    // ]).buffer
    // this.sceneShaderBuffer.unmap()
  }

  private processPrmoptItem(
    item: StImage | StVideo | Polygon | TextRenderer,
    total: number
  ): [string, number] {
    if (item.hidden) {
      return ['', total]
    }

    // Convert coordinates to percentage-based values
    const x = item.transform.position[0] - CANVAS_HORIZ_OFFSET
    const xPercent = (x / 800.0) * 100.0
    const y = item.transform.position[1] - CANVAS_VERT_OFFSET
    const yPercent = (y / 450.0) * 100.0

    // Build the prompt string for this item
    const promptLine = [
      total.toString(),
      '5',
      item.dimensions[0].toString(),
      item.dimensions[1].toString(),
      Math.round(xPercent).toString(),
      Math.round(yPercent).toString(),
      '0.000', // direction
      '\n'
    ].join(', ')

    return [promptLine, total + 1]
  }

  createInferencePrompt(): string {
    let prompt = ''
    let total = 0

    // Process each type of item
    for (const itemArrays of [this.polygons, this.textItems, this.imageItems, this.videoItems]) {
      for (const item of itemArrays) {
        if (total > 6) break

        const [promptLine, newTotal] = this.processPrmoptItem(item, total)
        prompt += promptLine
        total = newTotal
      }

      if (total > 6) break
    }

    console.log('prompt', prompt)

    return prompt
  }

  async restore_sequence_objects(
    saved_sequence: Sequence,
    hidden: boolean,
    cloned_settings: ProjectSettings
  ) {
    await this.physics.initialize()

    const layerSpacing = cloned_settings ? cloned_settings.layerSpacing : 0.001
    // console.info('layerSpacing restore ', layerSpacing)
    const camera = this.camera! // Non-null assertion, assuming camera is initialized
    const windowSize = camera.windowSize

    const gpu_resources = this.gpuResources! // Non-null assertion

    const device = gpu_resources.device
    const queue = gpu_resources.queue

    camera.animation = saved_sequence?.camera?.animation

    saved_sequence.activePolygons.forEach((p) => {
      const restored_polygon = new Polygon(
        windowSize,
        device!,
        queue!,
        this.modelBindGroupLayout!,
        this.groupBindGroupLayout!,
        // this.gradientBindGroupLayout!,
        camera,
        [
          { x: 0.0, y: 0.0 },
          { x: 1.0, y: 0.0 },
          { x: 1.0, y: 1.0 },
          { x: 0.0, y: 1.0 }
        ],
        // { x: p.dimensions[0], y: p.dimensions[1] },
        [p.dimensions[0] * this.scaleMultiplier, p.dimensions[1] * this.scaleMultiplier],
        {
          x: p.position.x * this.scaleMultiplier,
          y: p.position.y * this.scaleMultiplier,
          z: p.position.z
        },
        0.0,
        p.borderRadius,
        // [p.fill[0], p.fill[1], p.fill[2], p.fill[3]],
        p.backgroundFill,
        {
          thickness: p.stroke.thickness,
          fill: [p.stroke.fill[0], p.stroke.fill[1], p.stroke.fill[2], p.stroke.fill[3]]
        },
        -2.0,
        p.layer,
        p.name,
        p.id, // Generate a new UUID
        saved_sequence.id,
        p.isCircle
      )

      restored_polygon.hidden = hidden

      this.polygons.push(restored_polygon)

      console.log('Polygon restored...')

      if (p.repeatPattern) {
        this.repeatManager.createRepeatObject(
          this.gpuResources?.device!,
          this.gpuResources?.queue!,
          camera.windowSize,
          this.modelBindGroupLayout,
          this.groupBindGroupLayout,
          restored_polygon,
          p.repeatPattern
        )
      }
    })

    // saved_sequence.activeTextItems.forEach(async (t) => {
    for (let t of saved_sequence.activeTextItems) {
      const position = {
        x: CANVAS_HORIZ_OFFSET + t.position.x * this.scaleMultiplier,
        y: CANVAS_VERT_OFFSET + t.position.y * this.scaleMultiplier
      }

      let fontData = await this.fontManager.loadFontByName(t.fontFamily)

      if (!fontData) {
        return
      }

      let config: TextRendererConfig = {
        id: t.id,
        name: t.name,
        text: t.text,
        fontFamily: t.fontFamily,
        dimensions: [
          t.dimensions[0] * this.scaleMultiplier,
          t.dimensions[1] * this.scaleMultiplier
        ],
        position,
        layer: t.layer,
        // color: rgbToWgpu(t.color[0], t.color[1], t.color[2], t.color[3]),
        color: t.color,
        fontSize: t.fontSize * this.scaleMultiplier,
        // backgroundFill: t.backgroundFill
        //   ? rgbToWgpu(
        //       t.backgroundFill[0],
        //       t.backgroundFill[1],
        //       t.backgroundFill[2],
        //       t.backgroundFill[3]
        //     )
        //   : rgbToWgpu(100, 100, 100, 255),
        backgroundFill: t.backgroundFill,
        isCircle: t.isCircle
      }

      const restored_text = new TextRenderer(
        device!,
        queue!,
        this.modelBindGroupLayout!,
        this.groupBindGroupLayout!,
        // this.gradientBindGroupLayout!,
        config,
        fontData,
        windowSize,
        // t.text,
        // config,
        // t.id,
        saved_sequence.id,
        camera,
        false
      )

      restored_text.hidden = hidden
      restored_text.renderText(device!, queue!, this.camera.windowSize)

      // Restore text animation if it exists
      if (t.textAnimation) {
        console.log('Restoring text animation for:', t.id, t.textAnimation)
        restored_text.setTextAnimation(t.textAnimation)
      }

      this.textItems.push(restored_text)

      console.log('Text restored...')
    }

    // saved_sequence.activeImageItems.forEach((i) => {
    for (let i of saved_sequence.activeImageItems) {
      const position = {
        x: CANVAS_HORIZ_OFFSET + i.position.x * this.scaleMultiplier,
        y: CANVAS_VERT_OFFSET + i.position.y * this.scaleMultiplier
      }

      const image_config: StImageConfig = {
        id: i.id,
        name: i.name,
        dimensions: [
          i.dimensions[0] * this.scaleMultiplier,
          i.dimensions[1] * this.scaleMultiplier
        ],
        url: i.url,
        position,
        layer: i.layer,
        isCircle: i.isCircle,
        borderRadius: i.borderRadius
      }

      let blob = await getUploadedImageData(i.url)

      let imageUrl = 'http://localhost:7301/public/images/' + i.url

      const restored_image = new StImage(
        device!,
        queue!,
        i.url,
        blob!, // load of image data
        image_config,
        windowSize,
        this.modelBindGroupLayout!,
        this.groupBindGroupLayout!,
        // this.gradientBindGroupLayout!,
        -2.0,
        saved_sequence.id,
        hidden
      )

      await restored_image.initialize(
        device!,
        queue!,
        i.url,
        blob!, // load of image data
        image_config,
        windowSize,
        this.modelBindGroupLayout!,
        this.groupBindGroupLayout!,
        // this.gradientBindGroupLayout!,
        -2.0,
        saved_sequence.id,
        hidden
      )

      // restored_image.hidden = hidden;
      this.imageItems.push(restored_image)
      console.log('Image restored...')
    }

    // saved_sequence.activeVideoItems.forEach((i) => {
    for (let i of saved_sequence.activeVideoItems) {
      // let stored_source_data: SourceData | null = null;
      // let stored_mouse_positions: MousePosition[] | null = null;

      // if (i.mouse_path) {
      //   try {
      //     // Assuming you have a way to read files of your TS environment (e.g., using fetch or Node.js's fs)
      //     const sourceDataPath =
      //       i.mouse_path.substring(0, i.mouse_path.lastIndexOf("/")) +
      //       "/sourceData.json";
      //     const sourceData = // however you read it, you'll need to await, etc.
      //       (stored_source_data = sourceData as SourceData); // parse the json

      //     const mousePositions = // read the mouse position file
      //       (stored_mouse_positions = mousePositions as MousePosition[]); // parse the json
      //   } catch (error) {
      //     console.error("Error reading video data:", error);
      //   }
      // }

      const position = {
        x: CANVAS_HORIZ_OFFSET + i.position.x * this.scaleMultiplier,
        y: CANVAS_VERT_OFFSET + i.position.y * this.scaleMultiplier
      }

      const video_config: StVideoConfig = {
        id: i.id,
        name: i.name,
        dimensions: [
          i.dimensions[0] * this.scaleMultiplier,
          i.dimensions[1] * this.scaleMultiplier
        ],
        path: i.path,
        position,
        layer: i.layer,
        borderRadius: i.borderRadius
        // mousePath: i.mousePath,
      }

      // let blob = await getUploadedVideoData(i.path)

      const restored_video = new StVideo(
        device!,
        queue!,
        i.path,
        video_config,
        windowSize,
        this.modelBindGroupLayout!,
        this.groupBindGroupLayout!,
        // this.gradientBindGroupLayout!,
        -2.0,
        // i.id,
        saved_sequence.id,
        hidden
      )

      await restored_video.initialize(
        device!,
        queue!,
        i.path,
        video_config,
        windowSize,
        this.modelBindGroupLayout!,
        this.groupBindGroupLayout!,
        // this.gradientBindGroupLayout!,
        -2.0,
        // i.id,
        saved_sequence.id,
        hidden
      )

      // restored_video.hidden = hidden;
      // restored_video.source_data = stored_source_data;
      // restored_video.mouse_positions = stored_mouse_positions;

      // restored_video.drawVideoFrame(device!, queue).catch(console.error); // Handle potential errors

      if (saved_sequence.polygonMotionPaths && !this.isExporting) {
        let objectId = i.id
        const animationData = saved_sequence.polygonMotionPaths.find(
          (anim) => anim.polygonId === objectId
        )
        if (!animationData) {
          console.warn(`Couldn't find animation data for object ${objectId}`)
          return
        }
        // add mouse zoom path if available
        const zoomProperty = animationData.properties.find(
          (prop) =>
            // prop.name.startsWith("Position")
            prop.propertyPath === 'zoom'
        )
        // if (!zoomProperty) {
        //   // console.warn(`Couldn't find zoom property for object ${objectId}`);
        //   return
        // } else {
        //   console.info('Found zoom property for ', objectId)
        // }

        if (zoomProperty) {
          // Sort keyframes by time
          const zoomKeyframes = [...zoomProperty.keyframes].sort((a, b) => a.time - b.time)
          const initialZoomPosition: [number, number] = animationData.position

          console.info('creating new zoom path', initialZoomPosition)

          const zoomPath = new MotionPath(
            device!,
            queue!,
            this.modelBindGroupLayout!,
            this.groupBindGroupLayout!,
            // this.gradientBindGroupLayout,
            objectId, // good association? no need to drag full zoom path?
            camera.windowSize,
            zoomKeyframes,
            camera,
            saved_sequence,
            1,
            objectId,
            initialZoomPosition
          )

          restored_video.mousePath = zoomPath
        }
      }

      this.videoItems.push(restored_video)

      console.log('Video restored...')
    }

    // Restore 3D cubes
    if (saved_sequence.activeCubes3D) {
      for (let c of saved_sequence.activeCubes3D) {
        const cube_config: Cube3DConfig = {
          id: c.id,
          name: c.name,
          dimensions: c.dimensions,
          position: {
            x: c.position.x * this.scaleMultiplier,
            y: c.position.y * this.scaleMultiplier,
            z: c.position.z || 0
          },
          rotation: c.rotation,
          backgroundFill: c.backgroundFill,
          layer: c.layer
        }

        const restored_cube = new Cube3D(
          windowSize,
          device!,
          queue!,
          this.modelBindGroupLayout!,
          this.groupBindGroupLayout!,
          camera,
          cube_config,
          saved_sequence.id
        )

        restored_cube.hidden = hidden
        this.cubes3D.push(restored_cube)

        if (c.name === 'PlayerCharacter') {
          const dynamicBody = this.physics.createVirtualCharacter(
            new this.physics.jolt.RVec3(c.position.x, c.position.y, c.position.z),
            new this.physics.jolt.Quat(0, 0, 0, 1),
            2, // characterHeightStanding
            1 // characterRadiusStanding
          )
          this.characters.set(c.id, dynamicBody)

          console.log('Vrtual Character restored...')
        } else {
          const dynamicBody = this.physics.createDynamicBox(
            new this.physics.jolt.RVec3(c.position.x, c.position.y, c.position.z || 0),
            new this.physics.jolt.Quat(0, 0, 0, 1),
            new this.physics.jolt.Vec3(c.dimensions[0], c.dimensions[1], c.dimensions[2])
          )
          this.bodies.set(c.id, dynamicBody)

          console.log('Dynamic Cube3D restored...')
        }
      }
    }

    // Restore 3D spheres
    if (saved_sequence.activeSpheres3D) {
      for (let s of saved_sequence.activeSpheres3D) {
        const sphere_config: Sphere3DConfig = {
          id: s.id,
          name: s.name,
          radius: s.radius,
          position: {
            x: s.position.x * this.scaleMultiplier,
            y: s.position.y * this.scaleMultiplier
          },
          rotation: s.rotation,
          backgroundFill: s.backgroundFill,
          layer: s.layer,
          segments: s.segments
        }

        const restored_sphere = new Sphere3D(
          windowSize,
          device!,
          queue!,
          this.modelBindGroupLayout!,
          this.groupBindGroupLayout!,
          camera,
          sphere_config,
          saved_sequence.id
        )

        restored_sphere.hidden = hidden
        this.spheres3D.push(restored_sphere)
        console.log('Sphere3D restored...')
      }
    }

    // Restore 3D Mockups
    if (saved_sequence.activeMockups3D) {
      for (let s of saved_sequence.activeMockups3D) {
        const mockup_config: Mockup3DConfig = {
          id: s.id,
          name: s.name,
          dimensions: s.dimensions,
          position: {
            x: s.position.x * this.scaleMultiplier,
            y: s.position.y * this.scaleMultiplier
          },
          rotation: s.rotation,
          backgroundFill: s.backgroundFill,
          layer: s.layer,
          videoChild: s.videoChild,
          tiltAngle: s.tiltAngle
        }

        const restored_mockup = new Mockup3D(
          windowSize,
          device!,
          queue!,
          this.modelBindGroupLayout!,
          this.groupBindGroupLayout!,
          camera,
          mockup_config,
          saved_sequence.id
        )

        const i = s.videoChild

        // TODO: initialize the video class as is done above in this function and attach to the restored_mockup
        const position = {
          x: CANVAS_HORIZ_OFFSET + i.position.x * this.scaleMultiplier,
          y: CANVAS_VERT_OFFSET + i.position.y * this.scaleMultiplier
        }

        // const ndcPoint = {
        //   x: (position.x / camera.windowSize.width) * 2.0 - 1.0,
        //   y: -((position.y / camera.windowSize.height) * 2.0 - 1.0)
        // }

        let dimensions = [
          i.dimensions[0] * this.scaleMultiplier,
          i.dimensions[1] * this.scaleMultiplier
        ] as [number, number]

        // const ndcDimensions = [
        //   (dimensions[0] / camera.windowSize.width) * 2.0 - 1.0,
        //   -((dimensions[1] / camera.windowSize.height) * 2.0 - 1.0)
        // ] as [number, number]

        const video_config: StVideoConfig = {
          id: i.id,
          name: i.name,
          dimensions: dimensions,
          path: i.path,
          // position: ndcPoint,
          position,
          layer: i.layer,
          borderRadius: i.borderRadius
          // mousePath: i.mousePath,
        }

        // let blob = await getUploadedVideoData(i.path)

        const restored_video = new StVideo(
          device!,
          queue!,
          i.path,
          video_config,
          windowSize,
          this.modelBindGroupLayout!,
          this.groupBindGroupLayout!,
          // this.gradientBindGroupLayout!,
          -2.0,
          // i.id,
          saved_sequence.id,
          hidden,
          7
        )

        await restored_video.initialize(
          device!,
          queue!,
          i.path,
          video_config,
          windowSize,
          this.modelBindGroupLayout!,
          this.groupBindGroupLayout!,
          // this.gradientBindGroupLayout!,
          -2.0,
          // i.id,
          saved_sequence.id,
          hidden
        )

        restored_mockup.videoChild = restored_video

        // restored_mockup.videoChild.transform.layer =
        //   restored_mockup.videoChild.transform.layer + 0.3
        restored_mockup.videoChild.transform.position[2] += 0.02

        restored_mockup.updateVideoChildTransform(
          this.gpuResources?.queue!,
          this.camera?.windowSize!
        )

        restored_mockup.hidden = hidden

        restored_mockup.initVideo() // run after adding video to mockup
        restored_mockup.updateChildRotations(queue, camera, s.rotation)

        this.mockups3D.push(restored_mockup)
        console.log('Sphere3D restored...')
      }
    }

    // Restore 3D models
    if (saved_sequence.activeModels3D) {
      for (const model of saved_sequence.activeModels3D) {
        if (
          !this.gpuResources ||
          !this.camera ||
          !this.modelBindGroupLayout ||
          !this.groupBindGroupLayout
        ) {
          continue
        }

        try {
          // Load model data from path
          const modelData = await window.api.uploads.getModel(model.path)

          if (!modelData.success) {
            console.error('Failed to load model data:', model.path)
            continue
          }

          console.info('model', model)

          const restored_model = await Model3D.create(
            this.camera.windowSize,
            this.gpuResources.device,
            this.gpuResources.queue,
            this.modelBindGroupLayout,
            this.groupBindGroupLayout,
            this.camera,
            model,
            saved_sequence.id,
            modelData.data.buffer
          )

          restored_model.hidden = hidden

          this.models3D.push(restored_model)

          console.info('model 3d restored')
        } catch (error) {
          console.error('Error restoring model:', error)
        }
      }
    }

    if (saved_sequence.activeBrushes) {
      for (const brush of saved_sequence.activeBrushes) {
        if (
          !this.gpuResources ||
          !this.camera ||
          !this.modelBindGroupLayout ||
          !this.groupBindGroupLayout
        ) {
          continue
        }

        try {
          const restored_brush = new ProceduralBrush(
            windowSize,
            this.gpuResources.device!,
            this.gpuResources.queue!,
            this.modelBindGroupLayout,
            this.groupBindGroupLayout,
            camera,
            brush,
            saved_sequence.id,
            this.scaleMultiplier
          )

          restored_brush.hidden = hidden

          this.brushes.push(restored_brush)

          console.info('brush restored')
        } catch (error) {
          console.error('Error restoring model:', error)
        }
      }
    }
  }

  reset_sequence_objects() {
    if (this.currentSequenceData) {
      const gpu_resources = this.gpuResources!
      const camera = this.camera!

      this.currentSequenceData.activePolygons.forEach((p) => {
        const polygon = this.polygons.find((polygon) => polygon.id === p.id)
        if (!polygon) {
          throw new Error("Couldn't find polygon")
        }

        let systemPosition = toNDC(
          p.position.x + CANVAS_HORIZ_OFFSET * this.scaleMultiplier,
          p.position.y + CANVAS_VERT_OFFSET * this.scaleMultiplier,
          camera.windowSize.width,
          camera.windowSize.height
        )
        systemPosition.z = p.position.z

        polygon.transform.position[0] = systemPosition.x
        polygon.transform.position[1] = systemPosition.y
        polygon.transform.rotation = 0.0
        polygon.transform.updateScale([1.0, 1.0])

        polygon.transform.updateUniformBuffer(gpu_resources.queue!, camera.windowSize)
        polygon.updateOpacity(gpu_resources.queue!, 1.0)
      })

      this.currentSequenceData.activeTextItems.forEach((t) => {
        const text = this.textItems.find((text) => text.id === t.id)
        if (!text) {
          throw new Error("Couldn't find text")
        }

        let systemPosition = toNDC(
          t.position.x + CANVAS_HORIZ_OFFSET * this.scaleMultiplier,
          t.position.y + CANVAS_VERT_OFFSET * this.scaleMultiplier,
          camera.windowSize.width,
          camera.windowSize.height
        )
        systemPosition.z = t.position.z

        text.transform.position[0] = systemPosition.x
        text.transform.position[1] = systemPosition.y
        text.transform.rotation = 0.0

        text.transform.updateUniformBuffer(gpu_resources.queue!, camera.windowSize)
        text.updateOpacity(gpu_resources.queue!, 1.0)

        text.backgroundPolygon.transform.position[0] = t.position.x + CANVAS_HORIZ_OFFSET
        text.backgroundPolygon.transform.position[1] = t.position.y + CANVAS_VERT_OFFSET
        text.backgroundPolygon.transform.rotation = 0.0

        text.backgroundPolygon.transform.updateUniformBuffer(
          gpu_resources.queue!,
          camera.windowSize
        )
        text.backgroundPolygon.updateOpacity(gpu_resources.queue!, 1.0)
      })

      this.currentSequenceData.activeImageItems.forEach((i) => {
        const image = this.imageItems.find((image) => image.id === i.id)
        if (!image) {
          throw new Error("Couldn't find image")
        }

        let systemPosition = toNDC(
          i.position.x + CANVAS_HORIZ_OFFSET * this.scaleMultiplier,
          i.position.y + CANVAS_VERT_OFFSET * this.scaleMultiplier,
          camera.windowSize.width,
          camera.windowSize.height
        )
        systemPosition.z = i.position.z

        image.transform.position[0] = systemPosition.x
        image.transform.position[1] = systemPosition.y
        image.transform.rotation = 0.0

        image.transform.updateUniformBuffer(gpu_resources.queue!, camera.windowSize)
        image.updateOpacity(gpu_resources.queue!, 1.0)
      })

      this.currentSequenceData.activeVideoItems.forEach((i) => {
        const video = this.videoItems.find((video) => video.id === i.id)
        if (!video) {
          throw new Error("Couldn't find video")
        }

        let systemPosition = toNDC(
          i.position.x + CANVAS_HORIZ_OFFSET * this.scaleMultiplier,
          i.position.y + CANVAS_VERT_OFFSET * this.scaleMultiplier,
          camera.windowSize.width,
          camera.windowSize.height
        )
        systemPosition.z = i.position.z

        video.groupTransform.position[0] = systemPosition.x
        video.groupTransform.position[1] = systemPosition.y
        video.groupTransform.rotation = 0.0

        video.groupTransform.updateUniformBuffer(gpu_resources.queue!, camera.windowSize)

        video.updateOpacity(gpu_resources.queue!, 1.0)

        video.resetPlayback()
      })
    }
  }

  clearCanvas() {
    this.reset_sequence_objects()
    this.hide_all_objects()

    this.currentSequenceData = null
  }

  getCurrentPositions() {
    const current_positions: [number, number, number, number][] = []
    let total = 0

    for (const polygon of this.polygons) {
      if (!polygon.hidden) {
        current_positions.push([
          total,
          20000,
          polygon.transform.position[0] - CANVAS_HORIZ_OFFSET,
          polygon.transform.position[1] - CANVAS_VERT_OFFSET
        ])
        total++
      }
    }

    for (const text of this.textItems) {
      if (!text.hidden) {
        current_positions.push([
          total,
          20000,
          text.transform.position[0] - CANVAS_HORIZ_OFFSET,
          text.transform.position[1] - CANVAS_VERT_OFFSET
        ])
        total++
      }
    }

    for (const image of this.imageItems) {
      if (!image.hidden) {
        current_positions.push([
          total,
          20000,
          image.transform.position[0] - CANVAS_HORIZ_OFFSET,
          image.transform.position[1] - CANVAS_VERT_OFFSET
        ])
        total++
      }
    }

    for (const video of this.videoItems) {
      if (!video.hidden) {
        current_positions.push([
          total,
          video.sourceDurationMs,
          video.groupTransform.position[0] - CANVAS_HORIZ_OFFSET,
          video.groupTransform.position[1] - CANVAS_VERT_OFFSET
        ])
        total++
      }
    }

    return current_positions
  }

  createMotionPathsFromPredictions(
    predictions: number[],
    current_positions: [number, number, number, number][],
    // getItemId: (idx: number) => string | null,
    // getObjectType: (objectIdx: number) => ObjectType | null
    manager: Editor | EditorState,
    dimensions = {
      width: 800,
      height: 450
    }
  ): AnimationData[] {
    const animation_data_vec: AnimationData[] = []
    const values_per_prediction = NUM_INFERENCE_FEATURES
    const keyframes_per_object = 6

    const timestamp_diffs = [0.0, 2500.0, 5000.0, -5000.0, -2500.0, 0.0]

    const total_predictions = predictions.length
    const num_objects = total_predictions / (values_per_prediction * keyframes_per_object)

    console.info(
      'createMotionPathsFromPredictions',
      total_predictions,
      num_objects,
      this.generationChoreographed,
      this.generationFade,
      this.generationCurved
    )

    let longest_path: number | null = 0
    if (this.generationChoreographed) {
      let max_distance = 0.0
      for (let object_idx = 0; object_idx < num_objects; object_idx++) {
        let path_length = 0.0
        let prev_x: number | null = null
        let prev_y: number | null = null

        for (let keyframe_idx = 0; keyframe_idx < keyframes_per_object; keyframe_idx++) {
          const base_idx =
            object_idx * (values_per_prediction * keyframes_per_object) +
            keyframe_idx * values_per_prediction

          if (base_idx + 5 >= predictions.length) {
            continue
          }

          const x = Math.round(predictions[base_idx + 4] * 0.01 * dimensions.width)
          const y = Math.round(predictions[base_idx + 5] * 0.01 * dimensions.height)

          if (prev_x !== null && prev_y !== null) {
            const dx = x - prev_x
            const dy = y - prev_y
            path_length += Math.sqrt(dx * dx + dy * dy)
          }

          prev_x = x
          prev_y = y
        }

        if (path_length > max_distance) {
          max_distance = path_length
          longest_path = object_idx
        }
      }
    }

    for (let object_idx = 0; object_idx < current_positions.length; object_idx++) {
      const itemId = manager.getItemId(object_idx)
      const objectType = manager.getObjectType(object_idx)

      if (!itemId || !objectType) continue // Skip if ID or type is not found

      console.info('processing item', itemId, objectType)

      const totalDuration =
        objectType === ObjectType.VideoItem
          ? this.videoItems.find((v) => v.id === itemId)?.sourceDurationMs || 20000 // Provide a default
          : 20000.0

      const timestamps = [
        0.0,
        2500.0,
        5000.0,
        totalDuration - 5000.0,
        totalDuration - 2500.0,
        totalDuration
      ]

      const pathSourceIdx = this.generationChoreographed ? longest_path : object_idx // Use nullish coalescing

      const positionKeyframes: UIKeyframe[] = []

      const [, , currentX, currentY] = current_positions[object_idx]

      const rangeCenterIdx =
        pathSourceIdx * (values_per_prediction * keyframes_per_object) + 2 * values_per_prediction

      console.info('rangeCenterIdx', rangeCenterIdx)

      const centerX = Math.round(predictions[rangeCenterIdx + 4] * 0.01 * dimensions.width)
      const centerY = Math.round(predictions[rangeCenterIdx + 5] * 0.01 * dimensions.height)

      const offsetX = currentX - centerX
      const offsetY = currentY - centerY

      for (let keyframeTimeIdx = 0; keyframeTimeIdx < keyframes_per_object; keyframeTimeIdx++) {
        if (this.generationCount === 4 && (keyframeTimeIdx === 1 || keyframeTimeIdx === 4)) {
          continue
        }

        const baseIdx =
          pathSourceIdx * (values_per_prediction * keyframes_per_object) +
          keyframeTimeIdx * values_per_prediction

        console.info('baseIdx', baseIdx)

        if (baseIdx + 5 >= predictions.length) {
          continue
        }

        const predictedX = Math.round(predictions[baseIdx + 4] * 0.01 * dimensions.width) + offsetX
        const predictedY = Math.round(predictions[baseIdx + 5] * 0.01 * dimensions.height) + offsetY

        const timestamp =
          keyframeTimeIdx < 3
            ? timestamp_diffs[keyframeTimeIdx]
            : totalDuration + timestamp_diffs[keyframeTimeIdx]

        console.info('key time', keyframeTimeIdx, timestamp)

        const keyframe: UIKeyframe = {
          id: uuidv4(),
          time: timestamp,
          value: { type: 'Position', value: [predictedX, predictedY] },
          easing: EasingType.EaseInOut,
          pathType: PathType.Linear,
          curveData: null,
          keyType: { type: 'Frame' }
        }

        positionKeyframes.push(keyframe)
      }

      console.info('pre split', positionKeyframes)

      // ... (rest of the code for range keyframes and final keyframes)

      if (positionKeyframes.length === 6) {
        const forthKeyframe = { ...positionKeyframes[3] } // Create a copy
        const thirdKeyframe = positionKeyframes[2]
        thirdKeyframe.keyType = {
          type: 'Range',
          data: {
            endTime: forthKeyframe.time // Duration of milliseconds
          }
        }
        positionKeyframes.splice(3, 1) // Remove the 4th element
      }

      if (positionKeyframes.length === 4) {
        const mid2Keyframe = { ...positionKeyframes[2] } // Create a copy
        const midKeyframe = positionKeyframes[1]
        // midKeyframe.keyType = KeyType.Range({ end_time: mid2Keyframe.time });
        midKeyframe.keyType = {
          type: 'Range',
          data: {
            endTime: mid2Keyframe.time // Duration of milliseconds
          }
        }
        positionKeyframes.splice(2, 1) // Remove the 3rd element (index 2)
      }

      let final_position_keyframes: UIKeyframe[] = []
      if (this.generationCurved) {
        for (const keyframe of positionKeyframes) {
          if (final_position_keyframes.length > 0) {
            // Check if there's a previous keyframe
            const prevKeyframe = final_position_keyframes[final_position_keyframes.length - 1]
            const curveData = calculateDefaultCurve(prevKeyframe, keyframe) // Implement this function
            prevKeyframe.pathType = PathType.Bezier
            if (prevKeyframe.pathType === PathType.Bezier && curveData) {
              prevKeyframe.curveData = curveData
            }
          }
          final_position_keyframes.push({ ...keyframe }) // Push a copy
        }
      } else {
        final_position_keyframes = [...positionKeyframes] // Create a copy
      }

      console.info('final positions', final_position_keyframes)

      if (final_position_keyframes.length > 0 && itemId) {
        // Check if itemId is defined
        const properties: AnimationProperty[] = [
          {
            name: 'Position',
            propertyPath: 'position',
            children: [],
            keyframes: final_position_keyframes,
            depth: 0
          },
          {
            name: 'Rotation',
            propertyPath: 'rotation',
            children: [],
            keyframes: timestamps.map((t) => ({
              id: uuidv4(),
              time: t,
              value: {
                type: 'Rotation',
                value: 0
              }, // Assuming 0 for rotation
              easing: EasingType.EaseInOut,
              pathType: PathType.Linear,
              keyType: { type: 'Frame' },
              curveData: null
            })),
            depth: 0
          },
          {
            name: 'Scale X',
            propertyPath: 'scalex',
            children: [],
            keyframes: timestamps.map((t) => ({
              id: uuidv4(),
              time: t,
              value: {
                type: 'ScaleX',
                value: 100
              }, // Assuming 100 for scale
              easing: EasingType.EaseInOut,
              pathType: PathType.Linear,
              keyType: { type: 'Frame' },
              curveData: null
            })),
            depth: 0
          },
          {
            name: 'Scale Y',
            propertyPath: 'scaley',
            children: [],
            keyframes: timestamps.map((t) => ({
              id: uuidv4(),
              time: t,
              value: {
                type: 'ScaleY',
                value: 100
              }, // Assuming 100 for scale
              easing: EasingType.EaseInOut,
              pathType: PathType.Linear,
              keyType: { type: 'Frame' },
              curveData: null
            })),
            depth: 0
          },
          {
            name: 'Opacity',
            propertyPath: 'opacity',
            children: [],
            keyframes: timestamps.map((t, i) => {
              let opacity = 100
              if (this.generationFade && (i === 0 || i === timestamps.length - 1)) {
                opacity = 0
              }

              return {
                id: uuidv4(),
                time: t,
                value: {
                  type: 'Opacity',
                  value: opacity
                },
                easing: EasingType.EaseInOut,
                pathType: PathType.Linear,
                keyType: { type: 'Frame' },
                curveData: null
              }
            }),
            depth: 0
          }
        ]

        if (objectType === ObjectType.VideoItem) {
          let keyframes = [] as UIKeyframe[]
          let entries = timestamps.entries() as any
          entries.forEach(([i, t]: [number, number]) =>
            keyframes.push({
              id: uuidv4(),
              time: t,
              value: {
                type: 'Zoom',
                value: {
                  position: [i * 20, i * 20],
                  zoomLevel: i === 0 ? 100 : 135
                }
              },
              easing: EasingType.EaseInOut,
              pathType: PathType.Linear,
              keyType: { type: 'Frame' },
              curveData: null
            })
          )

          properties.push({
            name: 'Zoom / Popout',
            propertyPath: 'zoom',
            children: [],
            keyframes,
            depth: 0
          })
        }

        animation_data_vec.push({
          id: uuidv4(),
          objectType: objectType,
          polygonId: itemId,
          duration: totalDuration,
          startTimeMs: 0,
          position: [0, 0],
          properties
        })
      }
    }

    return animation_data_vec
  }

  // Helper function to get item ID based on object index
  getItemId(objectIdx: number): string | null {
    const visiblePolygons: Polygon[] = this.polygons.filter((p) => !p.hidden)
    const visibleTexts: TextRenderer[] = this.textItems.filter((t) => !t.hidden)
    const visibleImages: StImage[] = this.imageItems.filter((i) => !i.hidden)
    const visibleVideos: StVideo[] = this.videoItems.filter((v) => !v.hidden)

    const polygonCount = visiblePolygons.length
    const textCount = visibleTexts.length
    const imageCount = visibleImages.length
    const videoCount = visibleVideos.length

    if (objectIdx < polygonCount) {
      return visiblePolygons[objectIdx].id
    } else if (objectIdx < polygonCount + textCount) {
      return visibleTexts[objectIdx - polygonCount].id
    } else if (objectIdx < polygonCount + textCount + imageCount) {
      return visibleImages[objectIdx - (polygonCount + textCount)].id
    } else if (objectIdx < polygonCount + textCount + imageCount + videoCount) {
      return visibleVideos[objectIdx - (polygonCount + textCount + imageCount)].id
    } else {
      return null
    }
  }

  // Helper function to get object type based on object index
  getObjectType(objectIdx: number): ObjectType | null {
    const polygonCount = this.polygons.filter((p) => !p.hidden).length
    const textCount = this.textItems.filter((t) => !t.hidden).length
    const imageCount = this.imageItems.filter((i) => !i.hidden).length
    const videoCount = this.videoItems.filter((v) => !v.hidden).length

    if (objectIdx < polygonCount) {
      return ObjectType.Polygon
    } else if (objectIdx < polygonCount + textCount) {
      return ObjectType.TextItem
    } else if (objectIdx < polygonCount + textCount + imageCount) {
      return ObjectType.ImageItem
    } else if (objectIdx < polygonCount + textCount + imageCount + videoCount) {
      return ObjectType.VideoItem
    } else {
      return null
    }
  }

  stepVideoAnimations(camera: Camera, providedCurrentTimeS?: number): void {
    if (!this.videoIsPlaying || !this.videoCurrentSequenceTimeline) {
      // console.warn("no data");
      return
    }

    const now = Date.now()
    const totalDt = this.videoStartPlayingTime ? (now - this.videoStartPlayingTime) / 1000 : 0

    const sequenceTimeline = this.videoCurrentSequenceTimeline

    // Convert totalDt from seconds to milliseconds for comparison with timeline
    const currentTimeMs = providedCurrentTimeS
      ? Math.floor(providedCurrentTimeS * 1000)
      : Math.floor(totalDt * 1000)

    // Get the sequences data
    const videoCurrentSequencesData = this.videoCurrentSequencesData
    if (!videoCurrentSequencesData) {
      // console.warn("no data");
      return
    }

    let updateBackground = false

    if (totalDt <= 1.0 / 60.0) {
      console.log('Update initial background...')
      updateBackground = true
    }

    // Iterate through timeline sequences of order
    for (const ts of sequenceTimeline.timeline_sequences) {
      // Skip audio tracks as we're only handling video
      if (ts.trackType !== TrackType.Video) {
        continue
      }

      // Find the corresponding sequence data
      const sequence = videoCurrentSequencesData.find((s) => s.id === ts.sequenceId)

      // Find the duration of the sequence
      // const durationMs =
      //   videoCurrentSequencesData.find((s) => s.id === ts.sequenceId)?.durationMs || 0
      const { startTimeMs, durationMs } = getSequencesDuration(
        this,
        videoCurrentSequencesData,
        sequence
      )

      // Check if this sequence should be playing at the current time
      if (currentTimeMs >= startTimeMs && currentTimeMs < startTimeMs + durationMs) {
        // console.info('checking mark', sequence.id, sequence.name)

        if (sequence) {
          // Calculate local time within this sequence
          const sequenceLocalTime = (currentTimeMs - startTimeMs) / 1000

          if (this.currentSequenceData) {
            // Check id to avoid unnecessary cloning
            if (sequence.id !== this.currentSequenceData.id) {
              this.currentSequenceData = sequence

              // Set hidden attribute on relevant objects
              const currentSequenceId = sequence.id

              // console.info("mark unhidden");

              for (const polygon of this.polygons) {
                polygon.hidden = polygon.currentSequenceId !== currentSequenceId
              }
              for (const text of this.textItems) {
                text.hidden = text.currentSequenceId !== currentSequenceId

                // if (!text.hidden && text.hasTextAnimation()) {
                //   const savedItem = this.currentSequenceData?.polygonMotionPaths?.find(
                //     (mp) => mp.polygonId === text.id
                //   )

                //   if (savedItem) {
                //     text.startTextAnimation(startTimeMs + savedItem.startTimeMs)
                //   }
                // }
              }
              for (const image of this.imageItems) {
                image.hidden = image.currentSequenceId !== currentSequenceId
              }
              for (const video of this.videoItems) {
                video.hidden = video.currentSequenceId !== currentSequenceId
              }

              updateBackground = true
            }
          } else {
            this.currentSequenceData = sequence
            // for (const text of this.textItems) {
            //   if (!text.hidden && text.hasTextAnimation()) {
            //     const savedItem = this.currentSequenceData?.polygonMotionPaths?.find(
            //       (mp) => mp.polygonId === text.id
            //     )

            //     if (savedItem) {
            //       text.startTextAnimation(savedItem.startTimeMs)
            //     }
            //   }
            // }
          }
        } else {
          // console.warn("no data");
        }
      }
    }

    if (updateBackground && this.currentSequenceData) {
      const backgroundFill = this.currentSequenceData.backgroundFill

      if (!backgroundFill) {
        return
      }

      let camera = this.camera

      if (!camera) return

      let backgroundSize: WindowSize = {
        width: (camera.windowSize.width - 50) * this.scaleMultiplier,
        height: (camera.windowSize.height - 50) * this.scaleMultiplier
      }

      this.replace_background(this.currentSequenceData.id, backgroundFill, backgroundSize)
    }
  }

  async stepMotionPathAnimations(camera: Camera, providedCurrentTimeS?: number): Promise<void> {
    if (!this.isPlaying || !this.currentSequenceData) {
      return
    }

    const now = Date.now()
    let totalDt = this.startPlayingTime ? (now - this.startPlayingTime) / 1000 : 0
    totalDt = providedCurrentTimeS !== undefined ? providedCurrentTimeS : totalDt
    this.lastFrameTime = now

    // if (providedCurrentTimeS !== undefined) {
    //   console.info("step animations");
    // }

    try {
      await this.stepAnimateSequence(totalDt, camera, providedCurrentTimeS !== undefined)
    } catch (error) {
      console.error('Error during stepAnimateSequence:', error)
      throw error // Re-throw the error to be handled by the caller
    }

    // if (providedCurrentTimeS !== undefined) {
    //   console.info("finished step animations");
    // }
  }

  async stepAnimateSequence(totalDt: number, camera: Camera, isExport: boolean): Promise<void> {
    const gpuResources = this.gpuResources
    if (!gpuResources) {
      throw new Error("Couldn't get GPU Resources")
    }

    const sequence = this.currentSequenceData
    // const { startTimeMs, durationMs: sequencDurationMs } = getSequenceDuration(sequence)
    const { startTimeMs: sequenceStartTimeMs, durationMs: sequenceDurationMs } =
      getSequencesDuration(this, this.videoCurrentSequencesData, sequence)
    if (!sequence || !sequence.polygonMotionPaths) {
      throw new Error("Couldn't get sequence")
    }

    // if (isExport) {
    //   console.info(
    //     "Exporting sequence animations...",
    //     sequence.polygonMotionPaths
    //   );
    // }

    // if ((totalDt * 1000) < sequenceStartTimeMs)

    // Update each animation path
    for (const animation of sequence.polygonMotionPaths) {
      // Group transform position
      const pathGroupPosition = animation.position

      // Get current time within animation duration
      // const currentTime = totalDt % (sequenceDurationMs / 1000)
      const currentTime = Math.max(0, totalDt - sequenceStartTimeMs / 1000)
      const startTime = animation.startTimeMs / 1000
      const currentTimeMs = currentTime * 1000
      const startTimeMs = startTime * 1000

      // console.info("animating", animation.objectType, animation.polygonId);

      // Find the object to update
      let objectIdx: number | undefined
      switch (animation.objectType) {
        case 'Polygon':
          objectIdx = this.polygons.findIndex((p) => p.id === animation.polygonId)
          break
        case 'TextItem':
          objectIdx = this.textItems.findIndex((t) => t.id === animation.polygonId)
          break
        case 'ImageItem':
          objectIdx = this.imageItems.findIndex((i) => i.id === animation.polygonId)
          break
        case 'VideoItem':
          objectIdx = this.videoItems.findIndex((i) => i.id === animation.polygonId)
          break
        case 'Cube3D':
          objectIdx = this.cubes3D.findIndex((c) => c.id === animation.polygonId)
          break
        case 'Sphere3D':
          objectIdx = this.spheres3D.findIndex((s) => s.id === animation.polygonId)
          break
        case 'Mockup3D':
          objectIdx = this.mockups3D.findIndex((s) => s.id === animation.polygonId)
          break
        case 'Model3D':
          objectIdx = this.models3D.findIndex((s) => s.id === animation.polygonId)
          break
      }

      if (objectIdx === undefined || objectIdx === -1) {
        // if (isExport) {
        //   console.warn(
        //     `Object with ID ${animation.polygonId} not found for animation type ${animation.objectType}`
        //   );
        // }
        continue
      }

      let visibleDurationMs = animation.duration

      if (animation.objectType === ObjectType.VideoItem) {
        visibleDurationMs = this.videoItems[objectIdx].sourceDurationMs
      }

      if (animation.objectType === ObjectType.Mockup3D) {
        visibleDurationMs = this.mockups3D[objectIdx].videoChild.sourceDurationMs
      }

      if (animation.visibleDurationMs) {
        visibleDurationMs = animation.visibleDurationMs
      }

      if (
        currentTimeMs < animation.startTimeMs ||
        currentTimeMs > animation.startTimeMs + visibleDurationMs
      ) {
        switch (animation.objectType) {
          case 'Polygon':
            this.polygons[objectIdx].hidden = true
            break
          case 'TextItem':
            this.textItems[objectIdx].hidden = true
            break
          case 'ImageItem':
            this.imageItems[objectIdx].hidden = true
            break
          case 'VideoItem':
            this.videoItems[objectIdx].hidden = true
            break
          case 'Cube3D':
            this.cubes3D[objectIdx].hidden = true
            break
          case 'Sphere3D':
            this.spheres3D[objectIdx].hidden = true
            break
          case 'Mockup3D':
            this.mockups3D[objectIdx].hidden = true
            break
          case 'Model3D':
            this.models3D[objectIdx].hidden = true
            break
        }
      } else {
        switch (animation.objectType) {
          case 'Polygon':
            this.polygons[objectIdx].hidden = false
            break
          case 'TextItem':
            this.textItems[objectIdx].hidden = false
            break
          case 'ImageItem':
            this.imageItems[objectIdx].hidden = false
            break
          case 'VideoItem':
            this.videoItems[objectIdx].hidden = false
            break
          case 'Cube3D':
            this.cubes3D[objectIdx].hidden = false
            break
          case 'Sphere3D':
            this.spheres3D[objectIdx].hidden = false
            break
          case 'Mockup3D':
            this.mockups3D[objectIdx].hidden = false
            break
          case 'Model3D':
            this.models3D[objectIdx].hidden = false
            break
        }
      }

      // if (isExport) {
      //   console.info(
      //     `Processing animation for ${animation.objectType} with ID ${animation.polygonId} at time ${currentTimeMs} (start: ${startTimeMs}, duration: ${animation.duration})`
      //   );
      // }

      // Determine whether to draw the video frame based on the frame rate and current time
      let animateProperties = false

      if (animation.objectType === 'VideoItem' || animation.objectType === ObjectType.Mockup3D) {
        const videoItem =
          animation.objectType === ObjectType.Mockup3D
            ? this.mockups3D[objectIdx].videoChild
            : this.videoItems[objectIdx]
        const frameRate = videoItem.sourceFrameRate
        const sourceDurationMs = videoItem.sourceDurationMs
        const frameInterval = 1.0 / frameRate

        // Calculate the number of frames that should have been displayed by now
        const elapsedTime = currentTimeMs - startTimeMs
        const currentFrameTime = videoItem.numFramesDrawn * frameInterval

        // Only draw the frame if the current time is within the frame's display interval
        if (currentTime >= currentFrameTime && currentTime < currentFrameTime + frameInterval) {
          if (currentTime * 1000 + 1000 < sourceDurationMs) {
            // console.info(
            //   `Drawing video frame for ${videoItem.id} at time ${currentTimeMs} (start: ${startTimeMs}, duration: ${animation.duration})`
            // );
            // await videoItem.drawVideoFrame(gpuResources.device!, gpuResources.queue!)
            videoItem.drawVideoFrame(gpuResources.device!, gpuResources.queue!)
            // console.info("drew frame");
            animateProperties = true
            videoItem.numFramesDrawn += 1

            // buffers the next 5s of audio whenever there is 2s of audio left to play
            if (!isExport) {
              videoItem.checkAndScheduleAudio()
            }
          }
        } else {
          // Determine how many video frames to draw to catch up
          const difference = currentTime - currentFrameTime
          const catchUpFrames = Math.floor(difference / frameInterval)

          // Only catch up if we're behind and within the video duration
          if (catchUpFrames > 0 && currentTimeMs + 1000 < sourceDurationMs) {
            // Limit the maximum number of frames to catch up to avoid excessive CPU usage
            const maxCatchUp = 5
            const framesToDraw = Math.min(catchUpFrames, maxCatchUp)

            // console.info("Catching up video frames:", framesToDraw);

            for (let i = 0; i < framesToDraw; i++) {
              // await videoItem.drawVideoFrame(gpuResources.device!, gpuResources.queue!)
              videoItem.drawVideoFrame(gpuResources.device!, gpuResources.queue!)
              videoItem.numFramesDrawn += 1
            }

            animateProperties = true
          }
        }
      } else {
        animateProperties = true
      }

      // Check if the current time is within the animation's active period
      if (currentTimeMs < startTimeMs || currentTimeMs > startTimeMs + visibleDurationMs) {
        // if (isExport) {
        //   console.warn(
        //     `Skipping animation for ${animation.objectType} with ID ${animation.polygonId} at time ${currentTimeMs} (start: ${startTimeMs}, duration: ${animation.duration})`
        //   );
        // }
        continue
      }

      // if (isExport) {
      //   console.info(
      //     `Processing animation for ${animation.objectType} with ID ${animation.polygonId} at time ${currentTimeMs} (start: ${startTimeMs}, duration: ${animation.duration})`
      //   );
      // }

      if (!animateProperties) {
        continue
      }

      // Go through each property
      for (const property of animation.properties) {
        if (property.keyframes.length < 2) {
          continue
        }

        if (startTime > currentTime) {
          continue
        }

        // Find the surrounding keyframes
        const surroundingKeyframes = this.getSurroundingKeyframes(
          property.keyframes,
          currentTimeMs - startTimeMs
        )
        if (!surroundingKeyframes) {
          // console.info("no surrounding keyframes");
          continue
        }

        const [startFrame, endFrame] = surroundingKeyframes

        if (!startFrame || !endFrame) {
          continue
        }

        // Calculate interpolation progress
        const duration = endFrame.time - startFrame.time // duration between keyframes
        const elapsed = currentTimeMs - startTimeMs - startFrame.time // elapsed since start keyframe
        let progress = elapsed / duration

        // Apply easing based on keyframe setting
        switch (startFrame.easing) {
          case EasingType.Linear:
            break // progress stays as is
          case EasingType.EaseIn:
            progress = progress * progress
            break
          case EasingType.EaseOut:
            progress = 1.0 - (1.0 - progress) * (1.0 - progress)
            break
          case EasingType.EaseInOut:
            progress =
              progress < 0.5
                ? 2.0 * progress * progress
                : 1.0 - Math.pow(-2.0 * progress + 2.0, 2) / 2.0
            break
          default:
            break // Default to linear
        }

        // Apply the interpolated value to the object's property
        const startValue = startFrame.value
        const endValue = endFrame.value

        // Add property-specific interpolation logic here
        // Example:
        // if (property.type === 'Position') {
        //     const interpolatedValue = startValue + (endValue - startValue) * progress;
        //     this.updateObjectProperty(objectIdx, property.type, interpolatedValue);
        // }

        switch (
          true // Using switch(true) for cleaner type checking
        ) {
          case startFrame.value.type === 'Position' && endFrame.value.type === 'Position': {
            const start = startFrame.value.value as [number, number] // Type assertion for clarity
            const end = endFrame.value.value as [number, number]

            const x = this.lerp(start[0], end[0], progress)
            const y = this.lerp(start[1], end[1], progress)

            const position: Point = {
              x: CANVAS_HORIZ_OFFSET + x + pathGroupPosition[0],
              y: CANVAS_VERT_OFFSET + y + pathGroupPosition[1]
            }

            let posBufferAdjustment = 0
            if (this.scaleMultiplier > 1) {
              posBufferAdjustment = 100
            }

            // const positionVec: vec2 = vec2.fromValues(position.x, position.y);
            let positionVec1 = [
              position.x * this.scaleMultiplier - posBufferAdjustment,
              position.y * this.scaleMultiplier - posBufferAdjustment
            ] as [number, number]

            let systemPosition = toNDC(
              positionVec1[0],
              positionVec1[1],
              camera.windowSize.width,
              camera.windowSize.height
            )

            let positionVec = [systemPosition.x, systemPosition.y] as [number, number]

            // const windowSizeVec: vec2 = vec2.fromValues(
            //   camera.windowSize.width,
            //   camera.windowSize.height
            // ); // Assuming camera.windowSize is an array [width, height]

            switch (animation.objectType) {
              case ObjectType.Polygon:
                ;(this.polygons[objectIdx] as Polygon).transform.updatePosition(
                  positionVec,
                  camera.windowSize
                )
                break
              case ObjectType.TextItem:
                this.textItems[objectIdx].transform.updatePosition(positionVec, camera.windowSize)
                this.textItems[objectIdx].backgroundPolygon.transform.updatePosition(
                  positionVec,
                  camera.windowSize
                )
                break
              case ObjectType.ImageItem:
                this.imageItems[objectIdx].transform.updatePosition(positionVec, camera.windowSize)
                break
              case ObjectType.VideoItem:
                // console.info("update video transform", positionVec);
                this.videoItems[objectIdx].groupTransform.updatePosition(
                  positionVec,
                  camera.windowSize
                )
                break
              case ObjectType.Cube3D:
                this.cubes3D[objectIdx].transform.updatePosition(positionVec, camera.windowSize)
                break
              case ObjectType.Sphere3D:
                this.spheres3D[objectIdx].transform.updatePosition(positionVec, camera.windowSize)
                break
              case ObjectType.Model3D:
                this.models3D[objectIdx].transform.updatePosition(positionVec, camera.windowSize)
                break
            }
            break
          }

          case startFrame.value.type === 'PerspectiveX' && endFrame.value.type === 'PerspectiveX': {
            const start = startFrame.value.value // Type assertion for clarity
            const end = endFrame.value.value

            const x = this.lerp(start, end, progress)

            switch (animation.objectType) {
              case ObjectType.Polygon:
                ;(this.polygons[objectIdx] as Polygon).transform.updateRotationXDegrees(x)
                break
              case ObjectType.TextItem:
                this.textItems[objectIdx].transform.updateRotationXDegrees(x)
                this.textItems[objectIdx].backgroundPolygon.transform.updateRotationXDegrees(x)
                break
              case ObjectType.ImageItem:
                this.imageItems[objectIdx].transform.updateRotationXDegrees(x)
                break
              case ObjectType.VideoItem:
                // console.info("update video transform", positionVec);
                this.videoItems[objectIdx].groupTransform.updateRotationXDegrees(x)
                break
              case ObjectType.Cube3D:
                this.cubes3D[objectIdx].transform.updateRotationXDegrees(x)
                break
              case ObjectType.Sphere3D:
                this.spheres3D[objectIdx].transform.updateRotationXDegrees(x)
                break
              case ObjectType.Mockup3D:
                let currentRotationY = this.mockups3D[objectIdx].transform.rotationY
                let currentRotationZ = this.mockups3D[objectIdx].transform.rotation
                this.mockups3D[objectIdx].updateChildRotations(gpuResources.queue, this.camera, [
                  x,
                  radiansToDegrees(currentRotationY),
                  radiansToDegrees(currentRotationZ)
                ])
                break
              case ObjectType.Model3D:
                this.models3D[objectIdx].transform.updateRotationXDegrees(x)
                break
            }
            break
          }

          case startFrame.value.type === 'PerspectiveY' && endFrame.value.type === 'PerspectiveY': {
            const start = startFrame.value.value // Type assertion for clarity
            const end = endFrame.value.value

            const y = this.lerp(start, end, progress)

            switch (animation.objectType) {
              case ObjectType.Polygon:
                ;(this.polygons[objectIdx] as Polygon).transform.updateRotationYDegrees(y)
                break
              case ObjectType.TextItem:
                this.textItems[objectIdx].transform.updateRotationYDegrees(y)
                this.textItems[objectIdx].backgroundPolygon.transform.updateRotationYDegrees(y)
                break
              case ObjectType.ImageItem:
                this.imageItems[objectIdx].transform.updateRotationYDegrees(y)
                break
              case ObjectType.VideoItem:
                // console.info("update video transform", positionVec);
                this.videoItems[objectIdx].groupTransform.updateRotationYDegrees(y)
                break
              case ObjectType.Cube3D:
                this.cubes3D[objectIdx].transform.updateRotationYDegrees(y)
                break
              case ObjectType.Sphere3D:
                this.spheres3D[objectIdx].transform.updateRotationYDegrees(y)
                break
              case ObjectType.Mockup3D:
                let currentRotationX = this.mockups3D[objectIdx].transform.rotationX
                let currentRotationZ = this.mockups3D[objectIdx].transform.rotation
                this.mockups3D[objectIdx].updateChildRotations(gpuResources.queue, this.camera, [
                  radiansToDegrees(currentRotationX),
                  y,
                  radiansToDegrees(currentRotationZ)
                ])
                break
              case ObjectType.Model3D:
                this.models3D[objectIdx].transform.updateRotationYDegrees(y)
                break
            }
            break
          }

          case startFrame.value.type === 'Rotation' && endFrame.value.type === 'Rotation': {
            const start = startFrame.value.value as number
            const end = endFrame.value.value as number
            const new_rotation = this.lerp(start, end, progress)
            const new_rotation_rad = toRadians(new_rotation)

            switch (animation.objectType) {
              case ObjectType.Polygon:
                this.polygons[objectIdx].transform.updateRotation(new_rotation_rad)
                break
              case ObjectType.TextItem:
                this.textItems[objectIdx].transform.updateRotation(new_rotation_rad)
                break
              case ObjectType.ImageItem:
                this.imageItems[objectIdx].transform.updateRotation(new_rotation_rad)
                break
              case ObjectType.VideoItem:
                this.videoItems[objectIdx].groupTransform.updateRotation(new_rotation_rad)
                break
              case ObjectType.Cube3D:
                this.cubes3D[objectIdx].transform.updateRotation(new_rotation_rad)
                break
              case ObjectType.Sphere3D:
                this.spheres3D[objectIdx].transform.updateRotation(new_rotation_rad)
                break
              case ObjectType.Mockup3D:
                let currentRotationX = this.mockups3D[objectIdx].transform.rotationX
                let currentRotationY = this.mockups3D[objectIdx].transform.rotationY
                this.mockups3D[objectIdx].updateChildRotations(gpuResources.queue, this.camera, [
                  radiansToDegrees(currentRotationX),
                  radiansToDegrees(currentRotationY),
                  radiansToDegrees(new_rotation_rad)
                ])
                break
              case ObjectType.Model3D:
                this.models3D[objectIdx].transform.updateRotation(new_rotation_rad)
                break
            }
            break
          }
          case startFrame.value.type === 'ScaleX' && endFrame.value.type === 'ScaleX': {
            const start = startFrame.value.value as number
            const end = endFrame.value.value as number
            const new_scale = this.lerp(start, end, progress) / 100.0
            // const scaleVec: vec2 = vec2.fromValues(new_scale, new_scale); // Create scale vector
            const scaleVec = [new_scale, new_scale] as [number, number]

            // console.info("scaling to", new_scale, scaleVec);

            switch (animation.objectType) {
              case ObjectType.Polygon:
                ;(this.polygons[objectIdx] as Polygon).transform.updateScaleX(new_scale)
                break
              case ObjectType.TextItem:
                this.textItems[objectIdx].transform.updateScaleX(new_scale)
                this.textItems[objectIdx].backgroundPolygon.transform.updateScaleX(new_scale)
                break
              case ObjectType.ImageItem:
                const originalScaleImage = this.imageItems[objectIdx].dimensions
                // const scaledImageDimensions = vec2.fromValues(
                //   originalScaleImage[0] * new_scale,
                //   originalScaleImage[1] * new_scale
                // );
                const scaledImageDimensions = [
                  originalScaleImage[0] * new_scale,
                  originalScaleImage[1] * new_scale
                ] as [number, number]
                const systemWidth = toSystemScale(
                  originalScaleImage[0] * new_scale,
                  camera.windowSize.width
                )
                // this.imageItems[objectIdx].transform.updateScaleX(originalScaleImage[0] * new_scale)
                this.imageItems[objectIdx].transform.updateScaleX(systemWidth)
                break
              case ObjectType.VideoItem:
                const originalScaleVideo = this.videoItems[objectIdx].dimensions
                // const scaledVideoDimensions = vec2.fromValues(
                //   originalScaleVideo[0] * new_scale,
                //   originalScaleVideo[1] * new_scale
                // );
                // const scaledVideoDimensions = [
                //   originalScaleVideo[0] * new_scale,
                //   originalScaleVideo[1] * new_scale,
                // ] as [number, number];
                // console.info("scaling", originalScaleVideo, new_scale);
                this.videoItems[objectIdx].groupTransform.updateScaleX(
                  new_scale // only scaleVec needed for group
                )
                break
              case ObjectType.Cube3D:
                this.cubes3D[objectIdx].transform.updateScaleX(new_scale)
                break
              case ObjectType.Sphere3D:
                this.spheres3D[objectIdx].transform.updateScaleX(new_scale)
                break
              case ObjectType.Model3D:
                this.models3D[objectIdx].transform.updateScaleX(new_scale)
                break
            }
            break
          }
          case startFrame.value.type === 'ScaleY' && endFrame.value.type === 'ScaleY': {
            const start = startFrame.value.value as number
            const end = endFrame.value.value as number
            const new_scale = this.lerp(start, end, progress) / 100.0
            // const scaleVec: vec2 = vec2.fromValues(new_scale, new_scale); // Create scale vector
            const scaleVec = [new_scale, new_scale] as [number, number]

            // console.info("scaling to", new_scale, scaleVec);

            switch (animation.objectType) {
              case ObjectType.Polygon:
                ;(this.polygons[objectIdx] as Polygon).transform.updateScaleY(new_scale)
                break
              case ObjectType.TextItem:
                this.textItems[objectIdx].transform.updateScaleY(new_scale)
                this.textItems[objectIdx].backgroundPolygon.transform.updateScaleY(new_scale)
                break
              case ObjectType.ImageItem:
                const originalScaleImage = this.imageItems[objectIdx].dimensions
                // const scaledImageDimensions = vec2.fromValues(
                //   originalScaleImage[0] * new_scale,
                //   originalScaleImage[1] * new_scale
                // );
                const scaledImageDimensions = [
                  originalScaleImage[0] * new_scale,
                  originalScaleImage[1] * new_scale
                ] as [number, number]
                const systemHeight = toSystemScale(
                  originalScaleImage[1] * new_scale,
                  camera.windowSize.height
                )
                // this.imageItems[objectIdx].transform.updateScaleY(originalScaleImage[1] * new_scale)
                this.imageItems[objectIdx].transform.updateScaleY(systemHeight)
                break
              case ObjectType.VideoItem:
                const originalScaleVideo = this.videoItems[objectIdx].dimensions
                // const scaledVideoDimensions = vec2.fromValues(
                //   originalScaleVideo[0] * new_scale,
                //   originalScaleVideo[1] * new_scale
                // );
                // const scaledVideoDimensions = [
                //   originalScaleVideo[0] * new_scale,
                //   originalScaleVideo[1] * new_scale,
                // ] as [number, number];
                // console.info("scaling", originalScaleVideo, new_scale);
                this.videoItems[objectIdx].groupTransform.updateScaleY(
                  new_scale // only scaleVec needed for group
                )
                break
              case ObjectType.Cube3D:
                this.cubes3D[objectIdx].transform.updateScaleY(new_scale)
                break
              case ObjectType.Sphere3D:
                this.spheres3D[objectIdx].transform.updateScaleY(new_scale)
                break
              case ObjectType.Model3D:
                this.models3D[objectIdx].transform.updateScaleY(new_scale)
                break
            }
            break
          }
          case startFrame.value.type === 'Opacity' && endFrame.value.type === 'Opacity': {
            const start = startFrame.value.value as number
            const end = endFrame.value.value as number
            const opacity = this.lerp(start, end, progress) / 100.0

            const gpuResources = this.gpuResources

            if (gpuResources) {
              const queue = gpuResources.queue
              switch (animation.objectType) {
                case ObjectType.Polygon:
                  this.polygons[objectIdx].updateOpacity(queue!, opacity)
                  break
                case ObjectType.TextItem:
                  this.textItems[objectIdx].updateOpacity(queue!, opacity)
                  this.textItems[objectIdx].backgroundPolygon.updateOpacity(queue!, opacity)
                  break
                case ObjectType.ImageItem:
                  this.imageItems[objectIdx].updateOpacity(queue!, opacity)
                  break
                case ObjectType.VideoItem:
                  this.videoItems[objectIdx].updateOpacity(queue!, opacity)
                  break
                // case ObjectType.Cube3D:
                //   this.cubes3D[objectIdx].updateOpacity(queue!, opacity);
                //   break;
                // case ObjectType.Sphere3D:
                //   this.spheres3D[objectIdx].updateOpacity(queue!, opacity);
                //   break;
              }
            } else {
              console.error('GPU resources not available.')
            }
            break
          }

          case startFrame.value.type === 'Zoom' && endFrame.value.type === 'Zoom': {
            const zoom =
              this.lerp(
                startFrame.value.value.zoomLevel,
                endFrame.value.value.zoomLevel,
                progress
              ) / 100.0

            const lerpX = this.lerp(
              startFrame.value.value.position[0],
              endFrame.value.value.position[0],
              progress
            )

            const lerpY = this.lerp(
              startFrame.value.value.position[1],
              endFrame.value.value.position[1],
              progress
            )

            if (!this.gpuResources) {
              throw new Error("Couldn't get gpu resources")
            }

            if (animation.objectType === ObjectType.VideoItem) {
              const videoItem = this.videoItems[objectIdx]

              // complex zoom with variable speed depending on distance and additional layers of shift distance detection
              // processVideoZoom(
              //   gpuResources,
              //   zoom,
              //   property,
              //   videoItem,
              //   currentTimeMs,
              //   this.scaleMultiplier
              // )

              let halfVideoWidth = videoItem.dimensions[0] / 2.0 / this.scaleMultiplier
              let halfVideoHeight = videoItem.dimensions[1] / 2.0 / this.scaleMultiplier

              const scaledCenterPoint: Point = {
                x: lerpX * this.scaleMultiplier,
                y: lerpY * this.scaleMultiplier
              }

              videoItem.updateZoom(gpuResources.queue!, zoom, scaledCenterPoint)
            }

            break
          }

          default:
            break // Or handle the default case as needed
        }
      }
    }

    // Update text animations
    // console.info("About to call updateTextAnimations, totalDt:", totalDt);
    this.updateTextAnimations(totalDt * 1000, gpuResources.queue!)
    this.updateBrushAnimations(totalDt * 1000)
    this.updateCameraAnimation(totalDt * 1000)

    this.updateRepeatAnimations(totalDt * 1000)
  }

  seekTo(timeMs: number) {
    let gpuResources = this.gpuResources
    let device = gpuResources.device
    let queue = gpuResources.queue
    let windowSize = this.camera.windowSize

    const timeS = timeMs / 1000

    this.videoItems.forEach((v) => {
      // v.seekToTime(timeMs) // runs in drawVideoFrame
      v.drawVideoFrame(gpuResources.device!, gpuResources.queue!, timeMs, true)
    })

    this.stepAnimateSequence(timeS, this.camera, false)

    this.polygons.forEach((x) => {
      x.transform.updateUniformBuffer(queue, windowSize)
    })
    this.textItems.forEach((x) => {
      x.backgroundPolygon.transform.updateUniformBuffer(queue, windowSize)

      x.transform.updateUniformBuffer(queue, windowSize)
    })
    this.videoItems.forEach((x) => {
      x.groupTransform.updateUniformBuffer(queue, windowSize)
    })
    this.imageItems.forEach((x) => {
      x.transform.updateUniformBuffer(queue, windowSize)
    })
    this.brushes.forEach((x) => {
      x.transform.updateUniformBuffer(queue, windowSize)
    })
    this.mockups3D.forEach((x) => {
      x.groupTransform.updateUniformBuffer(queue, windowSize)
      x.videoChild.transform.updateUniformBuffer(queue, windowSize)
    })
    this.cubes3D.forEach((x) => {
      x.transform.updateUniformBuffer(queue, windowSize)
    })
    this.spheres3D.forEach((x) => {
      x.transform.updateUniformBuffer(queue, windowSize)
    })
    this.models3D.forEach((x) => {
      x.transform.updateUniformBuffer(queue, windowSize)
    })
  }

  getSurroundingKeyframes(
    keyframes: UIKeyframe[],
    current_time: number
  ): [UIKeyframe | null, UIKeyframe | null] {
    let prev_frame: UIKeyframe | null = null
    let next_frame: UIKeyframe | null = null

    keyframes.sort((a, b) => a.time - b.time) // Sort keyframes by time

    for (let i = 0; i < keyframes.length; i++) {
      const frame = keyframes[i]

      if (frame.time > current_time) {
        if (i > 0) {
          const prevKeyframe = keyframes[i - 1]
          if (prevKeyframe.keyType.type === 'Range') {
            // Check the 'type' property
            const range_data = prevKeyframe.keyType.data as RangeData // Type assertion

            if (current_time >= prevKeyframe.time && current_time < range_data.endTime) {
              prev_frame = { ...prevKeyframe } // Create a copy
              next_frame = {
                id: 'virtual',
                time: range_data.endTime,
                value: prevKeyframe.value,
                easing: EasingType.Linear,
                pathType: PathType.Linear,
                keyType: { type: 'Frame' }, // Virtual keyframe is a Frame
                curveData: null
              }
              return [prev_frame, next_frame]
            }

            if (current_time >= range_data.endTime && current_time < frame.time) {
              prev_frame = {
                id: 'virtual',
                time: range_data.endTime,
                value: prevKeyframe.value,
                easing: EasingType.Linear,
                pathType: PathType.Linear,
                keyType: { type: 'Frame' },
                curveData: null
              }
              next_frame = { ...frame } // Create a copy
              return [prev_frame, next_frame]
            }
          }
        }

        next_frame = { ...frame } // Create a copy
        prev_frame = i > 0 ? { ...keyframes[i - 1] } : { ...keyframes[keyframes.length - 1] } // Create a copy
        break
      }
    }

    return [prev_frame, next_frame]
  }

  lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress
  }

  createMotionPathVisualization(sequence: Sequence, objectId: string, colorIndex: number): void {
    if (!sequence.polygonMotionPaths) {
      return
    }

    const animationData = sequence.polygonMotionPaths.find((anim) => anim.polygonId === objectId)
    if (!animationData) {
      console.warn(`Couldn't find animation data for object ${objectId}`)
      return
    }

    const positionProperty = animationData.properties.find(
      (prop) =>
        // prop.name.startsWith("Position")
        prop.propertyPath === 'position'
    )
    if (!positionProperty) {
      console.warn(
        `Couldn't create motion path as couldn't find position property for object ${objectId}`
      )
      return
    }

    // Sort keyframes by time
    const keyframes = [...positionProperty.keyframes].sort((a, b) => a.time - b.time)

    const newId = animationData.id // Directly using string ID
    const initialPosition: [number, number] = animationData.position

    if (
      !this.camera ||
      !this.gpuResources ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
      // !this.gradientBindGroupLayout
    ) {
      console.error('Missing required resources for motion path visualization.')
      return
    }

    const motionPath = new MotionPath(
      this.gpuResources.device!,
      this.gpuResources.queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      // this.gradientBindGroupLayout,
      newId,
      this.camera.windowSize,
      keyframes,
      this.camera,
      sequence,
      colorIndex,
      objectId,
      initialPosition
    )

    this.motionPaths.push(motionPath)

    // add mouse zoom path if available
    const zoomProperty = animationData.properties.find(
      (prop) =>
        // prop.name.startsWith("Position")
        prop.propertyPath === 'zoom'
    )
    if (!zoomProperty) {
      // console.warn(`Couldn't find zoom property for object ${objectId}`);
      return
    } else {
      console.info('Found zoom property for ', objectId)
    }

    // Sort keyframes by time
    const zoomKeyframes = [...zoomProperty.keyframes].sort((a, b) => a.time - b.time)

    const animationId = animationData.id // Directly using string ID
    const initialZoomPosition: [number, number] = animationData.position

    console.info('creating new zoom path', initialZoomPosition)

    const zoomPath = new MotionPath(
      this.gpuResources.device!,
      this.gpuResources.queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      // this.gradientBindGroupLayout,
      objectId, // good association? no need to drag full zoom path?
      this.camera.windowSize,
      zoomKeyframes,
      this.camera,
      sequence,
      colorIndex,
      objectId,
      initialZoomPosition
    )

    this.videoItems.forEach((video) => {
      if (video.id === objectId) {
        video.mousePath = zoomPath
      }
    })
  }

  updateMotionPaths(sequence: Sequence): void {
    this.motionPaths = []

    let colorIndex = 1
    const allItems = [
      ...sequence.activePolygons,
      ...sequence.activeTextItems,
      ...sequence.activeImageItems,
      ...sequence.activeVideoItems
    ]

    for (const item of allItems) {
      this.createMotionPathVisualization(sequence, item.id, colorIndex)
      colorIndex += 1
    }
  }

  updateCameraBinding() {
    if (this.cameraBinding && this.camera && this.gpuResources) {
      this.cameraBinding.update(this.gpuResources.queue!, this.camera)
    }
  }

  handleWHeel(delta: number, mouse_pos: Point) {
    let camera = this.camera

    // if (
    //   this.lastScreen.x < this.interactiveBounds.min.x ||
    //   this.lastScreen.x > this.interactiveBounds.max.x ||
    //   this.lastScreen.y < this.interactiveBounds.min.y ||
    //   this.lastScreen.y > this.interactiveBounds.max.y
    // ) {
    //   return;
    // }

    // let zoom_factor = if delta > 0.0 { 1[1] } else { 0.9 };
    // let zoom_factor = delta / 10.0
    // camera?.update_zoom(zoom_factor, mouse_pos)
    // this.updateCameraBinding()
  }

  /** Add Object Handlers */

  add_polygon(
    polygon_config: PolygonConfig,
    polygon_name: string,
    new_id: string,
    selected_sequence_id: string
  ) {
    let gpuResources = this.gpuResources
    let camera = this.camera
    let windowSize = camera?.windowSize

    if (
      !camera ||
      !windowSize ||
      !gpuResources ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
      // !this.gradientBindGroupLayout
    ) {
      return
    }

    let polygon = new Polygon(
      windowSize,
      gpuResources.device!,
      gpuResources.queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      // this.gradientBindGroupLayout,
      camera,
      polygon_config.points,
      polygon_config.dimensions,
      polygon_config.position,
      0.0,
      polygon_config.borderRadius,
      // polygon_config.fill,
      polygon_config.backgroundFill,
      {
        thickness: 2.0,
        fill: rgbToWgpu(0, 0, 0, 255.0)
      },
      0.0,
      polygon_config.layer,
      polygon_name,
      new_id,
      selected_sequence_id,
      polygon_config.isCircle
    )

    this.polygons.push(polygon)
  }

  add_brush(brush_config: SavedBrushConfig, new_id: string, selected_sequence_id: string) {
    let gpuResources = this.gpuResources
    let camera = this.camera
    let windowSize = camera?.windowSize

    if (
      !camera ||
      !windowSize ||
      !gpuResources ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
    ) {
      return
    }

    let brush = new ProceduralBrush(
      windowSize,
      gpuResources.device!,
      gpuResources.queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      camera,
      brush_config,
      selected_sequence_id,
      1.0
    )

    this.brushes.push(brush)
    this.currentBrush = brush
  }

  add_cube3d(cube_config: Cube3DConfig, new_id: string, selected_sequence_id: string) {
    let gpuResources = this.gpuResources
    let camera = this.camera
    let windowSize = camera?.windowSize

    if (
      !camera ||
      !windowSize ||
      !gpuResources ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
    ) {
      return
    }

    let cube = new Cube3D(
      windowSize,
      gpuResources.device!,
      gpuResources.queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      camera,
      cube_config,
      selected_sequence_id
    )

    this.cubes3D.push(cube)
  }

  add_sphere3d(sphere_config: Sphere3DConfig, new_id: string, selected_sequence_id: string) {
    let gpuResources = this.gpuResources
    let camera = this.camera
    let windowSize = camera?.windowSize

    if (
      !camera ||
      !windowSize ||
      !gpuResources ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
    ) {
      return
    }

    let sphere = new Sphere3D(
      windowSize,
      gpuResources.device!,
      gpuResources.queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      camera,
      sphere_config,
      selected_sequence_id
    )

    this.spheres3D.push(sphere)
  }

  add_mockup3d(mockup_config: Mockup3DConfig, new_id: string, selected_sequence_id: string) {
    let gpuResources = this.gpuResources
    let camera = this.camera
    let windowSize = camera?.windowSize

    if (
      !camera ||
      !windowSize ||
      !gpuResources ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
    ) {
      return
    }

    let mockup = new Mockup3D(
      windowSize,
      gpuResources.device!,
      gpuResources.queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      camera,
      mockup_config,
      selected_sequence_id
    )

    this.mockups3D.push(mockup)
  }

  async add_model3d(
    model_config: Model3DConfig,
    new_id: string,
    selected_sequence_id: string,
    modelData: ArrayBuffer
  ) {
    let gpuResources = this.gpuResources
    let camera = this.camera
    let windowSize = camera?.windowSize

    if (
      !camera ||
      !windowSize ||
      !gpuResources ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
    ) {
      return null
    }

    let model = await Model3D.create(
      windowSize,
      gpuResources.device,
      gpuResources.queue,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      camera,
      model_config,
      selected_sequence_id,
      modelData
    )

    this.models3D.push(model)

    return model
  }

  async add_text_item(
    text_config: TextRendererConfig,
    text_content: string,
    new_id: string,
    selected_sequence_id: string
  ) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera) {
      console.warn('No resources or camera')
      return
    }

    if (
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
      // !this.gradientBindGroupLayout
    ) {
      console.warn('No binding layouts')
      return
    }

    let device = gpuResources.device
    let queue = gpuResources.queue

    let windowSize = camera.windowSize

    let default_fontFamily = await this.fontManager.loadFontByName(text_config.fontFamily)

    if (!default_fontFamily) {
      console.warn('Cannot load default font family')
      return
    }

    let text_item = new TextRenderer(
      device!,
      queue!,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      // this.gradientBindGroupLayout,
      text_config,
      default_fontFamily, // load font data ahead of time
      windowSize,
      selected_sequence_id,
      camera,
      false
    )

    text_item.renderText(device!, queue!, this.camera.windowSize)

    this.textItems.push(text_item)
  }

  // Update text animations for all text items
  updateTextAnimations(currentTimeMs: number, queue: PolyfillQueue): void {
    // update animators
    for (const text of this.textItems) {
      if (!text.hidden && text.hasTextAnimation()) {
        const savedItem = this.currentSequenceData?.polygonMotionPaths?.find(
          (mp) => mp.polygonId === text.id
        )

        if (savedItem) {
          if (!text.textAnimator.isAnimationPlaying()) {
            text.startTextAnimation(savedItem.startTimeMs)
          }

          text.updateTextAnimation(currentTimeMs, queue, this.camera.windowSize)
        }
      }
    }
    // console.info("Editor.updateTextAnimations called with", this.textItems.length, "text items");

    // for (const textItem of this.textItems) {
    //   // console.info("Checking text item:", textItem.id, "hidden:", textItem.hidden, "hasAnimation:", textItem.hasTextAnimation());
    //   if (!textItem.hidden && textItem.hasTextAnimation()) {
    //     // console.info("Calling updateTextAnimation for:", textItem.id);
    //     textItem.updateTextAnimation(currentTimeMs, queue, this.camera.windowSize)
    //   }
    // }
  }

  // Update text animations for all brush items
  updateBrushAnimations(currentTimeMs: number): void {
    // console.info("Editor.updateTextAnimations called with", this.textItems.length, "text items");

    for (const brush of this.brushes) {
      // console.info("Checking text item:", textItem.id, "hidden:", textItem.hidden, "hasAnimation:", textItem.hasTextAnimation());
      if (!brush.hidden) {
        // console.info("Calling updateTextAnimation for:", textItem.id);
        brush.updateAnimation(currentTimeMs)
      }
    }
  }

  updateCameraAnimation(currentTimeMs: number) {
    let camera = this.camera

    switch (camera.animation) {
      case CameraAnimation.PanDownReveal:
        camera.animatePanDownReveal(currentTimeMs)
        this.updateCameraBinding()
        break

      case CameraAnimation.ZoomRotateIn:
        camera.animateZoomRotateIn(currentTimeMs)
        this.updateCameraBinding()
        break

      default:
        break
    }
  }

  updateRepeatAnimations(currentTimeMs: number) {
    let objects = this.repeatManager.getAllRepeatObjects()

    objects.forEach((o) => {
      o.animationStep(currentTimeMs, this.gpuResources.queue, this.camera.windowSize)
    })
  }

  async add_image_item(
    // windowSize: WindowSize,
    // device: Polyfilldevice!,
    // queue: PolyfillQueue,
    image_config: StImageConfig,
    // path: Path,
    url: string,
    blob: Blob,
    new_id: string,
    selected_sequence_id: string
  ) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera) {
      return
    }
    let device = gpuResources.device
    let queue = gpuResources.queue

    let windowSize = camera.windowSize

    if (
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout
      // !this.gradientBindGroupLayout
    ) {
      return
    }

    let image_item = new StImage(
      device!,
      queue!,
      // path,
      url,
      blob,
      image_config,
      windowSize,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      // this.gradientBindGroupLayout,
      0.0,
      selected_sequence_id,
      false
    )

    await image_item.initialize(
      device!,
      queue!,
      url,
      blob, // load of image data
      image_config,
      windowSize,
      this.modelBindGroupLayout!,
      this.groupBindGroupLayout!,
      // this.gradientBindGroupLayout!,
      0.0,
      selected_sequence_id,
      false
    )

    this.imageItems.push(image_item)
  }

  async add_video_item(
    // windowSize: WindowSize,
    // device: Polyfilldevice!,
    // queue: PolyfillQueue,
    video_config: StVideoConfig,
    url: string,
    new_id: string,
    selected_sequence_id: string,
    mouse_positions: MousePosition[],
    stored_source_data: SourceData | null
  ) {
    let video_item = await this.create_video_item(
      video_config,
      url,
      new_id,
      selected_sequence_id,
      mouse_positions,
      stored_source_data
    )

    if (!video_item) {
      return
    }

    this.videoItems.push(video_item)
  }

  async create_video_item(
    // windowSize: WindowSize,
    // device: Polyfilldevice!,
    // queue: PolyfillQueue,
    video_config: StVideoConfig,
    url: string,
    new_id: string,
    selected_sequence_id: string,
    mouse_positions: MousePosition[],
    stored_source_data: SourceData | null,
    objectTypeShader: number = 3
  ): Promise<StVideo | null> {
    let gpuResources = this.gpuResources
    let camera = this.camera

    let device = gpuResources?.device
    let queue = gpuResources?.queue
    let windowSize = camera?.windowSize

    if (
      !gpuResources ||
      !camera ||
      !this.modelBindGroupLayout ||
      !this.groupBindGroupLayout ||
      // !this.gradientBindGroupLayout ||
      !device ||
      !queue ||
      !windowSize
    ) {
      return null
    }

    let video_item = new StVideo(
      device!,
      queue!,
      url,
      video_config,
      windowSize,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      // this.gradientBindGroupLayout,
      0.0,
      selected_sequence_id,
      false,
      objectTypeShader
    )

    await video_item.initialize(
      device!,
      queue!,
      url,
      video_config,
      windowSize,
      this.modelBindGroupLayout,
      this.groupBindGroupLayout,
      // this.gradientBindGroupLayout,
      0.0,
      selected_sequence_id,
      false
    )

    return video_item
  }

  /** Object Updates */

  replace_background(
    sequence_id: string,
    backgroundFill: BackgroundFill,
    backgroundSize: WindowSize
  ) {
    let gpuResources = this.gpuResources
    let camera = this.camera
    let modelBindGroupLayout = this.modelBindGroupLayout
    let groupBindGroupLayout = this.groupBindGroupLayout
    // let gradientBindGroupLayout = this.gradientBindGroupLayout;

    if (
      !gpuResources ||
      !camera ||
      !modelBindGroupLayout ||
      !groupBindGroupLayout
      // !gradientBindGroupLayout
    ) {
      return
    }

    console.info('replace background {:?} {:?}', sequence_id, backgroundFill)

    let windowSize = camera.windowSize

    // Remove existing background
    this.staticPolygons = this.staticPolygons.filter((p) => p.name !== 'canvas_background')

    // let canvas_polygon = new Polygon(
    //   windowSize,
    //   gpuResources.device!,
    //   gpuResources.queue!,
    //   modelBindGroupLayout,
    //   groupBindGroupLayout,
    //   // gradientBindGroupLayout,
    //   camera,
    //   [
    //     { x: 0.0, y: 0.0 },
    //     { x: 1.0, y: 0.0 },
    //     { x: 1.0, y: 1.0 },
    //     { x: 0.0, y: 1.0 }
    //   ],
    //   [backgroundSize.width as number, backgroundSize.height as number],
    //   {
    //     x: windowSize.width / 2.0,
    //     y: windowSize.height / 2.0
    //     // z: -89
    //   },
    //   0.0,
    //   0.0,
    //   backgroundFill,
    //   // [0.2, 0.5, 0.2, 0.5],
    //   {
    //     thickness: 0.0,
    //     fill: rgbToWgpu(0, 0, 0, 255.0)
    //   },
    //   0.0,
    //   -89, // camera far is -100
    //   'canvas_background',
    //   sequence_id,
    //   sequence_id,
    //   false
    // )

    const sphere_config: Sphere3DConfig = {
      id: uuidv4(),
      name: 'canvas_background',
      radius: 300,
      position: {
        x: 0,
        y: 0
      },
      rotation: [0, 0, 0],
      backgroundFill: backgroundFill,
      layer: 0,
      segments: 64
    }

    const skybox = new Sphere3D(
      windowSize,
      gpuResources.device!,
      gpuResources.queue!,
      this.modelBindGroupLayout!,
      this.groupBindGroupLayout!,
      camera,
      sphere_config,
      sequence_id
    )

    console.info('bg skybox', skybox)

    // skybox.transform.updateScale([5, 5])
    // skybox.transform.position[2] = -3
    // skybox.transform.updateUniformBuffer(gpuResources.queue!, camera.windowSize)

    skybox.updateGradientAnimation(gpuResources.device!, 0.01)

    this.staticPolygons.push(skybox)
  }

  update_background(
    selected_id: string,
    // key: string,
    // new_value_type: InputValue,
    // new_value: number
    newFill: BackgroundFill
  ) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera || !this.modelBindGroupLayout) {
      return
    }

    // First iteration: find the index of the selected polygon
    let polygon_index = this.staticPolygons.findIndex((p) => p.name == 'canvas_background')

    if (polygon_index !== null) {
      console.info(
        'Found selected static_polygon with ID: ',
        selected_id,
        this.staticPolygons[polygon_index]
      )

      let windowSize = camera?.windowSize
      let device = gpuResources.device
      let queue = gpuResources.queue

      if (this.staticPolygons[polygon_index]) {
        let selected_polygon = this.staticPolygons[polygon_index]

        selected_polygon.updateDataFromFill(
          windowSize,
          device!,
          queue!,
          this.modelBindGroupLayout,
          this.groupBindGroupLayout,
          newFill,
          camera
        )

        // update scale
        selected_polygon.transform.updateUniformBuffer(gpuResources.queue!, camera.windowSize)
      }
    } else {
      console.info('No static_polygon found with the selected ID: {}', selected_id)
    }
  }

  updateBackgroundFill(selected_id: string, objectType: ObjectType, new_value: BackgroundFill) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera || !this.modelBindGroupLayout) {
      return
    }

    if (objectType === ObjectType.Polygon) {
      let polygon = this.polygons.find((p) => p.id == selected_id)

      if (!polygon) {
        return
      }

      let device = gpuResources.device
      let queue = gpuResources.queue

      let windowSize = camera.windowSize

      polygon.updateDataFromFill(
        windowSize,
        device!,
        queue!,
        this.modelBindGroupLayout,
        this.groupBindGroupLayout,
        new_value,
        camera
      )
    } else if (objectType === ObjectType.TextItem) {
      let text = this.textItems.find((p) => p.id == selected_id)

      if (!text) {
        return
      }

      let device = gpuResources.device
      let queue = gpuResources.queue

      let windowSize = camera.windowSize

      text.backgroundPolygon.updateDataFromFill(
        windowSize,
        device!,
        queue!,
        this.modelBindGroupLayout,
        this.groupBindGroupLayout,
        new_value,
        camera
      )
    }
  }

  update_polygon(selected_id: string, key: string, new_value_type: InputValue, new_value: number) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera || !this.modelBindGroupLayout) {
      return
    }

    // First iteration: find the index of the selected polygon
    let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

    if (polygon_index !== null) {
      console.info('Found selected polygon with ID: {}', selected_id)

      // Get the necessary data from editor
      let viewport_width = camera.windowSize.width
      let viewport_height = camera.windowSize.height
      let device = gpuResources.device
      let queue = gpuResources.queue

      let windowSize = camera.windowSize
      // Second iteration: update the selected polygon
      if (this.polygons[polygon_index]) {
        let selected_polygon = this.polygons[polygon_index]

        switch (new_value_type) {
          case InputValue.Number: {
            switch (key) {
              case 'width': {
                selected_polygon.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [new_value, selected_polygon.dimensions[1]],
                  camera
                )
                break
              }
              case 'height': {
                selected_polygon.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [selected_polygon.dimensions[0], new_value],
                  camera
                )
                break
              }
              case 'borderRadius': {
                selected_polygon.updateDataFromBorderRadius(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  new_value,
                  camera
                )
                break
              }
              case 'red': {
                if (selected_polygon.backgroundFill.type === 'Color') {
                  selected_polygon.updateDataFromFill(
                    windowSize,
                    device!,
                    queue!,
                    this.modelBindGroupLayout,
                    this.groupBindGroupLayout,
                    {
                      type: 'Color',
                      value: [
                        new_value,
                        selected_polygon.backgroundFill.value[1],
                        selected_polygon.backgroundFill.value[2],
                        selected_polygon.backgroundFill.value[3]
                      ]
                    },
                    camera
                  )
                }
                break
              }
              case 'green': {
                if (selected_polygon.backgroundFill.type === 'Color') {
                  selected_polygon.updateDataFromFill(
                    windowSize,
                    device!,
                    queue!,
                    this.modelBindGroupLayout,
                    this.groupBindGroupLayout,
                    {
                      type: 'Color',
                      value: [
                        selected_polygon.backgroundFill.value[0],
                        new_value,
                        selected_polygon.backgroundFill.value[2],
                        selected_polygon.backgroundFill.value[3]
                      ]
                    },
                    camera
                  )
                }
                break
              }
              case 'blue': {
                if (selected_polygon.backgroundFill.type === 'Color') {
                  selected_polygon.updateDataFromFill(
                    windowSize,
                    device!,
                    queue!,
                    this.modelBindGroupLayout,
                    this.groupBindGroupLayout,
                    {
                      type: 'Color',
                      value: [
                        selected_polygon.backgroundFill.value[0],
                        selected_polygon.backgroundFill.value[1],
                        new_value,
                        selected_polygon.backgroundFill.value[3]
                      ]
                    },
                    camera
                  )
                }
                break
              }
              case 'stroke_thickness': {
                selected_polygon.updateDataFromStroke(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  {
                    thickness: new_value,
                    fill: selected_polygon.stroke.fill
                  },
                  camera
                )
                break
              }
              case 'stroke_red': {
                selected_polygon.updateDataFromStroke(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  {
                    thickness: selected_polygon.stroke.thickness,
                    fill: [
                      colorToWgpu(new_value),
                      selected_polygon.stroke.fill[1],
                      selected_polygon.stroke.fill[2],
                      selected_polygon.stroke.fill[3]
                    ]
                  },
                  camera
                )
                break
              }
              case 'stroke_green': {
                selected_polygon.updateDataFromStroke(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  {
                    thickness: selected_polygon.stroke.thickness,
                    fill: [
                      selected_polygon.stroke.fill[0],
                      colorToWgpu(new_value),
                      selected_polygon.stroke.fill[2],
                      selected_polygon.stroke.fill[3]
                    ]
                  },
                  camera
                )
                break
              }
              case 'stroke_blue': {
                selected_polygon.updateDataFromStroke(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  {
                    thickness: selected_polygon.stroke.thickness,
                    fill: [
                      selected_polygon.stroke.fill[0],
                      selected_polygon.stroke.fill[1],
                      colorToWgpu(new_value),
                      selected_polygon.stroke.fill[3]
                    ]
                  },
                  camera
                )
                break
              }
              case 'positionX': {
                selected_polygon.updateDataFromPosition(
                  windowSize,
                  device!,
                  // queue!,
                  this.modelBindGroupLayout,
                  {
                    x: new_value,
                    y: selected_polygon.position.y
                  },
                  camera
                )
                selected_polygon.transform.updateUniformBuffer(
                  gpuResources.queue!,
                  camera.windowSize
                )
                break
              }
              case 'positionY': {
                selected_polygon.updateDataFromPosition(
                  windowSize,
                  device!,
                  // queue!,
                  this.modelBindGroupLayout,
                  {
                    x: selected_polygon.position.x,
                    y: new_value
                  },
                  camera
                )
                selected_polygon.transform.updateUniformBuffer(
                  gpuResources.queue!,
                  camera.windowSize
                )
                break
              }
              case 'positionZ': {
                selected_polygon.transform.position[2] = new_value
                selected_polygon.transform.updateUniformBuffer(
                  gpuResources.queue!,
                  camera.windowSize
                )
                break
              }
            }
          }
        }
      }
    } else {
      console.info('No polygon found with the selected ID: {}', selected_id)
    }
  }

  update_text(selected_id: string, key: string, new_value_type: InputValue, new_value: number) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera || !this.modelBindGroupLayout) {
      return
    }

    // First iteration: find the index of the selected polygon
    let text_index = this.textItems.findIndex((p) => p.id == selected_id)

    if (text_index !== null) {
      console.info('Found selected text with ID: {}', selected_id)

      // Get the necessary data from editor
      let viewport_width = camera.windowSize.width
      let viewport_height = camera.windowSize.height
      let device = gpuResources.device
      let queue = gpuResources.queue

      let windowSize = camera.windowSize
      // Second iteration: update the selected polygon
      if (this.textItems[text_index]) {
        let selected_text = this.textItems[text_index]

        console.info('check 2', key)

        switch (new_value_type) {
          case InputValue.Number: {
            switch (key) {
              case 'width': {
                console.info('update the width')
                let systemWidth = toSystemScale(new_value, viewport_width)
                let systemHeight = toSystemScale(selected_text.dimensions[1], viewport_height)
                selected_text.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [systemWidth, systemHeight],
                  camera
                )
                break
              }
              case 'height': {
                console.info('update the height')
                let systemWidth = toSystemScale(selected_text.dimensions[0], viewport_width)
                let systemHeight = toSystemScale(new_value, viewport_height)
                selected_text.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [systemWidth, systemHeight],
                  camera
                )
                break
              }
              case 'red_fill': {
                if (selected_text.backgroundPolygon.backgroundFill.type === 'Color') {
                  selected_text.backgroundPolygon.updateDataFromFill(
                    windowSize,
                    device!,
                    queue!,
                    this.modelBindGroupLayout,
                    this.groupBindGroupLayout,
                    {
                      type: 'Color',
                      value: [
                        new_value,
                        selected_text.backgroundPolygon.backgroundFill.value[1],
                        selected_text.backgroundPolygon.backgroundFill.value[2],
                        selected_text.backgroundPolygon.backgroundFill.value[3]
                      ]
                    },
                    camera
                  )
                }
                break
              }
              case 'green_fill': {
                if (selected_text.backgroundPolygon.backgroundFill.type === 'Color') {
                  selected_text.backgroundPolygon.updateDataFromFill(
                    windowSize,
                    device!,
                    queue!,
                    this.modelBindGroupLayout,
                    this.groupBindGroupLayout,
                    {
                      type: 'Color',
                      value: [
                        selected_text.backgroundPolygon.backgroundFill.value[0],
                        new_value,
                        selected_text.backgroundPolygon.backgroundFill.value[2],
                        selected_text.backgroundPolygon.backgroundFill.value[3]
                      ]
                    },
                    camera
                  )
                }
                break
              }
              case 'blue_fill': {
                if (selected_text.backgroundPolygon.backgroundFill.type === 'Color') {
                  selected_text.backgroundPolygon.updateDataFromFill(
                    windowSize,
                    device!,
                    queue!,
                    this.modelBindGroupLayout,
                    this.groupBindGroupLayout,
                    {
                      type: 'Color',
                      value: [
                        selected_text.backgroundPolygon.backgroundFill.value[0],
                        selected_text.backgroundPolygon.backgroundFill.value[1],
                        new_value,
                        selected_text.backgroundPolygon.backgroundFill.value[3]
                      ]
                    },
                    camera
                  )
                }
                break
              }
              case 'positionX': {
                let ndc = toNDC(new_value, new_value, windowSize.width, windowSize.width)
                selected_text.transform.position[0] = ndc.x
                selected_text.transform.updateUniformBuffer(gpuResources.queue!, camera.windowSize)
                break
              }
              case 'positionY': {
                let ndc = toNDC(new_value, new_value, windowSize.height, windowSize.height)
                selected_text.transform.position[1] = ndc.y
                selected_text.transform.updateUniformBuffer(gpuResources.queue!, camera.windowSize)
                break
              }
              case 'positionZ': {
                selected_text.transform.position[2] = new_value
                selected_text.transform.updateUniformBuffer(gpuResources.queue!, camera.windowSize)
                break
              }
            }
          }
        }
      }
    } else {
      console.info('No text found with the selected ID: {}', selected_id)
    }
  }

  update_image(selected_id: string, key: string, new_value_type: InputValue, new_value: number) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera || !this.modelBindGroupLayout) {
      return
    }

    // First iteration: find the index of the selected polygon
    let image_index = this.imageItems.findIndex((p) => p.id == selected_id)

    if (image_index !== null) {
      console.info('Found selected image with ID: {}', selected_id)

      // Get the necessary data from editor
      let viewport_width = camera.windowSize.width
      let viewport_height = camera.windowSize.height
      let device = gpuResources.device
      let queue = gpuResources.queue

      let windowSize = camera.windowSize
      // Second iteration: update the selected polygon
      if (this.imageItems[image_index]) {
        let selected_image = this.imageItems[image_index]

        switch (new_value_type) {
          case InputValue.Number: {
            switch (key) {
              case 'width': {
                selected_image.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [new_value as number, selected_image.dimensions[1] as number]
                  //   camera
                )
                break
              }
              case 'height': {
                selected_image.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [selected_image.dimensions[0] as number, new_value as number]
                  //   camera
                )
                break
              }
              case 'positionX': {
                let ndc = toNDC(new_value, new_value, windowSize.width, windowSize.width)

                selected_image.transform.position[0] = ndc.x
                selected_image.transform.updateUniformBuffer(
                  this.gpuResources.queue!,
                  this.camera.windowSize
                )
                break
              }
              case 'positionY': {
                let ndc = toNDC(new_value, new_value, windowSize.height, windowSize.height)

                selected_image.transform.position[1] = ndc.y
                selected_image.transform.updateUniformBuffer(
                  this.gpuResources.queue!,
                  this.camera.windowSize
                )
                break
              }
              case 'positionZ': {
                selected_image.transform.position[2] = new_value
                selected_image.transform.updateUniformBuffer(gpuResources.queue!, camera.windowSize)
                break
              }
            }
          }
        }
      }
    } else {
      console.info('No image found with the selected ID: {}', selected_id)
    }
  }

  update_video(selected_id: string, key: string, new_value_type: InputValue, new_value: number) {
    let gpuResources = this.gpuResources
    let camera = this.camera

    if (!gpuResources || !camera || !this.modelBindGroupLayout) {
      return
    }

    // First iteration: find the index of the selected polygon
    let video_index = this.videoItems.findIndex((p) => p.id == selected_id)

    if (video_index !== null) {
      console.info('Found selected video with ID: {}', selected_id)

      // Get the necessary data from editor
      let viewport_width = camera.windowSize.width
      let viewport_height = camera.windowSize.height
      let device = gpuResources.device
      let queue = gpuResources.queue

      let windowSize = camera.windowSize
      // Second iteration: update the selected polygon
      if (this.videoItems[video_index]) {
        let selected_video = this.videoItems[video_index]

        switch (new_value_type) {
          case InputValue.Number: {
            switch (key) {
              case 'width': {
                selected_video.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [new_value as number, selected_video.dimensions[1] as number]
                  //   camera
                )
                break
              }
              case 'height': {
                selected_video.updateDataFromDimensions(
                  windowSize,
                  device!,
                  queue!,
                  this.modelBindGroupLayout,
                  [selected_video.dimensions[0] as number, new_value as number]
                  //   camera
                )
                break
              }
              case 'positionX': {
                let ndc = toNDC(new_value, new_value, windowSize.width, windowSize.width)

                selected_video.groupTransform.position[0] = ndc.x
                selected_video.groupTransform.updateUniformBuffer(
                  this.gpuResources.queue!,
                  this.camera.windowSize
                )
                break
              }
              case 'positionY': {
                let ndc = toNDC(new_value, new_value, windowSize.height, windowSize.height)

                selected_video.groupTransform.position[1] = ndc.y
                selected_video.groupTransform.updateUniformBuffer(
                  this.gpuResources.queue!,
                  this.camera.windowSize
                )
                break
              }
              case 'positionZ': {
                selected_video.groupTransform.position[2] = new_value
                selected_video.groupTransform.updateUniformBuffer(
                  gpuResources.queue!,
                  camera.windowSize
                )
                break
              }
            }
          }
        }
      }
    } else {
      console.info('No video found with the selected ID: {}', selected_id)
    }
  }

  get_object_width(selected_id: string, object_type: ObjectType): number {
    switch (object_type) {
      case ObjectType.Polygon: {
        let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.polygons[polygon_index]) {
            let selected_polygon = this.polygons[polygon_index]
            return selected_polygon.dimensions[0]
          } else {
            return 0.0
          }
        }
      }
      case ObjectType.TextItem: {
        let polygon_index = this.textItems.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.textItems[polygon_index]) {
            let selected_polygon = this.textItems[polygon_index]
            return selected_polygon.dimensions[0]
          } else {
            return 0.0
          }
        }
      }
      case ObjectType.ImageItem: {
        let polygon_index = this.imageItems.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.imageItems[polygon_index]) {
            let selected_polygon = this.imageItems[polygon_index]
            return selected_polygon.dimensions[0] as number
          } else {
            return 0.0
          }
        }
      }
      case ObjectType.VideoItem: {
        let polygon_index = this.videoItems.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.videoItems[polygon_index]) {
            let selected_polygon = this.videoItems[polygon_index]
            return selected_polygon.dimensions[0] as number
          } else {
            return 0.0
          }
        }
      }
    }

    return 0.0
  }

  get_object_height(selected_id: string, object_type: ObjectType): number {
    switch (object_type) {
      case ObjectType.Polygon: {
        let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.polygons[polygon_index]) {
            let selected_polygon = this.polygons[polygon_index]
            return selected_polygon.dimensions[1]
          } else {
            return 0.0
          }
        }
      }
      case ObjectType.TextItem: {
        let polygon_index = this.textItems.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.textItems[polygon_index]) {
            let selected_polygon = this.textItems[polygon_index]
            return selected_polygon.dimensions[1]
          } else {
            return 0.0
          }
        }
      }
      case ObjectType.ImageItem: {
        let polygon_index = this.imageItems.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.imageItems[polygon_index]) {
            let selected_polygon = this.imageItems[polygon_index]
            return selected_polygon.dimensions[1] as number
          } else {
            return 0.0
          }
        }
      }
      case ObjectType.VideoItem: {
        let polygon_index = this.videoItems.findIndex((p) => p.id == selected_id)

        if (polygon_index) {
          if (this.videoItems[polygon_index]) {
            let selected_polygon = this.videoItems[polygon_index]
            return selected_polygon.dimensions[1] as number
          } else {
            return 0.0
          }
        }
      }
    }

    return 0.0
  }

  // get_fill_red(selected_id: string): number {
  //   let polygon_index = this.textItems.findIndex((p) => p.id == selected_id);

  //   if (polygon_index) {
  //     if (this.textItems[polygon_index]) {
  //       let selected_polygon = this.textItems[polygon_index];
  //       return selected_polygon.backgroundPolygon.fill[0];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_fill_green(selected_id: string): number {
  //   let polygon_index = this.textItems.findIndex((p) => p.id == selected_id);

  //   if (polygon_index) {
  //     if (this.textItems[polygon_index]) {
  //       let selected_polygon = this.textItems[polygon_index];
  //       return selected_polygon.backgroundPolygon.fill[1];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_fill_blue(selected_id: string): number {
  //   let polygon_index = this.textItems.findIndex((p) => p.id == selected_id);

  //   if (polygon_index) {
  //     if (this.textItems[polygon_index]) {
  //       let selected_polygon = this.textItems[polygon_index];
  //       return selected_polygon.backgroundPolygon.fill[2];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_background_red(selected_id: string): number {
  //   let polygon_index = this.staticPolygons.findIndex(
  //     (p) => p.id == selected_id
  //   );

  //   if (polygon_index) {
  //     if (this.staticPolygons[polygon_index]) {
  //       let selected_polygon = this.staticPolygons[polygon_index];

  //       return selected_polygon.fill[0];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_background_green(selected_id: string): number {
  //   let polygon_index = this.staticPolygons.findIndex(
  //     (p) => p.id == selected_id
  //   );

  //   if (polygon_index) {
  //     if (this.staticPolygons[polygon_index]) {
  //       let selected_polygon = this.staticPolygons[polygon_index];

  //       return selected_polygon.fill[1];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_background_blue(selected_id: string): number {
  //   let polygon_index = this.staticPolygons.findIndex(
  //     (p) => p.id == selected_id
  //   );

  //   if (polygon_index) {
  //     if (this.staticPolygons[polygon_index]) {
  //       let selected_polygon = this.staticPolygons[polygon_index];

  //       return selected_polygon.fill[2];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_polygon_red(selected_id: string): number {
  //   let polygon_index = this.polygons.findIndex((p) => p.id == selected_id);

  //   if (polygon_index) {
  //     if (this.polygons[polygon_index]) {
  //       let selected_polygon = this.polygons[polygon_index];

  //       return selected_polygon.fill[0];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_polygon_green(selected_id: string): number {
  //   let polygon_index = this.polygons.findIndex((p) => p.id == selected_id);

  //   if (polygon_index) {
  //     if (this.polygons[polygon_index]) {
  //       let selected_polygon = this.polygons[polygon_index];

  //       return selected_polygon.fill[1];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  // get_polygon_blue(selected_id: string): number {
  //   let polygon_index = this.polygons.findIndex((p) => p.id == selected_id);

  //   if (polygon_index) {
  //     if (this.polygons[polygon_index]) {
  //       let selected_polygon = this.polygons[polygon_index];

  //       return selected_polygon.fill[2];
  //     } else {
  //       return 0.0;
  //     }
  //   }

  //   return 0.0;
  // }

  get_polygon_borderRadius(selected_id: string): number {
    let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

    if (polygon_index) {
      if (this.polygons[polygon_index]) {
        let selected_polygon = this.polygons[polygon_index]

        return selected_polygon.borderRadius
      } else {
        return 0.0
      }
    }

    return 0.0
  }

  get_polygon_stroke_thickness(selected_id: string): number {
    let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

    if (polygon_index) {
      if (this.polygons[polygon_index]) {
        let selected_polygon = this.polygons[polygon_index]

        return selected_polygon.stroke.thickness
      } else {
        return 0.0
      }
    }

    return 0.0
  }

  get_polygon_stroke_red(selected_id: string): number {
    let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

    if (polygon_index) {
      if (this.polygons[polygon_index]) {
        let selected_polygon = this.polygons[polygon_index]

        return selected_polygon.stroke.fill[0]
      } else {
        return 0.0
      }
    }

    return 0.0
  }

  get_polygon_stroke_green(selected_id: string): number {
    let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

    if (polygon_index) {
      if (this.polygons[polygon_index]) {
        let selected_polygon = this.polygons[polygon_index]

        return selected_polygon.stroke.fill[1]
      } else {
        return 0.0
      }
    }

    return 0.0
  }

  get_polygon_stroke_blue(selected_id: string): number {
    let polygon_index = this.polygons.findIndex((p) => p.id == selected_id)

    if (polygon_index) {
      if (this.polygons[polygon_index]) {
        let selected_polygon = this.polygons[polygon_index]

        return selected_polygon.stroke.fill[2]
      } else {
        return 0.0
      }
    }

    return 0.0
  }

  async update_text_fontFamily(font_id: string, selected_text_id: string) {
    let gpuResources = this.gpuResources
    let new_fontFamily = await this.fontManager.loadFontByName(font_id)

    if (!new_fontFamily) {
      return
    }

    let text_item = this.textItems.find((t) => t.id == selected_text_id)

    if (!text_item || !gpuResources) {
      return
    }

    console.info('Updating font family... ', font_id)

    text_item.fontFamily = font_id
    text_item.updateFontFamily(new_fontFamily)
    text_item.renderText(gpuResources.device!, gpuResources.queue!, this.camera.windowSize)
  }

  update_text_color(selected_text_id: string, color: [number, number, number, number]) {
    let gpuResources = this.gpuResources
    let text_item = this.textItems.find((t) => t.id == selected_text_id)

    if (!text_item || !gpuResources) {
      return
    }

    console.info('Updating text color...')

    text_item.color = color
    text_item.renderText(gpuResources.device!, gpuResources.queue!, this.camera.windowSize)
  }

  update_text_size(selected_text_id: string, size: number) {
    let gpuResources = this.gpuResources
    let text_item = this.textItems.find((t) => t.id == selected_text_id)

    if (!text_item || !gpuResources) {
      return
    }

    text_item.fontSize = size
    text_item.renderText(gpuResources.device!, gpuResources.queue!, this.camera.windowSize)
  }

  update_text_content(selected_text_id: string, content: string) {
    let gpuResources = this.gpuResources
    let text_item = this.textItems.find((t) => t.id == selected_text_id)

    if (!text_item || !gpuResources) {
      return
    }

    text_item.text = content
    text_item.renderText(gpuResources.device!, gpuResources.queue!, this.camera.windowSize)
  }

  /** Mouse Handlers */

  handle_mouse_down(positionX: number, positionY: number) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let ray = visualize_ray_intersection(camera.windowSize, positionX, positionY, camera)
    let top_left = ray.top_left
    this.lastRay = ray
    this.lastTopLeft = top_left

    let ndc = toNDC(positionX, positionY, camera.windowSize.width, camera.windowSize.height)

    // if (
    //   this.lastScreen.x < this.interactiveBounds.min.x ||
    //   this.lastScreen.x > this.interactiveBounds.max.x ||
    //   this.lastScreen.y < this.interactiveBounds.min.y ||
    //   this.lastScreen.y > this.interactiveBounds.max.y
    // ) {
    //   return;
    // }

    // First, check if brush drawing mode
    if (this.brushDrawingMode && this.currentBrush) {
      const brushPoint = {
        x: positionX,
        y: positionY,
        pressure: 1.0, // Could be read from pointer event if supported
        timestamp: Date.now()
      }

      // Create a new ProceduralBrush instance for this stroke
      const gpuResources = this.gpuResources
      const camera = this.camera
      if (!gpuResources || !camera) {
        return
      }

      const windowSize = camera.windowSize
      const config = this.currentBrush.toSavedConfig(windowSize)
      config.id = `brush_stroke_${Date.now()}_${Math.random()}`
      config.strokes = []
      config.position = {
        x: positionX,
        y: positionY
      }

      const newBrush = new ProceduralBrush(
        windowSize,
        gpuResources.device!,
        gpuResources.queue!,
        this.modelBindGroupLayout!,
        this.groupBindGroupLayout!,
        camera,
        config,
        this.currentBrush.currentSequenceId,
        1.0
      )

      // newBrush.transform.updatePosition([ndc.x, ndc.y], windowSize)
      // newBrush.transform.updateUniformBuffer(this.gpuResources.queue, windowSize)

      this.brushes.push(newBrush)
      this.currentBrush = newBrush
      this.currentBrush.startStroke(brushPoint, config, camera.windowSize)
      return
    }

    // Next, check if panning
    if (this.controlMode == ControlMode.Pan) {
      this.isPanning = true
      this.dragStart = this.lastTopLeft

      return
    }

    // Next, check if we're clicking on a motion path handle to drag
    // for (poly_index, polygon) of this.staticPolygons {
    //     if polygon.name != "motion_path_handle" {
    //         continue;
    //     }

    //     if polygon.containsPoint(this.lastTopLeft, camera) {
    //         this.draggingPathHandle = (polygon.id);
    //         this.draggingPathObject = polygon.sourcePolygonId;
    //         this.draggingPathKeyframe = polygon.sourceKeyframeId;
    //         this.dragStart = (this.lastTopLeft);

    //         return; // nothing to add to undo stack
    //     }
    // }

    // for (let path of this.motionPaths) {
    //   for (let polygon of path.staticPolygons) {
    //     // check if we're clicking on a motion path handle to drag
    //     if (polygon.name == 'motion_path_handle') {
    //       if (polygon.containsPoint(this.lastTopLeft, camera)) {
    //         this.draggingPathHandle = polygon.id
    //         this.draggingPathAssocPath = polygon.sourcePathId
    //         this.draggingPathObject = polygon.sourcePolygonId
    //         this.draggingPathKeyframe = polygon.sourceKeyframeId
    //         this.dragStart = this.lastTopLeft

    //         return // nothing to add to undo stack
    //       }
    //     }
    //     if (polygon.name == 'motion_path_segment') {
    //       if (polygon.containsPoint(this.lastTopLeft, camera)) {
    //         this.draggingPath = path.id
    //         this.draggingPathObject = polygon.sourcePolygonId
    //         this.dragStart = this.lastTopLeft

    //         return // nothing to add to undo stack
    //       }
    //     }
    //   }
    // }

    // Finally, check for object interation
    let intersecting_objects: [number, InteractionTarget, number][] = []

    // Collect intersecting polygons
    for (let [i, polygon] of this.polygons.entries()) {
      if (polygon.hidden) {
        continue
      }

      if (polygon.containsPoint(ray, camera.windowSize)) {
        console.info('polygon contains pointer')
        intersecting_objects.push([polygon.layer, InteractionTarget.Polygon, i])
      }
    }

    // Collect intersecting text items
    for (let [i, text_item] of this.textItems.entries()) {
      if (text_item.hidden) {
        continue
      }

      if (text_item.containsPoint(ray, camera.windowSize)) {
        intersecting_objects.push([text_item.layer, InteractionTarget.Text, i])
      }
    }

    // Collect intersecting image items
    for (let [i, image_item] of this.imageItems.entries()) {
      if (image_item.hidden) {
        continue
      }

      if (image_item.containsPoint(ray, camera.windowSize)) {
        intersecting_objects.push([image_item.layer, InteractionTarget.Image, i])
      }
    }

    // Collect intersecting image items
    for (let [i, video_item] of this.videoItems.entries()) {
      if (video_item.hidden) {
        continue
      }

      // console.info("Checking video point");

      if (video_item.containsPoint(ray, camera.windowSize)) {
        console.info('Video contains point')
        intersecting_objects.push([video_item.layer, InteractionTarget.Video, i])
      }

      if (video_item.mousePath) {
        for (let polygon of video_item.mousePath.staticPolygons) {
          // check if we're clicking on a motion path handle to drag

          let adjustedPoint: Point = {
            x: this.lastTopLeft.x - video_item.groupTransform.position[0],
            y: this.lastTopLeft.y - video_item.groupTransform.position[1]
          }

          // if (polygon.name == 'motion_path_handle') {
          //   if (polygon.containsPoint(adjustedPoint, camera)) {
          //     // console.info("triggering handle!", polygon.id);

          //     this.draggingPathHandle = polygon.id
          //     this.draggingPathAssocPath = polygon.sourcePathId // video_item.mousePath.id
          //     this.draggingPathObject = polygon.sourcePolygonId
          //     this.draggingPathKeyframe = polygon.sourceKeyframeId
          //     this.dragStart = this.lastTopLeft

          //     return // nothing to add to undo stack
          //   }
          // }
          // if (polygon.name == 'motion_path_segment') {
          //   if (polygon.containsPoint(adjustedPoint, camera)) {
          //     this.draggingPath = video_item.mousePath.id
          //     this.draggingPathObject = polygon.sourcePolygonId
          //     this.dragStart = this.lastTopLeft

          //     return // nothing to add to undo stack
          //   }
          // }
        }
      }
    }

    // Collect intersecting cubes
    // Convert mouse position to NDC for 3D objects
    // const ndcPoint = {
    //   x: (this.lastTopLeft.x / camera.windowSize.width) * 2.0 - 1.0,
    //   y: -((this.lastTopLeft.y / camera.windowSize.height) * 2.0 - 1.0)
    // }

    // for (let [i, cube] of this.cubes3D.entries()) {
    //   if (cube.hidden) {
    //     continue
    //   }

    //   if (cube.containsPoint(ray)) {
    //     intersecting_objects.push([cube.layer, InteractionTarget.Cube3D, i])
    //   }
    // }

    // // Collect intersecting spheres
    // for (let [i, sphere] of this.spheres3D.entries()) {
    //   if (sphere.hidden) {
    //     continue
    //   }

    //   if (sphere.containsPoint(ray)) {
    //     intersecting_objects.push([sphere.layer, InteractionTarget.Sphere3D, i])
    //   }
    // }

    // // Collect intersecting mockups
    // for (let [i, mockup] of this.mockups3D.entries()) {
    //   if (mockup.hidden) {
    //     continue
    //   }

    //   if (mockup.containsPoint(ray, this.camera?.windowSize!)) {
    //     intersecting_objects.push([mockup.layer, InteractionTarget.Mockup3D, i])
    //   }
    // }

    // Sort intersecting objects by layer of descending order (highest layer first)
    // intersecting_objects.sort_by(|a, b| b.0.cmp(a.0));

    // sort by lowest layer first, for this system
    // intersecting_objects.sort_by((a, b) a.0.cmp(b.0));
    intersecting_objects.sort((a, b) => a[0] - b[0])

    // Return the topmost intersecting object, if any
    // let target = intersecting_objects
    //     .into_iter()
    //     .next()
    //     .map(((_, target)) => target);

    if (intersecting_objects.length <= 0) {
      console.warn('No selection to be made')
      return
    }

    let target: InteractionTarget = intersecting_objects[intersecting_objects.length - 1][1]
    let index = intersecting_objects[intersecting_objects.length - 1][2]

    // if (target) {
    switch (target) {
      case InteractionTarget.Polygon: {
        let polygon = this.polygons[index]

        this.draggingPolygon = polygon.id
        this.dragStart = this.lastTopLeft

        polygon.transform.startPosition = vec2.fromValues(this.dragStart.x, this.dragStart.y)

        // TODO: make DRY with below
        if (this.handlePolygonClick) {
          // let handler_creator = this.handlePolygonClick;
          // let handle_click = handler_creator();

          // if (!handle_click) {
          //   return;
          // }

          this.handlePolygonClick(polygon.id, {
            id: polygon.id,
            name: polygon.name,
            points: polygon.points,
            dimensions: polygon.dimensions,
            rotation: polygon.rotation,
            position: {
              x: polygon.transform.position[0],
              y: polygon.transform.position[1]
            },
            borderRadius: polygon.borderRadius,
            backgroundFill: polygon.backgroundFill,
            stroke: polygon.stroke,
            layer: polygon.layer,
            isCircle: polygon.isCircle
          })
          this.selectedPolygonId = polygon.id
          // polygon.old_points = polygon.points;
        }

        break // nothing to add to undo stack
      }
      case InteractionTarget.Text: {
        let text_item = this.textItems[index]

        this.draggingText = text_item.id
        this.dragStart = this.lastTopLeft

        text_item.transform.startPosition = vec2.fromValues(this.dragStart.x, this.dragStart.y)

        // TODO: make DRY with below
        if (this.handleTextClick) {
          // let handler_creator = this.handleTextClick;
          // let handle_click = handler_creator();

          // if (!handle_click) {
          //   return;
          // }

          this.handleTextClick(
            text_item.id
            //    {
            //   id: text_item.id,
            //   name: text_item.name,
            //   text: text_item.text,
            //   fontFamily: text_item.fontFamily,
            //   // points: polygon.points,
            //   dimensions: text_item.dimensions,
            //   position: {
            //     x: text_item.transform.position[0],
            //     y: text_item.transform.position[1],
            //   },
            //   layer: text_item.layer,
            //   color: text_item.color,
            //   fontSize: text_item.fontSize,
            //   backgroundFill: [
            //     wgpuToHuman(text_item.backgroundPolygon.fill[0]) as number,
            //     wgpuToHuman(text_item.backgroundPolygon.fill[1]) as number,
            //     wgpuToHuman(text_item.backgroundPolygon.fill[2]) as number,
            //     wgpuToHuman(text_item.backgroundPolygon.fill[3]) as number,
            //   ],
            //   // borderRadius: polygon.borderRadius,
            //   // fill: polygon.fill,
            //   // stroke: polygon.stroke,
            // }
          )
          this.selectedPolygonId = text_item.id // TODO: separate property for each object type?
          // polygon.old_points = (polygon.points);
        }

        break // nothing to add to undo stack
      }
      case InteractionTarget.Image: {
        let image_item = this.imageItems[index]

        this.draggingImage = image_item.id
        this.dragStart = this.lastTopLeft

        image_item.transform.startPosition = vec2.fromValues(this.dragStart.x, this.dragStart.y)

        // TODO: make DRY with below
        if (this.handleImageClick) {
          // let handler_creator = this.handleImageClick;
          // let handle_click = handler_creator();

          // if (!handle_click) {
          //   return;
          // }

          let uuid = image_item.id
          this.handleImageClick(
            uuid
            //   {
            //   id: image_item.id,
            //   name: image_item.name,
            //   url: image_item.url,
            //   // points: polygon.points,
            //   dimensions: image_item.dimensions,
            //   position: {
            //     x: image_item.transform.position[0],
            //     y: image_item.transform.position[1],
            //   },
            //   layer: image_item.layer, // borderRadius: polygon.borderRadius,
            //   // fill: polygon.fill,
            //   // stroke: polygon.stroke,
            // }
          )
          this.selectedPolygonId = uuid // TODO: separate property for each object type?
          // polygon.old_points = (polygon.points);
        }

        break // nothing to add to undo stack
      }
      case InteractionTarget.Video: {
        let video_item = this.videoItems[index]

        this.draggingVideo = video_item.id
        this.dragStart = this.lastTopLeft

        video_item.transform.startPosition = vec2.fromValues(this.dragStart.x, this.dragStart.y)
        if (video_item.mousePath) {
          video_item.mousePath.transform.startPosition = vec2.fromValues(
            this.dragStart.x,
            this.dragStart.y
          )
        }

        console.info('Video interaction')

        // TODO: make DRY with below
        if (this.handleVideoClick) {
          console.info('Video click')

          let handler_creator = this.handleVideoClick
          // let handle_click = handler_creator();

          // if (!handle_click) {
          //   return;
          // }

          let uuid = video_item.id
          this.handleVideoClick(
            uuid
            //   {
            //   id: video_item.id,
            //   name: video_item.name,
            //   path: video_item.path,
            //   // points: polygon.points,
            //   dimensions: video_item.dimensions,
            //   position: {
            //     x: video_item.transform.position[0],
            //     y: video_item.transform.position[1],
            //   },
            //   layer: video_item.layer,
            //   mousePath: video_item.mousePath as string, // borderRadius: polygon.borderRadius,
            //   // fill: polygon.fill,
            //   // stroke: polygon.stroke,
            // }
          )
          this.selectedPolygonId = uuid // TODO: separate property for each object type?
          // polygon.old_points = (polygon.points);
        }

        break // nothing to add to undo stack
      }
      case InteractionTarget.Cube3D: {
        let cube = this.cubes3D[index]

        this.draggingCube3D = cube.id
        this.dragStart = this.lastTopLeft

        cube.transform.startPosition = vec2.fromValues(this.dragStart.x, this.dragStart.y)

        if (this.handleCube3DClick) {
          this.handleCube3DClick(cube.id, {
            id: cube.id,
            name: cube.name,
            dimensions: cube.dimensions,
            position: {
              x: cube.transform.position[0] - CANVAS_HORIZ_OFFSET,
              y: cube.transform.position[1] - CANVAS_VERT_OFFSET
            },
            rotation: cube.rotation,
            backgroundFill: cube.backgroundFill,
            layer: cube.layer
          })
        }

        break
      }
      case InteractionTarget.Sphere3D: {
        let sphere = this.spheres3D[index]

        this.draggingSphere3D = sphere.id
        this.dragStart = this.lastTopLeft

        sphere.transform.startPosition = vec2.fromValues(this.dragStart.x, this.dragStart.y)

        if (this.handleSphere3DClick) {
          this.handleSphere3DClick(sphere.id, {
            id: sphere.id,
            name: sphere.name,
            radius: sphere.radius,
            position: {
              x: sphere.transform.position[0] - CANVAS_HORIZ_OFFSET,
              y: sphere.transform.position[1] - CANVAS_VERT_OFFSET
            },
            rotation: sphere.rotation,
            backgroundFill: sphere.backgroundFill,
            layer: sphere.layer,
            segments: sphere.segments
          })
        }

        break
      }
      case InteractionTarget.Mockup3D: {
        let mockup = this.mockups3D[index]

        this.draggingMockup3D = mockup.id
        this.dragStart = this.lastTopLeft

        mockup.groupTransform.startPosition = vec2.fromValues(this.dragStart.x, this.dragStart.y)

        if (this.handleMockup3DClick) {
          this.handleMockup3DClick(mockup.id, {
            id: mockup.id,
            name: mockup.name,
            dimensions: mockup.dimensions,
            position: {
              x: mockup.groupTransform.position[0] - CANVAS_HORIZ_OFFSET,
              y: mockup.groupTransform.position[1] - CANVAS_VERT_OFFSET
            },
            rotation: [
              mockup.groupTransform.rotationX,
              mockup.groupTransform.rotationY,
              mockup.groupTransform.rotation
            ],
            backgroundFill: mockup.backgroundFill,
            layer: mockup.layer,
            videoChild: mockup.videoChildConfig,
            tiltAngle: mockup.tiltAngle
          })
        }

        break
      }
      default:
        const _exhaustiveCheck: never = target
        console.error('Unhandled InteractionTarget:', target)
    }
    // }

    return
  }

  handle_mouse_move(
    // windowSize: WindowSize,
    // device: Polyfilldevice!,
    // queue: PolyfillQueue,
    x: number,
    y: number
  ) {
    let camera = this.camera
    let windowSize = camera?.windowSize
    let gpuResources = this.gpuResources
    let device = gpuResources?.device
    let queue = gpuResources?.queue

    if (!camera || !windowSize || !device || !queue) {
      return
    }

    let mouse_pos = { x, y }
    let ray = visualize_ray_intersection(windowSize, x, y, camera)
    let top_left = ray.top_left

    this.globalTopLeft = top_left
    this.lastScreen = { x, y }

    // if (
    //   this.lastScreen.x < this.interactiveBounds.min.x ||
    //   this.lastScreen.x > this.interactiveBounds.max.x ||
    //   this.lastScreen.y < this.interactiveBounds.min.y ||
    //   this.lastScreen.y > this.interactiveBounds.max.y
    // ) {
    //   // reset when out of bounds
    //   this.isPanning = false;
    //   return;
    // }

    this.lastTopLeft = top_left
    this.lastRay = ray

    const ndcPoint = {
      x: (this.lastTopLeft.x / camera.windowSize.width) * 2.0 - 1.0,
      y: -((this.lastTopLeft.y / camera.windowSize.height) * 2.0 - 1.0)
    }

    const startNdcPoint = this.dragStart
      ? {
          x: (this.dragStart.x / camera.windowSize.width) * 2.0 - 1.0,
          y: -((this.dragStart.y / camera.windowSize.height) * 2.0 - 1.0)
        }
      : {
          x: 0,
          y: 0
        }

    // handle brush drawing
    if (this.brushDrawingMode && this.currentBrush && this.currentBrush.currentStroke) {
      const brushPoint = {
        x: x, // converts to ndc in brush.ts
        y: y,
        pressure: 1.0, // Could be read from pointer event if supported
        timestamp: Date.now()
      }

      this.currentBrush.addStrokePoint(brushPoint, camera.windowSize)

      // Update brush geometry in real-time
      this.currentBrush.createGeometry(camera, windowSize)
      this.currentBrush.updateBuffers(device, queue, camera, windowSize)

      return
    }

    // handle panning
    if (this.controlMode == ControlMode.Pan && this.isPanning) {
      let dx = this.previousTopLeft.x - this.lastTopLeft.x
      let dy = this.lastTopLeft.y - this.previousTopLeft.y
      let new_x = camera.position[0] + dx
      let new_y = camera.position[1] + dy

      // camera.position = Vector2.new(new_x, new_y);
      let new_position = vec2.create()
      vec2.set(new_position, new_x, new_y)
      camera.position = new_position

      // this.updateCameraBinding(); // call of render loop, much more efficient
      // this.interactiveBounds = {
      //     max: {
      //         x: this.interactiveBounds.max.x + dx,
      //         y: this.interactiveBounds.max.y + dy,
      //     },
      //     min: {
      //         x: this.interactiveBounds.min.x + dx,
      //         y: this.interactiveBounds.min.y + dy,
      //     },
      // }
    }

    // handle dragging paths
    if (this.draggingPath) {
      if (this.dragStart) {
        this.move_path(this.lastTopLeft, this.dragStart, this.draggingPath, windowSize, device)
      }
    }

    // handle motion path handles
    if (this.draggingPathHandle) {
      if (this.draggingPathAssocPath) {
        if (this.dragStart) {
          // this.move_static_polygon(this.lastTopLeft, start, poly_id, windowSize, device);
          this.move_path_static_polygon(
            this.lastTopLeft,
            this.dragStart,
            this.draggingPathHandle,
            this.draggingPathAssocPath,
            windowSize,
            device
          )
        }
      }
    }

    // handle dragging to move objects (polygons, images, text, etc)
    if (this.draggingPolygon) {
      if (this.dragStart) {
        this.move_polygon(
          this.lastTopLeft,
          this.dragStart,
          this.draggingPolygon,
          windowSize,
          device
        )
      }
    }

    if (this.draggingText) {
      if (this.dragStart) {
        this.move_text(this.lastTopLeft, this.dragStart, this.draggingText, windowSize, device)
      }
    }

    if (this.draggingImage) {
      if (this.dragStart) {
        this.move_image(this.lastTopLeft, this.dragStart, this.draggingImage, windowSize, device)
      }
    }

    if (this.draggingVideo) {
      if (this.dragStart) {
        this.move_video(this.lastTopLeft, this.dragStart, this.draggingVideo, windowSize, device)
      }
    }

    if (this.draggingCube3D) {
      if (this.dragStart) {
        this.move_cube3d(ndcPoint, startNdcPoint, this.draggingCube3D, windowSize, device)
      }
    }

    if (this.draggingSphere3D) {
      if (this.dragStart) {
        this.move_sphere3d(ndcPoint, startNdcPoint, this.draggingSphere3D, windowSize, device)
      }
    }

    if (this.draggingMockup3D) {
      if (this.dragStart) {
        this.move_mockup3d(
          this.lastTopLeft,
          this.dragStart,
          this.draggingMockup3D,
          windowSize,
          device
        )
      }
    }

    this.previousTopLeft = this.lastTopLeft
  }

  handle_mouse_up() {
    // let action_edit = None;

    let camera = this.camera

    if (!camera) {
      return
    }

    // Handle brush stroke end
    if (this.brushDrawingMode && this.currentBrush && this.currentBrush.currentStroke) {
      this.currentBrush.endStroke()

      // Regenerate final geometry with all strokes
      const windowSize = camera.windowSize
      const gpuResources = this.gpuResources
      const device = gpuResources?.device
      const queue = gpuResources?.queue

      if (windowSize && device && queue) {
        this.currentBrush.createGeometry(camera, windowSize)
        this.currentBrush.updateBuffers(device, queue, camera, windowSize)
      }

      if (this.onBrushStrokeUp) {
        this.onBrushStrokeUp(this.currentBrush.id)
      }

      return
    }

    // TODO: does another bounds cause this to get stuck?
    // if (
    //   this.lastScreen.x < this.interactiveBounds.min.x ||
    //   this.lastScreen.x > this.interactiveBounds.max.x ||
    //   this.lastScreen.y < this.interactiveBounds.min.y ||
    //   this.lastScreen.y > this.interactiveBounds.max.y
    // ) {
    //   return;
    // }

    // handle object on mouse up
    let object_id = null
    let active_point = null
    if (this.draggingPolygon) {
      object_id = this.draggingPolygon
      let active_polygon = this.polygons.find((p) => p.id == this.draggingPolygon)

      if (active_polygon) {
        active_point = {
          x: active_polygon.transform.position[0],
          y: active_polygon.transform.position[1]
        }
      }
    } else if (this.draggingImage) {
      object_id = this.draggingImage
      let active_image = this.imageItems.find((i) => i.id == this.draggingImage)

      if (active_image) {
        active_point = {
          x: active_image.transform.position[0],
          y: active_image.transform.position[1]
        }
      }
    } else if (this.draggingText) {
      object_id = this.draggingText
      let active_text = this.textItems.find((t) => t.id == this.draggingText)

      if (active_text) {
        active_point = {
          x: active_text.transform.position[0],
          y: active_text.transform.position[1]
        }
      }
    } else if (this.draggingVideo) {
      object_id = this.draggingVideo
      let active_video = this.videoItems.find((t) => t.id == this.draggingVideo)

      if (active_video) {
        active_point = {
          x: active_video.groupTransform.position[0],
          y: active_video.groupTransform.position[1]
        }
      }
    } else if (this.draggingCube3D) {
      object_id = this.draggingCube3D
      let active_cube = this.cubes3D.find((c) => c.id == this.draggingCube3D)

      if (active_cube) {
        active_point = {
          x: active_cube.transform.position[0],
          y: active_cube.transform.position[1]
        }
      }
    } else if (this.draggingSphere3D) {
      object_id = this.draggingSphere3D
      let active_sphere = this.spheres3D.find((s) => s.id == this.draggingSphere3D)

      if (active_sphere) {
        active_point = {
          x: active_sphere.transform.position[0],
          y: active_sphere.transform.position[1]
        }
      }
    } else if (this.draggingMockup3D) {
      object_id = this.draggingMockup3D
      let active_mockup = this.mockups3D.find((m) => m.id == this.draggingMockup3D)

      if (active_mockup) {
        active_point = {
          x: active_mockup.groupTransform.position[0],
          y: active_mockup.groupTransform.position[1]
        }
      }
    }

    if (object_id && active_point) {
      if (this.onMouseUp) {
        // let on_up = this.onMouseUp();

        // if (!on_up) {
        //   return;
        // }

        let human = fromNDC(
          active_point.x,
          active_point.y,
          this.camera.windowSize.width,
          this.camera.windowSize.height
        )

        // let active_point = active_point;
        let data = this.onMouseUp(object_id, {
          x: human.x - CANVAS_HORIZ_OFFSET,
          y: human.y - CANVAS_VERT_OFFSET
        })

        if (data) {
          let [selected_sequence_data, selected_keyframes] = data
        }
        // need some way of seeing if keyframe selected
        // perhaps need some way of opening keyframes explicitly
        // perhaps a toggle between keyframes and layout
        // if (selected_keyframes.length > 0) {
        //   this.updateMotionPaths(selected_sequence_data);
        //   console.info("Motion Paths updated!");
        // }
      }
    }

    // handle handle on mouse up
    let handle_id = this.draggingPathHandle ? this.draggingPathHandle : null
    let handle_point = null
    if (handle_id) {
      let active_handle = this.motionPaths
        .map((m) => m.staticPolygons)
        .flat()
        .find((p) => p.id == handle_id)

      if (active_handle) {
        handle_point = {
          x: active_handle.transform.position[0],
          y: active_handle.transform.position[1]
        }
      } else {
        console.info('checking video handle')
        let active_handle = this.videoItems
          .filter((v) => !v.hidden && v.id === this.draggingPathObject)
          .map((m) => m.mousePath?.staticPolygons)
          .flat()
          .find((p) => p?.id == handle_id)

        if (active_handle) {
          console.info('found video handle!')

          handle_point = {
            x: active_handle.transform.position[0],
            y: active_handle.transform.position[1]
          }
        }
      }
    }

    // the object (polygon, text image, etc) related to this motion path handle
    let handle_object_id = this.draggingPathObject ? this.draggingPathObject : null
    // the keyframe associated with this motion path handle
    let handle_keyframe_id = this.draggingPathKeyframe ? this.draggingPathKeyframe : null

    console.info('checing video handle data', handle_object_id, handle_keyframe_id)

    if (handle_keyframe_id && handle_point) {
      // need to update saved state and motion paths, handle polygon position already updated
      if (this.onHandleMouseUp) {
        // let on_up = this.onHandleMouseUp();

        if (handle_object_id) {
          // let handle_point = handle_point.expect("Couldn't get handle point");
          console.info('calling video handle mouse up!')
          let upObject = this.onHandleMouseUp(handle_keyframe_id, handle_object_id, {
            x: handle_point.x - CANVAS_HORIZ_OFFSET,
            y: handle_point.y - CANVAS_VERT_OFFSET
          })

          if (upObject) {
            let [selected_sequence_data, selected_keyframes] = upObject

            // always updated when handle is moved
            if (selected_sequence_data) {
              this.updateMotionPaths(selected_sequence_data)
              console.info('Motion Paths updated!')
            }
          }
        }
      }
    }

    // handle path mouse up
    if (this.draggingPath) {
      let active_path = this.motionPaths.find((p) => p.id == this.draggingPath)

      if (active_path) {
        let path_point = {
          x: active_path.transform.position[0],
          y: active_path.transform.position[1]
        }

        if (this.onPathMouseUp) {
          let on_up = this.onPathMouseUp()

          if (on_up) {
            let [selected_sequence_data, selected_keyframes] = on_up(
              this.draggingPath,
              // {
              //     x: path_point.x - 600.0,
              //     y: path_point.y - 50.0,
              // },
              // no offset needed because all relative?
              {
                x: path_point.x,
                y: path_point.y
              }
            )

            // always updated when handle is moved
            // not necessary to update motion paths here? seems redundant
            // this.updateMotionPaths(selected_sequence_data);
            // console.info("Motion Paths updated!");
          }
        }
      }
    }

    if (this.textArea) {
      let characterId = this.textArea.textAreaCharContainsPoint(this.lastTopLeft)

      console.info('text area click', characterId)

      if (typeof characterId !== 'undefined' && characterId !== null) {
        const characterPage = parseInt(characterId.split('-')[1])
        const characterIndex = parseInt(characterId.split('-')[2])
        const characterNlIndex = parseInt(characterId.split('-')[3])

        // const character = this.multiPageEditor?.masterDoc[characterIndex];
        // const character = this.multiPageEditor?.pages[characterPage].layout.queryInfos(characterIndex);

        // console.info("character clicked ", character);

        window.__canvasRTEInsertCharacterIndex = characterIndex
        window.__canvasRTEInsertCharacterIndexNl = characterNlIndex

        this.textAreaActive = true

        // renderCursor();
      }
    }

    // reset variables
    console.info('reset vars')
    this.draggingPolygon = null
    this.draggingText = null
    this.draggingImage = null
    this.draggingVideo = null
    this.draggingCube3D = null
    this.draggingSphere3D = null
    this.draggingMockup3D = null
    this.dragStart = null
    this.draggingPath = null
    this.draggingPathAssocPath = null
    this.draggingPathHandle = null
    this.draggingPathObject = null
    this.draggingPathKeyframe = null
    this.isPanning = false
    // this.lastTopLeft = { x: -1000, y: -1000 }; // resets for mobile?

    // this.dragging_edge = None;
    // this.guide_lines.clear();
    // this.update_cursor();

    // action_edit
    return
  }

  handle_key() {}

  /** Movement Handlers */

  move_polygon(
    mouse_pos: Point,
    start: Point,
    poly_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let aspect_ratio = ((camera.windowSize.width as number) / camera.windowSize.height) as number
    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    let polygon = this.polygons.find((p) => p.id == poly_id)

    if (!polygon || !this.modelBindGroupLayout) {
      return
    }

    // let new_position = {
    //   x: roundToGrid(polygon.transform.position[0] + dx, this.gridSnap), // not sure relation with aspect_ratio?
    //   y: roundToGrid(polygon.transform.position[1] + dy, this.gridSnap),
    // };

    // Get the original position when drag started
    const originalX = polygon.transform.startPosition
      ? polygon.transform.startPosition[0]
      : polygon.transform.position[0]
    const originalY = polygon.transform.startPosition
      ? polygon.transform.startPosition[1]
      : polygon.transform.position[1]

    // On first drag, store original position
    if (!polygon.transform.startPosition) {
      polygon.transform.startPosition = vec2.fromValues(
        polygon.transform.position[0],
        polygon.transform.position[1]
      )
    }

    // Calculate new position based on original position + total movement
    let new_position = {
      x: roundToGrid(originalX + dx, this.gridSnap),
      y: roundToGrid(originalY + dy, this.gridSnap)
    }

    // Get the original group position for associated motion paths
    const originalPathX =
      this.motionPaths.filter((p) => p.associatedPolygonId === poly_id)[0]?.transform
        .startPosition[0] || 0
    const originalPathY =
      this.motionPaths.filter((p) => p.associatedPolygonId === poly_id)[0]?.transform
        .startPosition[1] || 0

    let new_path_position = {
      x: roundToGrid(originalPathX + dx, this.gridSnap),
      y: roundToGrid(originalPathY + dy, this.gridSnap)
    }

    // console.info("move_polygon {:?}", new_position);

    polygon.updateDataFromPosition(
      windowSize,
      device!,
      this.modelBindGroupLayout,
      new_position,
      camera
    )

    // Move associated motion paths when object is moved
    this.motionPaths.forEach((motionPath) => {
      if (motionPath.associatedPolygonId === poly_id) {
        motionPath.updateDataFromPosition(
          windowSize,
          device!,
          this.modelBindGroupLayout!,
          // new_path_position,
          new_position,
          camera
        )
      }
    })

    // Also check video items for motion paths
    // this.videoItems.forEach((videoItem) => {
    //   if (
    //     videoItem.mousePath &&
    //     videoItem.mousePath.associatedPolygonId === poly_id
    //   ) {
    //     videoItem.mousePath.updateDataFromPosition(
    //       windowSize,
    //       device!,
    //       this.modelBindGroupLayout!,
    //       new_position,
    //       camera
    //     );
    //   }
    // });

    // this.dragStart = mouse_pos;
    // this.update_guide_lines(poly_index, windowSize);
  }

  move_static_polygon(
    mouse_pos: Point,
    start: Point,
    poly_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let aspect_ratio = ((camera.windowSize.width as number) / camera.windowSize.height) as number
    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    let polygon = this.staticPolygons.find((p) => p.id == poly_id) as Polygon

    if (!polygon || !this.modelBindGroupLayout) {
      return
    }

    let new_position = {
      x: polygon.transform.position[0] + dx, // not sure relation with aspect_ratio?
      y: polygon.transform.position[1] + dy
    }

    // console.info("move_polygon {:?}", new_position);

    polygon.updateDataFromPosition(
      windowSize,
      device!,
      this.modelBindGroupLayout,
      new_position,
      camera
    )

    this.dragStart = mouse_pos
    // this.update_guide_lines(poly_index, windowSize);
  }

  move_path_static_polygon(
    mouse_pos: Point,
    start: Point,
    poly_id: string,
    path_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let aspect_ratio = ((camera.windowSize.width as number) / camera.windowSize.height) as number
    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    let path = this.motionPaths.find((p) => p.id == path_id)

    if (!path) {
      path = this.videoItems.find((v) => !v.hidden && v.mousePath?.id === path_id)?.mousePath

      // console.info("move static", path, poly_id);
    }

    if (!path) {
      return
    }

    let polygon = path.staticPolygons.find((p) => p.id == poly_id)

    if (!polygon || !this.modelBindGroupLayout) {
      return
    }

    // console.info("moving static", polygon);

    let new_position = {
      x: polygon.transform.position[0] + dx, // not sure relation with aspect_ratio?
      y: polygon.transform.position[1] + dy
    }

    // console.info("move path polygon {:?}", new_position);

    polygon.updateDataFromPosition(
      windowSize,
      device!,
      this.modelBindGroupLayout,
      new_position,
      camera
    )

    this.dragStart = mouse_pos
    // this.update_guide_lines(poly_index, windowSize);
  }

  move_path(
    mouse_pos: Point,
    start: Point,
    poly_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let aspect_ratio = ((camera.windowSize.width as number) / camera.windowSize.height) as number
    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    let path = this.motionPaths.find((p) => p.id == poly_id)

    if (!path || !this.modelBindGroupLayout) {
      return
    }

    let new_position = {
      x: path.transform.position[0] + dx, // not sure relation with aspect_ratio? probably not needed now
      y: path.transform.position[1] + dy
    }

    // console.info("move_path {:?}", new_position);

    path.updateDataFromPosition(
      windowSize,
      device!,
      this.modelBindGroupLayout,
      new_position,
      camera
    )

    this.dragStart = mouse_pos
    // this.update_guide_lines(poly_index, windowSize);
  }

  // move_text(
  //   mouse_pos: Point,
  //   start: Point,
  //   text_id: string,
  //   windowSize: WindowSize,
  //   device: PolyfillDevice
  // ) {
  //   let camera = this.camera

  //   if (!camera) {
  //     return
  //   }

  //   let aspect_ratio = ((camera.windowSize.width as number) / camera.windowSize.height) as number

  //   // Calculate dx and dy relative to the original drag start point
  //   let dx = mouse_pos.x - start.x
  //   let dy = mouse_pos.y - start.y

  //   let text_item = this.textItems.find((t) => t.id == text_id)

  //   if (!text_item) {
  //     return
  //   }

  //   // Get the original position when drag started
  //   const originalX = text_item.transform.startPosition
  //     ? text_item.transform.startPosition[0]
  //     : text_item.transform.position[0]
  //   const originalY = text_item.transform.startPosition
  //     ? text_item.transform.startPosition[1]
  //     : text_item.transform.position[1]

  //   // On first drag, store original position
  //   if (!text_item.transform.startPosition) {
  //     text_item.transform.startPosition = vec2.fromValues(
  //       text_item.transform.position[0],
  //       text_item.transform.position[1]
  //     )
  //   }

  //   // Calculate new position based on original position + total movement
  //   let new_position = {
  //     x: roundToGrid(originalX + dx, this.gridSnap),
  //     y: roundToGrid(originalY + dy, this.gridSnap)
  //   }

  //   text_item.transform.updatePosition([new_position.x, new_position.y], windowSize)
  //   text_item.backgroundPolygon.transform.updatePosition(
  //     [new_position.x, new_position.y],
  //     windowSize
  //   )

  //   // Get the original group position for associated motion paths
  //   const originalPathX =
  //     this.motionPaths.filter((p) => p.associatedPolygonId === text_id)[0]?.transform
  //       .startPosition[0] || 0
  //   const originalPathY =
  //     this.motionPaths.filter((p) => p.associatedPolygonId === text_id)[0]?.transform
  //       .startPosition[1] || 0

  //   let new_path_position = {
  //     x: roundToGrid(originalPathX + dx, this.gridSnap),
  //     y: roundToGrid(originalPathY + dy, this.gridSnap)
  //   }

  //   // Move associated motion paths when text object is moved
  //   this.motionPaths.forEach((motionPath) => {
  //     if (motionPath.associatedPolygonId === text_id) {
  //       motionPath.updateDataFromPosition(
  //         windowSize,
  //         device!,
  //         this.modelBindGroupLayout!,
  //         new_path_position,
  //         camera
  //       )
  //     }
  //   })
  // }

  move_text(
    mouse_pos: Point, // Screen coordinates of the current mouse position
    // start_world_pos: vec3, // 🌟 World position of the text item when drag started
    start: Point,
    text_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera as Camera3D // Cast for 3D properties

    if (!camera) {
      return
    }

    let text_item = this.textItems.find((t) => t.id == text_id)

    if (!text_item) {
      return
    }

    // 1. Generate the Ray for the current mouse position
    const current_ray: Ray = this.lastRay

    // let start_world_pos = vec3.fromValues(
    //   text_item.transform.position[0],
    //   text_item.transform.position[1],
    //   text_item.transform.position[2]
    // )

    let start_ndc = toNDC(start.x, start.y, windowSize.width, windowSize.height)
    let start_world_pos = vec3.fromValues(start_ndc.x, start_ndc.y, start_ndc.z || 0)

    // 2. Define the Drag Plane
    // Point on Plane: The object's starting world position (Z is 0 for 2D objects in 3D space)
    const P_plane = start_world_pos

    // Normal of Plane: The camera's forward vector (makes the plane parallel to the screen)
    const N_plane = getCameraForward(camera)

    // 3. Calculate New Intersection Point (P_new)
    const P_new = checkRayPlaneIntersection(current_ray, P_plane, N_plane)

    if (!P_new) {
      console.warn('Ray is parallel to the drag plane, cannot move.')
      return
    }

    // 4. Calculate World-Space Delta (ΔP_world = P_new - P_start)
    const delta_world = vec3.create()
    vec3.subtract(delta_world, P_new, start_world_pos)

    delta_world[2] = 0

    // 5. Apply new position to the object
    const new_world_pos_3D = vec3.create()
    vec3.add(new_world_pos_3D, start_world_pos, delta_world)

    // The object's transform expects a vec2 for position (x, y)
    // const new_position_vec2 = vec2.fromValues(
    //   roundToGrid(new_world_pos_3D[0], this.gridSnap),
    //   roundToGrid(new_world_pos_3D[1], this.gridSnap)
    // )

    // 6. Update the text item and its background
    text_item.transform.updatePosition([new_world_pos_3D[0], new_world_pos_3D[1]], windowSize)
    text_item.backgroundPolygon.transform.updatePosition(
      [new_world_pos_3D[0], new_world_pos_3D[1]],
      windowSize
    )

    // 7. Update associated motion paths (using the new world position)
  }

  move_image(
    mouse_pos: Point,
    start: Point,
    image_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let aspect_ratio = ((camera.windowSize.width as number) / camera.windowSize.height) as number
    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    // let image_item = .imageItems[image_index];
    let image_item = this.imageItems.find((i) => i.id == image_id)

    if (!image_item) {
      return
    }

    // let new_position = {
    //   x: image_item.transform.position[0] + dx, // not sure relation with aspect_ratio?
    //   y: image_item.transform.position[1] + dy,
    // };
    // let new_position = {
    //   x: roundToGrid(image_item.transform.position[0] + dx, this.gridSnap), // not sure relation with aspect_ratio?
    //   y: roundToGrid(image_item.transform.position[1] + dy, this.gridSnap),
    // };

    // Get the original position when drag started
    const originalX = image_item.transform.startPosition
      ? image_item.transform.startPosition[0]
      : image_item.transform.position[0]
    const originalY = image_item.transform.startPosition
      ? image_item.transform.startPosition[1]
      : image_item.transform.position[1]

    // On first drag, store original position
    if (!image_item.transform.startPosition) {
      image_item.transform.startPosition = vec2.fromValues(
        image_item.transform.position[0],
        image_item.transform.position[1]
      )
    }

    // Calculate new position based on original position + total movement
    let new_position = {
      x: roundToGrid(originalX + dx, this.gridSnap),
      y: roundToGrid(originalY + dy, this.gridSnap)
    }

    // console.info("move_image {:?}", new_position);

    image_item.transform.updatePosition([new_position.x, new_position.y], windowSize)

    // Get the original group position for associated motion paths
    const originalPathX =
      this.motionPaths.filter((p) => p.associatedPolygonId === image_id)[0]?.transform
        .startPosition[0] || 0
    const originalPathY =
      this.motionPaths.filter((p) => p.associatedPolygonId === image_id)[0]?.transform
        .startPosition[1] || 0

    let new_path_position = {
      x: roundToGrid(originalPathX + dx, this.gridSnap),
      y: roundToGrid(originalPathY + dy, this.gridSnap)
    }

    // Move associated motion paths when image object is moved
    this.motionPaths.forEach((motionPath) => {
      if (motionPath.associatedPolygonId === image_id) {
        motionPath.updateDataFromPosition(
          windowSize,
          device!,
          this.modelBindGroupLayout!,
          new_path_position,
          camera
        )
      }
    })

    // Also check video items for motion paths
    // this.videoItems.forEach((videoItem) => {
    //   if (
    //     videoItem.mousePath &&
    //     videoItem.mousePath.associatedPolygonId === image_id
    //   ) {
    //     videoItem.mousePath.updateDataFromPosition(
    //       windowSize,
    //       device!,
    //       this.modelBindGroupLayout!,
    //       new_position,
    //       camera
    //     );
    //   }
    // });

    // this.dragStart = mouse_pos;
    // this.update_guide_lines(poly_index, windowSize);
  }

  move_video(
    mouse_pos: Point,
    start: Point,
    video_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let aspect_ratio = ((camera.windowSize.width as number) / camera.windowSize.height) as number
    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    // let image_item = .imageItems[image_index];
    let video_item = this.videoItems.find((i) => i.id == video_id)

    if (!video_item) {
      return
    }

    // let new_position = {
    //   x: video_item.groupTransform.position[0] + dx, // not sure relation with aspect_ratio?
    //   y: video_item.groupTransform.position[1] + dy,
    // };

    // let new_position = {
    //   x: roundToGrid(video_item.transform.position[0] + dx, this.gridSnap), // not sure relation with aspect_ratio?
    //   y: roundToGrid(video_item.transform.position[1] + dy, this.gridSnap),
    // };

    // Get the original position when drag started
    const originalX = video_item.transform.startPosition
      ? video_item.transform.startPosition[0]
      : video_item.transform.position[0]
    const originalY = video_item.transform.startPosition
      ? video_item.transform.startPosition[1]
      : video_item.transform.position[1]

    // On first drag, store original position
    if (!video_item.transform.startPosition) {
      video_item.transform.startPosition = vec2.fromValues(
        video_item.transform.position[0],
        video_item.transform.position[1]
      )
    }

    // Calculate new position based on original position + total movement
    let new_position = {
      x: roundToGrid(originalX + dx, this.gridSnap),
      y: roundToGrid(originalY + dy, this.gridSnap)
    }

    // console.info("move_video {:?}", new_position);

    video_item.groupTransform.updatePosition([new_position.x, new_position.y], windowSize)

    // Get the original group position for associated motion paths
    const originalPathX =
      this.motionPaths.filter((p) => p.associatedPolygonId === video_id)[0]?.transform
        .startPosition[0] || 0
    const originalPathY =
      this.motionPaths.filter((p) => p.associatedPolygonId === video_id)[0]?.transform
        .startPosition[1] || 0

    let new_path_position = {
      x: roundToGrid(originalPathX + dx, this.gridSnap),
      y: roundToGrid(originalPathY + dy, this.gridSnap)
    }

    // Move associated motion paths when video object is moved
    this.motionPaths.forEach((motionPath) => {
      if (motionPath.associatedPolygonId === video_id) {
        motionPath.updateDataFromPosition(
          windowSize,
          device!,
          this.modelBindGroupLayout!,
          new_path_position,
          camera
        )
      }
    })

    // Get the original position when drag started
    const originalX2 = video_item.mousePath?.transform.startPosition
      ? video_item.mousePath?.transform.startPosition[0]
      : video_item.mousePath?.transform.position[0]
    const originalY2 = video_item.mousePath?.transform.startPosition
      ? video_item.mousePath?.transform.startPosition[1]
      : video_item.mousePath?.transform.position[1]

    // On first drag, store original position
    if (video_item.mousePath && !video_item.mousePath?.transform.startPosition) {
      video_item.mousePath.transform.startPosition = vec2.fromValues(
        video_item.mousePath.transform.position[0],
        video_item.mousePath.transform.position[1]
      )
    }

    // Calculate new position based on original position + total movement
    let new_position2 = {
      x:
        (originalX2 ? roundToGrid(originalX2 + dx, this.gridSnap) : dx) -
        video_item.dimensions[0] / 2,
      y:
        (originalY2 ? roundToGrid(originalY2 + dy, this.gridSnap) : dy) -
        video_item.dimensions[1] / 2
    }

    console.info(
      'originalX2',
      video_item.mousePath?.transform.position,
      originalX2,
      originalY2,
      new_position2
    )

    // Also check video items for motion paths (self-reference case)
    video_item?.mousePath?.updateDataFromPosition(
      windowSize,
      device!,
      this.modelBindGroupLayout!,
      new_position2,
      camera
    )

    // this.dragStart = mouse_pos;
    // this.update_guide_lines(poly_index, windowSize);
  }

  move_cube3d(
    mouse_pos: Point,
    start: Point,
    cube_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    let cube = this.cubes3D.find((c) => c.id == cube_id)

    if (!cube) {
      return
    }

    const originalX = cube.transform.startPosition
      ? cube.transform.startPosition[0]
      : cube.transform.position[0]
    const originalY = cube.transform.startPosition
      ? cube.transform.startPosition[1]
      : cube.transform.position[1]

    if (!cube.transform.startPosition) {
      cube.transform.startPosition = vec2.fromValues(
        cube.transform.position[0],
        cube.transform.position[1]
      )
    }

    // let new_position = {
    //   x: roundToGrid(originalX + dx, this.gridSnap),
    //   y: roundToGrid(originalY + dy, this.gridSnap),
    // };

    // let new_position = {
    //   x: originalX + dx,
    //   y: originalY + dy,
    // };

    let new_position = mouse_pos

    cube.transform.updatePosition([new_position.x, new_position.y], windowSize)
  }

  move_sphere3d(
    mouse_pos: Point,
    start: Point,
    sphere_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    let sphere = this.spheres3D.find((s) => s.id == sphere_id)

    if (!sphere) {
      return
    }

    const originalX = sphere.transform.startPosition
      ? sphere.transform.startPosition[0]
      : sphere.transform.position[0]
    const originalY = sphere.transform.startPosition
      ? sphere.transform.startPosition[1]
      : sphere.transform.position[1]

    if (!sphere.transform.startPosition) {
      sphere.transform.startPosition = vec2.fromValues(
        sphere.transform.position[0],
        sphere.transform.position[1]
      )
    }

    // let new_position = {
    //   x: roundToGrid(originalX + dx, this.gridSnap),
    //   y: roundToGrid(originalY + dy, this.gridSnap),
    // };

    let new_position = mouse_pos

    sphere.transform.updatePosition([new_position.x, new_position.y], windowSize)
  }

  move_mockup3d(
    mouse_pos: Point,
    start: Point,
    mockup_id: string,
    windowSize: WindowSize,
    device: PolyfillDevice
  ) {
    let camera = this.camera

    if (!camera) {
      return
    }

    let dx = mouse_pos.x - start.x
    let dy = mouse_pos.y - start.y
    let mockup = this.mockups3D.find((m) => m.id == mockup_id)

    if (!mockup) {
      return
    }

    const originalX = mockup.groupTransform.startPosition
      ? mockup.groupTransform.startPosition[0]
      : mockup.groupTransform.position[0]
    const originalY = mockup.groupTransform.startPosition
      ? mockup.groupTransform.startPosition[1]
      : mockup.groupTransform.position[1]

    if (!mockup.groupTransform.startPosition) {
      mockup.groupTransform.startPosition = vec2.fromValues(
        mockup.groupTransform.position[0],
        mockup.groupTransform.position[1]
      )
    }

    // let new_position = mouse_pos;

    let new_position = {
      x: roundToGrid(originalX + dx, this.gridSnap),
      y: roundToGrid(originalY + dy, this.gridSnap)
    }

    mockup.groupTransform.updatePosition([new_position.x, new_position.y], windowSize)

    // Video child automatically follows via shared group transform
  }

  /** Reset Handlers */

  reset_bounds(windowSize: WindowSize) {
    let camera = this.camera

    if (!camera) {
      return
    }

    // camera.position = Vector2.new(0.0, 0.0);
    camera.position = vec2.create()
    camera.zoom = 1.0
    this.updateCameraBinding()
    // this.interactiveBounds = {
    //   min: { x: 550.0, y: 0.0 }, // account for aside width, allow for some off-canvas positioning
    //   max: {
    //     x: windowSize.width as number,
    //     // y: windowSize.height as number - 350.0, // 350.0 for timeline space
    //     y: 550.0, // allow for 50.0 padding below and above the canvas
    //   },
    // };
  }

  hide_all_objects() {
    // Remove objects
    this.polygons.forEach((p) => {
      p.hidden = true
    })
    this.textItems.forEach((t) => {
      t.hidden = true
    })
    this.imageItems.forEach((i) => {
      i.hidden = true
    })
    this.videoItems.forEach((v) => {
      v.hidden = true
    })

    // Remove existing motion path segments
    // this.staticPolygons.retain(|p| {
    //     p.name != "motion_path_segment"
    //          p.name != "motion_path_handle"
    //          p.name != "motion_path_arrow"
    // });

    // Remove existing motion paths
    this.motionPaths = []
    this.staticPolygons = []
  }
}

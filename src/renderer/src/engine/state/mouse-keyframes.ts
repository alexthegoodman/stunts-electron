import {
  AnimationData,
  AnimationProperty,
  EasingType,
  ObjectType,
  PathType,
  UIKeyframe
} from '../animations'
import EditorState from '../editor_state'
import { SavedPoint } from '../polygon'
import { v4 as uuidv4 } from 'uuid'
import { save_default_keyframes } from './keyframes'

export interface MousePosition {
  x: number
  y: number
  timestamp: number
}

export function create_keyframes_from_mouse_positions(
  editorState: EditorState,
  savable_item_id: string,
  object_type: ObjectType,
  initial_position: SavedPoint,
  video_dimensions: [number, number],
  mouse_positions: MousePosition[],
  durationMs: number,
  sourceData?: {
    id: string
    name: string
    bounds: {
      width: number
      height: number
      x: number
      y: number
    }
    scaleFactor: number
  }
): AnimationData {
  // Start with default keyframes for Position, Rotation, Scale, etc.
  const defaultAnimationData = save_default_keyframes(
    editorState,
    savable_item_id,
    object_type,
    initial_position,
    durationMs
  )

  // Create Zoom keyframes from mouse positions
  let zoom_keyframes: UIKeyframe[] = []

  console.info('sourceData ', sourceData, mouse_positions, video_dimensions)

  if (mouse_positions.length > 0 && sourceData) {
    zoom_keyframes.push({
      id: uuidv4().toString(),
      time: 0,
      value: {
        type: 'Zoom',
        value: {
          position: [sourceData.bounds.width / 2, sourceData.bounds.height / 2],
          zoomLevel: 100
        }
      },
      easing: EasingType.Linear,
      pathType: PathType.Linear,
      keyType: { type: 'Frame' },
      curveData: null
    })

    let scaled_positions: any[] = []
    mouse_positions.forEach((mousePos, index) => {
      // Check if mouse position data is valid
      if (mousePos.x == null || mousePos.y == null) {
        console.warn('Skipping mouse position with null/undefined coordinates:', mousePos)
        return
      }

      // Adjust mouse position relative to window bounds
      let adjustedMouseX = mousePos.x - sourceData.bounds.x
      let adjustedMouseY = mousePos.y - sourceData.bounds.y

      // Normalize to video dimensions (800x500)
      let scaledX = (adjustedMouseX / sourceData.bounds.width) * 800
      let scaledY = (adjustedMouseY / sourceData.bounds.height) * 500

      // Calculate zoom level: animate from 100 to 135 and back to 100
      // Use sine wave to create smooth in-and-out animation
      const progress = index / (mouse_positions.length - 1 || 1)
      const zoomLevel = 100 + 50 * Math.sin(progress * Math.PI)

      scaled_positions.push({
        timestamp: mousePos.timestamp,
        scaledX,
        scaledY,
        zoomLevel
      })
    })

    console.info('scaled_positions ', scaled_positions)

    scaled_positions.forEach((scaled, index) => {
      // Create Zoom keyframe with position and zoom level
      zoom_keyframes.push({
        id: uuidv4().toString(),
        time: Math.min(scaled.timestamp, durationMs),
        value: {
          type: 'Zoom',
          value: {
            // position: [initial_position.x + scaledOffsetX, initial_position.y + scaledOffsetY],
            position: [scaled.scaledX, scaled.scaledY],
            zoomLevel: scaled.zoomLevel
          }
        },
        easing: EasingType.Linear,
        pathType: PathType.Linear,
        keyType: { type: 'Frame' },
        curveData: null
      })
    })
  } else {
    // Fallback: single zoom keyframe at initial position
    zoom_keyframes.push({
      id: uuidv4().toString(),
      time: 0,
      value: {
        type: 'Zoom',
        value: {
          position: [initial_position.x, initial_position.y],
          zoomLevel: 100
        }
      },
      easing: EasingType.Linear,
      pathType: PathType.Linear,
      keyType: { type: 'Frame' },
      curveData: null
    })
  }

  const zoom_prop: AnimationProperty = {
    name: 'Zoom',
    propertyPath: 'zoom',
    children: [],
    keyframes: zoom_keyframes,
    depth: 0
  }

  // Find and replace the zoom property in default animation data, or add it
  const zoomPropertyIndex = defaultAnimationData.properties.findIndex(
    (prop) => prop.propertyPath === 'zoom'
  )

  if (zoomPropertyIndex !== -1) {
    // Replace existing zoom property
    defaultAnimationData.properties[zoomPropertyIndex] = zoom_prop
  } else {
    // Add zoom property
    defaultAnimationData.properties.push(zoom_prop)
  }

  return defaultAnimationData
}

import {
  AnimationData,
  AnimationProperty,
  EasingType,
  ObjectType,
  PathType,
  UIKeyframe,
} from "../animations";
import EditorState from "../editor_state";
import { SavedPoint } from "../polygon";
import { v4 as uuidv4 } from "uuid";
import { save_default_keyframes } from "./keyframes";

export interface MousePosition {
  x: number;
  y: number;
  timestamp: number;
}

export function create_keyframes_from_mouse_positions(
  editorState: EditorState,
  savable_item_id: string,
  object_type: ObjectType,
  initial_position: SavedPoint,
  video_dimensions: [number, number],
  mouse_positions: MousePosition[],
  durationMs: number
): AnimationData {
  // Start with default keyframes for Position, Rotation, Scale, etc.
  const defaultAnimationData = save_default_keyframes(
    editorState,
    savable_item_id,
    object_type,
    initial_position,
    durationMs
  );

  // Create Zoom keyframes from mouse positions
  let zoom_keyframes: UIKeyframe[] = [];

  if (mouse_positions.length > 0) {
    // Get the first mouse position as reference point (screen coords)
    const firstMousePos = mouse_positions[0];

    mouse_positions.forEach((mousePos, index) => {
      // Calculate offset from first position
      const offsetX = mousePos.x - firstMousePos.x;
      const offsetY = mousePos.y - firstMousePos.y;

      // Scale the offset to be relative to video dimensions
      // The video starts at 800x500 (from ToolGrid)
      const scaledOffsetX = (offsetX / video_dimensions[0]) * 800;
      const scaledOffsetY = (offsetY / video_dimensions[1]) * 500;

      // Calculate zoom level: animate from 100 to 135 and back to 100
      // Use sine wave to create smooth in-and-out animation
      const progress = index / (mouse_positions.length - 1 || 1);
      const zoomLevel = 100 + 35 * Math.sin(progress * Math.PI);

      // Create Zoom keyframe with position and zoom level
      zoom_keyframes.push({
        id: uuidv4().toString(),
        time: Math.min(mousePos.timestamp, durationMs),
        value: {
          type: "Zoom",
          value: {
            position: [
              initial_position.x + scaledOffsetX,
              initial_position.y + scaledOffsetY,
            ],
            zoomLevel: zoomLevel,
          },
        },
        easing: EasingType.Linear,
        pathType: PathType.Linear,
        keyType: { type: "Frame" },
        curveData: null,
      });
    });
  } else {
    // Fallback: single zoom keyframe at initial position
    zoom_keyframes.push({
      id: uuidv4().toString(),
      time: 0,
      value: {
        type: "Zoom",
        value: {
          position: [initial_position.x, initial_position.y],
          zoomLevel: 100,
        },
      },
      easing: EasingType.Linear,
      pathType: PathType.Linear,
      keyType: { type: "Frame" },
      curveData: null,
    });
  }

  const zoom_prop: AnimationProperty = {
    name: "Zoom",
    propertyPath: "zoom",
    children: [],
    keyframes: zoom_keyframes,
    depth: 0,
  };

  // Find and replace the zoom property in default animation data, or add it
  const zoomPropertyIndex = defaultAnimationData.properties.findIndex(
    (prop) => prop.propertyPath === "zoom"
  );

  if (zoomPropertyIndex !== -1) {
    // Replace existing zoom property
    defaultAnimationData.properties[zoomPropertyIndex] = zoom_prop;
  } else {
    // Add zoom property
    defaultAnimationData.properties.push(zoom_prop);
  }

  return defaultAnimationData;
}

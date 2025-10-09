import { ObjectType } from './animations'
import { INTERNAL_LAYER_SPACE } from './polygon'

// Type alias to define the vertex data layout for buffer creation
export type VertexData = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]

// Helper function to calculate byte size
export const vertexByteSize = (3 + 2 + 4 + 2 + 1) * Float32Array.BYTES_PER_ELEMENT // 3 pos, 2 tex, 4 color

export interface Vertex {
  position: [number, number, number] // x, y, z coordinates
  tex_coords: [number, number] // u, v coordinates
  color: [number, number, number, number]
  gradient_coords: [number, number]
  object_type: number
  id?: string // never sent to shader
}

// TODO: hard to understand? Probably. But it works, we just need an option to increase the distance between layers
// export function getZLayer(layer: number, layerDivider: number = 1000.0): number {
//   const z = -((layer - INTERNAL_LAYER_SPACE) / layerDivider)

//   const zLayer = -1.0 - z - 5.0

//   return zLayer
// }

/**
 * Calculates the Z-coordinate for a given layer, allowing for custom spacing.
 *
 * @param layer The layer number (e.g., 0, 1, 2...).
 * @param layerSpacing The distance to add between each consecutive layer.
 * @returns The calculated Z-coordinate.
 */
export function getZLayer(layer: number, layerSpacing: number = 0.001): number {
  // A constant starting position on the Z-axis. This combines the original -1.0 and -5.0.
  const basePosition = -12.0 - 1 * layerSpacing

  const layerRel = (-layer - 1) * layerSpacing

  // The original code used a constant `INTERNAL_LAYER_SPACE` to offset the start.
  // We keep its effect here. This makes `layer = INTERNAL_LAYER_SPACE` the layer positioned at `basePosition`.
  // const effectiveLayer = layer - INTERNAL_LAYER_SPACE
  const effectiveLayer = -INTERNAL_LAYER_SPACE

  // The final Z position is the base, adjusted by the layer number and the desired spacing.
  const zLayer = basePosition + effectiveLayer * layerRel

  return zLayer
}

export function createVertex(
  x: number,
  y: number,
  z: number,
  color: [number, number, number, number],
  objectType: ObjectType
): Vertex {
  let object_type = 0
  switch (objectType) {
    case ObjectType.Polygon:
      object_type = 0
      break
    case ObjectType.TextItem:
      object_type = 1
      break
    case ObjectType.ImageItem:
      object_type = 2
      break
    case ObjectType.VideoItem:
      object_type = 3
      break
    case ObjectType.Brush:
      object_type = 4
      break
    default:
      break
  }

  return {
    position: [x, y, z],
    tex_coords: [0.0, 0.0], // Default UV coordinates
    color,
    gradient_coords: [0, 0],
    object_type
  }
}

export function createVertexBufferLayout(): GPUVertexBufferLayout {
  // const vertexSize = Float32Array.BYTES_PER_ELEMENT * (3 + 2 + 4); // Size of each vertex in bytes
  return {
    arrayStride: vertexByteSize,
    stepMode: 'vertex',
    attributes: [
      {
        offset: 0,
        shaderLocation: 0, // Corresponds to layout(location = 0) in shader
        format: 'float32x3' // x3 for position
      },
      {
        offset: Float32Array.BYTES_PER_ELEMENT * 3, // Offset after position
        shaderLocation: 1, // Corresponds to layout(location = 1) in shader
        format: 'float32x2' // x2 for uv
      },
      {
        offset: Float32Array.BYTES_PER_ELEMENT * 5, // Offset after position and uv
        shaderLocation: 2, // Corresponds to layout(location = 2) in shader
        format: 'float32x4' // x4 for color
      },
      {
        // gradient_coords
        shaderLocation: 3,
        offset: Float32Array.BYTES_PER_ELEMENT * 9,
        format: 'float32x2'
      },
      {
        // object_type
        shaderLocation: 4,
        offset: Float32Array.BYTES_PER_ELEMENT * 11,
        format: 'float32'
      }
    ]
  }
}

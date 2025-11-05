import { ObjectType } from './animations'
import { Point } from './editor'

export interface PointLight3DConfig {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  color: [number, number, number]
  intensity: number
  layer: number
}

export interface SavedPointLight3DConfig {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  color: [number, number, number]
  intensity: number
  layer: number
}

export class PointLight {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  color: [number, number, number]
  intensity: number
  layer: number
  hidden: boolean
  objectType: ObjectType

  constructor(config: PointLight3DConfig) {
    this.id = config.id
    this.name = config.name
    this.position = config.position
    this.color = config.color
    this.intensity = config.intensity
    this.layer = config.layer
    this.hidden = false
    this.objectType = ObjectType.PointLight
  }

  toConfig(): PointLight3DConfig {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      color: this.color,
      intensity: this.intensity,
      layer: this.layer
    }
  }

  toSavedConfig(): SavedPointLight3DConfig {
    return this.toConfig()
  }

  containsPoint(point: Point): boolean {
    // Lights don't have a visual representation for picking
    return false
  }

  updateLayer(layer: number) {
    this.layer = layer
  }
}

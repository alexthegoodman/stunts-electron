export enum SceneShaderType {
  Painting = 'Painting'
}

export interface PaintingScene {
  type: number
  intensity: number
  brush_scale: number
  noise_strength: number
}

// Default configurations for each shader theme
export const DEFAULT_PAINTING: PaintingScene = {
  type: 1,
  intensity: 0.7,
  brush_scale: 2.5,
  noise_strength: 0.1
}

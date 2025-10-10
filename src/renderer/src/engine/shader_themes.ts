// Shader Theme Definitions
// These define procedural shader-based backgrounds for sequences

export enum ShaderThemeType {
  NightSky = 'NightSky',
  Network = 'Network',
  DaySky = 'DaySky',
  RingsBlur = 'RingsBlur'
}

export interface ShaderThemeConfig {
  type: ShaderThemeType
  params: ShaderThemeParams
}

export type ShaderThemeParams = NightSkyParams | NetworkParams | DaySkyParams | RingsBlurParams

export interface NightSkyParams {
  starDensity: number // 0.0 - 1.0
  starBrightness: number // 0.0 - 1.0
  nebulaDensity: number // 0.0 - 1.0
  nebulaColor: [number, number, number, number] // RGBA
  twinkleSpeed: number // 0.0 - 5.0
}

export interface NetworkParams {
  nodeCount: number // 10 - 200
  connectionDistance: number // 0.1 - 1.0
  nodeColor: [number, number, number, number] // RGBA
  lineColor: [number, number, number, number] // RGBA
  animationSpeed: number // 0.0 - 5.0
  nodeSize: number // 0.001 - 0.05
}

export interface DaySkyParams {
  skyColor: [number, number, number, number] // RGBA
  cloudDensity: number // 0.0 - 1.0
  cloudSpeed: number // 0.0 - 5.0
  sunIntensity: number // 0.0 - 1.0
  sunPosition: [number, number] // Normalized coordinates (0-1)
}

export interface RingsBlurParams {
  ringCount: number // 3 - 20
  ringColor: [number, number, number, number] // RGBA
  blurAmount: number // 0.0 - 1.0
  rotationSpeed: number // 0.0 - 5.0
  radius: number // 0.1 - 1.0
  thickness: number // 0.01 - 0.2
}

// Default configurations for each shader theme
export const DEFAULT_NIGHT_SKY: NightSkyParams = {
  starDensity: 0.1,
  starBrightness: 0.1,
  nebulaDensity: 0.4,
  nebulaColor: [0.5, 0.2, 0.9, 1.0],
  twinkleSpeed: 0.25
}

export const DEFAULT_NETWORK: NetworkParams = {
  nodeCount: 40,
  connectionDistance: 0.25,
  nodeColor: [0.3, 0.7, 1.0, 1.0],
  lineColor: [0.3, 0.7, 1.0, 0.8],
  animationSpeed: 0.5,
  nodeSize: 0.008
}

export const DEFAULT_DAY_SKY: DaySkyParams = {
  skyColor: [0.4, 0.6, 1.0, 1.0],
  cloudDensity: 0.5,
  cloudSpeed: 1.5,
  sunIntensity: 0.9,
  sunPosition: [0.75, 0.25]
}

export const DEFAULT_RINGS_BLUR: RingsBlurParams = {
  ringCount: 6,
  ringColor: [0.9, 0.5, 1.0, 1.0],
  blurAmount: 0.6,
  rotationSpeed: 0.5,
  radius: 0.7,
  thickness: 0.04
}

// Helper to get default params for a shader type
export function getDefaultShaderParams(type: ShaderThemeType): ShaderThemeParams {
  switch (type) {
    case ShaderThemeType.NightSky:
      return DEFAULT_NIGHT_SKY
    case ShaderThemeType.Network:
      return DEFAULT_NETWORK
    case ShaderThemeType.DaySky:
      return DEFAULT_DAY_SKY
    case ShaderThemeType.RingsBlur:
      return DEFAULT_RINGS_BLUR
    default:
      return DEFAULT_NIGHT_SKY
  }
}

import { Camera, CameraBinding, WindowSize } from '../camera'
import { EasingType, PathType, UIKeyframe } from '../animations'
import { BBox, Point } from '../editor'
import { toNDC } from '../vertex'

// used for grid snap
export function roundUp(numToRound: number, multiple: number): number {
  if (multiple == 0) {
    return numToRound
  }

  let remainder = numToRound % multiple
  if (remainder == 0) {
    return numToRound
  }

  return numToRound + multiple - remainder
}

export function roundToGrid(numToRound: number, grid: number): number {
  return Math.round(numToRound / grid) * grid
}

// export function roundToGrid(
//   numToRound: number,
//   grid: number,
//   roundUp = true
// ): number {
//   if (roundUp) {
//     // For positive numbers, ceil rounds up
//     // For negative numbers, floor rounds "up" (to more negative)
//     return numToRound >= 0
//       ? Math.ceil(1 / grid) * grid
//       : Math.floor(-1 / grid) * grid;
//   } else {
//     // Standard rounding behavior
//     return Math.round(numToRound / grid) * grid;
//   }
// }

export function interpolatePosition(
  start: UIKeyframe,
  end: UIKeyframe,
  time: number
): [number, number] {
  let startPos = start.value.value as [number, number]
  let endPos = end.value.value as [number, number]

  if (start.value.type === 'Zoom' && end.value.type === 'Zoom') {
    startPos = start.value.value.position as [number, number]
    endPos = end.value.value.position as [number, number]
  }

  const progress = (() => {
    const total_time = end.time - start.time
    const current_time = time - start.time
    const t = current_time / total_time

    switch (start.easing) {
      case EasingType.Linear:
        return t
      case EasingType.EaseIn:
        return t * t
      case EasingType.EaseOut:
        return 1.0 - (1.0 - t) * (1.0 - t)
      case EasingType.EaseInOut:
        return t < 0.5 ? 2.0 * t * t : 1.0 - Math.pow(-2.0 * t + 2.0, 2) / 2.0
      default:
        return t // Default case, or throw an error if you want to be stricter
    }
  })()

  // console.info("Segment progress", progress);

  switch (start.pathType) {
    case PathType.Linear:
      return [
        startPos[0] + (endPos[0] - startPos[0]) * progress,
        startPos[1] + (endPos[1] - startPos[1]) * progress
      ]
    case PathType.Bezier:
      const p0 = [startPos[0], startPos[1]]
      const p3 = [endPos[0], endPos[1]]

      const p1 =
        start.pathType === PathType.Bezier && start.curveData?.controlPoint1
          ? [start.curveData.controlPoint1.x, start.curveData.controlPoint1.y]
          : [p0[0] + (p3[0] - p0[0]) * 0.33, p0[1] + (p3[1] - p0[1]) * 0.33]

      const p2 =
        start.pathType === PathType.Bezier && start.curveData?.controlPoint2
          ? [start.curveData.controlPoint2.x, start.curveData.controlPoint2.y]
          : [p0[0] + (p3[0] - p0[0]) * 0.66, p0[1] + (p3[1] - p0[1]) * 0.66]

      const t = progress
      const t2 = t * t
      const t3 = t2 * t
      const mt = 1.0 - t
      const mt2 = mt * mt
      const mt3 = mt2 * mt

      const x = p0[0] * mt3 + 3.0 * p1[0] * mt2 * t + 3.0 * p2[0] * mt * t2 + p3[0] * t3
      const y = p0[1] * mt3 + 3.0 * p1[1] * mt2 * t + 3.0 * p2[1] * mt * t2 + p3[1] * t3

      return [x, y]
    default:
      throw new Error('Invalid PathType')
  }
}

import { vec3 } from 'gl-matrix'

// Helper for Ray-Sphere Intersection
export function checkRaySphereIntersection(ray: Ray, center: vec3, radius: number): boolean {
  const L = vec3.create()
  // Vector from sphere center to ray origin: L = O - C
  vec3.subtract(L, ray.origin, center)

  // a = D · D (Ray direction dot product with itself - should be 1 if D is normalized)
  // We can assume a = 1 since the ray direction is normalized in visualize_ray_intersection.
  const a = 1.0

  // b = 2 * (D · L)
  const b = 2.0 * vec3.dot(ray.direction, L)

  // c = L · L - r²
  const c = vec3.dot(L, L) - radius * radius

  // Discriminant: Δ = b² - 4ac
  const discriminant = b * b - 4 * a * c

  if (discriminant < 0) {
    // No real solution, ray misses the sphere
    return false
  }

  // Solve for t (distance along the ray): t = (-b ± √Δ) / 2a
  // We only care if the intersection is in front of the ray origin (t > 0).
  const t0 = (-b - Math.sqrt(discriminant)) / (2 * a)
  const t1 = (-b + Math.sqrt(discriminant)) / (2 * a)

  // If the closest intersection point is positive, the sphere is in front of the camera.
  return t0 > 0 || t1 > 0
}

import { vec2 } from 'gl-matrix'

export function checkRayPlaneIntersection(
  ray: Ray,
  planePoint: vec3,
  planeNormal: vec3
): vec3 | null {
  // 1. Calculate N · D (dot product of plane normal and ray direction)
  const NdotD = vec3.dot(planeNormal, ray.direction)

  // Check if the ray is parallel to the plane (or points away from the side we are facing)
  if (Math.abs(NdotD) < 1e-6) {
    return null // Parallel or near-parallel, no reliable intersection
  }

  // 2. Calculate N · (P_plane - O)
  const W = vec3.create()
  vec3.subtract(W, planePoint, ray.origin)
  const NdotW = vec3.dot(planeNormal, W)

  // 3. Calculate t (distance along the ray)
  const t = NdotW / NdotD

  // Check if intersection is behind the ray origin (usually t < 0)
  if (t < 0) {
    // return null; // Only check if you want to prevent clicking through the camera
  }

  // 4. Calculate intersection point: P = O + t * D
  const intersectionPoint = vec3.create()
  const tD = vec3.create()
  vec3.scale(tD, ray.direction, t)
  vec3.add(intersectionPoint, ray.origin, tD)

  return intersectionPoint
}

// Assuming this helper function is available in your class/module
export function getCameraForward(camera: Camera3D): vec3 {
  const forward = vec3.create()
  vec3.subtract(forward, camera.target, camera.position3D)
  vec3.normalize(forward, forward)
  return forward
}

// The new, proper 3D Ray interface
export interface IRay3D {
  origin: vec3
  direction: vec3
}

export class Ray implements IRay3D {
  origin: vec3
  direction: vec3

  constructor(origin: vec3, direction: vec3) {
    this.origin = origin
    this.direction = direction
  }

  // New static factory that returns a proper 3D Ray
  static new(origin: vec3, direction: vec3): Ray {
    return new Ray(origin, direction)
  }

  // Keep the old top_left for backward compatibility
  // NOTE: This value is **not** used for 3D intersection logic.
  // It is just the 2D screen coordinate, which you should replace usage of.
  get top_left(): Point {
    return { x: this.origin[0], y: this.origin[1] } // Conceptual, only for old 2D code
  }
}

// export function visualize_ray_intersection(
//   windowSize: WindowSize,
//   screen_x: number,
//   screen_y: number,
//   camera: Camera
// ): Ray {
//   const scale_factor = camera.zoom
//   const zoom_center_x = windowSize.width / 2.0
//   const zoom_center_y = windowSize.height / 2.0

//   const translated_screen_x = screen_x - zoom_center_x
//   const translated_screen_y = screen_y - zoom_center_y

//   const zoomed_screen_x = translated_screen_x / scale_factor
//   const zoomed_screen_y = translated_screen_y / scale_factor

//   const scaled_screen_x = zoomed_screen_x + zoom_center_x
//   const scaled_screen_y = zoomed_screen_y + zoom_center_y

//   const pan_offset_x = camera.position[0] * 0.5
//   const pan_offset_y = camera.position[1] * 0.5

//   const top_left: Point = {
//     x: scaled_screen_x + pan_offset_x,
//     y: scaled_screen_y - pan_offset_y
//   }

//   return Ray.new(top_left)
// }

// export function visualize_ray_intersection(
//   windowSize: WindowSize,
//   screen_x: number,
//   screen_y: number,
//   camera: Camera
// ): Ray {
//   let top_left = toNDC(screen_x, screen_y, windowSize.width, windowSize.height)

//   return Ray.new(top_left)
// }

import { mat4, vec4 } from 'gl-matrix'
import { Camera3D } from '../3dcamera'

// NOTE: This implementation assumes you have the gl-matrix library available.
// NOTE: Your Camera3D.getProjection() uses a fixed aspect ratio of 500/500,
// which may need adjustment if your windowSize is not square.
export function visualize_ray_intersection(
  windowSize: WindowSize,
  screen_x: number,
  screen_y: number,
  camera: Camera3D
): Ray {
  // 1. Convert screen coordinates (pixel space) to Normalized Device Coordinates (NDC)
  // NDC: x from -1 (left) to 1 (right), y from 1 (top) to -1 (bottom)
  const ndc_x = (screen_x / windowSize.width) * 2 - 1
  const ndc_y = 1 - (screen_y / windowSize.height) * 2 // Invert Y-axis

  // 2. Define the ray's start (near plane) and end (far plane) points in Clip Space.
  // We use z = -1 (near) and z = 1 (far). w = 1 for a 3D point.
  const ray_clip_near = vec4.fromValues(ndc_x, ndc_y, -1.0, 1.0)
  const ray_clip_far = vec4.fromValues(ndc_x, ndc_y, 1.0, 1.0)

  // 3. Compute the Inverse Projection-View Matrix
  const inv_proj_view = mat4.create()
  const projectionMatrix = camera.getProjection()
  const viewMatrix = camera.getView()

  const view_projection = mat4.create()
  mat4.multiply(view_projection, projectionMatrix, viewMatrix) // P * V
  mat4.invert(inv_proj_view, view_projection) // (P * V)^-1

  // 4. Transform points from Clip Space to World Space
  const ray_world_near = vec4.create()
  const ray_world_far = vec4.create()

  vec4.transformMat4(ray_world_near, ray_clip_near, inv_proj_view)
  vec4.transformMat4(ray_world_far, ray_clip_far, inv_proj_view)

  // 5. Perform Perspective Divide (divide X, Y, Z by W)
  // This converts from Homogeneous Coordinates (vec4) to World Coordinates (vec3)
  const near_point = vec3.fromValues(
    ray_world_near[0] / ray_world_near[3],
    ray_world_near[1] / ray_world_near[3],
    ray_world_near[2] / ray_world_near[3]
  )

  const far_point = vec3.fromValues(
    ray_world_far[0] / ray_world_far[3],
    ray_world_far[1] / ray_world_far[3],
    ray_world_far[2] / ray_world_far[3]
  )

  // 6. Define the 3D Ray
  const ray_origin = vec3.clone(camera.position3D) // Ray origin is the camera's world position

  // The direction vector is from the origin to the unprojected point on the far plane.
  const ray_direction = vec3.create()
  vec3.subtract(ray_direction, far_point, ray_origin)
  vec3.normalize(ray_direction, ray_direction) // Direction must be normalized

  // Return the new 3D Ray
  return Ray.new(ray_origin, ray_direction)
}

export enum InteractionTarget {
  Polygon,
  Text,
  Image,
  Video,
  Cube3D,
  Sphere3D,
  Mockup3D
}

export function getColor(color_index: number): number {
  const normalized_index = color_index % 30
  const shade_index = Math.floor(normalized_index / 3) // Use Math.floor for integer division
  return 155 + shade_index * 10
}

export function getFullColor(index: number): [number, number, number] {
  const normalized_index = index % 30

  switch (normalized_index % 3) {
    case 0:
      return [getColor(index), 10, 10]
    case 1:
      return [10, getColor(index), 10]
    case 2:
      return [10, 10, getColor(index)]
    default:
      throw new Error('Unreachable case of get_full_color') // More appropriate than unreachable!()
  }
}

export enum InputValue {
  Text,
  Number
  // Points(Vec<Point>),
}

export function getRandomNumber(min: number, max: number) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function sizeToNormal(windowSize: WindowSize, x: number, y: number): [number, number] {
  const ndcX = x / windowSize.width
  const ndcY = y / windowSize.height

  return [ndcX, ndcY]
}

export function pointToNdc(point: Point, windowSize: WindowSize) {
  const aspectRatio = windowSize.width / windowSize.height

  return {
    x: (point.x / windowSize.width) * 2.0 - 1.0,
    y: 1.0 - (point.y / windowSize.height) * 2.0
  }
}

export function rgbToWgpu(
  r: number,
  g: number,
  b: number,
  a: number
): [number, number, number, number] {
  return [r / 255.0, g / 255.0, b / 255.0, a / 255.0]
}

export function colorToWgpu(c: number): number {
  return c / 255.0
}

export function wgpuToHuman(c: number): number {
  return c * 255.0
}

export function stringToF32(s: string): number {
  const trimmed = s.trim()

  if (trimmed.length === 0) {
    return 0.0
  }

  // Check if there's at least one digit of the string
  if (!/\d/.test(trimmed)) {
    return 0.0
  }

  // At this point, we know there's at least one digit, so let's try to parse
  const num = parseFloat(trimmed)
  if (!isNaN(num)) {
    return num
  } else {
    // If parsing failed, check if it's because of a misplaced dash
    if (trimmed.includes('-') && trimmed !== '-') {
      // Remove all dashes and try parsing again
      const withoutDashes = trimmed.replace(/-/g, '')
      const parsed = parseFloat(withoutDashes)
      return !isNaN(parsed) ? -Math.abs(parsed) : 0.0
    } else {
      return 0.0
    }
  }
}

export function stringToU32(s: string): number {
  const trimmed = s.trim()

  if (trimmed.length === 0) {
    return 0
  }

  // Check if there's at least one digit of the string
  if (!/\d/.test(trimmed)) {
    return 0
  }

  // At this point, we know there's at least one digit, so let's try to parse
  const num = parseInt(trimmed, 10)
  return !isNaN(num) ? num : 0
}

export function isOverlapping(a: BBox, b: BBox, margin: number = 10): boolean {
  return !(
    (
      a.x + a.width + margin < b.x || // a is left of b
      a.x > b.x + b.width + margin || // a is right of b
      a.y + a.height + margin < b.y || // a is above b
      a.y > b.y + b.height + margin
    ) // a is below b
  )
}

export function resolveOverlaps(
  objects: BBox[],
  maxIterations: number = 10,
  pushAmount: number = 20
): BBox[] {
  let moved = true
  let iterations = 0

  while (moved && iterations < maxIterations) {
    moved = false
    iterations++

    for (let i = 0; i < objects.length; i++) {
      for (let j = i + 1; j < objects.length; j++) {
        let a = objects[i]
        let b = objects[j]

        if (isOverlapping(a, b)) {
          moved = true
          let dx = a.x + a.width / 2 - (b.x + b.width / 2)
          let dy = a.y + a.height / 2 - (b.y + b.height / 2)
          let magnitude = Math.sqrt(dx * dx + dy * dy) || 1 // Avoid division by zero

          // Push objects apart
          dx = (dx / magnitude) * pushAmount
          dy = (dy / magnitude) * pushAmount

          a.x += dx
          a.y += dy
          b.x -= dx
          b.y -= dy
        }
      }
    }
  }

  return objects
}

export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

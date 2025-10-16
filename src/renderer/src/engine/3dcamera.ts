import { mat4, vec2, vec3, quat } from 'gl-matrix'
import { Point } from './editor'
import { Camera } from './camera' // Import your existing Camera class
import { WindowSize } from './camera'
import { degreesToRadians } from './transform'

export class Camera3D extends Camera {
  // 3D position instead of 2D
  position3D: vec3

  // Rotation represented as quaternion
  rotation: quat

  // Field of view in radians
  fov: number

  // Near and far clipping planes
  near: number
  far: number

  // Camera up vector
  up: vec3

  // Camera target/look-at point
  target: vec3

  lastOrbitX: number = 0
  lastOrbitY: number = 0

  resetZ: number = 7.0

  constructor(windowSize: WindowSize) {
    super(windowSize)

    // Initialize 3D position (x, y from base class, adding z)
    this.position3D = vec3.fromValues(this.position[0], this.position[1], this.resetZ)

    // Initialize rotation as identity quaternion (no rotation)
    this.rotation = quat.create()

    // Default field of view
    this.fov = Math.PI / 8 // best

    // Set reasonable near and far clipping planes
    this.near = 0.1
    this.far = 1000.0

    // Default up vector
    this.up = vec3.fromValues(0, 1, 0)

    // Default target - point in front of camera (negative Z direction)
    // This allows orbiting around the content which is in front of the camera
    this.target = vec3.fromValues(0, 0, -25)
  }

  // Override the projection matrix to use perspective instead of orthographic
  getProjection(): mat4 {
    // const aspectRatio = this.windowSize.width / this.windowSize.height;
    const aspectRatio = 500 / 500
    const result = mat4.create()

    // Create perspective matrix
    mat4.perspective(
      result,
      this.fov * this.zoom, // Apply zoom to field of view
      aspectRatio,
      this.near,
      this.far
    )

    return result
  }

  // Override the view matrix to handle 3D camera positioning and rotation
  getView(): mat4 {
    const view = mat4.create()

    // Create lookAt matrix
    mat4.lookAt(view, this.position3D, this.target, this.up)

    // Apply rotation if needed
    const rotationMatrix = mat4.create()
    mat4.fromQuat(rotationMatrix, this.rotation)
    mat4.multiply(view, view, rotationMatrix)

    return view
  }

  // Method to set camera position in 3D space
  setPosition(x: number, y: number, z: number): void {
    this.position[0] = x // Update 2D position for compatibility
    this.position[1] = y // Update 2D position for compatibility
    this.position3D = vec3.fromValues(x, y, z)
  }

  // Method to set where the camera is looking at
  lookAt(target: vec3): void {
    this.target = vec3.clone(target)

    // Calculate and store the direction vector
    const direction = vec3.create()
    vec3.subtract(direction, this.target, this.position3D)
    vec3.normalize(direction, direction)

    // Update rotation quaternion based on direction
    const forward = vec3.fromValues(0, 0, -1) // Default forward direction
    this.rotation = quat.rotationTo(quat.create(), forward, direction)
  }

  rotate(axis: string, degrees: number) {
    let myQuaternion = this.rotation
    let angleInRadians = degreesToRadians(degrees) // 45 degrees

    let newQuaternion = quat.create()

    switch (axis) {
      case 'x':
        quat.rotateX(newQuaternion, myQuaternion, angleInRadians)
        break

      case 'y':
        quat.rotateY(newQuaternion, myQuaternion, angleInRadians)
        break

      default:
        break
    }

    this.rotation = newQuaternion
  }

  pan(delta: vec2) {
    console.log('target:', this.target, 'pos:', this.position3D)
    this.position3D[0] = this.position3D[0] + delta[0]
    this.position3D[1] = this.position3D[1] + delta[1]
    this.position[0] = this.position3D[0]
    this.position[1] = this.position3D[1]
    const panVector = vec3.create()
    panVector[0] = delta[0]
    panVector[1] = delta[1]
    vec3.add(this.target, this.target, panVector)
    console.log('target:', this.target, 'pos:', this.position3D)
  }

  // Move camera along its view direction
  moveForward(distance: number): void {
    const direction = vec3.create()
    vec3.subtract(direction, this.target, this.position3D)
    vec3.normalize(direction, direction)
    vec3.scale(direction, direction, distance)
    vec3.add(this.position3D, this.position3D, direction)
  }

  // Move camera along its right vector
  moveRight(distance: number): void {
    const direction = vec3.create()
    vec3.subtract(direction, this.target, this.position3D)
    const right = vec3.create()
    vec3.cross(right, direction, this.up)
    vec3.normalize(right, right)
    vec3.scale(right, right, distance)
    vec3.add(this.position3D, this.position3D, right)
  }

  // Override zoom to affect field of view instead
  update_zoom(delta: number): void {
    this.position3D[2] += delta
  }

  reset_zoom() {
    this.position3D[2] = this.resetZ
  }

  // Method to orbit camera around target point
  orbit(deltaX: number, deltaY: number, radius?: number): void {
    // If radius is provided, maintain that distance from target
    if (radius !== undefined) {
      const direction = vec3.create()
      vec3.subtract(direction, this.position3D, this.target)
      vec3.normalize(direction, direction)
      vec3.scale(direction, direction, radius)
      vec3.add(this.position3D, this.target, direction)
    }

    // Create rotation quaternions for x and y rotations
    const rotationX = quat.create()
    const rotationY = quat.create()

    // Rotate around vertical axis (y-axis)
    quat.setAxisAngle(rotationY, this.up, deltaX)

    // Find the right vector for horizontal rotation
    const forward = vec3.create()
    vec3.subtract(forward, this.target, this.position3D)
    const right = vec3.create()
    vec3.cross(right, forward, this.up)
    vec3.normalize(right, right)

    // Rotate around horizontal axis (right vector)
    quat.setAxisAngle(rotationX, right, deltaY)

    // Combine rotations
    const rotation = quat.create()
    quat.multiply(rotation, rotationX, rotationY)

    // Apply rotation to position (orbiting around target)
    const offset = vec3.create()
    vec3.subtract(offset, this.position3D, this.target)
    vec3.transformQuat(offset, offset, rotation)
    vec3.add(this.position3D, this.target, offset)

    // Update rotation quaternion
    quat.multiply(this.rotation, rotation, this.rotation)

    // Update 2D position for compatibility
    this.position[0] = this.position3D[0]
    this.position[1] = this.position3D[1]

    this.lastOrbitX = deltaX
    this.lastOrbitY = deltaY
  }
}

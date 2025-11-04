import { mat4, vec3, quat, vec2 } from 'gl-matrix'
import { Camera3D } from './3dcamera'
import { WindowSize } from './camera'
import { degreesToRadians } from './transform'

export class FirstPersonCamera extends Camera3D {
  // Sensitivity for mouse movement
  // mouseSensitivity: number = 0.1

  constructor(windowSize: WindowSize) {
    super(windowSize)

    // Initialize position and rotation for a first-person view
    this.defaultPosition3D = vec3.fromValues(0, 2, 0) // Start at origin
    this.position3D = this.defaultPosition3D // Start at origin
    this.rotation = quat.create() // No initial rotation

    // Update the target based on the initial position and rotation
    this.updateTarget()
  }

  // Helper to update the target based on current position and rotation
  // updateTarget(): void {
  //   const forward = vec3.fromValues(0, 0, -1) // Default forward direction
  //   vec3.transformQuat(forward, forward, this.rotation) // Rotate forward vector
  //   vec3.add(this.target, this.position3D, forward) // Target is in front of camera
  // }

  // // Override moveForward to ensure target is updated
  // moveForward(distance: number): void {
  //   super.moveForward(distance)
  //   this.updateTarget()
  // }

  // // Override moveRight to ensure target is updated
  // moveRight(distance: number): void {
  //   super.moveRight(distance)
  //   this.updateTarget()
  // }

  // Override moveForward to use rotation instead of target
  moveForward(distance: number): void {
    const forward = vec3.fromValues(0, 0, -1) // Default forward direction
    vec3.transformQuat(forward, forward, this.rotation) // Get actual forward from rotation
    vec3.scale(forward, forward, distance)
    vec3.add(this.position3D, this.position3D, forward)
    this.updateTarget() // Update target after moving
  }

  // Override moveRight to use rotation instead of target
  moveRight(distance: number): void {
    const right = vec3.fromValues(1, 0, 0) // Default right direction
    vec3.transformQuat(right, right, this.rotation) // Get actual right from rotation
    vec3.scale(right, right, distance)
    vec3.add(this.position3D, this.position3D, right)
    this.updateTarget() // Update target after moving
  }

  // // Pitch (look up/down)
  // pitch(angleDegrees: number): void {
  //   const angleRadians = degreesToRadians(angleDegrees)
  //   const pitchQuat = quat.create()
  //   quat.setAxisAngle(pitchQuat, vec3.fromValues(1, 0, 0), angleRadians) // Rotate around local X-axis
  //   quat.multiply(this.rotation, pitchQuat, this.rotation) // Apply pitch
  //   quat.normalize(this.rotation, this.rotation)
  //   this.updateTarget()
  // }

  // // Yaw (look left/right)
  // yaw(angleDegrees: number): void {
  //   const angleRadians = degreesToRadians(angleDegrees)
  //   const yawQuat = quat.create()
  //   quat.setAxisAngle(yawQuat, vec3.fromValues(0, 1, 0), angleRadians) // Rotate around global Y-axis
  //   quat.multiply(this.rotation, yawQuat, this.rotation) // Apply yaw
  //   quat.normalize(this.rotation, this.rotation)
  //   this.updateTarget()
  // }

  // Override update_zoom to adjust FOV for first-person zoom
  update_zoom(delta: number): void {
    // Adjust FOV directly for a first-person "zoom" effect
    this.fov = Math.max(0.1, Math.min(Math.PI / 2, this.fov + delta * 0.01)) // Clamp FOV
  }

  // Disable or modify editor-specific camera controls
  pan(delta: vec2): void {
    // No panning in first-person camera
    console.warn('Pan is disabled for FirstPersonCamera.')
  }

  panTarget(delta: vec2): void {
    // No panning target in first-person camera
    console.warn('PanTarget is disabled for FirstPersonCamera.')
  }

  orbit(deltaX: number, deltaY: number, radius?: number): void {
    // No orbiting in first-person camera
    console.warn('Orbit is disabled for FirstPersonCamera.')
  }
}

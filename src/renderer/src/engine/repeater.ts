import { mat4, vec2, vec3 } from 'gl-matrix'
import { StImage } from './image'
import { Polygon, setupGradientBuffers } from './polygon'
import { TextRenderer } from './text'
import { createEmptyGroupTransform, Transform } from './transform'
import { fromNDC, toNDC, Vertex } from './vertex'
import { v4 as uuidv4 } from 'uuid'
import { WindowSize } from './camera'
import {
  PolyfillBindGroup,
  PolyfillBindGroupLayout,
  PolyfillBuffer,
  PolyfillDevice,
  PolyfillQueue
} from './polyfill'

export enum RepeatAnimationType {
  LightlyFloating = 'LightlyFloating',
  OrganicChimes = 'OrganicChimes'
}

// Types for repeat patterns
export type RepeatPattern = {
  count: number
  spacing: number
  direction: 'horizontal' | 'vertical' | 'circular' | 'grid'
  rotation?: number
  scale?: number
  fadeOut?: boolean
  animation?: RepeatAnimationType | null
}

export type RepeatableObject = Polygon | TextRenderer | StImage

export class RepeatInstance {
  transform: Transform | null = null
  bindGroup: PolyfillBindGroup | null = null
}

export class RepeatObject {
  id: string
  sourceObject: RepeatableObject
  pattern: RepeatPattern
  instances: RepeatInstance[]
  vertexBuffer: PolyfillBuffer | null = null
  indexBuffer: PolyfillBuffer | null = null
  hidden: boolean
  layer: number
  vertices: Vertex[] = []
  indices: number[] = []
  groupBindGroup: PolyfillBindGroup

  constructor(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    groupBindGroupLayout: PolyfillBindGroupLayout,
    sourceObject: RepeatableObject,
    pattern: RepeatPattern
  ) {
    this.id = uuidv4()
    this.sourceObject = sourceObject
    this.pattern = pattern
    this.instances = []
    this.hidden = false
    this.layer = sourceObject.layer

    if (!sourceObject.vertices || !sourceObject.indices) {
      return
    }

    this.vertexBuffer = device.createBuffer(
      {
        size: 65536,
        usage: process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      },
      ''
    )

    this.indexBuffer = device.createBuffer(
      {
        size: 65536,
        usage: process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
      },
      ''
    )

    queue.writeBuffer(
      this.vertexBuffer,
      0,
      new Float32Array(
        sourceObject.vertices.flatMap((v) => [
          ...v.position,
          ...v.tex_coords,
          ...v.color,
          ...v.gradient_coords,
          v.object_type
        ])
      )
    )
    queue.writeBuffer(this.indexBuffer, 0, new Uint32Array(sourceObject.indices))

    this.vertices = sourceObject.vertices
    this.indices = sourceObject.indices

    // Create transforms for each instance
    this.generateInstances(device, queue, windowSize, bindGroupLayout)

    // Copy the bind group from the source object
    // this.bindGroup = sourceObject.bindGroup; // not workable, need our own uniform per instance

    let [group_bind_group, group_transform] = createEmptyGroupTransform(
      device,
      groupBindGroupLayout,
      windowSize
    )

    this.groupBindGroup = group_bind_group
  }

  private generateInstances(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout
  ) {
    this.instances = []
    const baseTransform = this.sourceObject.transform

    switch (this.pattern.direction) {
      case 'horizontal':
        this.generateHorizontalInstances(device, queue, windowSize, bindGroupLayout, baseTransform)
        break
      case 'vertical':
        this.generateVerticalInstances(device, queue, windowSize, bindGroupLayout, baseTransform)
        break
      case 'circular':
        this.generateCircularInstances(device, queue, windowSize, bindGroupLayout, baseTransform)
        break
      case 'grid':
        this.generateGridInstances(device, queue, windowSize, bindGroupLayout, baseTransform)
        break
    }
  }

  private createBindGroup(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    bindGroupLayout: PolyfillBindGroupLayout,
    instance: RepeatInstance
  ): PolyfillBuffer {
    const identityMatrix = mat4.create()
    let uniformBuffer = device.createBuffer(
      {
        size: 64,
        usage:
          process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      },
      'uniformMatrix4fv'
    )

    if (process.env.NODE_ENV !== 'test') {
      new Float32Array(uniformBuffer.getMappedRange()).set(identityMatrix)
      // uniformBuffer.unmap();
    }

    // let sampler = device.createSampler({
    //   addressModeU: "clamp-to-edge",
    //   addressModeV: "clamp-to-edge",
    //   magFilter: "linear",
    //   minFilter: "linear",
    //   mipmapFilter: "linear",
    // });

    // instance.bindGroup = device.createBindGroup({
    //   layout: bindGroupLayout,
    //   entries: [
    //     { binding: 0, groupIndex: 3, resource: { pbuffer: uniformBuffer } }
    //     // { binding: 1, resource: this.sourceObject.textureView },
    //     // { binding: 2, resource: sampler },
    //   ]
    // })

    const textureSize = { width: 1, height: 1, depthOrArrayLayers: 1 }
    const texture = device.createTexture({
      label: 'Default White Texture',
      size: textureSize,
      // mipLevelCount: 1,
      // sampleCount: 1,
      // dimension: "2d",
      format: 'rgba8unorm',
      usage:
        process.env.NODE_ENV === 'test'
          ? 0
          : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    })
    const whitePixel = new Uint8Array([255, 255, 255, 255])
    queue.writeTexture(
      {
        texture,
        mipLevel: 0,
        origin: { x: 0, y: 0, z: 0 } //aspect: "all"
      },
      whitePixel,
      { offset: 0, bytesPerRow: 4, rowsPerImage: undefined },
      textureSize
    )
    let [gradient, gradientBuffer] = setupGradientBuffers(device, queue, null, undefined, null)

    instance.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          groupIndex: 1,
          resource: {
            pbuffer: uniformBuffer
          }
        },
        // { binding: 1, resource: this.textureView },
        { binding: 1, groupIndex: 1, resource: texture },
        // { binding: 2, resource: sampler },
        {
          binding: 0,
          groupIndex: 2,
          resource: {
            pbuffer: gradientBuffer
          }
        }
      ]
      // label: "Image Bind Group",
    })

    uniformBuffer.unmap()

    return uniformBuffer
  }

  private generateHorizontalInstances(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    baseTransform: Transform
  ) {
    for (let i = 0; i < this.pattern.count; i++) {
      let instance = new RepeatInstance()

      let uniformBuffer = this.createBindGroup(device, queue, bindGroupLayout, instance)

      let worldTransform = fromNDC(
        baseTransform.position[0],
        baseTransform.position[1],
        windowSize.width,
        windowSize.height
      )

      worldTransform.x = worldTransform.x + (i + 1) * this.pattern.spacing

      let systemTransform = toNDC(
        worldTransform.x,
        worldTransform.y,
        windowSize.width,
        windowSize.height
      )

      let position = vec3.fromValues(
        systemTransform.x,
        systemTransform.y,
        baseTransform.position[2]
      )

      console.info('repeat post ', this.pattern, position)

      let rotation = baseTransform.rotation + (this.pattern.rotation || 0) * i
      let scale = vec2.scale(
        vec2.create(),
        baseTransform.scale,
        this.pattern.scale ? Math.pow(this.pattern.scale, i) : 1
      )

      const transform = new Transform(position, rotation, scale, uniformBuffer)

      transform.layer = this.layer

      instance.transform = transform

      instance.transform.updateUniformBuffer(queue, windowSize)

      this.instances.push(instance)
    }
  }

  private generateVerticalInstances(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    baseTransform: Transform
  ) {
    for (let i = 0; i < this.pattern.count; i++) {
      let instance = new RepeatInstance()

      let uniformBuffer = this.createBindGroup(device, queue, bindGroupLayout, instance)

      // let position = vec3.fromValues(
      //   baseTransform.position[0],
      //   baseTransform.position[1] + i * this.pattern.spacing,
      //   baseTransform.position[2]
      // )

      let worldTransform = fromNDC(
        baseTransform.position[0],
        baseTransform.position[1],
        windowSize.width,
        windowSize.height
      )

      worldTransform.y = worldTransform.y + (i + 1) * this.pattern.spacing

      let systemTransform = toNDC(
        worldTransform.x,
        worldTransform.y,
        windowSize.width,
        windowSize.height
      )

      let position = vec3.fromValues(
        systemTransform.x,
        systemTransform.y,
        baseTransform.position[2]
      )

      let rotation = baseTransform.rotation + (this.pattern.rotation || 0) * i
      let scale = vec2.scale(
        vec2.create(),
        baseTransform.scale,
        this.pattern.scale ? Math.pow(this.pattern.scale, i) : 1
      )

      const transform = new Transform(position, rotation, scale, uniformBuffer)

      transform.layer = this.layer

      instance.transform = transform

      instance.transform.updateUniformBuffer(queue, windowSize)

      this.instances.push(instance)
    }
  }

  private generateCircularInstances(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    baseTransform: Transform
  ) {
    const radius = this.pattern.spacing
    const angleStep = (2 * Math.PI) / this.pattern.count

    for (let i = 0; i < this.pattern.count; i++) {
      let instance = new RepeatInstance()

      let uniformBuffer = this.createBindGroup(device, queue, bindGroupLayout, instance)

      const angle = i * angleStep

      // let position = vec3.fromValues(
      //   baseTransform.position[0] + radius * Math.cos(angle),
      //   baseTransform.position[1] + radius * Math.sin(angle),
      //   baseTransform.position[2]
      // )

      let worldTransform = fromNDC(
        baseTransform.position[0],
        baseTransform.position[1],
        windowSize.width,
        windowSize.height
      )

      worldTransform.x = worldTransform.x + radius * Math.cos(angle)
      worldTransform.y = worldTransform.y + radius * Math.sin(angle)

      let systemTransform = toNDC(
        worldTransform.x,
        worldTransform.y,
        windowSize.width,
        windowSize.height
      )

      let position = vec3.fromValues(
        systemTransform.x,
        systemTransform.y,
        baseTransform.position[2]
      )

      let rotation = baseTransform.rotation + angle + (this.pattern.rotation || 0)
      let scale = vec2.scale(
        vec2.create(),
        baseTransform.scale,
        this.pattern.scale ? Math.pow(this.pattern.scale, i) : 1
      )

      const transform = new Transform(position, rotation, scale, uniformBuffer)

      transform.layer = this.layer

      instance.transform = transform

      instance.transform.updateUniformBuffer(queue, windowSize)

      this.instances.push(instance)
    }
  }

  private generateGridInstances(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    baseTransform: Transform
  ) {
    const gridSize = Math.ceil(Math.sqrt(this.pattern.count))
    let instanceCount = 0

    for (let y = 0; y < gridSize && instanceCount < this.pattern.count; y++) {
      for (let x = 0; x < gridSize && instanceCount < this.pattern.count; x++) {
        let instance = new RepeatInstance()

        let uniformBuffer = this.createBindGroup(device, queue, bindGroupLayout, instance)

        // let position = vec3.fromValues(
        //   baseTransform.position[0] + x * this.pattern.spacing,
        //   baseTransform.position[1] + y * this.pattern.spacing,
        //   baseTransform.position[2]
        // )

        let worldTransform = fromNDC(
          baseTransform.position[0],
          baseTransform.position[1],
          windowSize.width,
          windowSize.height
        )

        worldTransform.x = worldTransform.x + x * this.pattern.spacing
        worldTransform.y = worldTransform.y + y * this.pattern.spacing

        let systemTransform = toNDC(
          worldTransform.x,
          worldTransform.y,
          windowSize.width,
          windowSize.height
        )

        let position = vec3.fromValues(
          systemTransform.x,
          systemTransform.y,
          baseTransform.position[2]
        )

        let rotation = baseTransform.rotation + (this.pattern.rotation || 0) * instanceCount
        let scale = vec2.scale(
          vec2.create(),
          baseTransform.scale,
          this.pattern.scale ? Math.pow(this.pattern.scale, instanceCount) : 1
        )

        const transform = new Transform(position, rotation, scale, uniformBuffer)

        transform.layer = this.layer

        instance.transform = transform

        instance.transform.updateUniformBuffer(queue, windowSize)

        this.instances.push(instance)

        instanceCount++
      }
    }
  }

  updatePattern(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    newPattern: Partial<RepeatPattern>
  ) {
    this.pattern = { ...this.pattern, ...newPattern }
    this.generateInstances(device, queue, windowSize, bindGroupLayout)
  }

  /**
   * 3. Animate each instance based on the current time and the animation step function.
   * @param currentTimeMs The current time in milliseconds.
   * @param queue The PolyfillQueue for updating uniform buffers.
   * @param windowSize The current window size.
   */
  animationStep(currentTimeMs: number, queue: PolyfillQueue, windowSize: WindowSize) {
    if (!this.pattern.animation) {
      return // No animation defined
    }

    // Normalize time to a [0, 1] range over a 3000ms loop
    const loopDurationMs = 3000
    const normalizedTime = (currentTimeMs % loopDurationMs) / loopDurationMs

    let animatedInstances = [...this.instances, this.sourceObject]

    animatedInstances.forEach((instance, index) => {
      if (!instance.transform) return

      let animationFn: AnimationStep = null

      switch (this.pattern.animation) {
        case RepeatAnimationType.OrganicChimes:
          animationFn = organicChimesEffect
          break

        case RepeatAnimationType.LightlyFloating:
          animationFn = lightFloatingEffect
          break

        default:
          break
      }

      if (!animationFn) {
        return
      }

      const animationUpdates = animationFn(currentTimeMs, index)
      const transform = instance.transform

      // Apply position offset
      if (animationUpdates.positionOffset) {
        vec3.add(transform.position, transform.startPosition, animationUpdates.positionOffset)
      } else {
        vec3.copy(transform.position, transform.startPosition) // Reset to base if no offset
      }

      let baseRotation = 0

      // Apply rotation offset
      if (animationUpdates.rotationOffset !== undefined) {
        transform.rotation = baseRotation + animationUpdates.rotationOffset
      } else {
        transform.rotation = baseRotation // Reset to base if no offset
      }

      let baseScale = vec2.fromValues(1, 1)

      // Apply scale offset (requires vec2 for addition/multiplication)
      if (animationUpdates.scaleOffset) {
        // Assuming additive scale offset here: scale = baseScale + scaleOffset
        vec2.add(transform.scale, baseScale, animationUpdates.scaleOffset)
      } else {
        vec2.copy(transform.scale, baseScale) // Reset to base if no offset
      }

      // Update the uniform buffer with the new transform
      // transform.updateUniformBuffer(queue, windowSize) // this runs in the pipeline during playback
    })
  }
}

export class RepeatManager {
  private repeatedObjects: Map<string, RepeatObject>

  constructor() {
    this.repeatedObjects = new Map()
  }

  createRepeatObject(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    groupBindGroupLayout: PolyfillBindGroupLayout,
    sourceObject: RepeatableObject,
    pattern: RepeatPattern
  ): RepeatObject {
    const repeatObject = new RepeatObject(
      device,
      queue,
      windowSize,
      bindGroupLayout,
      groupBindGroupLayout,
      sourceObject,
      pattern
    )
    this.repeatedObjects.set(sourceObject.id, repeatObject)
    return repeatObject
  }

  updateRepeatObject(
    device: PolyfillDevice,
    queue: PolyfillQueue,
    windowSize: WindowSize,
    bindGroupLayout: PolyfillBindGroupLayout,
    id: string,
    newPattern: Partial<RepeatPattern>
  ): RepeatObject | null {
    const repeatObject = this.repeatedObjects.get(id)

    if (repeatObject) {
      repeatObject.updatePattern(device, queue, windowSize, bindGroupLayout, newPattern)

      return repeatObject
    } else {
      console.warn('Repeat object does not exist')
    }

    return null
  }

  deleteRepeatObject(id: string): boolean {
    return this.repeatedObjects.delete(id)
  }

  getRepeatObject(id: string): RepeatObject | null {
    return this.repeatedObjects.get(id) || null
  }

  getAllRepeatObjects(): RepeatObject[] {
    return Array.from(this.repeatedObjects.values())
  }
}

/**
 * An animation step function that takes the current time in milliseconds
 * and the instance index, and returns an object of transform updates.
 *
 * @param currentTimeMs The current time in milliseconds (loops every 3000ms).
 * @param instanceIndex The index of the current instance.
 * @returns An object containing changes to position, rotation, or scale.
 */
export type AnimationStep = (
  currentTimeMs: number,
  instanceIndex: number
) => {
  positionOffset?: vec3
  rotationOffset?: number
  scaleOffset?: vec2
}

/**
 * Animation Step Function: Light Floating Effect (Sine Wave)
 * @param currentTimeMs Current time in milliseconds.
 * @param instanceIndex Index of the repeating instance.
 * @returns { positionOffset: vec3 }
 */
export const lightFloatingEffect: AnimationStep = (currentTimeMs, instanceIndex) => {
  const loopDurationMs = 4000 // Slow, gentle cycle
  const time = (currentTimeMs % loopDurationMs) / loopDurationMs // Normalized [0, 1]

  // Seeded pseudo-random phase shift (consistent per instance)
  const seed = instanceIndex + 1
  const random = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453
  const phaseShift = (random - Math.floor(random)) * Math.PI * 2 // Random value [0, 2π]

  // Simple up and down motion
  const verticalOffset = Math.sin(time * 2 * Math.PI + phaseShift) * 0.012

  return {
    positionOffset: vec3.fromValues(0, verticalOffset, 0)
  }
}

/**
 * Animation Step Function: Light Floating Effect (Sine Wave)
 * @param currentTimeMs Current time in milliseconds.
 * @param instanceIndex Index of the repeating instance.
 * @returns { positionOffset: vec3 }
 */
export const organicChimesEffect: AnimationStep = (currentTimeMs, instanceIndex) => {
  const loopDurationMs = 2500 // Slightly faster for more life
  const time = (currentTimeMs % loopDurationMs) / loopDurationMs // Normalized [0, 1]
  const phaseShift = instanceIndex * 0.3 // More stagger for variety

  // Primary bob (main up/down motion)
  const primaryBob = Math.sin(time * 2 * Math.PI + phaseShift) * 0.015

  // Secondary bob (adds natural irregularity)
  const secondaryBob = Math.sin(time * 4 * Math.PI + phaseShift * 0.5) * 0.005

  // Gentle sway (subtle horizontal drift)
  const horizontalSway = Math.sin(time * 2 * Math.PI * 0.6 + phaseShift) * 0.008

  const verticalOffset = primaryBob + secondaryBob
  const horizontalOffset = horizontalSway

  return {
    positionOffset: vec3.fromValues(horizontalOffset, verticalOffset, 0)
  }
}

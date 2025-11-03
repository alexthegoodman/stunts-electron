import { mat4, vec2, vec3 } from 'gl-matrix'
import { Camera, WindowSize } from './camera'
import { BoundingBox, CANVAS_HORIZ_OFFSET, CANVAS_VERT_OFFSET, Point } from './editor'
import { createEmptyGroupTransform, matrix4ToRawArray, Transform } from './transform'
import { createVertex, getZLayer, Vertex, vertexByteSize } from './vertex'
import { BackgroundFill, GradientDefinition, ObjectType } from './animations'
import {
  PolyfillBindGroup,
  PolyfillBindGroupLayout,
  PolyfillBuffer,
  PolyfillDevice,
  PolyfillQueue
} from './polyfill'
import { setupGradientBuffers } from './polygon'
import { ShaderThemeConfig } from './shader_themes'

export interface Torus3DConfig {
  id: string
  name: string
  radius: number
  tubeRadius: number
  position: Point
  rotation: [number, number, number] // Euler angles [x, y, z]
  backgroundFill: BackgroundFill
  layer: number
  segments?: number // Optional: defaults to 32
}

export class Torus3D {
  id: string
  name: string
  radius: number
  tubeRadius: number
  position: Point
  rotation: [number, number, number]
  backgroundFill: BackgroundFill
  layer: number
  layerSpacing: number
  segments: number
  hidden: boolean
  objectType: ObjectType

  vertices: Vertex[]
  indices: number[]
  vertexBuffer: PolyfillBuffer
  indexBuffer: PolyfillBuffer
  bindGroup: PolyfillBindGroup
  groupBindGroup: PolyfillBindGroup
  transform: Transform
  currentSequenceId: string

  gradient?: GradientDefinition
  gradientBuffer?: PolyfillBuffer
  gradientBindGroup?: PolyfillBindGroup
  timeOffset: number = 0

  constructor(
    windowSize: WindowSize,
    device: PolyfillDevice,
    queue: PolyfillQueue,
    bindGroupLayout: PolyfillBindGroupLayout,
    groupBindGroupLayout: PolyfillBindGroupLayout,
    camera: Camera,
    config: Torus3DConfig,
    currentSequenceId: string
  ) {
    this.id = config.id
    this.name = config.name
    this.radius = config.radius
    this.tubeRadius = config.tubeRadius
    this.position = {
      x: CANVAS_HORIZ_OFFSET + config.position.x,
      y: CANVAS_VERT_OFFSET + config.position.y
    }
    this.rotation = config.rotation
    this.backgroundFill = config.backgroundFill
    this.layer = config.layer
    this.layerSpacing = 0.001
    this.segments = config.segments || 32
    this.hidden = false
    this.objectType = ObjectType.Torus3D // This will need to be added to the enum
    this.currentSequenceId = currentSequenceId

    this.initialize(
      windowSize,
      device,
      queue,
      bindGroupLayout,
      groupBindGroupLayout,
      config,
      currentSequenceId
    )
  }

  initialize(
    windowSize: WindowSize,
    device: PolyfillDevice,
    queue: PolyfillQueue,
    bindGroupLayout: PolyfillBindGroupLayout,
    groupBindGroupLayout: PolyfillBindGroupLayout,
    config: Torus3DConfig,
    currentSequenceId: string
  ) {
    // Generate torus geometry
    const [vertices, indices] = this.generateTorusGeometry()
    this.vertices = vertices
    this.indices = indices

    // Create vertex buffer
    this.vertexBuffer = device.createBuffer(
      {
        label: 'Torus3D Vertex Buffer',
        size: vertices.length * vertexByteSize,
        usage: process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      },
      ''
    )

    const vertexData = new Float32Array(vertices.length * (3 + 2 + 4 + 2 + 1))
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 0] = v.position[0]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 1] = v.position[1]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 2] = v.position[2]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 3] = v.tex_coords[0]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 4] = v.tex_coords[1]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 5] = v.color[0]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 6] = v.color[1]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 7] = v.color[2]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 8] = v.color[3]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 9] = v.gradient_coords[0]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 10] = v.gradient_coords[1]
      vertexData[i * (3 + 2 + 4 + 2 + 1) + 11] = v.object_type
    }

    queue.writeBuffer(this.vertexBuffer, 0, vertexData.buffer)

    // Create index buffer
    this.indexBuffer = device.createBuffer(
      {
        label: 'Torus3D Index Buffer',
        size: indices.length * Uint32Array.BYTES_PER_ELEMENT,
        usage: process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
      },
      ''
    )
    queue.writeBuffer(this.indexBuffer, 0, new Uint32Array(indices).buffer)

    // Create uniform buffer
    const emptyMatrix = mat4.create()
    const rawMatrix = matrix4ToRawArray(emptyMatrix)

    const uniformBuffer = device.createBuffer(
      {
        label: 'Torus3D Uniform Buffer',
        size: rawMatrix.byteLength,
        usage:
          process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      },
      'uniformMatrix4fv'
    )

    if (process.env.NODE_ENV !== 'test') {
      new Float32Array(uniformBuffer.getMappedRange()).set(rawMatrix)
      uniformBuffer.unmap()
    }

    // Create texture
    const textureSize = { width: 1, height: 1, depthOrArrayLayers: 1 }
    const texture = device.createTexture({
      label: 'Torus3D Texture',
      size: textureSize,
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
        origin: { x: 0, y: 0, z: 0 }
      },
      whitePixel,
      { offset: 0, bytesPerRow: 4, rowsPerImage: undefined },
      textureSize
    )

    let gradientDef = null
    let shaderConfig = null

    if (config.backgroundFill.type === 'Gradient') {
      gradientDef = config.backgroundFill.value
    } else if (config.backgroundFill.type === 'Shader') {
      shaderConfig = config.backgroundFill.value
    }

    let [gradient, gradientBuffer] = setupGradientBuffers(
      device,
      queue,
      gradientDef,
      undefined,
      shaderConfig
    )

    if (config.backgroundFill.type) {
      this.gradient = gradient
      this.timeOffset = 0
      this.gradientBuffer = gradientBuffer
    }

    // Create bind group
    this.bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          groupIndex: 1,
          resource: {
            pbuffer: uniformBuffer
          }
        },
        { binding: 1, groupIndex: 1, resource: texture },
        {
          binding: 0,
          groupIndex: 2,
          resource: {
            pbuffer: gradientBuffer
          }
        }
      ]
    })

    // Create transform
    this.transform = new Transform(
      vec3.fromValues(this.position.x, this.position.y, this.position.z ?? 0),
      0, // 2D rotation (we'll handle 3D rotation separately)
      vec2.fromValues(1, 1),
      uniformBuffer
    )

    this.transform.updateRotationXDegrees(this.rotation[0])
    this.transform.updateRotationYDegrees(this.rotation[1])
    this.transform.updateRotationDegrees(this.rotation[2])
    this.transform.layer = (getZLayer(config.layer) as number) - 0.5
    this.transform.updateUniformBuffer(queue, windowSize)

    // Create group bind group
    let [tmp_group_bind_group, tmp_group_transform] = createEmptyGroupTransform(
      device,
      groupBindGroupLayout,
      windowSize
    )
    this.groupBindGroup = tmp_group_bind_group
  }

  private generateTorusGeometry(): [Vertex[], number[]] {
    const vertices: Vertex[] = []
    const indices: number[] = []
    const majorSegments = this.segments
    const minorSegments = this.segments

    let color: [number, number, number, number] = [1, 1, 1, 1]
    if (this.backgroundFill.type === 'Color') {
      color = this.backgroundFill.value
    }

    for (let i = 0; i <= majorSegments; i++) {
      const majorAngle = (i / majorSegments) * 2 * Math.PI
      const cosMajor = Math.cos(majorAngle)
      const sinMajor = Math.sin(majorAngle)

      for (let j = 0; j <= minorSegments; j++) {
        const minorAngle = (j / minorSegments) * 2 * Math.PI
        const cosMinor = Math.cos(minorAngle)
        const sinMinor = Math.sin(minorAngle)

        const x = (this.radius + this.tubeRadius * cosMinor) * cosMajor
        const y = this.tubeRadius * sinMinor
        const z = (this.radius + this.tubeRadius * cosMinor) * sinMajor

        const u = i / majorSegments
        const v = j / minorSegments

        vertices.push({
          position: [x, y, z],
          tex_coords: [u, v],
          color: color,
          gradient_coords: [u, v],
          object_type: 7 // Will need to add Torus3D to ObjectType enum
        })
      }
    }

    for (let i = 0; i < majorSegments; i++) {
      for (let j = 0; j < minorSegments; j++) {
        const first = i * (minorSegments + 1) + j
        const second = first + minorSegments + 1

        indices.push(first, second, first + 1)
        indices.push(second, second + 1, first + 1)
      }
    }

    return [vertices, indices]
  }

  updateOpacity(queue: PolyfillQueue, opacity: number) {
    let new_color: [number, number, number, number] = [1, 1, 1, opacity]
    if (this.backgroundFill.type === 'Color') {
      new_color = [
        this.backgroundFill.value[0],
        this.backgroundFill.value[1],
        this.backgroundFill.value[2],
        opacity
      ]
    }

    this.vertices.forEach((v) => {
      v.color = new_color
    })

    queue.writeBuffer(
      this.vertexBuffer,
      0,
      new Float32Array(
        this.vertices.flatMap((v) => [
          ...v.position,
          ...v.tex_coords,
          ...v.color,
          ...v.gradient_coords,
          v.object_type
        ])
      )
    )
  }

  updateLayer(layer: number) {
    let layer_index = getZLayer(layer, this.layerSpacing)
    this.layer = layer
    this.transform.layer = layer_index as number
  }
}

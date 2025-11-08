import { mat4, vec2, vec3 } from 'gl-matrix'
import { Camera3D } from './3dcamera'
import { WindowSize } from './camera'
import {
  PolyfillBindGroup,
  PolyfillBindGroupLayout,
  PolyfillBuffer,
  PolyfillDevice,
  PolyfillQueue
} from './polyfill'
import { createEmptyGroupTransform, matrix4ToRawArray, Transform } from './transform'
import { getZLayer, Vertex, vertexByteSize, vertexOffset } from './vertex'
import { VoxelConfig } from './voxel'
import { setupGradientBuffers } from './polygon'
import { Point } from './editor'

export default class VoxelCache {
  id: string
  name: string
  position: Point
  rotation: [number, number, number]
  vertexBuffer: PolyfillBuffer
  indexBuffer: PolyfillBuffer
  bindGroup: PolyfillBindGroup
  groupBindGroup: PolyfillBindGroup
  transform: Transform

  vertexCache: Vertex[] = []
  indiceCache: number[] = []

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
  }

  after_vertex_restored(
    windowSize: WindowSize,
    device: PolyfillDevice,
    queue: PolyfillQueue,
    bindGroupLayout: PolyfillBindGroupLayout,
    groupBindGroupLayout: PolyfillBindGroupLayout,
    camera: Camera3D,
    currentSequenceId: string
  ) {
    // this.id = config.id
    //     this.name = config.name
    //     this.dimensions = config.dimensions
    //     this.position = {
    //       x: CANVAS_HORIZ_OFFSET + config.position.x,
    //       y: CANVAS_VERT_OFFSET + config.position.y,
    //       z: config.position.z
    //     }
    //     this.rotation = config.rotation
    //     this.backgroundFill = config.backgroundFill
    //     this.originalBackgroundFill = { ...config.backgroundFill } // Store a copy of the original
    //     this.layer = config.layer
    //     this.layerSpacing = 0.001
    //     this.hidden = false
    //     this.objectType = ObjectType.Cube3D // Using Cube3D object type for now
    //     this.currentSequenceId = currentSequenceId
    //     this.voxelType = config.voxelType

    //     // Generate cube geometry
    //     const [vertices, indices] = this.generateCubeGeometry()
    //     this.vertices = vertices
    //     this.indices = indices

    // Create vertex buffer
    this.vertexBuffer = device.createBuffer(
      {
        label: 'Voxel Vertex Buffer',
        size: this.vertexCache.length * vertexByteSize,
        usage: process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      },
      ''
    )

    const vertexData = new Float32Array(this.vertexCache.length * vertexOffset)
    for (let i = 0; i < this.vertexCache.length; i++) {
      const v = this.vertexCache[i]
      vertexData[i * vertexOffset + 0] = v.position[0]
      vertexData[i * vertexOffset + 1] = v.position[1]
      vertexData[i * vertexOffset + 2] = v.position[2]
      vertexData[i * vertexOffset + 3] = v.tex_coords[0]
      vertexData[i * vertexOffset + 4] = v.tex_coords[1]
      vertexData[i * vertexOffset + 5] = v.color[0]
      vertexData[i * vertexOffset + 6] = v.color[1]
      vertexData[i * vertexOffset + 7] = v.color[2]
      vertexData[i * vertexOffset + 8] = v.color[3]
      vertexData[i * vertexOffset + 9] = v.gradient_coords[0]
      vertexData[i * vertexOffset + 10] = v.gradient_coords[1]
      vertexData[i * vertexOffset + 11] = v.object_type
      vertexData[i * vertexOffset + 12] = v.normal[0]
      vertexData[i * vertexOffset + 13] = v.normal[1]
      vertexData[i * vertexOffset + 14] = v.normal[2]
    }

    queue.writeBuffer(this.vertexBuffer, 0, vertexData.buffer)

    // Create index buffer
    this.indexBuffer = device.createBuffer(
      {
        label: 'Voxel Index Buffer',
        size: this.indiceCache.length * Uint32Array.BYTES_PER_ELEMENT,
        usage: process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
      },
      ''
    )
    queue.writeBuffer(this.indexBuffer, 0, new Uint32Array(this.indiceCache).buffer)

    // Create uniform buffer
    const emptyMatrix = mat4.create()
    const rawMatrix = matrix4ToRawArray(emptyMatrix)

    const uniformBuffer = device.createBuffer(
      {
        label: 'Voxel Uniform Buffer',
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
      label: 'Voxel Texture',
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

    // Setup gradient
    let [gradient, gradientBuffer] = setupGradientBuffers(device, queue, null)

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
      // vec3.fromValues(this.position.x, this.position.y, this.position.z ?? 0),
      vec3.fromValues(0, 0, 0), // now hardcoding position as individual voxels dont move
      0, // 2D rotation (we'll handle 3D rotation separately)
      vec2.fromValues(1, 1),
      uniformBuffer
    )

    // this.transform.updateRotationXDegrees(this.rotation[0])
    // this.transform.updateRotationYDegrees(this.rotation[1])
    // this.transform.updateRotationDegrees(this.rotation[2])
    // this.transform.layer = (getZLayer(1) as number) - 0.5
    this.transform.updateUniformBuffer(queue, camera.windowSize)

    // Create group bind group
    let [tmp_group_bind_group, tmp_group_transform] = createEmptyGroupTransform(
      device,
      groupBindGroupLayout,
      windowSize
    )
    this.groupBindGroup = tmp_group_bind_group
  }
}

import { mat4, vec2, vec3 } from 'gl-matrix'
import { Camera, WindowSize } from './camera'
import { BoundingBox, CANVAS_HORIZ_OFFSET, CANVAS_VERT_OFFSET, Point } from './editor'
import { createEmptyGroupTransform, matrix4ToRawArray, Transform } from './transform'
import { createVertex, getZLayer, Vertex, vertexByteSize } from './vertex'
import { BackgroundFill, ObjectType } from './animations'
import {
  PolyfillBindGroup,
  PolyfillBindGroupLayout,
  PolyfillBuffer,
  PolyfillDevice,
  PolyfillQueue
} from './polyfill'
import { setupGradientBuffers } from './polygon'
import { GLTFLoader, postProcessGLTF } from '@loaders.gl/gltf'
import { load } from '@loaders.gl/core'

export interface Model3DConfig {
  id: string
  name: string
  path: string // URL to the GLB file
  position: Point
  rotation: [number, number, number] // Euler angles [x, y, z]
  scale: [number, number, number] // Scale [x, y, z]
  backgroundFill: BackgroundFill
  layer: number
}

export interface SavedModel3DConfig {
  id: string
  name: string
  path: string
  position: Point
  rotation: [number, number, number]
  scale: [number, number, number]
  backgroundFill: BackgroundFill
  layer: number
}

export class Model3D {
  id: string
  name: string
  path: string
  position: Point
  rotation: [number, number, number]
  scale: [number, number, number]
  backgroundFill: BackgroundFill
  layer: number
  layerSpacing: number
  hidden: boolean
  objectType: ObjectType

  vertices: Vertex[]
  // indices: number[]
  indices: Uint32Array<ArrayBufferLike>
  vertexBuffer: PolyfillBuffer
  indexBuffer: PolyfillBuffer
  bindGroup: PolyfillBindGroup
  groupBindGroup: PolyfillBindGroup
  transform: Transform
  currentSequenceId: string

  private constructor(
    windowSize: WindowSize,
    device: PolyfillDevice,
    queue: PolyfillQueue,
    bindGroupLayout: PolyfillBindGroupLayout,
    groupBindGroupLayout: PolyfillBindGroupLayout,
    camera: Camera,
    config: Model3DConfig,
    currentSequenceId: string,
    vertices: Vertex[],
    // indices: number[],
    indices32: Uint32Array<ArrayBufferLike>,
    textureImage: ImageData | null
  ) {
    this.id = config.id
    this.name = config.name
    this.path = config.path
    this.position = {
      x: CANVAS_HORIZ_OFFSET + config.position.x,
      y: CANVAS_VERT_OFFSET + config.position.y,
      z: config.position.z
    }
    this.rotation = config.rotation
    this.scale = config.scale
    this.backgroundFill = config.backgroundFill
    this.layer = config.layer
    this.layerSpacing = 0.001
    this.hidden = false
    this.objectType = ObjectType.Model3D
    this.currentSequenceId = currentSequenceId

    this.vertices = vertices
    this.indices = indices32

    const vertexSize = vertices.length * vertexByteSize * 100

    console.info('Model3D vertices count ', this.vertices.length, this.indices.length)
    console.info('vertices ', this.vertices.slice(100, 150), this.indices.slice(0, 10))
    // const maxIndex = Math.max(...indices)
    // console.log('Max index:', maxIndex)

    // Create vertex buffer
    this.vertexBuffer = device.createBuffer(
      {
        label: 'Model3D Vertex Buffer',
        size: vertexSize,
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
        label: 'Model3D Index Buffer',
        size: indices32.length * Uint32Array.BYTES_PER_ELEMENT * 100,
        usage: process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
      },
      ''
    )

    // console.info('set indicies', new Uint32Array(indices))

    queue.writeBuffer(this.indexBuffer, 0, indices32)

    // Create uniform buffer
    const emptyMatrix = mat4.create()
    const rawMatrix = matrix4ToRawArray(emptyMatrix)

    const uniformBuffer = device.createBuffer(
      {
        label: 'Model3D Uniform Buffer',
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
    let textureSize: { width: number; height: number; depthOrArrayLayers: number }
    let textureData: Uint8Array

    if (textureImage) {
      // Use the GLB texture
      textureSize = {
        width: textureImage.width,
        height: textureImage.height,
        depthOrArrayLayers: 1
      }
      textureData = new Uint8Array(textureImage.data.buffer)
      console.info('using glb texture')
    } else {
      // Fallback to white pixel
      textureSize = { width: 1, height: 1, depthOrArrayLayers: 1 }
      textureData = new Uint8Array([255, 255, 255, 255])
    }

    const texture = device.createTexture({
      label: 'Model3D Texture',
      size: textureSize,
      format: 'rgba8unorm',
      usage:
        process.env.NODE_ENV === 'test'
          ? 0
          : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    })

    queue.writeTexture(
      {
        texture,
        mipLevel: 0,
        origin: { x: 0, y: 0, z: 0 }
      },
      textureData,
      { offset: 0, bytesPerRow: textureSize.width * 4, rowsPerImage: textureSize.height },
      textureSize
    )

    // Setup gradient
    let [gradient, gradientBuffer] = setupGradientBuffers(
      device,
      queue,
      config.backgroundFill.type === 'Gradient' ? config.backgroundFill.value : null
    )

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
      vec2.fromValues(this.scale[0], this.scale[1]),
      uniformBuffer
    )

    this.transform.updateRotationXDegrees(this.rotation[0])
    this.transform.updateRotationYDegrees(this.rotation[1])
    this.transform.updateRotationDegrees(this.rotation[2])
    this.transform.layer = (getZLayer(config.layer) as number) - 0.5
    this.transform.updateUniformBuffer(queue, camera.windowSize)

    // Create group bind group
    let [tmp_group_bind_group, tmp_group_transform] = createEmptyGroupTransform(
      device,
      groupBindGroupLayout,
      windowSize
    )
    this.groupBindGroup = tmp_group_bind_group
  }

  static async create(
    windowSize: WindowSize,
    device: PolyfillDevice,
    queue: PolyfillQueue,
    bindGroupLayout: PolyfillBindGroupLayout,
    groupBindGroupLayout: PolyfillBindGroupLayout,
    camera: Camera,
    config: Model3DConfig,
    currentSequenceId: string,
    modelData: ArrayBuffer
  ): Promise<Model3D> {
    // Parse the GLB model first
    const [vertices, indices32, textureImage] = await Model3D.parseGLBModel(
      modelData,
      config.backgroundFill
    )

    // Create the instance
    return new Model3D(
      windowSize,
      device,
      queue,
      bindGroupLayout,
      groupBindGroupLayout,
      camera,
      config,
      currentSequenceId,
      vertices,
      indices32,
      textureImage
    )
  }

  private static async parseGLBModel(
    modelData: ArrayBuffer,
    backgroundFill: BackgroundFill
  ): Promise<[Vertex[], Uint32Array, ImageData | null]> {
    const vertices: Vertex[] = []
    const indices: number[] = []
    let textureImage: ImageData | null = null

    try {
      // Use the official @loaders.gl/gltf loader
      const gltfData = await load(modelData, GLTFLoader)

      // Post-process the GLTF to properly decode all buffer data
      const gltf = postProcessGLTF(gltfData)

      // Get color from fill
      const color: [number, number, number, number] =
        backgroundFill.type === 'Color' ? backgroundFill.value : [0.7, 0.7, 0.75, 1.0]

      if (gltf.materials && gltf.materials.length > 0) {
        const material = gltf.materials[0]
        if (material.pbrMetallicRoughness?.baseColorTexture) {
          const textureIndex = material.pbrMetallicRoughness.baseColorTexture.index
          const texture = gltf.textures?.[textureIndex]
          if (texture?.source !== undefined) {
            const imageData = texture.source.image
            // loaders.gl provides the image as an ImageBitmap or HTMLImageElement
            if (imageData instanceof ImageBitmap || imageData instanceof HTMLImageElement) {
              // Convert to ImageData using OffscreenCanvas
              const canvas = new OffscreenCanvas(imageData.width, imageData.height)
              const ctx = canvas.getContext('2d')
              if (ctx) {
                // console.info('draw texture', texture)
                ctx.drawImage(imageData, 0, 0)
                textureImage = ctx.getImageData(0, 0, canvas.width, canvas.height)
              }
            }
          }
        }
      }

      // Process all meshes
      if (gltf.meshes && gltf.meshes.length > 0) {
        for (const mesh of gltf.meshes) {
          if (!mesh.primitives) continue

          for (const primitive of mesh.primitives) {
            console.info('primitive', primitive)
            const attributes = primitive.attributes
            const startIndex = vertices.length

            // Get position data - need to get from accessors and bufferViews
            const positionAccessorIndex = attributes.POSITION.value

            const positions = new Float32Array(positionAccessorIndex.buffer)

            // console.info('positions', positions)

            const texcoordAccessor = attributes.TEXCOORD_0.value

            const texcoords = new Float32Array(texcoordAccessor.buffer)

            // Create vertices
            // const vertexCount = positionAccessor.count
            const vertexCount = positionAccessorIndex.length

            for (let i = 0; i < vertexCount; i++) {
              const px = positions[i * 3]
              const py = positions[i * 3 + 1]
              const pz = positions[i * 3 + 2]

              const u = texcoords ? texcoords[i * 2] : 0
              const v = texcoords ? texcoords[i * 2 + 1] : 0

              vertices.push({
                position: [px, py, pz],
                tex_coords: [u, v],
                color: color,
                gradient_coords: [u, v],
                object_type: 10
              })
            }

            const indicesAccessor = primitive.indices.value

            const indices = new Uint32Array(indicesAccessor.buffer)

            return [vertices, indices, textureImage]
          }
        }
      }

      if (vertices.length === 0) {
        console.warn('No vertices found in GLB, using fallback geometry')
        const [fallbackVertices, fallbackIndices] = Model3D.getFallbackGeometry(backgroundFill)
        return [fallbackVertices, new Uint32Array(), null]
      }

      return [vertices, new Uint32Array(), textureImage]
    } catch (error) {
      console.error('Error parsing GLB model:', error)
      const [fallbackVertices, fallbackIndices] = Model3D.getFallbackGeometry(backgroundFill)
      return [fallbackVertices, new Uint32Array(), null]
    }
  }

  private static getFallbackGeometry(backgroundFill: BackgroundFill): [Vertex[], number[]] {
    // Return a simple cube as fallback
    const vertices: Vertex[] = []
    const indices: number[] = []

    const w = 0.5,
      h = 0.5,
      d = 0.5
    const hw = w / 2,
      hh = h / 2,
      hd = d / 2

    const color: [number, number, number, number] =
      backgroundFill.type === 'Color' ? backgroundFill.value : [0.7, 0.7, 0.75, 1.0]

    const positions: [number, number, number][] = [
      [-hw, -hh, hd],
      [hw, -hh, hd],
      [hw, hh, hd],
      [-hw, hh, hd],
      [-hw, -hh, -hd],
      [hw, -hh, -hd],
      [hw, hh, -hd],
      [-hw, hh, -hd]
    ]

    const faces = [
      { indices: [0, 1, 2, 0, 2, 3] }, // Front
      { indices: [5, 4, 7, 5, 7, 6] }, // Back
      { indices: [3, 2, 6, 3, 6, 7] }, // Top
      { indices: [4, 5, 1, 4, 1, 0] }, // Bottom
      { indices: [1, 5, 6, 1, 6, 2] }, // Right
      { indices: [4, 0, 3, 4, 3, 7] } // Left
    ]

    for (const face of faces) {
      const startIndex = vertices.length
      for (const idx of face.indices) {
        const pos = positions[idx]
        vertices.push({
          position: pos,
          tex_coords: [0, 0],
          color: color,
          gradient_coords: [(pos[0] + hw) / w, (pos[1] + hh) / h],
          object_type: 10
        })
      }
      for (let i = 0; i < 6; i++) {
        indices.push(startIndex + i)
      }
    }

    return [vertices, indices]
  }

  updateOpacity(queue: PolyfillQueue, opacity: number) {
    let new_color: [number, number, number, number] = [1, 1, 1, opacity]
    if (this.backgroundFill.type === 'Gradient') {
      let firstStop = this.backgroundFill.value.stops[0]
      new_color = [firstStop.color[0], firstStop.color[1], firstStop.color[2], opacity]
    } else if (this.backgroundFill.type === 'Color') {
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

  toConfig(): Model3DConfig {
    return {
      id: this.id,
      name: this.name,
      path: this.path,
      position: {
        x: this.transform.position[0] - CANVAS_HORIZ_OFFSET,
        y: this.transform.position[1] - CANVAS_VERT_OFFSET,
        z: this.transform.position[2]
      },
      rotation: this.rotation,
      scale: this.scale,
      backgroundFill: this.backgroundFill,
      layer: this.layer
    }
  }

  toSavedConfig(): SavedModel3DConfig {
    return this.toConfig()
  }

  containsPoint(point: Point): boolean {
    // Simple bounding box check for 3D model projected to 2D
    const avgScale = (this.scale[0] + this.scale[1]) / 2
    const size = 100 * avgScale // Approximate size
    const x = this.transform.position[0]
    const y = this.transform.position[1]

    return (
      point.x >= x - size / 2 &&
      point.x <= x + size / 2 &&
      point.y >= y - size / 2 &&
      point.y <= y + size / 2
    )
  }
}

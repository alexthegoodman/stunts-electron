import { mat4, vec3, vec4 } from 'gl-matrix'
import { createVertexBufferLayout } from './vertex'
import { Camera, CameraBinding } from './camera'
import { ControlMode, Editor } from './editor'

// import FragShader from "./shaders/frag_primary.wgsl?raw";
// import VertShader from "./shaders/vert_primary.wgsl?raw";
import FragShader from './shaders/frag_webgl.glsl?raw'
import VertShader from './shaders/vert_webgl.glsl?raw'
import { ObjectType } from './animations'
import { TextRenderer } from './text'
import { RepeatableObject } from './repeater'

import { makeShaderDataDefinitions, makeStructuredView } from 'webgpu-utils'
import { SaveTarget } from './editor_state'
import { quatToEuler } from './editor/helpers'
import { Camera3D } from './3dcamera'
import {
  GPUPolyfill,
  PolyfillBindGroup,
  PolyfillBuffer,
  PolyfillDevice,
  PolyfillQueue,
  PolyfillTexture,
  WebGpuResources
} from './polyfill'
import { degreesToRadians } from './transform'
import Jolt from 'jolt-physics/debug-wasm-compat'

interface WindowSize {
  width: number
  height: number
}

interface WindowSizeShader {
  width: number
  height: number
}

const wrapVec3 = (joltVec3: Jolt.Vec3) => {
  return vec3.fromValues(joltVec3.GetX(), joltVec3.GetY(), joltVec3.GetZ())
}

export class CanvasPipeline {
  // gpuResources: WebGpuResources | null = null;
  gpuResources: GPUPolyfill | null = null
  depthView: GPUTextureView | null = null
  multisampledView: GPUTextureView | null = null
  private animationFrameId: number | null = null
  public stepFrames: boolean = true
  public canvas: HTMLCanvasElement | OffscreenCanvas | null = null
  public isPlaying: boolean = false

  desiredVelocity: vec3 = vec3.fromValues(0, 0, 0)
  _tmpVec3: vec3 = vec3.fromValues(0, 0, 0)

  // TODO: move character state elsewhere besides pipeline, perhaps editor.ts
  characterHeightStanding = 2
  characterRadiusStanding = 1
  characterHeightCrouching = 1
  characterRadiusCrouching = 0.8

  // Character movement properties
  controlMovementDuringJump = true ///< If false the character cannot change movement direction in mid air
  characterSpeed = 6.0
  jumpSpeed = 15.0

  enableCharacterInertia = false

  upRotationX = 0
  upRotationZ = 0
  maxSlopeAngle = degreesToRadians(45.0)
  maxStrength = 100.0
  characterPadding = 0.02
  penetrationRecoverySpeed = 1.0
  predictiveContactDistance = 0.1
  enableWalkStairs = false // true will take away small projectile hit when on ground
  enableStickToFloor = true

  shapeType = 'Capsule'
  standingShape
  crouchingShape
  threeStandingGeometry
  threeCrouchingGeometry

  character
  isCrouched = false
  allowSliding = false

  constructor() {}

  async new(
    editor: Editor,
    onScreenCanvas: boolean,
    canvasId: string,
    windowSize: WindowSize,
    stepFrames: boolean
  ) {
    this.stepFrames = stepFrames
    console.log('Initializing Canvas Renderer...')

    this.canvas = null
    if (onScreenCanvas) {
      this.canvas = document.getElementById(canvasId) as HTMLCanvasElement

      if (!this.canvas) throw new Error('Canvas not found')
    } else {
      // let render_canvas: HTMLCanvasElement | OffscreenCanvas | null = canvas;
      // if (!render_canvas) {
      this.canvas = new OffscreenCanvas(windowSize.width, windowSize.height)
      // }
    }

    // Set canvas dimensions
    // const width = 900;
    // const height = 550;

    console.info('Canvas dimensions', windowSize)

    // const windowSize: WindowSize = { width, height };

    // Initialize WebGPU
    // const gpuResources = await WebGpuResources.request(this.canvas, windowSize);

    // Intiialize Polyfill
    const gpuResources = new GPUPolyfill('webgl', this.canvas, windowSize)
    await gpuResources.initializeResources()

    console.info('Initializing pipeline...')

    // Create camera and camera binding
    // const camera = new Camera(windowSize);
    const camera = new Camera3D(windowSize)

    // Make it look at the origin
    // camera.lookAt(vec3.fromValues(0, 0, 0)); // lets set the default right in the camera

    const cameraBinding = new CameraBinding(gpuResources.device!, gpuResources.queue!, camera)

    editor.camera = camera
    editor.cameraBinding = cameraBinding

    // Create depth stencil state
    const depthStencilState: GPUDepthStencilState = {
      format: 'depth24plus-stencil8',
      depthWriteEnabled: true,
      depthCompare: 'less'
    }

    // Create bind group layouts
    const modelBindGroupLayout = gpuResources.device!.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: 'float'
            // viewDimension: "2d",
          }
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {
            type: 'filtering'
          }
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        }
      ]
      // label: "model_bind_group_layout",
    })

    // const gradientBindGroupLayout = gpuResources.device.createBindGroupLayout({
    //   entries: [
    //     {
    //       binding: 0,
    //       visibility: GPUShaderStage.FRAGMENT,
    //       buffer: {
    //         type: "uniform",
    //       },
    //     },
    //   ],
    //   label: "gradient_bind_group_layout",
    // });

    const groupBindGroupLayout = gpuResources.device!.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        }
      ]
      // label: "group_bind_group_layout",
    })

    // Create window size buffer and bind group
    const windowSizeBuffer = gpuResources.device!.createBuffer(
      {
        label: 'Window Size Buffer',
        size: 8, // 2 floats, 4 bytes each
        usage:
          process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      },
      'uniform2f'
    )

    windowSizeBuffer.unmap() // Unmap after creation

    // Update initial scene shader buffer
    const windowSizeData = new Float32Array([windowSize.width, windowSize.height])
    gpuResources.queue!.writeBuffer(windowSizeBuffer, 0, windowSizeData)

    const windowSizeBindGroupLayout = gpuResources.device!.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'uniform'
          }
        }
      ]
    })

    const windowSizeBindGroup = gpuResources.device!.createBindGroup({
      layout: windowSizeBindGroupLayout,
      entries: [
        {
          binding: 1,
          groupIndex: 0,
          resource: {
            pbuffer: windowSizeBuffer
          }
        }
      ]
    })

    // Create window size buffer and bind group
    const sceneShaderBuffer = gpuResources.device!.createBuffer(
      {
        label: 'Scene Shader Buffer',
        size: 16, // 4 floats, 4 bytes each
        usage:
          process.env.NODE_ENV === 'test' ? 0 : GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true
      },
      'UBO'
    )

    // Update window size buffer
    const sceneShaderData = new Float32Array([0, 0, 0, 0])
    gpuResources.queue!.writeBuffer(sceneShaderBuffer, 0, sceneShaderData)

    // sceneShaderBuffer.unmap() // Unmap after creation // writeBuffer already calls subData in webgl

    const sceneShaderBindGroupLayout = gpuResources.device!.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        }
      ]
    })

    const sceneShaderBindGroup = gpuResources.device!.createBindGroup({
      layout: sceneShaderBindGroupLayout,
      entries: [
        {
          binding: 0,
          groupIndex: 4,
          resource: {
            pbuffer: sceneShaderBuffer
          }
        }
      ]
    })

    // gpuResources.queue!.writeBuffer(windowSizeBuffer, 0, windowSizeData);

    // Create pipeline layout
    const pipelineLayout = gpuResources.device!.createPipelineLayout({
      label: 'Pipeline Layout',
      bindGroupLayouts: [
        // cameraBinding.bindGroupLayout,
        modelBindGroupLayout,
        windowSizeBindGroupLayout,
        groupBindGroupLayout,
        sceneShaderBindGroupLayout
        // gradientBindGroupLayout,
      ]
    })

    // Load shaders
    const vertexShaderModule = gpuResources.device!.createShaderModule({
      label: 'Vertex Shader',
      code: VertShader
    })

    const fragmentShaderModule = gpuResources.device!.createShaderModule({
      label: 'Fragment Shader',
      code: FragShader
    })

    let format: GPUTextureFormat = 'rgba8unorm'

    // Create render pipeline
    const renderPipeline = gpuResources.device!.createRenderPipeline({
      label: 'Common Vector Primary Render Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: vertexShaderModule,
        entryPoint: 'vs_main',
        buffers: [createVertexBufferLayout()]
      },
      fragment: {
        module: fragmentShaderModule,
        entryPoint: 'fs_main',
        targets: [
          {
            format: format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add'
              }
            }
          }
        ]
      },
      primitive: {
        topology: 'triangle-list',
        frontFace: 'ccw',
        cullMode: undefined
      },
      depthStencil: depthStencilState,
      multisample: {
        count: 4,
        mask: 0xffffffff,
        alphaToCoverageEnabled: false
      }
    })

    // necessary for webgl
    // renderPipeline.use();

    console.info('Initialized...')

    editor.gpuResources = gpuResources

    // TODO: consolidate bind groups with multiple buffers each
    editor.modelBindGroupLayout = modelBindGroupLayout
    editor.groupBindGroupLayout = groupBindGroupLayout
    editor.windowSizeBindGroup = windowSizeBindGroup
    editor.windowSizeBindGroupLayout = windowSizeBindGroupLayout
    editor.windowSizeBuffer = windowSizeBuffer
    editor.sceneShaderBuffer = sceneShaderBuffer
    editor.sceneShaderBindGroupLayout = sceneShaderBindGroupLayout
    editor.sceneShaderBindGroup = sceneShaderBindGroup

    editor.renderPipeline = renderPipeline

    editor.updateCameraBinding()

    this.gpuResources = gpuResources

    return this
  }

  async beginRendering(editor: Editor): Promise<void> {
    if (this.stepFrames) {
      // Start the animation loop
      const renderLoop = async () => {
        // editor.renderPipeline!.use();

        await this.renderWebglFrame(editor)

        // Schedule the next frame
        this.animationFrameId = window.requestAnimationFrame(renderLoop)
      }

      // editor.renderPipeline!.use();
      // Start the first frame
      this.animationFrameId = window.requestAnimationFrame(renderLoop)
    } else {
      // editor.renderPipeline!.use();
      await this.renderWebglFrame(editor)
    }
  }

  recreateDepthView(window_width: number, window_height: number) {}

  // handleInput(
  //   editor: Editor,
  //   character: Jolt.CharacterVirtual,
  //   movementDirection: vec3, // gl-matrix
  //   jump: boolean,
  //   switchStance,
  //   deltaTime: number
  // ) {
  //   const playerControlsHorizontalVelocity =
  //     this.controlMovementDuringJump || character.IsSupported()
  //   if (playerControlsHorizontalVelocity) {
  //     // True if the player intended to move
  //     //  this.allowSliding = !(movementDirection.length() < 1.0e-12)
  //     // Smooth the player input
  //     if (this.enableCharacterInertia) {
  //       vec3.scale(movementDirection, movementDirection, 0.25 * this.characterSpeed)
  //       vec3.scaleAndAdd(this.desiredVelocity, this.desiredVelocity, movementDirection, 0.75)
  //       // this.desiredVelocity
  //       //   .multiplyScalar(0.75)
  //       //   .add(movementDirection.multiplyScalar(0.25 * this.characterSpeed))
  //     } else {
  //       // this.desiredVelocity.copy(movementDirection).multiplyScalar(this.characterSpeed)
  //       vec3.scale(this.desiredVelocity, this.desiredVelocity, this.characterSpeed)
  //     }
  //   } else {
  //     // While in air we allow sliding
  //     this.allowSliding = true
  //   }
  //   // this._tmpVec3.Set(this.upRotationX, 0, this.upRotationZ)
  //   vec3.set(this._tmpVec3, this.upRotationX, 0, this.upRotationZ)
  //   const characterUpRotation = editor.physics.jolt.Quat.prototype.sEulerAngles(
  //     new editor.physics.jolt.Vec3(this._tmpVec3[0], this._tmpVec3[1], this._tmpVec3[2])
  //   )
  //   character.SetUp(characterUpRotation.RotateAxisY())
  //   character.SetRotation(characterUpRotation)
  //   const upRotation = wrapQuat(characterUpRotation)

  //   character.UpdateGroundVelocity()
  //   const characterUp = wrapVec3(character.GetUp())
  //   const linearVelocity = wrapVec3(character.GetLinearVelocity())
  //   const currentVerticalVelocity = characterUp
  //     .clone()
  //     .multiplyScalar(linearVelocity.dot(characterUp))
  //   const groundVelocity = wrapVec3(character.GetGroundVelocity())
  //   const gravity = wrapVec3(editor.physics.physicsSystem.GetGravity())

  //   let newVelocity
  //   const movingTowardsGround = currentVerticalVelocity.y - groundVelocity.y < 0.1
  //   if (
  //     character.GetGroundState() == editor.physics.jolt.EGroundState_OnGround && // If on ground
  //     (this.enableCharacterInertia
  //       ? movingTowardsGround // Inertia enabled: And not moving away from ground
  //       : !character.IsSlopeTooSteep(character.GetGroundNormal()))
  //   ) {
  //     // Inertia disabled: And not on a slope that is too steep
  //     // Assume velocity of ground when on ground
  //     newVelocity = groundVelocity

  //     // Jump
  //     if (jump && movingTowardsGround) {
  //       vec3.scaleAndAdd(newVelocity, newVelocity, characterUp, this.jumpSpeed)
  //       // newVelocity.add(characterUp.multiplyScalar(jumpSpeed))
  //     }
  //   } else newVelocity = currentVerticalVelocity.clone()

  //   // Gravity
  //   newVelocity.add(gravity.multiplyScalar(deltaTime).applyQuaternion(upRotation))

  //   if (playerControlsHorizontalVelocity) {
  //     // Player input
  //     newVelocity.add(this.desiredVelocity.clone().applyQuaternion(upRotation))
  //   } else {
  //     // Preserve horizontal velocity
  //     const currentHorizontalVelocity = linearVelocity.sub(currentVerticalVelocity)
  //     newVelocity.add(currentHorizontalVelocity)
  //   }

  //   // this._tmpVec3.Set(newVelocity.x, newVelocity.y, newVelocity.z)
  //   vec3.set(this._tmpVec3, newVelocity.x, newVelocity.y, newVelocity.z)
  //   character.SetLinearVelocity(
  //     new editor.physics.jolt.Vec3(this._tmpVec3[0], this._tmpVec3[1], this._tmpVec3[2])
  //   )
  // }

  // prePhysicsUpdate(editor: Editor, character: Jolt.CharacterVirtual, deltaTime: number) {
  //   // if (isInLava) {
  //   //   // Teleport the user back to the origin if they fall off the platform
  //   //   _tmpRVec3.Set(0, 10, 0)
  //   //   character.SetPosition(_tmpRVec3)
  //   //   isInLava = false
  //   // }
  //   const characterUp = wrapVec3(character.GetUp()) // returns gl-matrix vec3
  //   if (!this.enableStickToFloor) {
  //     editor.physics.updateSettings.mStickToFloorStepDown = Jolt.Vec3.prototype.sZero()
  //   } else {
  //     const vec = characterUp
  //       .clone()
  //       .multiplyScalar(-editor.physics.updateSettings.mStickToFloorStepDown.Length())
  //     editor.physics.updateSettings.mStickToFloorStepDown.Set(vec.x, vec.y, vec.z)
  //   }

  //   if (!this.enableWalkStairs) {
  //     editor.physics.updateSettings.mWalkStairsStepUp = Jolt.Vec3.prototype.sZero()
  //   } else {
  //     const vec = characterUp
  //       .clone()
  //       .multiplyScalar(editor.physics.updateSettings.mWalkStairsStepUp.Length())
  //     editor.physics.updateSettings.mWalkStairsStepUp.Set(vec.x, vec.y, vec.z)
  //   }
  //   characterUp.multiplyScalar(-editor.physics.physicsSystem.GetGravity().Length())
  //   character.ExtendedUpdate(
  //     deltaTime,
  //     character.GetUp(),
  //     editor.physics.updateSettings,
  //     editor.physics.movingBPFilter,
  //     editor.physics.movingLayerFilter,
  //     editor.physics.bodyFilter,
  //     editor.physics.shapeFilter,
  //     editor.physics.joltInterface.GetTempAllocator()
  //   )
  // }

  prePhysicsUpdate(editor: Editor, character: Jolt.CharacterVirtual, deltaTime: number) {
    // Get character up as a gl-matrix vec3
    const characterUp = wrapVec3(character.GetUp())

    // mStickToFloorStepDown: zero or aligned with character up (negated)
    if (!this.enableStickToFloor) {
      // set to zero vector
      editor.physics.updateSettings.mStickToFloorStepDown.Set(0, 0, 0)
    } else {
      const stepDownLen = editor.physics.updateSettings.mStickToFloorStepDown.Length()
      const tmp = vec3.create()
      vec3.scale(tmp, characterUp, -stepDownLen)
      editor.physics.updateSettings.mStickToFloorStepDown.Set(tmp[0], tmp[1], tmp[2])
    }

    // mWalkStairsStepUp: zero or aligned with character up
    if (!this.enableWalkStairs) {
      editor.physics.updateSettings.mWalkStairsStepUp.Set(0, 0, 0)
    } else {
      const stepUpLen = editor.physics.updateSettings.mWalkStairsStepUp.Length()
      const tmp2 = vec3.create()
      vec3.scale(tmp2, characterUp, stepUpLen)
      editor.physics.updateSettings.mWalkStairsStepUp.Set(tmp2[0], tmp2[1], tmp2[2])
    }

    // Call extended character update with Jolt's native up vector
    character.ExtendedUpdate(
      deltaTime,
      character.GetUp(),
      editor.physics.updateSettings,
      editor.physics.movingBPFilter,
      editor.physics.movingLayerFilter,
      editor.physics.bodyFilter,
      editor.physics.shapeFilter,
      editor.physics.joltInterface.GetTempAllocator()
    )
  }

  handleInput(
    editor: Editor,
    character: Jolt.CharacterVirtual,
    movementDirection: vec3, // gl-matrix
    jump: boolean,
    switchStance,
    deltaTime: number
  ) {
    const playerControlsHorizontalVelocity =
      this.controlMovementDuringJump || character.IsSupported()

    // Temporary vectors
    const tmpA = vec3.create()
    const tmpB = vec3.create()

    if (playerControlsHorizontalVelocity) {
      // Smooth the player input
      if (this.enableCharacterInertia) {
        // movementDirection *= 0.25 * speed
        vec3.scale(tmpA, movementDirection, 0.25 * this.characterSpeed)
        // desiredVelocity = desiredVelocity + tmpA * 0.75
        vec3.scaleAndAdd(this.desiredVelocity, this.desiredVelocity, tmpA, 0.75)
      } else {
        // desiredVelocity = movementDirection * characterSpeed
        vec3.scale(this.desiredVelocity, movementDirection, this.characterSpeed)
      }
    } else {
      // While in air we allow sliding
      this.allowSliding = true
    }

    vec3.set(this._tmpVec3, this.upRotationX, 0, this.upRotationZ)
    const characterUpRotation = editor.physics.jolt.Quat.prototype.sEulerAngles(
      new editor.physics.jolt.Vec3(this._tmpVec3[0], this._tmpVec3[1], this._tmpVec3[2])
    )
    character.SetUp(characterUpRotation.RotateAxisY())
    character.SetRotation(characterUpRotation)
    const upRotation = vec4.fromValues(
      characterUpRotation.GetX(),
      characterUpRotation.GetY(),
      characterUpRotation.GetZ(),
      characterUpRotation.GetW()
    )

    character.UpdateGroundVelocity()

    const characterUp = wrapVec3(character.GetUp()) // gl-matrix vec3
    const linearVelocity = wrapVec3(character.GetLinearVelocity()) // gl-matrix vec3

    // project linearVelocity onto characterUp: currentVerticalVelocity = characterUp * (linearVelocity · characterUp)
    const dot = vec3.dot(linearVelocity, characterUp)
    const currentVerticalVelocity = vec3.create()
    vec3.scale(currentVerticalVelocity, characterUp, dot)

    const groundVelocity = wrapVec3(character.GetGroundVelocity())
    const gravity = wrapVec3(editor.physics.physicsSystem.GetGravity())

    const newVelocity = vec3.create()
    const movingTowardsGround = currentVerticalVelocity[1] - groundVelocity[1] < 0.1

    if (
      character.GetGroundState() == editor.physics.jolt.EGroundState_OnGround &&
      (this.enableCharacterInertia
        ? movingTowardsGround
        : !character.IsSlopeTooSteep(character.GetGroundNormal()))
    ) {
      // On ground -> start from ground velocity
      vec3.copy(newVelocity, groundVelocity)

      // Jump
      if (jump && movingTowardsGround) {
        vec3.scaleAndAdd(newVelocity, newVelocity, characterUp, this.jumpSpeed)
      }
    } else {
      // In air -> preserve vertical component
      vec3.copy(newVelocity, currentVerticalVelocity)
    }

    // Gravity: apply gravity * deltaTime rotated by upRotation
    vec3.scale(tmpA, gravity, deltaTime) // tmpA = gravity * deltaTime
    vec3.transformQuat(tmpB, tmpA, upRotation) // tmpB = tmpA rotated by upRotation
    vec3.add(newVelocity, newVelocity, tmpB)

    if (playerControlsHorizontalVelocity) {
      // Player input: apply desiredVelocity rotated by upRotation
      vec3.transformQuat(tmpA, this.desiredVelocity, upRotation)
      vec3.add(newVelocity, newVelocity, tmpA)
    } else {
      // Preserve horizontal velocity: linearVelocity - currentVerticalVelocity
      vec3.subtract(tmpA, linearVelocity, currentVerticalVelocity)
      vec3.add(newVelocity, newVelocity, tmpA)
    }

    // Set physics character velocity
    vec3.set(this._tmpVec3, newVelocity[0], newVelocity[1], newVelocity[2])

    // console.info('newVelocity', this._tmpVec3[0], this._tmpVec3[1], this._tmpVec3[2])
    character.SetLinearVelocity(
      new editor.physics.jolt.Vec3(this._tmpVec3[0], this._tmpVec3[1], this._tmpVec3[2])
    )
  }

  async renderWebglFrame(
    editor: Editor,
    frameEncoder?: (renderTexture: PolyfillTexture) => Promise<void>,
    currentTimeS?: number
  ): Promise<void> {
    if (!editor.camera || !editor.gpuResources) {
      console.error('Editor or camera not initialized')
      return
    }

    // Get WebGL resources through polyfill
    const device = editor.gpuResources.getDevice() as PolyfillDevice
    const queue = editor.gpuResources.getQueue() as PolyfillQueue
    const gl = editor.gpuResources.getContext() as WebGL2RenderingContext
    const renderPipeline = editor.renderPipeline

    if (!gl || !renderPipeline) {
      console.error('WebGL context or render pipeline not initialized')
      return
    }

    // Animation steps (same as WebGPU)
    // TODO: need to loop through all the bodies to update? Just the dynamic ones?
    // if (editor.physics && editor.bodies.size > 0) {
    //   editor.physics.step(1.0 / 60.0) // Step with a fixed time step

    //   const dynamicCubeBody = editor.bodies.get('dynamic-cube')
    //   if (dynamicCubeBody) {
    //     const { position, rotation } = editor.physics.getBodyPositionAndRotation(dynamicCubeBody)
    //     const dynamicCube = editor.cubes3D.find((c) => c.id === 'dynamic-cube')
    //     if (dynamicCube) {
    //       dynamicCube.transform.position[0] = position.GetX()
    //       dynamicCube.transform.position[1] = position.GetY()
    //       dynamicCube.transform.position[2] = position.GetZ()

    //       const euler = vec3.create()

    //       dynamicCube.transform.rotationX = rotation.GetEulerAngles().GetX()
    //       dynamicCube.transform.rotationY = rotation.GetEulerAngles().GetY()
    //       dynamicCube.transform.rotation = rotation.GetEulerAngles().GetZ()

    //       dynamicCube.transform.updateUniformBuffer(queue, editor.camera.windowSize)
    //     }
    //   }
    // }

    if (this.isPlaying) {
      let deltaTime = 1.0 / 60.0 // TODO: make real
      const player = editor.cubes3D.find((c) => c.name === 'PlayerCharacter') // TODO: change to c.type so name can be changed

      if (player) {
        const playerBody = editor.characters.get(player.id)
        // console.info('is playing', player, playerBody)
        if (playerBody) {
          const nodes = editor.nodes
          const edges = editor.edges
          const inputNode = nodes.find((n) => n.data.label === 'Input')
          // console.info('pressed player', playerBody, inputNode)
          if (inputNode) {
            const connectedEdges = edges.filter((e) => e.target === inputNode.id)
            // console.info('connectedEdges on press', connectedEdges)

            for (const edge of connectedEdges) {
              const connectedNode = nodes.find((n) => n.id === edge.source)
              if (connectedNode) {
                // console.info('connectednodes on press', connectedNode)
                switch (connectedNode.data.label) {
                  case 'Forward':
                    if (connectedNode.data.pressed) {
                      // TODO: integrate handle_input here (will need to calculate delta time)
                      // console.info('forward force')
                      // editor.physics.bodyInterface.AddForce(
                      //   playerBody.GetID(),
                      //   new editor.physics.jolt.Vec3(0, 0, -1000),
                      //   editor.physics.jolt.EActivation_Activate
                      // )
                      this.handleInput(
                        editor,
                        playerBody,
                        vec3.fromValues(0, 0, -1),
                        false,
                        null,
                        deltaTime
                      )
                    }
                    break
                  case 'Backward':
                    if (connectedNode.data.pressed) {
                      // editor.physics.bodyInterface.AddForce(
                      //   playerBody.GetID(),
                      //   new editor.physics.jolt.Vec3(0, 0, 1000),
                      //   editor.physics.jolt.EActivation_Activate
                      // )
                      console.info('back press')
                      this.handleInput(
                        editor,
                        playerBody,
                        vec3.fromValues(0, 0, 1),
                        false,
                        null,
                        deltaTime
                      )
                    }
                    break
                  case 'Left':
                    if (connectedNode.data.pressed) {
                      // editor.physics.bodyInterface.AddForce(
                      //   playerBody.GetID(),
                      //   new editor.physics.jolt.Vec3(-1000, 0, 0),
                      //   editor.physics.jolt.EActivation_Activate
                      // )
                      this.handleInput(
                        editor,
                        playerBody,
                        vec3.fromValues(-1, 0, 0),
                        false,
                        null,
                        deltaTime
                      )
                    }
                    break
                  case 'Right':
                    if (connectedNode.data.pressed) {
                      // editor.physics.bodyInterface.AddForce(
                      //   playerBody.GetID(),
                      //   new editor.physics.jolt.Vec3(1000, 0, 0),
                      //   editor.physics.jolt.EActivation_Activate
                      // )
                      this.handleInput(
                        editor,
                        playerBody,
                        vec3.fromValues(1, 0, 0),
                        false,
                        null,
                        deltaTime
                      )
                    }
                    break
                }
              }
            }
          }

          // animate physics of player
          if (editor.physics && editor.bodies.size > 0) {
            for (const [id, body] of editor.bodies.entries()) {
              const { position, rotation } = editor.physics.getBodyPositionAndRotation(body)
              const sphere = editor.spheres3D.find((s) => s.id === id)
              const cube = editor.cubes3D.find((s) => s.id === id)
              const object = sphere ? sphere : cube
              if (object) {
                object.transform.position[0] = position.GetX()
                object.transform.position[1] = position.GetY()
                object.transform.position[2] = position.GetZ()

                object.transform.rotationX = rotation.GetEulerAngles().GetX()
                object.transform.rotationY = rotation.GetEulerAngles().GetY()
                object.transform.rotation = rotation.GetEulerAngles().GetZ()

                object.transform.updateUniformBuffer(queue, editor.camera.windowSize)
              }
            }

            for (const [id, chaacter] of editor.characters.entries()) {
              this.prePhysicsUpdate(editor, chaacter, deltaTime)

              const { position, rotation } =
                editor.physics.getCharacterPositionAndRotation(chaacter)
              const cube = editor.cubes3D.find((s) => s.id === id)
              // console.info(
              //   'cube postition',
              //   cube.name,
              //   position.GetX(),
              //   position.GetY(),
              //   position.GetZ()
              // )
              if (cube) {
                cube.transform.position[0] = position.GetX()
                cube.transform.position[1] = position.GetY()
                cube.transform.position[2] = position.GetZ()

                cube.transform.rotationX = rotation.GetEulerAngles().GetX()
                cube.transform.rotationY = rotation.GetEulerAngles().GetY()
                cube.transform.rotation = rotation.GetEulerAngles().GetZ()

                // console.info('cube postition', cube.name, cube.transform.position) // stays same?

                cube.transform.updateUniformBuffer(queue, editor.camera.windowSize)
              }
            }

            editor.physics.step(deltaTime) // TODO: get actual deltaTime between frames
          }
        }
      }

      if (editor.gameLogic) {
        editor.gameLogic.update(deltaTime)
      }
    }

    editor.stepVideoAnimations(editor.camera, currentTimeS)
    await editor.stepMotionPathAnimations(editor.camera, currentTimeS)

    // Bind render pipeline (in WebGL this means using the shader program)
    if (renderPipeline.program) {
      gl.useProgram(renderPipeline.program)
    }

    // Set up WebGL render state
    gl.viewport(0, 0, editor.camera.windowSize.width, editor.camera.windowSize.height)

    // Clear the framebuffer
    gl.clearColor(1.0, 1.0, 1.0, 1.0) // White background
    gl.clearDepth(1.0)
    // gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Enable depth testing and culling (similar to WebGPU setup)
    gl.enable(gl.DEPTH_TEST)

    if (editor.target === SaveTarget.Games) {
      gl.enable(gl.CULL_FACE) // disabling this fixed a annoying bug with culling
    } else {
      gl.disable(gl.CULL_FACE) // disabling this fixed a annoying bug with culling
      gl.depthMask(false)
    }

    // gl.cullFace(gl.BACK);
    // gl.frontFace(gl.CCW);

    // Set up blending for transparency
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // gl.depthMask(false)

    // Bind camera uniform buffer (bind group 0)
    if (editor.cameraBinding) {
      editor.cameraBinding.bindGroup.bindWebGLBindGroup(gl)
    } else {
      console.error("Couldn't get camera binding")
      return
    }

    // Bind window size uniform buffer
    if (editor.windowSizeBindGroup) {
      editor.windowSizeBindGroup.bindWebGLBindGroup(gl)
    } else {
      console.error("Couldn't get window size group")
      return
    }

    // Bind scene shader uniform buffer
    if (editor.sceneShaderBindGroup) {
      editor.sceneShaderBindGroup.bindWebGLBindGroup(gl)
    } else {
      console.error("Couldn't get scene shader group")
      return
    }

    // Helper function to draw indexed geometry
    const drawIndexedGeometry = (
      vertexBuffer: PolyfillBuffer,
      indexBuffer: PolyfillBuffer,
      indexCount: number
    ) => {
      const stride = 12 * Float32Array.BYTES_PER_ELEMENT // 48 bytes

      // Bind vertex buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer.buffer)

      // position: vec3 -> float32 * 3
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, stride, 0)

      // tex_coords: vec2 -> float32 * 2
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 12)

      // color: vec4 -> float32 * 4
      gl.enableVertexAttribArray(2)
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 20)

      // gradient_coords: vec2 -> float32 * 2
      gl.enableVertexAttribArray(3)
      gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 36)

      // object_type: float32
      gl.enableVertexAttribArray(4)
      gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, 44)

      // Bind index buffer
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer)

      // console.info("indexBuffer.buffer", indexBuffer);
      // console.info("indexCount", indexCount);

      // Draw
      gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_INT, 0)
      // try drawArrays instead
      // const vertexCount = vertexBuffer.data
      //   ? vertexBuffer.data.byteLength / stride
      //   : 0;
      // gl.drawArrays(gl.TRIANGLES, 0, vertexCount); // Use indexCount directly for drawArrays
    }

    // Draw static polygons
    for (const polygon of editor.staticPolygons || []) {
      // Update uniform buffer if this polygon is being dragged
      if (editor.draggingPathHandle === polygon.id) {
        polygon.transform.updateUniformBuffer(queue, editor.camera.windowSize)
      }

      if (
        polygon.name === 'canvas_background' &&
        editor.target === SaveTarget.Videos &&
        editor.isPlaying
      ) {
        // Use faster deltaTime for shader backgrounds (10x) to make animations visible
        const deltaTime = polygon.backgroundFill.type === 'Shader' ? 0.1 : 0.001
        polygon.updateGradientAnimation(device, deltaTime)
      }

      polygon.bindGroup.bindWebGLBindGroup(gl)
      // polygon.gradientBindGroup?.bindWebGLBindGroup(gl);
      polygon.groupBindGroup?.bindWebGLBindGroup(gl)

      // log data
      // console.info(
      //   "polygon data",
      //   polygon.bindGroup.resources.filter((x) =>
      //     x.resource instanceof PolyfillBuffer ? x.resource.data : null
      //   ),
      //   // polygon.gradientBindGroup?.resources.filter((x) =>
      //   //   x.resource instanceof PolyfillBuffer ? x.resource.data : null
      //   // ),
      //   polygon.groupBindGroup.resources.filter((x) =>
      //     x.resource instanceof PolyfillBuffer ? x.resource.data : null
      //   )
      // );

      drawIndexedGeometry(
        polygon.vertexBuffer as PolyfillBuffer,
        polygon.indexBuffer as PolyfillBuffer,
        polygon.indices.length
      )
    }

    // Draw motion paths
    for (const path of editor.motionPaths || []) {
      // Update path transform if being dragged
      if (
        editor.draggingPath === path.id ||
        editor.draggingPolygon === path.associatedPolygonId ||
        editor.draggingImage === path.associatedPolygonId ||
        editor.draggingText === path.associatedPolygonId ||
        editor.draggingVideo === path.associatedPolygonId
      ) {
        path.transform.updateUniformBuffer(queue, editor.camera.windowSize)
      }

      // this.bindWebGLBindGroup(gl, path.bindGroup, 3);
      path.bindGroup.bindWebGLBindGroup(gl)

      // Draw static polygons in this path
      for (const polygon of path.staticPolygons || []) {
        if (editor.draggingPathHandle === polygon.id) {
          polygon.transform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        // this.bindWebGLBindGroup(gl, polygon.bindGroup, 1);

        polygon.bindGroup.bindWebGLBindGroup(gl)
        // polygon.groupBindGroup?.bindWebGLBindGroup(gl);

        drawIndexedGeometry(
          polygon.vertexBuffer as PolyfillBuffer,
          polygon.indexBuffer as PolyfillBuffer,
          polygon.indices.length
        )
      }
    }

    // Draw regular polygons
    for (const polygon of editor.polygons || []) {
      if (!polygon.hidden) {
        // Update if dragging or during playback
        if (editor.draggingPolygon === polygon.id || editor.isPlaying) {
          polygon.transform.updateUniformBuffer(queue, editor.camera.windowSize)

          // console.info("polygon", polygon.id, polygon.transform.layer);
        }

        // this.bindWebGLBindGroup(gl, polygon.bindGroup, 1);
        // this.bindWebGLBindGroup(gl, polygon.groupBindGroup, 3);

        polygon.bindGroup.bindWebGLBindGroup(gl)
        polygon.groupBindGroup?.bindWebGLBindGroup(gl)

        drawIndexedGeometry(
          polygon.vertexBuffer as PolyfillBuffer,
          polygon.indexBuffer as PolyfillBuffer,
          polygon.indices.length
        )
      }
    }

    // Draw text items
    for (const textItem of editor.textItems || []) {
      if (!textItem.hidden && textItem.indices) {
        // Draw background polygon if not hidden
        if (!textItem.backgroundPolygon.hidden && !textItem.hiddenBackground) {
          if (editor.draggingText === textItem.backgroundPolygon.id || editor.isPlaying) {
            textItem.backgroundPolygon.transform.updateUniformBuffer(
              queue,
              editor.camera.windowSize
            )
          }

          // this.bindWebGLBindGroup(gl, textItem.backgroundPolygon.bindGroup, 1);
          // this.bindWebGLBindGroup(
          //   gl,
          //   textItem.backgroundPolygon.groupBindGroup,
          //   3
          // );

          textItem.bindGroup.bindWebGLBindGroup(gl)
          textItem.groupBindGroup?.bindWebGLBindGroup(gl)

          drawIndexedGeometry(
            textItem.backgroundPolygon.vertexBuffer as PolyfillBuffer,
            textItem.backgroundPolygon.indexBuffer as PolyfillBuffer,
            textItem.backgroundPolygon.indices.length
          )
        }

        // Draw the text itself
        if (editor.draggingText === textItem.id || editor.isPlaying) {
          textItem.transform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        // this.bindWebGLBindGroup(gl, textItem.bindGroup, 1);
        // this.bindWebGLBindGroup(gl, textItem.groupBindGroup, 3);

        if (textItem.hiddenBackground) {
          textItem.bindGroup.bindWebGLBindGroup(gl)
          textItem.groupBindGroup?.bindWebGLBindGroup(gl)
        }

        drawIndexedGeometry(
          textItem.vertexBuffer as PolyfillBuffer,
          textItem.indexBuffer as PolyfillBuffer,
          textItem.indices.length
        )
      }
    }

    // Draw video items
    for (const video of editor.videoItems || []) {
      if (!video.hidden) {
        // this.bindWebGLBindGroup(gl, video.groupBindGroup, 3);

        if (video.mousePath) {
          // Update path transform if being dragged
          if (editor.draggingPath === video.mousePath.id || editor.draggingVideo === video.id) {
            video.mousePath.transform.updateUniformBuffer(queue, editor.camera.windowSize)
          }

          video.mousePath.bindGroup.bindWebGLBindGroup(gl)

          // Draw static polygons in this path
          for (const polygon of video.mousePath.staticPolygons || []) {
            if (editor.draggingPathHandle === polygon.id || editor.draggingVideo === video.id) {
              polygon.transform.updateUniformBuffer(queue, editor.camera.windowSize)
            }

            // this.bindWebGLBindGroup(gl, polygon.bindGroup, 1);

            polygon.bindGroup.bindWebGLBindGroup(gl)
            // video.mousePath.bindGroup.bindWebGLBindGroup(gl)
            // polygon.groupBindGroup?.bindWebGLBindGroup(gl)

            drawIndexedGeometry(
              polygon.vertexBuffer as PolyfillBuffer,
              polygon.indexBuffer as PolyfillBuffer,
              polygon.indices.length
            )
          }
        }

        if (editor.draggingVideo === video.id || editor.isPlaying) {
          video.groupTransform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        // this.bindWebGLBindGroup(gl, video.bindGroup, 1);

        video.bindGroup.bindWebGLBindGroup(gl)
        video.groupBindGroup?.bindWebGLBindGroup(gl)

        // console.info("video layer", video.layer, video.transform.layer);

        drawIndexedGeometry(
          video.vertexBuffer as PolyfillBuffer,
          video.indexBuffer as PolyfillBuffer,
          video.indices.length
        )
      }
    }

    // Draw image items
    for (const image of editor.imageItems || []) {
      if (!image.hidden) {
        // Disable depth writes for transparent images
        // gl.depthMask(false);

        if (editor.draggingImage === image.id || editor.isPlaying) {
          image.transform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        // this.bindWebGLBindGroup(gl, image.bindGroup, 1);
        // this.bindWebGLBindGroup(gl, image.groupBindGroup, 3);

        image.bindGroup.bindWebGLBindGroup(gl)
        image.groupBindGroup?.bindWebGLBindGroup(gl)

        drawIndexedGeometry(
          image.vertexBuffer as PolyfillBuffer,
          image.indexBuffer as PolyfillBuffer,
          image.indices.length
        )

        // Re-enable depth writes for subsequent objects
        // gl.depthMask(true);
      }
    }

    // Draw brushes
    for (const brush of editor.brushes || []) {
      if (!brush.hidden && brush.vertices.length > 0) {
        // Brushes don't typically need dragging updates, but could be added if needed
        if (editor.isPlaying) {
          brush.transform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        const indicesToDraw = editor.isPlaying ? brush.drawCount : brush.totalIndices

        brush.bindGroup.bindWebGLBindGroup(gl)
        brush.groupBindGroup?.bindWebGLBindGroup(gl)

        drawIndexedGeometry(
          brush.vertexBuffer as PolyfillBuffer,
          brush.indexBuffer as PolyfillBuffer,
          // brush.indices.length
          indicesToDraw
        )
      }
    }

    // Draw 3D Mockups
    for (const mockup of editor.mockups3D || []) {
      if (!mockup.hidden) {
        if (editor.draggingMockup3D === mockup.id || editor.isPlaying) {
          mockup.groupTransform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        mockup.groupBindGroup?.bindWebGLBindGroup(gl)
        mockup.bindGroup.bindWebGLBindGroup(gl)

        drawIndexedGeometry(
          mockup.vertexBuffer as PolyfillBuffer,
          mockup.indexBuffer as PolyfillBuffer,
          mockup.indices.length
        )

        // Draw anchor debug cube if it exists
        // if (mockup.anchorDebugCube) {
        //   mockup.groupBindGroup?.bindWebGLBindGroup(gl)
        //   mockup.anchorDebugCube.bindGroup.bindWebGLBindGroup(gl)

        //   drawIndexedGeometry(
        //     mockup.anchorDebugCube.vertexBuffer as PolyfillBuffer,
        //     mockup.anchorDebugCube.indexBuffer as PolyfillBuffer,
        //     mockup.anchorDebugCube.indices.length
        //   )
        // }

        if (mockup.videoChild) {
          if (editor.draggingVideo === mockup.videoChild.id || editor.isPlaying) {
            mockup.videoChild.transform.updateUniformBuffer(queue, editor.camera.windowSize)
          }

          mockup.videoChild.bindGroup.bindWebGLBindGroup(gl)

          // console.info("video layer", video.layer, video.transform.layer);

          drawIndexedGeometry(
            mockup.videoChild.vertexBuffer as PolyfillBuffer,
            mockup.videoChild.indexBuffer as PolyfillBuffer,
            mockup.videoChild.indices.length
          )
        }
      }
    }

    // Draw 3D cubes
    for (const cube of editor.cubes3D || []) {
      if (!cube.hidden) {
        // console.info('cube pos', cube.transform.position)

        if (editor.draggingCube3D === cube.id || editor.isPlaying) {
          cube.transform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        cube.bindGroup.bindWebGLBindGroup(gl)
        cube.groupBindGroup?.bindWebGLBindGroup(gl)

        drawIndexedGeometry(
          cube.vertexBuffer as PolyfillBuffer,
          cube.indexBuffer as PolyfillBuffer,
          cube.indices.length
        )
      }
    }

    // Draw Gizmo
    if (editor.gizmo) {
      for (const axis of [editor.gizmo.xAxis, editor.gizmo.yAxis, editor.gizmo.zAxis]) {
        if (!axis.hidden) {
          axis.bindGroup.bindWebGLBindGroup(gl)
          axis.groupBindGroup?.bindWebGLBindGroup(gl)

          drawIndexedGeometry(
            axis.vertexBuffer as PolyfillBuffer,
            axis.indexBuffer as PolyfillBuffer,
            axis.indices.length
          )
        }
      }
    }

    // Draw 3D spheres
    for (const sphere of editor.spheres3D || []) {
      if (!sphere.hidden) {
        if (editor.draggingSphere3D === sphere.id || editor.isPlaying) {
          sphere.transform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        sphere.bindGroup.bindWebGLBindGroup(gl)
        sphere.groupBindGroup?.bindWebGLBindGroup(gl)

        drawIndexedGeometry(
          sphere.vertexBuffer as PolyfillBuffer,
          sphere.indexBuffer as PolyfillBuffer,
          sphere.indices.length
        )
      }
    }

    // Draw 3D models
    for (const model of editor.models3D || []) {
      if (!model.hidden) {
        // if (editor.draggingModel3D === model.id || editor.isPlaying) {
        if (editor.isPlaying) {
          model.transform.updateUniformBuffer(queue, editor.camera.windowSize)
        }

        model.bindGroup.bindWebGLBindGroup(gl)
        model.groupBindGroup?.bindWebGLBindGroup(gl)

        drawIndexedGeometry(
          model.vertexBuffer as PolyfillBuffer,
          model.indexBuffer as PolyfillBuffer,
          model.indices.length
        )
      }
    }

    // Draw repeat objects
    let repeatObjects = editor.repeatManager.getAllRepeatObjects()
    if (repeatObjects.length > 0) {
      for (const repeatObject of repeatObjects || []) {
        if (!repeatObject.hidden && repeatObject.indices && repeatObject.indexBuffer) {
          let sourceObject = repeatObject.sourceObject
          let instances = repeatObject.instances

          for (let instance of instances) {
            if (isTextRenderer(sourceObject)) {
              if (
                sourceObject.objectType === ObjectType.TextItem &&
                sourceObject?.backgroundPolygon
              ) {
                // Draw background polygon if not hidden
                if (
                  sourceObject?.backgroundPolygon &&
                  !sourceObject.backgroundPolygon.hidden &&
                  !sourceObject.hiddenBackground
                ) {
                  if (editor.isPlaying) {
                    sourceObject.backgroundPolygon.transform.updateUniformBuffer(
                      queue,
                      editor.camera.windowSize
                    )
                  }

                  // this.bindWebGLBindGroup(
                  //   gl,
                  //   sourceObject.backgroundPolygon.bindGroup,
                  //   1
                  // );
                  // this.bindWebGLBindGroup(
                  //   gl,
                  //   sourceObject.backgroundPolygon.groupBindGroup,
                  //   3
                  // );

                  sourceObject.bindGroup.bindWebGLBindGroup(gl)
                  sourceObject.groupBindGroup?.bindWebGLBindGroup(gl)

                  drawIndexedGeometry(
                    sourceObject.backgroundPolygon.vertexBuffer as PolyfillBuffer,
                    sourceObject.backgroundPolygon.indexBuffer as PolyfillBuffer,
                    sourceObject.backgroundPolygon.indices.length
                  )
                }
              }
            }

            // Allow for animations
            if (instance.transform && editor.isPlaying) {
              instance.transform.updateUniformBuffer(queue, editor.camera.windowSize)
            }

            // this.bindWebGLBindGroup(gl, instance.bindGroup!, 1);
            // this.bindWebGLBindGroup(gl, sourceObject.groupBindGroup, 3);

            instance.bindGroup.bindWebGLBindGroup(gl)
            sourceObject.groupBindGroup?.bindWebGLBindGroup(gl)

            drawIndexedGeometry(
              repeatObject.vertexBuffer as PolyfillBuffer,
              repeatObject.indexBuffer as PolyfillBuffer,
              repeatObject.indices.length
            )
          }
        }
      }
    }

    // Draw text areas
    if (editor.textArea) {
      if (!editor.textArea.hidden && editor.textArea.indices) {
        // this.bindWebGLBindGroup(gl, editor.textArea.bindGroup, 1);
        // this.bindWebGLBindGroup(gl, editor.textArea.groupBindGroup, 3);

        //         textArea.bindGroup.bindWebGLBindGroup(gl);
        // textArea.groupBindGroup?.bindWebGLBindGroup(gl);

        drawIndexedGeometry(
          editor.textArea.vertexBuffer as PolyfillBuffer,
          editor.textArea.indexBuffer as PolyfillBuffer,
          editor.textArea.indices.length
        )
      }
    }

    // Update camera binding if panning
    if (editor.controlMode === ControlMode.Pan && editor.isPanning) {
      editor.updateCameraBinding()
    }

    // Flush WebGL commands (equivalent to queue.submit())
    gl.flush()

    // Call frame encoder if provided
    if (frameEncoder) {
      // Create a dummy texture for the frame encoder
      const frameTexture = device.createTexture({
        size: {
          width: editor.camera.windowSize.width,
          height: editor.camera.windowSize.height
        },
        format: 'rgba8unorm',
        usage: 0x10 // RENDER_ATTACHMENT
      })

      // Need to write the WebGL frame to this texture so data is ultimately encoded to the video file
      frameTexture.updateFromFramebuffer(
        editor.camera.windowSize.width,
        editor.camera.windowSize.height
      )

      await frameEncoder(frameTexture)
    }
  }
}

function isTextRenderer(obj: RepeatableObject): obj is TextRenderer {
  return (obj as TextRenderer).backgroundPolygon !== undefined
}

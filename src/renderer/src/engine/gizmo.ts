import { Cube3D, Cube3DConfig } from './cube3d'
import { Camera3D } from './3dcamera'
import { GPUPolyfill, PolyfillQueue } from './polyfill'
import { Transform } from './transform'
import { Physics } from './physics'
import Jolt from 'jolt-physics/debug-wasm-compat'
import { Torus3D, Torus3DConfig } from './torus3d'

export class Gizmo {
  xAxis: Cube3D
  yAxis: Cube3D
  zAxis: Cube3D
  xRing: Torus3D
  yRing: Torus3D
  zRing: Torus3D
  xScale: Cube3D
  yScale: Cube3D
  zScale: Cube3D
  target: Transform | null = null
  physics: Physics
  bodies: Jolt.Body[] = []

  constructor(
    gpuResources: GPUPolyfill,
    camera: Camera3D,
    modelBindGroupLayout: any,
    groupBindGroupLayout: any,
    physics: Physics
  ) {
    this.physics = physics
    const axisLength = 3.5
    const axisRadius = 0.075

    const xAxisConfig: Cube3DConfig = {
      id: 'gizmo-x-axis',
      name: 'Gizmo X-Axis',
      dimensions: [axisLength, axisRadius, axisRadius],
      position: { x: axisLength / 2, y: 0, z: 0 },
      rotation: [0, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [1, 0, 0, 1] // Red
      },
      layer: 999
    }

    const yAxisConfig: Cube3DConfig = {
      id: 'gizmo-y-axis',
      name: 'Gizmo Y-Axis',
      dimensions: [axisRadius, axisLength, axisRadius],
      position: { x: 0, y: axisLength / 2, z: 0 },
      rotation: [0, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [0, 1, 0, 1] // Green
      },
      layer: 999
    }

    const zAxisConfig: Cube3DConfig = {
      id: 'gizmo-z-axis',
      name: 'Gizmo Z-Axis',
      dimensions: [axisRadius, axisRadius, axisLength],
      position: { x: 0, y: 0, z: axisLength / 2 },
      rotation: [0, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [0, 0, 1, 1] // Blue
      },
      layer: 999
    }

    this.xAxis = new Cube3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      xAxisConfig,
      'gizmo-sequence'
    )

    this.yAxis = new Cube3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      yAxisConfig,
      'gizmo-sequence'
    )

    this.zAxis = new Cube3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      zAxisConfig,
      'gizmo-sequence'
    )

    // Create physics bodies for the axes
    const xAxisBody = this.physics.createStaticBox(
      new this.physics.jolt.RVec3(
        this.xAxis.transform.position[0],
        this.xAxis.transform.position[1],
        this.xAxis.transform.position[2]
      ),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      new this.physics.jolt.Vec3(axisLength, axisRadius, axisRadius)
    )
    this.bodies.push(xAxisBody)

    const yAxisBody = this.physics.createStaticBox(
      new this.physics.jolt.RVec3(
        this.yAxis.transform.position[0],
        this.yAxis.transform.position[1],
        this.yAxis.transform.position[2]
      ),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      new this.physics.jolt.Vec3(axisRadius, axisLength, axisRadius)
    )
    this.bodies.push(yAxisBody)

    const zAxisBody = this.physics.createStaticBox(
      new this.physics.jolt.RVec3(
        this.zAxis.transform.position[0],
        this.zAxis.transform.position[1],
        this.zAxis.transform.position[2]
      ),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      new this.physics.jolt.Vec3(axisRadius, axisRadius, axisLength)
    )
    this.bodies.push(zAxisBody)

    const ringRadius = 1.5
    const ringTubeRadius = 0.05

    const xRingConfig: Torus3DConfig = {
      id: 'gizmo-x-ring',
      name: 'Gizmo X-Ring',
      radius: ringRadius,
      tubeRadius: ringTubeRadius,
      position: { x: 0, y: 0, z: 0 },
      rotation: [0, 90, 0],
      backgroundFill: {
        type: 'Color',
        value: [1, 0, 0, 1] // Red
      },
      layer: 999
    }

    const yRingConfig: Torus3DConfig = {
      id: 'gizmo-y-ring',
      name: 'Gizmo Y-Ring',
      radius: ringRadius,
      tubeRadius: ringTubeRadius,
      position: { x: 0, y: 0, z: 0 },
      rotation: [90, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [0, 1, 0, 1] // Green
      },
      layer: 999
    }

    const zRingConfig: Torus3DConfig = {
      id: 'gizmo-z-ring',
      name: 'Gizmo Z-Ring',
      radius: ringRadius,
      tubeRadius: ringTubeRadius,
      position: { x: 0, y: 0, z: 0 },
      rotation: [0, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [0, 0, 1, 1] // Blue
      },
      layer: 999
    }

    this.xRing = new Torus3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      xRingConfig,
      'gizmo-sequence'
    )

    this.yRing = new Torus3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      yRingConfig,
      'gizmo-sequence'
    )

    this.zRing = new Torus3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      zRingConfig,
      'gizmo-sequence'
    )

    const xRingBody = this.physics.createStaticTorus(
      new this.physics.jolt.RVec3(0, 0, 0),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      ringRadius,
      ringTubeRadius,
      'x'
    )
    this.bodies.push(xRingBody)

    const yRingBody = this.physics.createStaticTorus(
      new this.physics.jolt.RVec3(0, 0, 0),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      ringRadius,
      ringTubeRadius,
      'y'
    )
    this.bodies.push(yRingBody)

    const zRingBody = this.physics.createStaticTorus(
      new this.physics.jolt.RVec3(0, 0, 0),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      ringRadius,
      ringTubeRadius,
      'z'
    )
    this.bodies.push(zRingBody)

    const scaleHandleSize = 0.2
    // const axisLength = 2

    const xScaleConfig: Cube3DConfig = {
      id: 'gizmo-x-scale',
      name: 'Gizmo X-Scale',
      dimensions: [scaleHandleSize, scaleHandleSize, scaleHandleSize],
      position: { x: axisLength, y: 0, z: 0 },
      rotation: [0, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [1, 0, 0, 1] // Red
      },
      layer: 999
    }

    const yScaleConfig: Cube3DConfig = {
      id: 'gizmo-y-scale',
      name: 'Gizmo Y-Scale',
      dimensions: [scaleHandleSize, scaleHandleSize, scaleHandleSize],
      position: { x: 0, y: axisLength, z: 0 },
      rotation: [0, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [0, 1, 0, 1] // Green
      },
      layer: 999
    }

    const zScaleConfig: Cube3DConfig = {
      id: 'gizmo-z-scale',
      name: 'Gizmo Z-Scale',
      dimensions: [scaleHandleSize, scaleHandleSize, scaleHandleSize],
      position: { x: 0, y: 0, z: axisLength },
      rotation: [0, 0, 0],
      backgroundFill: {
        type: 'Color',
        value: [0, 0, 1, 1] // Blue
      },
      layer: 999
    }

    this.xScale = new Cube3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      xScaleConfig,
      'gizmo-sequence'
    )

    this.yScale = new Cube3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      yScaleConfig,
      'gizmo-sequence'
    )

    this.zScale = new Cube3D(
      camera.windowSize,
      gpuResources.device,
      gpuResources.queue,
      modelBindGroupLayout,
      groupBindGroupLayout,
      camera,
      zScaleConfig,
      'gizmo-sequence'
    )

    const xScaleBody = this.physics.createStaticBox(
      new this.physics.jolt.RVec3(axisLength, 0, 0),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      new this.physics.jolt.Vec3(scaleHandleSize, scaleHandleSize, scaleHandleSize)
    )
    this.bodies.push(xScaleBody)

    const yScaleBody = this.physics.createStaticBox(
      new this.physics.jolt.RVec3(0, axisLength, 0),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      new this.physics.jolt.Vec3(scaleHandleSize, scaleHandleSize, scaleHandleSize)
    )
    this.bodies.push(yScaleBody)

    const zScaleBody = this.physics.createStaticBox(
      new this.physics.jolt.RVec3(0, 0, axisLength),
      new this.physics.jolt.Quat(0, 0, 0, 1),
      new this.physics.jolt.Vec3(scaleHandleSize, scaleHandleSize, scaleHandleSize)
    )
    this.bodies.push(zScaleBody)
  }

  attach(target: Transform) {
    this.target = target
  }

  detach() {
    this.target = null
  }

  update(queue: PolyfillQueue, camera: Camera3D, latestTarget: Transform | null) {
    this.target = latestTarget
    if (this.target) {
      this.xAxis.hidden = false
      this.yAxis.hidden = false
      this.zAxis.hidden = false
      this.xRing.hidden = false
      this.yRing.hidden = false
      this.zRing.hidden = false
      this.xScale.hidden = false
      this.yScale.hidden = false
      this.zScale.hidden = false

      this.xAxis.transform.position = this.target.position
      this.yAxis.transform.position = this.target.position
      this.zAxis.transform.position = this.target.position
      this.xRing.transform.position = this.target.position
      this.yRing.transform.position = this.target.position
      this.zRing.transform.position = this.target.position
      this.xScale.transform.position = this.target.position
      this.yScale.transform.position = this.target.position
      this.zScale.transform.position = this.target.position

      this.xAxis.transform.rotation = this.target.rotation
      this.yAxis.transform.rotation = this.target.rotation
      this.zAxis.transform.rotation = this.target.rotation
      this.xRing.transform.rotation = this.target.rotation
      this.yRing.transform.rotation = this.target.rotation
      this.zRing.transform.rotation = this.target.rotation
      this.xScale.transform.rotation = this.target.rotation
      this.yScale.transform.rotation = this.target.rotation
      this.zScale.transform.rotation = this.target.rotation

      this.xAxis.transform.updateUniformBuffer(queue, camera.windowSize)
      this.yAxis.transform.updateUniformBuffer(queue, camera.windowSize)
      this.zAxis.transform.updateUniformBuffer(queue, camera.windowSize)
      this.xRing.transform.updateUniformBuffer(queue, camera.windowSize)
      this.yRing.transform.updateUniformBuffer(queue, camera.windowSize)
      this.zRing.transform.updateUniformBuffer(queue, camera.windowSize)
      this.xScale.transform.updateUniformBuffer(queue, camera.windowSize)
      this.yScale.transform.updateUniformBuffer(queue, camera.windowSize)
      this.zScale.transform.updateUniformBuffer(queue, camera.windowSize)

      // Update physics bodies
      const position = new this.physics.jolt.RVec3(
        this.target.position[0],
        this.target.position[1],
        this.target.position[2]
      )
      const rotation = new this.physics.jolt.Quat(0, 0, 0, 1) // Assuming no rotation for gizmo bodies
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[0].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[1].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[2].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[3].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[4].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[5].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[6].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[7].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
      this.physics.bodyInterface.SetPositionAndRotation(
        this.bodies[8].GetID(),
        position,
        rotation,
        this.physics.jolt.EActivation_Activate
      )
    } else {
      this.xAxis.hidden = true
      this.yAxis.hidden = true
      this.zAxis.hidden = true
      this.xRing.hidden = true
      this.yRing.hidden = true
      this.zRing.hidden = true
      this.xScale.hidden = true
      this.yScale.hidden = true
      this.zScale.hidden = true
    }
  }
}

import { Cube3D, Cube3DConfig } from './cube3d'
import { Camera3D } from './3dcamera'
import { GPUPolyfill, PolyfillQueue } from './polyfill'
import { Transform } from './transform'

export class Gizmo {
  xAxis: Cube3D
  yAxis: Cube3D
  zAxis: Cube3D
  target: Transform | null = null

  constructor(
    gpuResources: GPUPolyfill,
    camera: Camera3D,
    modelBindGroupLayout: any,
    groupBindGroupLayout: any
  ) {
    const axisLength = 2
    const axisRadius = 0.05

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
  }

  attach(target: Transform) {
    this.target = target
  }

  detach() {
    this.target = null
  }

  update(queue: PolyfillQueue, camera: Camera3D) {
    if (this.target) {
      this.xAxis.hidden = false
      this.yAxis.hidden = false
      this.zAxis.hidden = false

      this.xAxis.transform.position = this.target.position
      this.yAxis.transform.position = this.target.position
      this.zAxis.transform.position = this.target.position

      this.xAxis.transform.rotation = this.target.rotation
      this.yAxis.transform.rotation = this.target.rotation
      this.zAxis.transform.rotation = this.target.rotation

      this.xAxis.transform.updateUniformBuffer(queue, camera.windowSize)
      this.yAxis.transform.updateUniformBuffer(queue, camera.windowSize)
      this.zAxis.transform.updateUniformBuffer(queue, camera.windowSize)
    } else {
      this.xAxis.hidden = true
      this.yAxis.hidden = true
      this.zAxis.hidden = true
    }
  }
}

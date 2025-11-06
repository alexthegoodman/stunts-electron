import { SavedVoxelConfig, Voxel, VoxelConfig, VoxelType } from '@renderer/engine/voxel'
import { v4 as uuidv4 } from 'uuid'

export interface SavedVoxelComponent {
  id: string
  name: string
  voxels: SavedVoxelConfig[]
}

export default class VoxelComponent {
  public id: string
  public name: string = 'VoxelComponent'
  public voxels: Voxel[] = []

  constructor(
    windowSize,
    device,
    queue,
    modelBindGroupLayout,
    groupBindGroupLayout,
    camera,
    saved_sequence_id,
    initialConfig?: SavedVoxelComponent
  ) {
    if (initialConfig) {
      this.id = initialConfig.id
      this.name = initialConfig.name

      this.voxels = initialConfig.voxels.map((v) => {
        let vx = new Voxel(
          windowSize,
          device!,
          queue!,
          modelBindGroupLayout,
          groupBindGroupLayout,
          camera,
          v,
          saved_sequence_id
        )

        return vx
      })
    } else {
      this.id = uuidv4()

      const voxel_config: VoxelConfig = {
        id: uuidv4(),
        name: 'SeedVoxel',
        dimensions: [1, 1, 1],
        position: {
          x: 0,
          y: 0,
          z: 0
        },
        rotation: [0, 0, 0],
        backgroundFill: {
          type: 'Color',
          value: [1, 1, 1, 1]
        },
        layer: 0,
        voxelType: VoxelType.StandardVoxel
      }

      let seedVoxel = new Voxel(
        windowSize,
        device!,
        queue!,
        modelBindGroupLayout,
        groupBindGroupLayout,
        camera,
        voxel_config,
        saved_sequence_id
      )

      this.voxels.push(seedVoxel)
    }
  }

  toSavedConfig(): SavedVoxelComponent {
    return {
      id: this.id,
      name: this.name,
      voxels: this.voxels.map((v) => v.toSavedConfig())
    }
  }
}

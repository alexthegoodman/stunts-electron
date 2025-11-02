import Jolt from 'jolt-physics/debug-wasm-compat'

export class Physics {
  jolt: typeof Jolt
  physicsSystem: Jolt.PhysicsSystem
  bodyInterface: Jolt.BodyInterface
  joltInterface: Jolt.JoltInterface
  ObjectLayer_NonMoving: Jolt.BroadPhaseLayer
  ObjectLayer_Moving: Jolt.BroadPhaseLayer

  constructor() {}

  public async initialize(): Promise<void> {
    this.jolt = await Jolt()
    const jolt = this.jolt

    // Initialize Jolt
    const settings = new jolt.JoltSettings()

    // Configure object layers
    const objectLayerPairFilter = new jolt.ObjectLayerPairFilterTable(2)
    objectLayerPairFilter.EnableCollision(0, 1)
    objectLayerPairFilter.EnableCollision(1, 1)

    const broadPhaseLayerInterface = new jolt.BroadPhaseLayerInterfaceTable(2, 2)
    this.ObjectLayer_NonMoving = new jolt.BroadPhaseLayer(0)
    this.ObjectLayer_Moving = new jolt.BroadPhaseLayer(1)
    broadPhaseLayerInterface.MapObjectToBroadPhaseLayer(0, this.ObjectLayer_NonMoving)
    broadPhaseLayerInterface.MapObjectToBroadPhaseLayer(1, this.ObjectLayer_Moving)

    settings.mObjectLayerPairFilter = objectLayerPairFilter
    settings.mBroadPhaseLayerInterface = broadPhaseLayerInterface
    settings.mObjectVsBroadPhaseLayerFilter = new jolt.ObjectVsBroadPhaseLayerFilterTable(
      settings.mBroadPhaseLayerInterface,
      2,
      settings.mObjectLayerPairFilter,
      2
    )

    this.joltInterface = new jolt.JoltInterface(settings)
    this.physicsSystem = this.joltInterface.GetPhysicsSystem()
    this.bodyInterface = this.physicsSystem.GetBodyInterface()
  }

  public createStaticBox(position: Jolt.RVec3, rotation: Jolt.Quat, size: Jolt.Vec3): Jolt.Body {
    const shape = new this.jolt.BoxShape(size, 0.05, null)
    const creationSettings = new this.jolt.BodyCreationSettings(
      shape,
      position,
      rotation,
      this.jolt.EMotionType_Static,
      this.ObjectLayer_NonMoving.GetValue()
    )
    const body = this.bodyInterface.CreateBody(creationSettings)
    this.bodyInterface.AddBody(body.GetID(), this.jolt.EActivation_DontActivate)
    return body
  }

  public createDynamicBox(position: Jolt.RVec3, rotation: Jolt.Quat, size: Jolt.Vec3): Jolt.Body {
    const shape = new this.jolt.BoxShape(size, 0.05, null)
    const creationSettings = new this.jolt.BodyCreationSettings(
      shape,
      position,
      rotation,
      this.jolt.EMotionType_Dynamic,
      this.ObjectLayer_Moving.GetValue()
    )
    const body = this.bodyInterface.CreateBody(creationSettings)
    this.bodyInterface.AddBody(body.GetID(), this.jolt.EActivation_Activate)
    return body
  }

  public step(deltaTime: number): void {
    this.joltInterface.Step(deltaTime, 1)
  }

  public getBodyPositionAndRotation(body: Jolt.Body): {
    position: Jolt.RVec3
    rotation: Jolt.Quat
  } {
    const position = body.GetPosition()
    const rotation = body.GetRotation()
    return { position, rotation }
  }
}

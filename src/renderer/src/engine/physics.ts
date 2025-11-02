import Jolt from 'jolt-physics/debug-wasm-compat'

export class Physics {
  private jolt: typeof Jolt
  settings: Jolt.JoltSettings
  interface: Jolt.JoltInterface
  ObjectLayer_NonMoving: number = 0
  ObjectLayer_Moving: number = 1
  private physicsSystem: Jolt.PhysicsSystem
  private bodyInterface: Jolt.BodyInterface

  constructor() {}

  public async initialize(): Promise<void> {
    this.jolt = await Jolt()
    this.settings = new this.jolt.JoltSettings()
    this.interface = new this.jolt.JoltInterface(this.settings)

    const jolt = this.jolt

    // Initialize Jolt

    const physicsSystem = new jolt.PhysicsSystem()
    // physicsSystem.Init(settings);

    this.physicsSystem = physicsSystem
    this.bodyInterface = physicsSystem.GetBodyInterface()
  }

  public createStaticBox(position: Jolt.RVec3, rotation: Jolt.Quat, size: Jolt.Vec3): Jolt.Body {
    const shape = new this.jolt.BoxShape(size, 0.05, null)
    const creationSettings = new this.jolt.BodyCreationSettings(
      shape,
      position,
      rotation,
      this.jolt.EMotionType_Static,
      this.ObjectLayer_NonMoving
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
      this.ObjectLayer_Moving
    )
    const body = this.bodyInterface.CreateBody(creationSettings)
    this.bodyInterface.AddBody(body.GetID(), this.jolt.EActivation_Activate)
    return body
  }

  public step(deltaTime: number): void {
    this.interface.Step(deltaTime, 1)
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

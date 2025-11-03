import Jolt from 'jolt-physics/debug-wasm-compat'
import { degreesToRadians } from './transform'

export class Physics {
  jolt: typeof Jolt
  physicsSystem: Jolt.PhysicsSystem
  bodyInterface: Jolt.BodyInterface
  joltInterface: Jolt.JoltInterface
  updateSettings: Jolt.ExtendedUpdateSettings
  ObjectLayer_NonMoving: Jolt.BroadPhaseLayer
  ObjectLayer_Moving: Jolt.BroadPhaseLayer
  movingBPFilter: Jolt.BroadPhaseLayerFilter
  movingLayerFilter: Jolt.ObjectLayerFilter
  bodyFilter: Jolt.BodyFilter
  shapeFilter: Jolt.ShapeFilter

  contactAddListeners: ((
    character,
    bodyID2,
    subShapeID2,
    contactPosition,
    contactNormal,
    settings
  ) => void)[] = []

  constructor() {}

  public async initialize(): Promise<void> {
    this.jolt = await Jolt()
    const jolt = this.jolt

    // Initialize Jolt
    const settings = new jolt.JoltSettings()
    const updateSettings = new jolt.ExtendedUpdateSettings()

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

    const movingBPFilter = new jolt.DefaultBroadPhaseLayerFilter(
      settings.mObjectVsBroadPhaseLayerFilter,
      this.ObjectLayer_Moving.GetValue()
    )
    const movingLayerFilter = new jolt.DefaultObjectLayerFilter(
      objectLayerPairFilter,
      this.ObjectLayer_Moving.GetValue()
    )
    const bodyFilter = new jolt.BodyFilter()
    const shapeFilter = new jolt.ShapeFilter()

    this.joltInterface = new jolt.JoltInterface(settings)
    this.physicsSystem = this.joltInterface.GetPhysicsSystem()
    this.bodyInterface = this.physicsSystem.GetBodyInterface()
    this.updateSettings = updateSettings
    this.movingBPFilter = movingBPFilter
    this.movingLayerFilter = movingLayerFilter
    this.bodyFilter = bodyFilter
    this.shapeFilter = shapeFilter
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
    this.bodyInterface.AddBody(body.GetID(), this.jolt.EActivation_Activate)
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

  public createDynamicSphere(position: Jolt.RVec3, rotation: Jolt.Quat, size: number): Jolt.Body {
    const shape = new this.jolt.SphereShape(size, null)
    const creationSettings = new this.jolt.BodyCreationSettings(
      shape,
      position,
      rotation,
      this.jolt.EMotionType_Dynamic,
      this.ObjectLayer_Moving.GetValue()
    )

    // TODO: later maybe set these depending on things
    // Enable continuous collision detection for fast-moving projectiles
    creationSettings.mMotionQuality = this.jolt.EMotionQuality_LinearCast

    // Reduce friction so it doesn't stick to surfaces
    creationSettings.mFriction = 0.0

    // Reduce bounciness (restitution) if you don't want it to bounce much
    creationSettings.mRestitution = 0.3

    const body = this.bodyInterface.CreateBody(creationSettings)
    this.bodyInterface.AddBody(body.GetID(), this.jolt.EActivation_Activate)
    return body
  }

  public runContactAddedListeners(
    character,
    bodyID2,
    subShapeID2,
    contactPosition,
    contactNormal,
    settings
  ) {
    for (let index = 0; index < this.contactAddListeners.length; index++) {
      const listener = this.contactAddListeners[index]
      listener(character, bodyID2, subShapeID2, contactPosition, contactNormal, settings)
    }
  }

  public createVirtualCharacter(
    position: Jolt.RVec3,
    rotation: Jolt.Quat,
    characterHeight: number,
    characterRadius: number
  ): Jolt.CharacterVirtual {
    const jolt = this.jolt

    const characterSettings = new jolt.CharacterVirtualSettings()
    characterSettings.mMass = 1000
    characterSettings.mMaxSlopeAngle = degreesToRadians(45.0)
    characterSettings.mMaxStrength = 100.0

    const standingShape = new jolt.RotatedTranslatedShapeSettings(
      new jolt.Vec3(0, 0.5 * characterHeight + characterRadius, 0),
      jolt.Quat.prototype.sIdentity(),
      new jolt.CapsuleShapeSettings(0.5 * characterHeight, characterRadius)
    )
      .Create()
      .Get()

    characterSettings.mShape = standingShape
    characterSettings.mBackFaceMode = jolt.EBackFaceMode_CollideWithBackFaces
    characterSettings.mCharacterPadding = 0.02
    characterSettings.mPenetrationRecoverySpeed = 1.0
    characterSettings.mPredictiveContactDistance = 0.1
    characterSettings.mSupportingVolume = new jolt.Plane(
      jolt.Vec3.prototype.sAxisY(),
      -characterRadius
    )

    const character = new jolt.CharacterVirtual(
      characterSettings,
      position,
      rotation,
      this.physicsSystem
    )

    // You might want to set a listener for character contacts here, similar to the example

    const characterContactListener = new jolt.CharacterContactListenerJS()
    characterContactListener.OnAdjustBodyVelocity = (
      character,
      body2,
      linearVelocity,
      angularVelocity
    ) => {
      // body2 = Jolt.wrapPointer(body2, Jolt.Body)
      // linearVelocity = Jolt.wrapPointer(linearVelocity, Jolt.Vec3)
      // // Apply artificial velocity to the character when standing on the conveyor belt
      // if (body2.GetID().GetIndexAndSequenceNumber() == conveyorBeltObjectId) {
      //   linearVelocity.SetX(linearVelocity.GetX() + 5)
      // }
    }
    characterContactListener.OnContactValidate = (character, bodyID2, subShapeID2) => {
      // bodyID2 = Jolt.wrapPointer(bodyID2, Jolt.BodyID)
      // character = Jolt.wrapPointer(character, Jolt.CharacterVirtual)
      // if (bodyID2.GetIndexAndSequenceNumber() == lavaObjectId) isInLava = true // Can't modify velocity or position at this point, marking that we want to teleport
      return true
    }
    characterContactListener.OnCharacterContactValidate = (
      character,
      otherCharacter,
      subShapeID2
    ) => {
      return true
    }
    characterContactListener.OnContactAdded = (
      character,
      bodyID2,
      subShapeID2,
      contactPosition,
      contactNormal,
      settings
    ) => {
      console.info('characterContactListener.OnContactAdded', character)
      this.runContactAddedListeners(
        character,
        bodyID2,
        subShapeID2,
        contactPosition,
        contactNormal,
        settings
      )
    }
    characterContactListener.OnContactPersisted = (
      character,
      bodyID2,
      subShapeID2,
      contactPosition,
      contactNormal,
      settings
    ) => {}
    characterContactListener.OnContactRemoved = (character, bodyID2, subShapeID2) => {}
    characterContactListener.OnCharacterContactAdded = (
      character,
      otherCharacter,
      subShapeID2,
      contactPosition,
      contactNormal,
      settings
    ) => {}
    characterContactListener.OnCharacterContactPersisted = (
      character,
      otherCharacter,
      subShapeID2,
      contactPosition,
      contactNormal,
      settings
    ) => {}
    characterContactListener.OnCharacterContactRemoved = (
      character,
      otherCharacterID,
      subShapeID2
    ) => {}
    characterContactListener.OnContactSolve = (
      character,
      bodyID2,
      subShapeID2,
      contactPosition,
      contactNormal,
      contactVelocity,
      contactMaterial,
      characterVelocity,
      newCharacterVelocity
    ) => {
      // // Don't allow the player to slide down static not-too-steep surfaces when not actively moving and when not on a moving platform
      // character = Jolt.wrapPointer(character, Jolt.CharacterVirtual)
      // contactVelocity = Jolt.wrapPointer(contactVelocity, Jolt.Vec3)
      // newCharacterVelocity = Jolt.wrapPointer(newCharacterVelocity, Jolt.Vec3)
      // contactNormal = Jolt.wrapPointer(contactNormal, Jolt.Vec3)
      // if (
      //   !allowSliding &&
      //   contactVelocity.IsNearZero() &&
      //   !character.IsSlopeTooSteep(contactNormal)
      // ) {
      //   newCharacterVelocity.SetX(0)
      //   newCharacterVelocity.SetY(0)
      //   newCharacterVelocity.SetZ(0)
      // }
    }
    characterContactListener.OnCharacterContactSolve = (
      character,
      otherCharacter,
      subShapeID2,
      contactPosition,
      contactNormal,
      contactVelocity,
      contactMaterial,
      characterVelocity,
      newCharacterVelocity
    ) => {}

    character.SetListener(characterContactListener)

    return character
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

  public getCharacterPositionAndRotation(body: Jolt.CharacterVirtual): {
    position: Jolt.RVec3
    rotation: Jolt.Quat
  } {
    const position = body.GetPosition()
    const rotation = body.GetRotation()
    return { position, rotation }
  }
}

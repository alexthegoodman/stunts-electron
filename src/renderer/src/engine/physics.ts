import Jolt from 'jolt-physics/debug-wasm-compat'
import { degreesToRadians } from './transform'
import { Editor } from './editor'
import { VoxelType, WaterVoxel } from './voxel'
import { GameNode } from '@renderer/components/stunts-app/GameLogic'

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
  nonmovingBPFilter: Jolt.BroadPhaseLayerFilter
  nonmovingLayerFilter: Jolt.ObjectLayerFilter
  bodyFilter: Jolt.BodyFilter
  shapeFilter: Jolt.ShapeFilter

  mainCharacterId: number

  contactAddListeners: ((
    character,
    bodyID2,
    subShapeID2,
    contactPosition,
    contactNormal,
    settings
  ) => void)[] = []

  primaryContactAddListeners: ((body1, body2, manifold, settings) => void)[] = []

  constructor() {}

  public async initialize(
    editor: Editor,
    setNodes: React.Dispatch<React.SetStateAction<GameNode[]>>
  ): Promise<void> {
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

    const nonmovingBPFilter = new jolt.DefaultBroadPhaseLayerFilter(
      settings.mObjectVsBroadPhaseLayerFilter,
      this.ObjectLayer_NonMoving.GetValue()
    )
    const nonmovingLayerFilter = new jolt.DefaultObjectLayerFilter(
      objectLayerPairFilter,
      this.ObjectLayer_NonMoving.GetValue()
    )

    const bodyFilter = new jolt.BodyFilter()
    const shapeFilter = new jolt.ShapeFilter()

    this.joltInterface = new jolt.JoltInterface(settings)
    this.physicsSystem = this.joltInterface.GetPhysicsSystem()
    this.bodyInterface = this.physicsSystem.GetBodyInterface()
    this.updateSettings = updateSettings
    this.movingBPFilter = movingBPFilter
    this.movingLayerFilter = movingLayerFilter
    this.nonmovingBPFilter = nonmovingBPFilter
    this.nonmovingLayerFilter = nonmovingLayerFilter
    this.bodyFilter = bodyFilter
    this.shapeFilter = shapeFilter

    const contactListener = new this.jolt.ContactListenerJS()
    contactListener.OnContactAdded = (body1, body2, manifold, settings) => {
      this.runPrimaryContactAddedListeners(body1, body2, manifold, settings)
      this.addGlobalContactAddedListener(editor, setNodes)(body1, body2, manifold, settings) // no need to run on Persisted (should not persist)
    }
    contactListener.OnContactPersisted = contactListener.OnContactAdded
    contactListener.OnContactValidate = (body1, body2, baseOffset, collideShapeResult) => {
      return Jolt.ValidateResult_AcceptAllContactsForThisBodyPair
    }
    contactListener.OnContactRemoved = (subShapePair) => {}
    this.physicsSystem.SetContactListener(contactListener)
  }

  addGlobalContactAddedListener(
    editor: Editor,
    setNodes: React.Dispatch<React.SetStateAction<GameNode[]>>
  ) {
    return (body1: number, body2: number, manifold: number, settings: number) => {
      const isProjectile = (bodyId: string) => {
        const projectile = editor.spheres3D.find((s) => s.id === bodyId)
        return projectile && projectile.name === 'Projectile'
      }
      const isEnemy = (bodyId: string) => {
        const enemy = editor.cubes3D.find((c) => c.id === bodyId)
        return enemy && enemy.name === 'EnemyCharacter'
      }
      const isPlayer = (bodyId: string) => {
        const player = editor.cubes3D.find((c) => c.id === bodyId)
        return player && player.name === 'PlayerCharacter'
      }

      let body1x = editor.physics.jolt.wrapPointer(body1, editor.physics.jolt.Body)
      let body2x = editor.physics.jolt.wrapPointer(body2, editor.physics.jolt.Body)

      // expensive extraction of uuid / matching of body
      let gameBodyId1: string | undefined
      let gameBodyId2: string | undefined
      for (const [id, body] of editor.bodies.entries()) {
        if (
          body.GetID().GetIndexAndSequenceNumber() === body1x.GetID().GetIndexAndSequenceNumber()
        ) {
          gameBodyId1 = id
          break
        }
        if (
          body.GetID().GetIndexAndSequenceNumber() === body2x.GetID().GetIndexAndSequenceNumber()
        ) {
          gameBodyId2 = id
          break
        }
      }

      const b1Id = gameBodyId1
      const b2Id = gameBodyId2

      if ((isProjectile(b1Id) && isEnemy(b2Id)) || (isProjectile(b2Id) && isEnemy(b1Id))) {
        const enemyId = isEnemy(b1Id) ? b1Id : b2Id
        const enemyNode = editor.nodes.find((n) => n.id === `${enemyId}-7`)
        if (enemyNode && typeof enemyNode.data.health === 'number') {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === enemyNode.id) {
                console.warn('MINUS 10 HEALTH on ENEMY')
                return { ...n, data: { ...n.data, health: n.data.health - 10 } }
              }
              return n
            })
          )
        }
      } else if ((isProjectile(b1Id) && isPlayer(b2Id)) || (isProjectile(b2Id) && isPlayer(b1Id))) {
        const playerNode = editor.nodes.find((n) => n.data.label === 'PlayerController')
        if (playerNode && typeof playerNode.data.health === 'number') {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id === playerNode.id) {
                console.warn('MINUS 10 HEALTH on PLAYER')
                return { ...n, data: { ...n.data, health: n.data.health - 10 } }
              }
              return n
            })
          )
        }
      }
    }
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

    // can cause things to easily tip over
    // const massProperties = new this.jolt.MassProperties()
    // massProperties.mMass = 0.8 // Medium heavy
    // creationSettings.mOverrideMassProperties = this.jolt.EOverrideMassProperties_CalculateInertia
    // creationSettings.mMassPropertiesOverride = massProperties

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
    creationSettings.mFriction = 0.1

    // Reduce bounciness (restitution) if you don't want it to bounce much
    creationSettings.mRestitution = 0.3

    // set custom mass
    const massProperties = new this.jolt.MassProperties()
    massProperties.mMass = 0.3 // Light projectile (in kg)
    creationSettings.mOverrideMassProperties = this.jolt.EOverrideMassProperties_CalculateInertia
    creationSettings.mMassPropertiesOverride = massProperties

    const body = this.bodyInterface.CreateBody(creationSettings)
    this.bodyInterface.AddBody(body.GetID(), this.jolt.EActivation_Activate)
    return body
  }

  public createStaticTorus(
    position: Jolt.RVec3,
    rotation: Jolt.Quat,
    radius: number,
    tubeRadius: number,
    plane: string = 'x'
  ): Jolt.Body {
    const jolt = this.jolt

    // Generate torus mesh geometry
    const segments = 32 // Match your Torus3D default
    const { vertices, indices } = this.generateTorusMesh(radius, tubeRadius, segments, plane)

    // Create triangles directly
    const triangleList = new jolt.TriangleList()

    for (let i = 0; i < indices.length; i += 3) {
      const v1 = vertices[indices[i]]
      const v2 = vertices[indices[i + 1]]
      const v3 = vertices[indices[i + 2]]

      const triangle = new jolt.Triangle(
        new jolt.Vec3(v1[0], v1[1], v1[2]),
        new jolt.Vec3(v2[0], v2[1], v2[2]),
        new jolt.Vec3(v3[0], v3[1], v3[2])
      )
      triangleList.push_back(triangle)
    }

    // Create mesh shape from triangles
    const meshSettings = new jolt.MeshShapeSettings(triangleList)
    const shape = meshSettings.Create().Get()

    const creationSettings = new jolt.BodyCreationSettings(
      shape,
      position,
      rotation,
      jolt.EMotionType_Static,
      this.ObjectLayer_NonMoving.GetValue()
    )

    const body = this.bodyInterface.CreateBody(creationSettings)
    this.bodyInterface.AddBody(body.GetID(), jolt.EActivation_Activate)

    return body
  }

  private generateTorusMesh(
    radius: number,
    tubeRadius: number,
    segments: number,
    plane: string
  ): { vertices: number[][]; indices: number[] } {
    const vertices: number[][] = []
    const indices: number[] = []
    const majorSegments = segments
    const minorSegments = segments

    for (let i = 0; i <= majorSegments; i++) {
      const majorAngle = (i / majorSegments) * 2 * Math.PI
      const cosMajor = Math.cos(majorAngle)
      const sinMajor = Math.sin(majorAngle)

      for (let j = 0; j <= minorSegments; j++) {
        const minorAngle = (j / minorSegments) * 2 * Math.PI
        const cosMinor = Math.cos(minorAngle)
        const sinMinor = Math.sin(minorAngle)

        let x = (radius + tubeRadius * cosMinor) * cosMajor
        let y = tubeRadius * sinMinor
        let z = (radius + tubeRadius * cosMinor) * sinMajor

        // Rotate torus based on plane
        if (plane === 'y') {
          // Rotate 90° around X to make it horizontal (XZ plane)
          ;[x, y, z] = [x, -z, y]
        } else if (plane === 'z') {
          // Rotate 90° around Y to make it vertical (XY plane)
          ;[x, y, z] = [z, y, x]
        }
        // plane === 'x' is default orientation (YZ plane)

        vertices.push([x, y, z])
      }
    }

    // Generate indices (same as your Torus3D)
    for (let i = 0; i < majorSegments; i++) {
      for (let j = 0; j < minorSegments; j++) {
        const first = i * (minorSegments + 1) + j
        const second = first + minorSegments + 1

        indices.push(first, second, first + 1)
        indices.push(second, second + 1, first + 1)
      }
    }

    return { vertices, indices }
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

  public runPrimaryContactAddedListeners(body1, body2, manifold, settings) {
    for (let index = 0; index < this.primaryContactAddListeners.length; index++) {
      const listener = this.primaryContactAddListeners[index]
      listener(body1, body2, manifold, settings)
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

  public step(editor: Editor, deltaTime: number): void {
    this.joltInterface.Step(deltaTime, 1)

    editor.characters.entries().forEach(([id, ch]) => {
      let associatedBody = editor.bodies.get(id)
      let bodyPosition = associatedBody.GetPosition()
      ch.SetPosition(
        new editor.physics.jolt.RVec3(bodyPosition.GetX(), bodyPosition.GetY(), bodyPosition.GetZ())
      )
    })

    editor.voxels
      .filter((v) => v.voxelType === VoxelType.WaterVoxel)
      .forEach((wv) => {
        ;(wv as WaterVoxel).update(deltaTime)
      })
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

  // public raycast(origin: Jolt.RVec3, direction: Jolt.Vec3): Jolt.BodyID | null {
  //   const jolt = this.jolt
  //   const physicsSystem = this.physicsSystem

  //   const query = physicsSystem.GetNarrowPhaseQuery()

  //   const ray = new jolt.RRayCast()
  //   ray.mOrigin = origin
  //   ray.mDirection = direction

  //   const collector = new jolt.CastRayClosestHitCollisionCollector()

  //   query.CastRay(
  //     ray,
  //     new jolt.RayCastSettings(),
  //     collector,
  //     this.movingBPFilter,
  //     this.movingLayerFilter,
  //     this.bodyFilter,
  //     this.shapeFilter
  //   )

  //   if (collector.HadHit()) {
  //     return collector.mHit.mBodyID
  //   }

  //   return null
  // }

  public raycast(
    origin: Jolt.RVec3,
    direction: Jolt.Vec3
  ): { bodyId: Jolt.BodyID; fraction: number; position: Jolt.RVec3; normal: Jolt.Vec3 } | null {
    const jolt = this.jolt
    const physicsSystem = this.physicsSystem
    const query = physicsSystem.GetNarrowPhaseQuery()

    const ray = new jolt.RRayCast()
    ray.mOrigin = origin
    ray.mDirection = direction

    // Raycast against moving objects
    const movingCollector = new jolt.CastRayClosestHitCollisionCollector()
    query.CastRay(
      ray,
      new jolt.RayCastSettings(),
      movingCollector,
      this.movingBPFilter,
      this.movingLayerFilter,
      this.bodyFilter,
      this.shapeFilter
    )

    const nonMovingCollector = new jolt.CastRayClosestHitCollisionCollector()
    query.CastRay(
      ray,
      new jolt.RayCastSettings(),
      nonMovingCollector,
      this.nonmovingBPFilter,
      this.nonmovingLayerFilter,
      this.bodyFilter,
      this.shapeFilter
    )

    // Find the closest hit
    let closestHit = null
    let closestFraction = Infinity

    if (movingCollector.HadHit()) {
      const fraction = movingCollector.mHit.mFraction
      if (fraction < closestFraction) {
        closestFraction = fraction
        closestHit = movingCollector.mHit
      }
    }

    if (nonMovingCollector.HadHit()) {
      const fraction = nonMovingCollector.mHit.mFraction
      if (fraction < closestFraction) {
        closestFraction = fraction
        closestHit = nonMovingCollector.mHit
      }
    }

    if (closestHit) {
      const hitPosition = new jolt.RVec3(
        origin.GetX() + direction.GetX() * closestHit.mFraction,
        origin.GetY() + direction.GetY() * closestHit.mFraction,
        origin.GetZ() + direction.GetZ() * closestHit.mFraction
      )

      // Get the surface normal at the hit point
      // The hit contains mSubShapeID2 which identifies the shape that was hit
      const bodyLockInterface = physicsSystem.GetBodyLockInterface()
      const body = bodyLockInterface.TryGetBody(closestHit.mBodyID)

      // Get the surface normal using GetSurfaceNormal
      const worldSpaceNormal = body.GetWorldSpaceSurfaceNormal(closestHit.mSubShapeID2, hitPosition)

      // bodyLockInterface.UnlockRead(bodyLockRead)

      return {
        bodyId: closestHit.mBodyID,
        fraction: closestHit.mFraction,
        position: hitPosition,
        normal: worldSpaceNormal
      }
    }

    return null
  }
}

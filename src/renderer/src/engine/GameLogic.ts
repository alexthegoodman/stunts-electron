import { Editor } from './editor'
import { Node } from '@xyflow/react'
import { Sphere3DConfig } from './sphere3d'
import { v4 as uuidv4 } from 'uuid'
import { GameNode } from '@renderer/components/stunts-app/GameEditor'
import Jolt from 'jolt-physics/debug-wasm-compat'
import { CanvasPipeline } from './pipeline'
import { vec3 } from 'gl-matrix'

export class GameLogic {
  private setNodes: React.Dispatch<React.SetStateAction<GameNode[]>>
  private editor: Editor
  private pipeline: CanvasPipeline
  private lastShotTime: number = 0
  private enemyMoveDirections: Map<string, Jolt.Vec3> = new Map()
  private enemyLastMoveTime: Map<string, number> = new Map()
  private readonly MOVE_INTERVAL = 2000 // 2 seconds

  constructor(
    editor: Editor,
    pipeline: CanvasPipeline,
    setNodes: React.Dispatch<React.SetStateAction<GameNode[]>>
  ) {
    this.setNodes = setNodes
    this.editor = editor
    this.pipeline = pipeline
    this.editor.physics.contactAddListeners.push(this.OnContactAdded.bind(this))
  }

  // example args: `21444976 1257504 1257512 1039936 1039920 1040746`
  /**
   * From the original Jolt Docs:
   * OnContactAdded()
      virtual void CharacterContactListener::OnContactAdded	(	const CharacterVirtual *	inCharacter,
      const BodyID &	inBodyID2,
      const SubShapeID &	inSubShapeID2,
      RVec3Arg	inContactPosition,
      Vec3Arg	inContactNormal,
      CharacterContactSettings &	ioSettings )
      inlinevirtual
      Called whenever the character collides with a body for the first time.

      Parameters
      inCharacter	Character that is being solved
      inBodyID2	Body ID of body that is being hit
      inSubShapeID2	Sub shape ID of shape that is being hit
      inContactPosition	World space contact position
      inContactNormal	World space contact normal
      ioSettings	Settings returned by the contact callback to indicate how the character should behave
   */
  OnContactAdded = (
    character: number,
    bodyID2: number,
    subShapeID2: number,
    contactPosition: number,
    contactNormal: number,
    settings: number
  ) => {
    // const b1 = character
    // const b2 = bodyID2

    // console.info(
    //   'OnContactAdded raw params:',
    //   character,
    //   bodyID2,
    //   subShapeID2,
    //   contactPosition,
    //   contactNormal,
    //   settings
    // )

    let bodyID2wrap = this.editor.physics.jolt.wrapPointer(bodyID2, this.editor.physics.jolt.BodyID)
    let characterWrap = this.editor.physics.jolt.wrapPointer(
      character,
      this.editor.physics.jolt.CharacterVirtual
    )

    // console.info('bodyID2wrap characteWrap', bodyID2wrap, characterWrap)

    let gameCharacterId: string | undefined
    for (const [id, char] of this.editor.characters.entries()) {
      // console.info('char.GetID().GetValue()', char.GetID())
      if (char.GetID().GetValue() === characterWrap.GetID().GetValue()) {
        gameCharacterId = id
        break
      }
    }

    let gameBodyId2: string | undefined
    for (const [id, body] of this.editor.bodies.entries()) {
      if (body.GetID().GetIndex() === bodyID2wrap.GetIndex()) {
        gameBodyId2 = id
        break
      }
    }

    console.info('Mapped IDs:', 'gameCharacterId:', gameCharacterId, 'gameBodyId2:', gameBodyId2)

    const isProjectile = (bodyId: string) => {
      const projectile = this.editor.spheres3D.find((s) => s.id === bodyId)
      return projectile && projectile.name === 'Projectile'
    }

    const isEnemy = (bodyId: string) => {
      const enemy = this.editor.cubes3D.find((c) => c.id === bodyId)
      return enemy && enemy.name === 'EnemyCharacter'
    }

    const isPlayer = (bodyId: string) => {
      const player = this.editor.cubes3D.find((c) => c.id === bodyId)
      return player && player.name === 'PlayerCharacter'
    }

    if (!gameCharacterId || !gameBodyId2) {
      console.warn('Could not map Jolt Physics IDs to game object IDs.')
      return
    }

    const b1Id = gameCharacterId
    const b2Id = gameBodyId2

    if ((isProjectile(b1Id) && isEnemy(b2Id)) || (isProjectile(b2Id) && isEnemy(b1Id))) {
      const enemyId = isEnemy(b1Id) ? b1Id : b2Id
      const enemyNode = this.editor.nodes.find((n) => n.id === `${enemyId}-7`)
      if (enemyNode && typeof enemyNode.data.health === 'number') {
        this.setNodes((nds) =>
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
      const playerNode = this.editor.nodes.find((n) => n.data.label === 'PlayerController')
      if (playerNode && typeof playerNode.data.health === 'number') {
        this.setNodes((nds) =>
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

    // if (isProjectile(b1Id)) {
    //   this.editor.spheres3D = this.editor.spheres3D.filter((s) => s.id !== b1Id)
    //   this.editor.bodies.delete(b1Id)
    // } else if (isProjectile(b2Id)) {
    //   this.editor.spheres3D = this.editor.spheres3D.filter((s) => s.id !== b2Id)
    //   this.editor.bodies.delete(b2Id)
    // }
  }

  update(deltaTime: number) {
    if (!this.editor) return

    const editor = this.editor
    const nodes = editor.nodes
    const enemyNodes = nodes.filter((n) => n.data.label === 'EnemyController')

    // console.info('enemyNode', enemyNodes)

    for (const enemyNode of enemyNodes) {
      const enemyId = editor.cubes3D.find(
        (c) => c.name === 'EnemyCharacter'
        // && c.id === enemyNode.id.split('-')[0] // this bad, but need some way to support multiple enemies
      )?.id
      if (!enemyId) continue

      const enemyCharacter = editor.characters.get(enemyId)
      const enemyStaticBody = editor.bodies.get(enemyId)

      const playerId = editor.cubes3D.find((c) => c.name === 'PlayerCharacter')?.id
      const playerCharacter = editor.characters.get(playerId)
      const playerStaticBody = editor.bodies.get(playerId)

      const playerPosition = vec3.fromValues(
        playerCharacter.GetPosition().GetX(),
        playerCharacter.GetPosition().GetY(),
        playerCharacter.GetPosition().GetZ()
      )
      const enemyPosition = vec3.fromValues(
        enemyCharacter.GetPosition().GetX(),
        enemyCharacter.GetPosition().GetY(),
        enemyCharacter.GetPosition().GetZ()
      )

      const playerNode = nodes.find((n) => n.data.label === 'PlayerController')

      let direction = vec3.create()
      vec3.subtract(direction, playerPosition, enemyPosition)

      // console.log('Direction:', direction[0], direction[1], direction[2])

      const length = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2)

      // console.log('Direction length:', length)

      let velocity = null

      if (length > 0.001) {
        const speed = 2
        velocity = new editor.physics.jolt.Vec3(
          (direction[0] / length) * speed,
          (direction[1] / length) * speed,
          (direction[2] / length) * speed
        )

        // console.info('projectile', velocity.GetX(), velocity.GetY(), velocity.GetZ())
      }
      // else {
      //               console.error('Cannot shoot: direction length is zero or invalid')
      //             }

      // this.pipeline.prePhysicsUpdate(this.editor, enemyCharacter, deltaTime)

      // console.info('enemyCharacter', enemyCharacter)
      // console.info('enemy x', playerPosition, enemyPosition)
      if (enemyCharacter) {
        // Random walk
        const now = Date.now()
        let moveDirection = this.enemyMoveDirections.get(enemyId)
        const lastMoveTime = this.enemyLastMoveTime.get(enemyId)

        // Shoot projectile
        // const shootNode = nodes.find((n) => n.id === `${enemyId}-9`)
        const shootNode = nodes.find((n) => n.data.label === 'ShootProjectile')
        if (shootNode) {
          const now = Date.now()
          const fireRate = (enemyNode.data.fireRate as number) ?? 1000
          if (now - this.lastShotTime > fireRate) {
            this.lastShotTime = now
            const projectileId = uuidv4()
            const projectileConfig: Sphere3DConfig = {
              id: projectileId,
              name: 'Projectile',
              radius: 0.2,
              position: {
                x: enemyPosition[0],
                y: enemyPosition[1],
                z: enemyPosition[2]
              },
              rotation: [0, 0, 0],
              backgroundFill: {
                type: 'Color',
                value: [1.0, 0.0, 0.0, 1.0]
              },
              layer: 0
            }
            editor.add_sphere3d(
              projectileConfig,
              projectileConfig.id,
              editor.currentSequenceData.id
            )
            const projectileBody = editor.physics.createDynamicSphere(
              new editor.physics.jolt.RVec3(
                projectileConfig.position.x,
                projectileConfig.position.y,
                projectileConfig.position.z
              ),
              new editor.physics.jolt.Quat(0, 0, 0, 1),
              projectileConfig.radius
            )

            editor.bodies.set(projectileId, projectileBody)
            editor.projectiles.push({ id: projectileId, creationTime: Date.now() })

            if (length > 0.001 && velocity) {
              console.info('projectile', velocity.GetX(), velocity.GetY(), velocity.GetZ())
              // projectileBody.SetLinearVelocity(velocity)
              editor.physics.bodyInterface.SetLinearVelocity(projectileBody.GetID(), velocity)
            } else {
              console.error('Cannot shoot: direction length is zero or invalid')
            }
          }
        }

        if (!moveDirection || !lastMoveTime || now - lastMoveTime > this.MOVE_INTERVAL) {
          const randomX = (Math.random() * 2 - 1) * 0.1
          const randomZ = (Math.random() * 2 - 1) * 0.1
          moveDirection = new editor.physics.jolt.Vec3(randomX, 0, randomZ)
          console.info(
            'moveDirection',
            moveDirection.GetX(),
            moveDirection.GetY(),
            moveDirection.GetZ()
          )
          this.enemyMoveDirections.set(enemyId, moveDirection)
          this.enemyLastMoveTime.set(enemyId, now)
        }

        if (
          moveDirection.GetX() !== Infinity &&
          moveDirection.GetY() !== Infinity &&
          moveDirection.GetZ() !== Infinity
        ) {
          // enemyCharacter.SetLinearVelocity(moveDirection)

          // console.info('not updating for some reason')

          this.pipeline.handleInput(
            editor,
            enemyCharacter,
            vec3.fromValues(moveDirection.GetX(), moveDirection.GetY(), moveDirection.GetZ()),
            false,
            null,
            deltaTime,
            enemyStaticBody
          )
        }
      }

      // Health logic
      const healthNode = nodes.find((n) => n.id === `${enemyId}-10`)
      if (healthNode) {
        if (typeof healthNode.data.value === 'number' && healthNode.data.value <= 0) {
          // Enemy is dead
          const enemy = editor.cubes3D.find((c) => c.id === enemyId)
          if (enemy) {
            // editor.remove_cube3d(enemy.id)
            editor.cubes3D = editor.cubes3D.filter((c) => c.id !== enemy.id)
            editor.characters.delete(enemy.id)
            this.setNodes((nds) =>
              nds.filter(
                (n) =>
                  n.id !== `${enemyId}-7` &&
                  n.id !== `${enemyId}-8` &&
                  n.id !== `${enemyId}-9` &&
                  n.id !== `${enemyId}-10`
              )
            )
          }
        }
      }
    }

    const now = Date.now()
    const expiredProjectiles = editor.projectiles.filter(
      (p) => now - p.creationTime > editor.projectileLifetime
    )

    expiredProjectiles.forEach((p) => {
      // editor.remove_sphere3d(p.id)
      editor.spheres3D = editor.spheres3D.filter((s) => s.id !== p.id)
      editor.bodies.delete(p.id)
    })

    editor.projectiles = editor.projectiles.filter(
      (p) => now - p.creationTime <= editor.projectileLifetime
    )
  }
}

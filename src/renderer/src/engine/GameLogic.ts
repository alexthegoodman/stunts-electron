import { Editor } from './editor'
import { Node } from '@xyflow/react'
import { Sphere3DConfig } from './sphere3d'
import { v4 as uuidv4 } from 'uuid'
import { GameNode } from '@renderer/components/stunts-app/GameEditor'

export class GameLogic {
  private setNodes: React.Dispatch<React.SetStateAction<GameNode[]>>
  private editor: Editor
  private lastShotTime: number = 0

  constructor(editor: Editor, setNodes: React.Dispatch<React.SetStateAction<GameNode[]>>) {
    this.setNodes = setNodes
    this.editor = editor
    this.editor.physics.contactAddListeners.push(this.OnContactAdded.bind(this))
  }

  OnContactAdded = (character, bodyID2, subShapeID2, contactPosition, contactNormal, settings) => {
    const b1 = character
    const b2 = bodyID2

    const isProjectile = (body) => {
      const projectile = this.editor.spheres3D.find((s) => this.editor.bodies.get(s.id) === body)
      return projectile && projectile.name === 'Projectile'
    }

    const isEnemy = (body) => {
      const enemy = this.editor.cubes3D.find((c) => this.editor.characters.get(c.id) === body)
      return enemy && enemy.name === 'EnemyCharacter'
    }

    // console.info('OnContactAdded',isProjectile(b1), isEnemy(b1), isProjectile(b2), isEnemy(b2))

    const isPlayer = (body) => {
      const player = this.editor.cubes3D.find((c) => this.editor.characters.get(c.id) === body)
      return player && player.name === 'PlayerCharacter'
    }

    if ((isProjectile(b1) && isEnemy(b2)) || (isProjectile(b2) && isEnemy(b1))) {
      const enemyBody = isEnemy(b1) ? b1 : b2
      const enemyId = this.editor.cubes3D.find(
        (c) => this.editor.bodies.get(c.id) === enemyBody
      )?.id
      if (enemyId) {
        const enemyNode = this.editor.nodes.find((n) => n.id === `${enemyId}-7`)
        if (enemyNode && typeof enemyNode.data.health === 'number') {
          this.setNodes((nds) =>
            nds.map((n) => {
              if (n.id === enemyNode.id) {
                return { ...n, data: { ...n.data, health: n.data.health - 10 } }
              }
              return n
            })
          )
        }
      }
    } else if ((isProjectile(b1) && isPlayer(b2)) || (isProjectile(b2) && isPlayer(b1))) {
      const playerNode = this.editor.nodes.find((n) => n.data.label === 'PlayerController')
      if (playerNode && typeof playerNode.data.health === 'number') {
        this.setNodes((nds) =>
          nds.map((n) => {
            if (n.id === playerNode.id) {
              return { ...n, data: { ...n.data, health: n.data.health - 10 } }
            }
            return n
          })
        )
      }
    }

    if (isProjectile(b1)) {
      this.editor.spheres3D = this.editor.spheres3D.filter(
        (s) => this.editor.bodies.get(s.id) !== b1
      )
      this.editor.bodies.delete(
        this.editor.spheres3D.find((s) => this.editor.bodies.get(s.id) === b1)?.id
      )
    } else if (isProjectile(b2)) {
      this.editor.spheres3D = this.editor.spheres3D.filter(
        (s) => this.editor.bodies.get(s.id) !== b2
      )
      this.editor.bodies.delete(
        this.editor.spheres3D.find((s) => this.editor.bodies.get(s.id) === b2)?.id
      )
    }
  }

  update() {
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
      // console.info('enemyCharacter', enemyCharacter)
      if (enemyCharacter) {
        // Random walk
        const randomX = Math.random() * 2 - 1
        const randomZ = Math.random() * 2 - 1
        const moveDirection = new editor.physics.jolt.Vec3(randomX, 0, randomZ)
        enemyCharacter.SetLinearVelocity(moveDirection.Mul(5))

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
                x: enemyCharacter.GetPosition().GetX(),
                y: enemyCharacter.GetPosition().GetY(),
                z: enemyCharacter.GetPosition().GetZ()
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
            const playerNode = nodes.find((n) => n.data.label === 'PlayerController')
            if (playerNode) {
              const playerCharacter = editor.characters.get(
                editor.cubes3D.find((c) => c.name === 'PlayerCharacter')?.id
              )
              if (playerCharacter) {
                const playerPosition = playerCharacter.GetPosition()
                const enemyPosition = enemyCharacter.GetPosition()
                const direction = playerPosition.Sub(
                  new editor.physics.jolt.Vec3(
                    enemyPosition.GetX(),
                    enemyPosition.GetY(),
                    enemyPosition.GetZ()
                  )
                )
                direction.Normalized()
                let velocity = direction.Mul(20)
                projectileBody.SetLinearVelocity(
                  new editor.physics.jolt.Vec3(velocity.GetX(), velocity.GetY(), velocity.GetZ())
                )
              }
            }
          }
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

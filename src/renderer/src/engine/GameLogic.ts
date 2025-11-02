import { Editor } from './editor'
import { Node } from '@xyflow/react'
import { Sphere3DConfig } from './sphere3d'
import { v4 as uuidv4 } from 'uuid'

export class GameLogic {
  private editor: Editor
  public enemyHealth: number = 100
  private lastShotTime: number = 0
  private fireRate: number = 1000 // 1 shot per second
  public onHealthChange: (health: number) => void

  constructor(editor: Editor, onHealthChange: (health: number) => void) {
    this.editor = editor
    this.onHealthChange = onHealthChange
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
      const enemy = this.editor.cubes3D.find((c) => this.editor.bodies.get(c.id) === body)
      return enemy && enemy.name === 'EnemyCharacter'
    }

    // TODO: need to setup Health on PlayerCharacter similar to as was done with EnemyCharacter (we also need to check whether a friendly or an enemy shot the projectile, not just who it hits)
    const isPlayer = (body) => {
      const enemy = this.editor.cubes3D.find((c) => this.editor.bodies.get(c.id) === body)
      return enemy && enemy.name === 'PlayerCharacter'
    }

    // console.info('OnContactAdded',isProjectile(b1), isEnemy(b1), isProjectile(b2), isEnemy(b2))

    if ((isProjectile(b1) && isEnemy(b2)) || (isProjectile(b2) && isEnemy(b1))) {
      this.enemyHealth -= 10
      this.onHealthChange(this.enemyHealth)
      // Update the node in the editor's nodes array
      this.editor.nodes = this.editor.nodes.map((n) => {
        if (n.id === '10' && typeof n.data.value === 'number') {
          n.data = { ...n.data, value: n.data.value - 10 }
        }
        return n
      })
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
    const enemyNode = nodes.find((n) => n.data.label === 'EnemyController')
    if (!enemyNode) return

    const enemyId = editor.cubes3D.find((c) => c.name === 'EnemyCharacter')?.id
    if (!enemyId) return

    const enemyCharacter = editor.characters.get(enemyId)
    if (enemyCharacter) {
      // Random walk
      const randomX = Math.random() * 2 - 1
      const randomZ = Math.random() * 2 - 1
      const moveDirection = new editor.physics.jolt.Vec3(randomX, 0, randomZ)
      enemyCharacter.SetLinearVelocity(moveDirection.Mul(5))

      // Shoot projectile
      const shootNode = nodes.find((n) => n.data.label === 'ShootProjectile')
      if (shootNode) {
        const now = Date.now()
        // TODO: maybe add a gap timer for update checks here in gamelogic
        if (now - this.lastShotTime > this.fireRate) {
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
          editor.add_sphere3d(projectileConfig, projectileConfig.id, editor.currentSequenceData.id)
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
              let velocity = direction.Mul(50)
              projectileBody.SetLinearVelocity(
                new editor.physics.jolt.Vec3(velocity.GetX(), velocity.GetY(), velocity.GetZ())
              )
            }
          }
        }
      }
    }

    // Health logic
    const healthNode = nodes.find((n) => n.data.label === 'Health')
    if (healthNode) {
      if (typeof healthNode.data.value === 'number' && healthNode.data.value <= 0) {
        // Enemy is dead
        const enemy = editor.cubes3D.find((c) => c.name === 'EnemyCharacter')
        if (enemy) {
          // editor.remove_cube3d(enemy.id)
          editor.cubes3D = editor.cubes3D.filter((c) => c.id !== enemy.id)
          editor.characters.delete(enemy.id)
          editor.nodes = editor.nodes.filter(
            (n) => n.id !== '7' && n.id !== '8' && n.id !== '9' && n.id !== '10'
          )
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

import { GameNode } from "../components/stunts-app/GameEditor";

export const createEnemyNodes = (enemyId: string): GameNode[] => {
  return [
    { id: `${enemyId}-7`, data: { label: 'EnemyController', health: 100, fireRate: 1000 }, position: { x: 850, y: 5 } },
    { id: `${enemyId}-8`, data: { label: 'RandomWalk' }, position: { x: 700, y: 100 } },
    { id: `${enemyId}-9`, data: { label: 'ShootProjectile' }, position: { x: 1000, y: 100 } },
    { id: `${enemyId}-10`, data: { label: 'Health', value: 100 }, position: { x: 850, y: 200 } }
  ]
}

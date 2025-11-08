import React, { useCallback } from 'react'
import { ReactFlow, Node, Edge, addEdge, Background, Controls, MiniMap } from '@xyflow/react'

import '@xyflow/react/dist/base.css'
import { ObjectType } from '@renderer/engine/animations'

// Enhanced GameNode interface to support Inventory and Collectables
export interface GameNode {
  id: string
  data: {
    label: string
    pressed?: boolean
    value?: number | string
    health?: number
    fireRate?: number
    // Inventory properties
    items?: CollectedItem[]
    maxSlots?: number
    // Collectable properties
    type?: string
    objectId?: string
    objectType?: ObjectType
    quantity?: number
    collected?: boolean
    effects?: CollectableEffect[]
  }
  position: {
    x: number
    y: number
  }
}

export interface CollectedItem {
  id: string
  type: string
  quantity: number
  objectId?: string
  objectType?: ObjectType
  effects?: CollectableEffect[]
}

export interface CollectableEffect {
  property: string // e.g., 'health', 'speed', 'damage'
  value: number
  operation: 'add' | 'multiply' | 'set'
}

// Updated initial nodes with Inventory system
export const initialNodes: GameNode[] = [
  { id: '1', data: { label: 'PlayerController', health: 100 }, position: { x: 250, y: 5 } },
  { id: '2', data: { label: 'Input' }, position: { x: 100, y: 100 } },
  { id: '3', data: { label: 'Forward', pressed: false }, position: { x: 400, y: 100 } },
  { id: '4', data: { label: 'Backward', pressed: false }, position: { x: 400, y: 150 } },
  { id: '5', data: { label: 'Left', pressed: false }, position: { x: 400, y: 200 } },
  { id: '6', data: { label: 'Right', pressed: false }, position: { x: 400, y: 250 } },
  { id: '6b', data: { label: 'Jump', pressed: false }, position: { x: 500, y: 250 } },
  { id: '6c', data: { label: 'Grab', pressed: false }, position: { x: 600, y: 250 } },
  { id: '6d', data: { label: 'Collect', pressed: false }, position: { x: 700, y: 250 } },
  { id: '6e', data: { label: 'Fire', pressed: false }, position: { x: 600, y: 300 } },
  {
    id: '7',
    data: { label: 'EnemyController', health: 100, fireRate: 1000 },
    position: { x: 850, y: 5 }
  },
  { id: '8', data: { label: 'RandomWalk' }, position: { x: 700, y: 100 } },
  { id: '9', data: { label: 'ShootProjectile' }, position: { x: 1000, y: 100 } },
  { id: '10', data: { label: 'Health', value: 100 }, position: { x: 850, y: 200 } },

  // NEW: Inventory System
  {
    id: '11',
    data: {
      label: 'Inventory',
      items: [],
      maxSlots: 10
    },
    position: { x: 250, y: 350 }
  }
]

export interface GameEdge {
  id: string
  source: string
  target: string
}

export const initialEdges: GameEdge[] = [
  { id: 'e2-1', source: '2', target: '1' },
  { id: 'e3-2', source: '3', target: '2' },
  { id: 'e3-3', source: '4', target: '2' },
  { id: 'e3-4', source: '5', target: '2' },
  { id: 'e3-5', source: '6', target: '2' },
  { id: 'e3-5b', source: '6b', target: '2' },
  { id: 'e3-5c', source: '6c', target: '2' },
  { id: 'e3-5d', source: '6d', target: '2' },
  { id: 'e3-5e', source: '6e', target: '2' },
  { id: 'e8-7', source: '8', target: '7' },
  { id: 'e9-7', source: '9', target: '7' },
  { id: 'e10-7', source: '10', target: '7' },

  // Connect Inventory to PlayerController
  { id: 'e11-1', source: '11', target: '1' }
]

// Utility function to handle collection
export function collectItem(
  nodes: GameNode[],
  collectableNodeId: string,
  inventoryNodeId: string = '11'
): GameNode[] {
  return nodes.map((node) => {
    // Mark collectable as collected
    if (node.id === collectableNodeId && node.data.label === 'Collectable') {
      if (node.data.collected) return node // Already collected

      return {
        ...node,
        data: { ...node.data, collected: true }
      }
    }

    // Add item to inventory
    if (node.id === inventoryNodeId && node.data.label === 'Inventory') {
      const collectableNode = nodes.find((n) => n.id === collectableNodeId)
      if (!collectableNode || collectableNode.data.collected) return node

      const items = node.data.items || []

      // Check if inventory is full
      if (items.length >= (node.data.maxSlots || 10)) {
        console.warn('Inventory full!')
        return node
      }

      // Check if item type already exists (for stackable items)
      const existingItemIndex = items.findIndex((item) => item.type === collectableNode.data.type)

      if (existingItemIndex >= 0) {
        // Stack the item
        const updatedItems = [...items]
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + (collectableNode.data.quantity || 1)
        }

        return {
          ...node,
          data: { ...node.data, items: updatedItems }
        }
      } else {
        // Add new item
        const newItem: CollectedItem = {
          id: collectableNodeId,
          type: collectableNode.data.type || 'Unknown',
          quantity: collectableNode.data.quantity || 1,
          objectId: collectableNode.data.objectId,
          effects: collectableNode.data.effects
        }

        return {
          ...node,
          data: { ...node.data, items: [...items, newItem] }
        }
      }
    }

    return node
  })
}

// Utility function to use/consume an item from inventory
export function useItem(
  nodes: GameNode[],
  inventoryNodeId: string,
  itemType: string,
  targetNodeId?: string
): GameNode[] {
  const inventoryNode = nodes.find((n) => n.id === inventoryNodeId)
  if (!inventoryNode || !inventoryNode.data.items) return nodes

  const item = inventoryNode.data.items.find((i) => i.type === itemType)
  if (!item) return nodes

  return nodes.map((node) => {
    // Remove/decrease item from inventory
    if (node.id === inventoryNodeId) {
      const items = node.data.items || []
      const updatedItems = items
        .map((i) => {
          if (i.type === itemType) {
            return { ...i, quantity: i.quantity - 1 }
          }
          return i
        })
        .filter((i) => i.quantity > 0)

      return {
        ...node,
        data: { ...node.data, items: updatedItems }
      }
    }

    // Apply effects to target node (e.g., PlayerController)
    if (targetNodeId && node.id === targetNodeId && item.effects) {
      const updatedData = { ...node.data }

      item.effects.forEach((effect) => {
        const currentValue = (updatedData[effect.property] as number) || 0

        switch (effect.operation) {
          case 'add':
            updatedData[effect.property] = currentValue + effect.value
            break
          case 'multiply':
            updatedData[effect.property] = currentValue * effect.value
            break
          case 'set':
            updatedData[effect.property] = effect.value
            break
        }
      })

      return { ...node, data: updatedData }
    }

    return node
  })
}

const GameLogicEditor: React.FC<any> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect
}) => {
  return (
    <div style={{ height: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  )
}

export default GameLogicEditor

import React, { useCallback } from 'react'
import { ReactFlow, Node, Edge, addEdge, Background, Controls, MiniMap } from '@xyflow/react'

import '@xyflow/react/dist/base.css'

const initialNodes: Node[] = [
  { id: '1', data: { label: 'Player' }, position: { x: 250, y: 5 } },
  { id: '2', data: { label: 'Input' }, position: { x: 100, y: 100 } },
  { id: '3', data: { label: 'Move' }, position: { x: 400, y: 100 } }
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '2', target: '1' },
  { id: 'e1-3', source: '1', target: '3' }
]

const GameLogic: React.FC<any> = ({ nodes, edges, onNodesChange, onEdgesChange, onConnect }) => {
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

export default GameLogic

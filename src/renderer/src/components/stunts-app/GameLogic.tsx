import React, { useCallback } from 'react'
import { ReactFlow, Node, Edge, addEdge, Background, Controls, MiniMap } from '@xyflow/react'

import '@xyflow/react/dist/base.css'

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

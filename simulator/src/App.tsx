import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './App.css'

function App() {
  return (
    <div className="canvas-shell">
      <ReactFlowProvider>
        <ReactFlow nodes={[]} edges={[]} fitView>
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#2a3a6b" />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}

export default App

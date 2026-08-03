import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SimulatorCanvas } from './canvas/SimulatorCanvas'

function App() {
  return (
    <ReactFlowProvider>
      <SimulatorCanvas />
    </ReactFlowProvider>
  )
}

export default App

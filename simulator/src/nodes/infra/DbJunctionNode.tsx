import { Handle, Position } from '@xyflow/react'
import { DB_JUNCTION_SIZE } from '../../canvas/initial-graph'

export function DbJunctionNode() {
  return (
    <div
      className="rounded-full border border-border bg-surface-raised"
      style={{ width: DB_JUNCTION_SIZE, height: DB_JUNCTION_SIZE }}
      title="Where each task's connection pool splits between the writer and reader endpoints"
    >
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
    </div>
  )
}

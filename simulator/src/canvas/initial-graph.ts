import type { SimulatorFlowNode } from '../types/node-data'
import type { RequestFlowEdge } from '../types/edge-data'

export const ALB_NODE_ID = 'alb'
export const ECS_SERVICE_NODE_ID = 'ecs-service'
export const ALB_TO_ECS_EDGE_ID = 'alb-ecs-service'

const ECS_SERVICE_POSITION = { x: 640, y: 200 }

export const TASK_COLUMN_X = 1090
export const TASK_ROW_GAP = 22
export const FALLBACK_TASK_HEIGHT = 108
export const TASK_COLUMN_CENTER_Y = ECS_SERVICE_POSITION.y

export const initialNodes: SimulatorFlowNode[] = [
  {
    id: ALB_NODE_ID,
    type: 'alb',
    position: { x: 360, y: 200 },
    data: { label: 'Load Balancer', tooltip: 'Distributes incoming requests across healthy ECS tasks.', status: 'idle' },
    draggable: false,
    deletable: false,
  },
  {
    id: ECS_SERVICE_NODE_ID,
    type: 'ecsService',
    position: ECS_SERVICE_POSITION,
    data: {
      label: 'ECS Service',
      tooltip:
        'Runs the application tasks behind the load balancer. Autoscaling tracks the ALBRequestCountPerTarget metric and adds or removes tasks to keep the average near 1000 req/min per task.',
      status: 'idle',
      requestsPerMinute: 0,
      healthyTaskCount: 2,
      totalTaskCount: 2,
    },
    draggable: false,
    deletable: false,
  },
]

export const initialEdges: RequestFlowEdge[] = [
  {
    id: ALB_TO_ECS_EDGE_ID,
    type: 'requestFlow',
    source: ALB_NODE_ID,
    sourceHandle: 'out',
    target: ECS_SERVICE_NODE_ID,
    targetHandle: 'in',
    data: { requestsPerMinute: 0 },
    deletable: false,
    reconnectable: false,
  },
]

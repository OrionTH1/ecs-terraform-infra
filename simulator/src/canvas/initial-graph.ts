import { AWS_ALARM_EVALUATION } from '../simulation/simulation-config'
import type { SimulatorFlowNode } from '../types/node-data'
import type { RequestFlowEdge } from '../types/edge-data'

export const ALB_NODE_ID = 'alb'
export const ECS_SERVICE_NODE_ID = 'ecs-service'
export const RDS_NODE_ID = 'rds'
export const ALB_TO_ECS_EDGE_ID = 'alb-ecs-service'

const ECS_SERVICE_POSITION = { x: 640, y: 200 }

export const TASK_COLUMN_X = 1090
export const RDS_NODE_POSITION = { x: TASK_COLUMN_X + 300, y: ECS_SERVICE_POSITION.y }
export const FIT_VIEW_OPTIONS = { padding: 0.22, maxZoom: 1 }

export const TASK_ROW_GAP = 22
export const FALLBACK_TASK_HEIGHT = 108
export const NODE_LEAVE_MS = 340
export const TASK_COLUMN_CENTER_Y = ECS_SERVICE_POSITION.y

export const initialNodes: SimulatorFlowNode[] = [
  {
    id: ALB_NODE_ID,
    type: 'alb',
    position: { x: 360, y: 200 },
    data: {
      label: 'Load Balancer',
      tooltip:
        'The only public entry point. It distributes requests across healthy targets only, and returns 503 when the target group has none — which is why the service keeps a minimum of two tasks.',
      status: 'idle',
      requestsPerMinute: 0,
      healthyTargetCount: 0,
    },
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
        'Runs the application tasks behind the load balancer. Autoscaling tracks the ALBRequestCountPerTarget metric to keep the average near 1000 req/min per task. Target tracking is asymmetric: on AWS it scales out after ' +
        `${AWS_ALARM_EVALUATION.scaleOutMs / 60_000} minutes above target but only scales in after ${AWS_ALARM_EVALUATION.scaleInMs / 60_000} minutes below it. ` +
        'Both alarm windows are shortened here so the demo stays watchable.',
      status: 'idle',
      requestsPerMinute: 0,
      healthyTaskCount: 0,
      totalTaskCount: 0,
    },
    draggable: false,
    deletable: false,
  },
  {
    id: RDS_NODE_ID,
    type: 'rds',
    position: RDS_NODE_POSITION,
    data: {
      label: 'Aurora (RDS)',
      tooltip:
        'Aurora Serverless v2 (Postgres). Configured for 0–1 ACU and auto-pauses after an hour idle — a cost-optimized dev config, not a production capacity plan. Traffic shown here is a simplification: the real API is a health-check canary and does not query the database on every request.',
      status: 'idle',
      requestsPerMinute: 0,
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

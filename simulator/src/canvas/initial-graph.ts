import { AWS_ALARM_EVALUATION } from '../simulation/simulation-config'
import type { SimulatorFlowNode } from '../types/node-data'
import type { SimulatorFlowEdge } from '../types/edge-data'

export const ALB_NODE_ID = 'alb'
export const WAF_NODE_ID = 'waf'
export const WAF_TO_ALB_EDGE_ID = 'waf-alb-association'
export const ECS_SERVICE_NODE_ID = 'ecs-service'
export const RDS_CLUSTER_NODE_ID = 'rds-cluster'
export const RDS_WRITER_NODE_ID = 'rds-writer'
export const RDS_READER_NODE_ID = 'rds-reader'
export const ALB_TO_ECS_EDGE_ID = 'alb-ecs-service'
export const RDS_CLUSTER_TO_WRITER_EDGE_ID = 'rds-cluster-writer'
export const RDS_CLUSTER_TO_READER_EDGE_ID = 'rds-cluster-reader'
export const RDS_REPLICATION_EDGE_ID = 'rds-writer-reader-replication'

const ECS_SERVICE_POSITION = { x: 640, y: 200 }

export const TASK_COLUMN_X = 1090
export const FIT_VIEW_OPTIONS = { padding: 0.22, maxZoom: 1 }

const RDS_CLUSTER_POSITION = { x: TASK_COLUMN_X + 300, y: ECS_SERVICE_POSITION.y }
const RDS_INSTANCE_X = RDS_CLUSTER_POSITION.x + 260
export const RDS_WRITER_POSITION = { x: RDS_INSTANCE_X, y: ECS_SERVICE_POSITION.y - 80 }
export const RDS_READER_POSITION = { x: RDS_INSTANCE_X, y: ECS_SERVICE_POSITION.y + 80 }

export const TASK_ROW_GAP = 22
export const FALLBACK_TASK_HEIGHT = 108
export const NODE_LEAVE_MS = 340
export const TASK_COLUMN_CENTER_Y = ECS_SERVICE_POSITION.y

const ALB_POSITION = { x: 360, y: 200 }

export const initialNodes: SimulatorFlowNode[] = [
  {
    id: WAF_NODE_ID,
    type: 'waf',
    position: { x: ALB_POSITION.x, y: ALB_POSITION.y - 330 },
    data: {
      label: 'Web ACL',
      tooltip:
        'AWS WAF is not a hop in front of the load balancer — the Web ACL is associated with the ALB, which evaluates it on every request before routing. Clients always talk to the ALB directly. The rate-based rule counts requests per source IP over a sliding 5-minute window, re-evaluated every 30 seconds, and blocked requests keep counting toward that window: lowering your rate does not unblock you until the window drains.',
      status: 'idle',
      inspectedRequestsPerMinute: 0,
      blockedRequests: 0,
      blockedIps: [],
    },
    draggable: false,
    deletable: false,
  },
  {
    id: ALB_NODE_ID,
    type: 'alb',
    position: ALB_POSITION,
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
    id: RDS_CLUSTER_NODE_ID,
    type: 'rdsCluster',
    position: RDS_CLUSTER_POSITION,
    data: {
      label: 'Aurora Cluster',
      tooltip:
        'Aurora Serverless v2 (Postgres), 0–1 ACU, auto-pauses after an hour idle. The cluster exposes a writer endpoint (all writes, and reads needing read-after-write consistency) and a reader endpoint (read-only, load-balanced across reader instances) — it does not proxy traffic itself, endpoints resolve directly to an instance. Traffic shown here is a simplification: the real API is a health-check canary and does not query the database on every request.',
      status: 'idle',
      requestsPerMinute: 0,
    },
    draggable: false,
    deletable: false,
  },
  {
    id: RDS_WRITER_NODE_ID,
    type: 'rdsInstance',
    position: RDS_WRITER_POSITION,
    data: {
      label: 'Writer Instance',
      tooltip:
        'The only instance that accepts writes — auto-assigned because it was the first aws_rds_cluster_instance provisioned. If it fails, Aurora automatically promotes the reader to take its place.',
      status: 'idle',
      role: 'writer',
      requestsPerMinute: 0,
    },
    draggable: false,
    deletable: false,
  },
  {
    id: RDS_READER_NODE_ID,
    type: 'rdsInstance',
    position: RDS_READER_POSITION,
    data: {
      label: 'Reader Instance',
      tooltip:
        'Read replica served from Aurora\'s shared storage layer, kept consistent via the writer\'s redo log stream (typically single-digit milliseconds of lag). Serves read-only queries and is promotable to writer on failover.',
      status: 'idle',
      role: 'reader',
      requestsPerMinute: 0,
    },
    draggable: false,
    deletable: false,
  },
]

export const initialEdges: SimulatorFlowEdge[] = [
  {
    id: WAF_TO_ALB_EDGE_ID,
    type: 'association',
    source: WAF_NODE_ID,
    sourceHandle: 'acl-out',
    target: ALB_NODE_ID,
    targetHandle: 'acl-in',
    data: { isActive: false },
    deletable: false,
    reconnectable: false,
    selectable: false,
  },
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
  {
    id: RDS_CLUSTER_TO_WRITER_EDGE_ID,
    type: 'requestFlow',
    source: RDS_CLUSTER_NODE_ID,
    sourceHandle: 'out',
    target: RDS_WRITER_NODE_ID,
    targetHandle: 'in',
    data: { requestsPerMinute: 0 },
    deletable: false,
    reconnectable: false,
  },
  {
    id: RDS_CLUSTER_TO_READER_EDGE_ID,
    type: 'requestFlow',
    source: RDS_CLUSTER_NODE_ID,
    sourceHandle: 'out',
    target: RDS_READER_NODE_ID,
    targetHandle: 'in',
    data: { requestsPerMinute: 0 },
    deletable: false,
    reconnectable: false,
  },
  {
    id: RDS_REPLICATION_EDGE_ID,
    type: 'replication',
    source: RDS_WRITER_NODE_ID,
    sourceHandle: 'replicate-out',
    target: RDS_READER_NODE_ID,
    targetHandle: 'replicate-in',
    data: { isActive: false },
    deletable: false,
    reconnectable: false,
  },
]

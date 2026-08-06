import { AWS_ALARM_EVALUATION, AUTOSCALING } from '../simulation/simulation-config'
import { NO_ALARM } from '../simulation/autoscaling-alarm'
import { FRAME_PADDING, frameAround } from './frame-metrics'
import type { ResourceId } from '../simulation/boot-graph'
import type { SimulatorFlowNode } from '../types/node-data'
import type { SimulatorFlowEdge } from '../types/edge-data'

export const ALB_NODE_ID = 'alb'
export const WAF_NODE_ID = 'waf'
export const WAF_TO_ALB_EDGE_ID = 'waf-alb-association'
export const ECS_SERVICE_NODE_ID = 'ecs-service'
export const AUTO_SCALING_NODE_ID = 'auto-scaling'
export const TARGET_GROUP_NODE_ID = 'target-group'
export const RDS_CLUSTER_NODE_ID = 'rds-cluster'
export const RDS_WRITER_NODE_ID = 'rds-writer'
export const RDS_READER_NODE_ID = 'rds-reader'
export const CLUSTER_VOLUME_NODE_ID = 'cluster-volume'
export const WRITER_TO_VOLUME_EDGE_ID = 'rds-writer-volume'
export const READER_TO_VOLUME_EDGE_ID = 'rds-reader-volume'
export const PAGE_CACHE_EDGE_ID = 'rds-writer-reader-page-cache'
export const METRIC_EDGE_ID = 'alb-auto-scaling-metric'
export const DESIRED_COUNT_EDGE_ID = 'auto-scaling-ecs-service-desired-count'

const ALB_POSITION = { x: 360, y: 200 }
const CONTROL_PLANE_Y = ALB_POSITION.y - 330

export const TASK_COLUMN_X = 780
export const TASK_COLUMN_CENTER_Y = ALB_POSITION.y
export const TASK_ROW_GAP = 22
export const FALLBACK_TASK_HEIGHT = 108
export const FALLBACK_TASK_WIDTH = 230
export const NODE_LEAVE_MS = 340

export const TASK_ZONE_GAP = 40

export const AUTO_SCALING_GAP = 74
export const FALLBACK_AUTO_SCALING_HEIGHT = 210

const FALLBACK_CARD_WIDTH = 210
const FALLBACK_CARD_HEIGHT = 132

const RDS_INSTANCE_X = TASK_COLUMN_X + 470

export const RDS_WRITER_POSITION = { x: RDS_INSTANCE_X, y: ALB_POSITION.y - 130 }
export const RDS_READER_POSITION = { x: RDS_INSTANCE_X, y: ALB_POSITION.y + 130 }
export const CLUSTER_VOLUME_POSITION = { x: RDS_INSTANCE_X + 310, y: ALB_POSITION.y - 46 }

const AURORA_FRAME = frameAround({
  left: RDS_INSTANCE_X,
  top: RDS_WRITER_POSITION.y,
  right: CLUSTER_VOLUME_POSITION.x + FALLBACK_CARD_WIDTH,
  bottom: RDS_READER_POSITION.y + FALLBACK_CARD_HEIGHT,
})

export const DB_JUNCTION_NODE_ID = 'db-junction'
export const DB_JUNCTION_SIZE = 12
export const DB_JUNCTION_POSITION = {
  x: TASK_COLUMN_X + 320,
  y: ALB_POSITION.y - DB_JUNCTION_SIZE / 2,
}

export const JUNCTION_TO_WRITER_EDGE_ID = 'db-junction-writer'
export const JUNCTION_TO_READER_EDGE_ID = 'db-junction-reader'

export function taskToJunctionEdgeId(taskId: string): string {
  return `${taskId}-${DB_JUNCTION_NODE_ID}`
}

export const FIT_VIEW_OPTIONS = { padding: 0.22, maxZoom: 1 }
export const MIN_ZOOM = 0.08

export function albToTaskEdgeId(taskId: string): string {
  return `${ALB_NODE_ID}-${taskId}`
}

export const NODE_RESOURCE_ID: Record<string, ResourceId> = {
  [WAF_NODE_ID]: 'wafWebAcl',
  [ALB_NODE_ID]: 'alb',
  [ECS_SERVICE_NODE_ID]: 'ecsService',
  [AUTO_SCALING_NODE_ID]: 'autoScalingPolicy',
  [DB_JUNCTION_NODE_ID]: 'ecsService',
  [RDS_CLUSTER_NODE_ID]: 'rdsCluster',
  [CLUSTER_VOLUME_NODE_ID]: 'rdsCluster',
  [RDS_WRITER_NODE_ID]: 'rdsWriter',
  [RDS_READER_NODE_ID]: 'rdsReader',
}

export const EDGE_RESOURCE_ID: Record<string, ResourceId> = {
  [WAF_TO_ALB_EDGE_ID]: 'wafAssociation',
  [METRIC_EDGE_ID]: 'autoScalingPolicy',
  [DESIRED_COUNT_EDGE_ID]: 'autoScalingPolicy',
}

const ECS_SERVICE_TOOLTIP =
  'Control plane, not a traffic hop — requests never pass through it. Everything inside this frame is a task the service owns: it holds the desired count, launches replacements for tasks that die, and registers each one into the ALB target group. It has no scaling rule of its own — Application Auto Scaling calls UpdateService with a new desired count and the scheduler simply converges on it.'

const AUTO_SCALING_TOOLTIP =
  'A separate AWS service, not part of ECS. It registers the service as a scalable target with min/max capacity and tracks ALBRequestCountPerTarget against a target value. It creates and owns two CloudWatch alarms you never write yourself: AlarmHigh for scale out and AlarmLow for scale in. When one fires, it computes a new desired count and calls UpdateService — only then does the ECS scheduler start or stop tasks. Target tracking is asymmetric: on AWS it scales out after ' +
  `${AWS_ALARM_EVALUATION.scaleOutMs / 60_000} minutes above target but only scales in after ${AWS_ALARM_EVALUATION.scaleInMs / 60_000} minutes below it. ` +
  'Both windows are shortened here so the demo stays watchable.'

export const initialNodes: SimulatorFlowNode[] = [
  {
    id: WAF_NODE_ID,
    type: 'waf',
    position: { x: ALB_POSITION.x, y: CONTROL_PLANE_Y },
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
        'The only public entry point. Its listener forwards to the target group, and it distributes requests across healthy targets only, returning 503 when the target group has none — which is why the service keeps a minimum of two tasks.',
      status: 'idle',
      requestsPerMinute: 0,
      healthyTargetCount: 0,
    },
    draggable: false,
    deletable: false,
  },
  {
    id: AUTO_SCALING_NODE_ID,
    type: 'autoScaling',
    position: { x: TASK_COLUMN_X, y: CONTROL_PLANE_Y },
    data: {
      label: 'Application Auto Scaling',
      tooltip: AUTO_SCALING_TOOLTIP,
      status: 'idle',
      requestsPerMinutePerTask: null,
      targetRequestsPerMinutePerTask: AUTOSCALING.targetRequestsPerMinutePerTask,
      alarm: NO_ALARM,
      minCapacity: AUTOSCALING.minCapacity,
      maxCapacity: AUTOSCALING.maxCapacity,
      desiredCount: AUTOSCALING.minCapacity,
    },
    draggable: false,
    deletable: false,
  },
  {
    id: ECS_SERVICE_NODE_ID,
    type: 'ecsService',
    position: { x: TASK_COLUMN_X - FRAME_PADDING * 2, y: TASK_COLUMN_CENTER_Y },
    data: {
      label: 'ECS Service',
      tooltip: ECS_SERVICE_TOOLTIP,
      status: 'idle',
      width: FALLBACK_TASK_WIDTH + FRAME_PADDING * 4,
      height: 0,
      desiredCount: AUTOSCALING.minCapacity,
      runningTaskCount: 0,
      pendingTaskCount: 0,
    },
    draggable: false,
    deletable: false,
    selectable: false,
    zIndex: -2,
  },
  {
    id: RDS_CLUSTER_NODE_ID,
    type: 'auroraCluster',
    position: AURORA_FRAME.position,
    data: {
      label: 'Aurora Cluster',
      tooltip:
        'A DB cluster is compute plus storage: the instances below and one shared cluster volume. Aurora Serverless v2 (Postgres), 0–1 ACU with auto-pause after an hour idle — one ACU is roughly 2 GiB of memory plus matching CPU, and capacity moves in 0.5 ACU steps without dropping connections. The cluster publishes the writer and reader endpoints; it never proxies a query itself, and each endpoint resolves straight to an instance.',
      status: 'idle',
      width: AURORA_FRAME.width,
      height: AURORA_FRAME.height,
    },
    draggable: false,
    deletable: false,
    selectable: false,
    zIndex: -1,
  },
  {
    id: CLUSTER_VOLUME_NODE_ID,
    type: 'clusterVolume',
    position: CLUSTER_VOLUME_POSITION,
    data: {
      label: 'Cluster Volume',
      tooltip:
        'The single virtual volume that holds every table, index and the WAL. Aurora writes each change synchronously to six storage nodes spread across three Availability Zones, and that replication factor is independent of how many DB instances the cluster has. Because storage is shared, adding a reader copies no data at all — the new instance simply attaches to the volume that already holds everything.',
      status: 'idle',
    },
    draggable: false,
    deletable: false,
  },
  {
    id: DB_JUNCTION_NODE_ID,
    type: 'dbJunction',
    position: DB_JUNCTION_POSITION,
    data: {},
    draggable: false,
    deletable: false,
    selectable: false,
  },
  {
    id: RDS_WRITER_NODE_ID,
    type: 'rdsInstance',
    position: RDS_WRITER_POSITION,
    data: {
      label: 'Writer Instance',
      tooltip:
        'The only instance that accepts writes — auto-assigned because it was the first aws_rds_cluster_instance provisioned. It does not own the data: every change goes down to the shared cluster volume. If it fails, Aurora promotes the reader, which typically restores service in under 60 seconds and often under 30. With no reader to promote, Aurora has to build a new primary instead, which takes up to 10 minutes — that gap is the whole reason this cluster runs two instances.',
      status: 'idle',
      role: 'writer',
      lifecycle: 'provisioning',
      requestsPerMinute: 0,
      isCacheInvalidating: false,
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
        'Reads the exact same cluster volume as the writer — Aurora never copies data between instances, so this replica had no data of its own to build. The writer sends its redo log stream to the storage nodes and, in parallel, to every reader. This instance applies each record that touches a page it already has cached and discards the rest, which is what the ReplicaLag metric measures: typically 100 ms or less. Serves read-only queries and is the promotion target on failover.',
      status: 'idle',
      role: 'reader',
      lifecycle: 'provisioning',
      requestsPerMinute: 0,
      isCacheInvalidating: false,
    },
    draggable: false,
    deletable: false,
  },
]

export const initialEdges: SimulatorFlowEdge[] = [
  {
    id: WAF_TO_ALB_EDGE_ID,
    type: 'signal',
    source: WAF_NODE_ID,
    sourceHandle: 'acl-out',
    target: ALB_NODE_ID,
    targetHandle: 'acl-in',
    data: { isActive: false, variant: 'association', label: 'associated' },
    deletable: false,
    reconnectable: false,
    selectable: false,
  },
  {
    id: METRIC_EDGE_ID,
    type: 'signal',
    source: ALB_NODE_ID,
    sourceHandle: 'metric-out',
    target: AUTO_SCALING_NODE_ID,
    targetHandle: 'metric-in',
    data: { isActive: false, variant: 'metric', label: 'req/target' },
    deletable: false,
    reconnectable: false,
    selectable: false,
  },
  {
    id: DESIRED_COUNT_EDGE_ID,
    type: 'signal',
    source: AUTO_SCALING_NODE_ID,
    sourceHandle: 'desired-count-out',
    target: ECS_SERVICE_NODE_ID,
    targetHandle: 'desired-count-in',
    data: { isActive: false, variant: 'command', label: 'UpdateService' },
    deletable: false,
    reconnectable: false,
    selectable: false,
  },
  {
    id: JUNCTION_TO_WRITER_EDGE_ID,
    type: 'requestFlow',
    source: DB_JUNCTION_NODE_ID,
    sourceHandle: 'out',
    target: RDS_WRITER_NODE_ID,
    targetHandle: 'in',
    data: { requestsPerMinute: 0 },
    deletable: false,
    reconnectable: false,
  },
  {
    id: JUNCTION_TO_READER_EDGE_ID,
    type: 'requestFlow',
    source: DB_JUNCTION_NODE_ID,
    sourceHandle: 'out',
    target: RDS_READER_NODE_ID,
    targetHandle: 'in',
    data: { requestsPerMinute: 0 },
    deletable: false,
    reconnectable: false,
  },
  {
    id: WRITER_TO_VOLUME_EDGE_ID,
    type: 'requestFlow',
    source: RDS_WRITER_NODE_ID,
    sourceHandle: 'storage-out',
    target: CLUSTER_VOLUME_NODE_ID,
    targetHandle: 'in',
    data: { requestsPerMinute: 0 },
    deletable: false,
    reconnectable: false,
  },
  {
    id: READER_TO_VOLUME_EDGE_ID,
    type: 'requestFlow',
    source: RDS_READER_NODE_ID,
    sourceHandle: 'storage-out',
    target: CLUSTER_VOLUME_NODE_ID,
    targetHandle: 'in',
    data: { requestsPerMinute: 0 },
    deletable: false,
    reconnectable: false,
  },
  {
    id: PAGE_CACHE_EDGE_ID,
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

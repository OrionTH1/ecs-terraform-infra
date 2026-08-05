import { AWS_ALARM_EVALUATION } from '../simulation/simulation-config'
import type { ResourceId } from '../simulation/boot-graph'
import type { SimulatorFlowNode } from '../types/node-data'
import type { SimulatorFlowEdge } from '../types/edge-data'

export const ALB_NODE_ID = 'alb'
export const WAF_NODE_ID = 'waf'
export const WAF_TO_ALB_EDGE_ID = 'waf-alb-association'
export const ECS_SERVICE_NODE_ID = 'ecs-service'
export const TARGET_GROUP_NODE_ID = 'target-group'
export const RDS_CLUSTER_NODE_ID = 'rds-cluster'
export const RDS_WRITER_NODE_ID = 'rds-writer'
export const RDS_READER_NODE_ID = 'rds-reader'
export const CLUSTER_VOLUME_NODE_ID = 'cluster-volume'
export const WRITER_TO_VOLUME_EDGE_ID = 'rds-writer-volume'
export const READER_TO_VOLUME_EDGE_ID = 'rds-reader-volume'
export const PAGE_CACHE_EDGE_ID = 'rds-writer-reader-page-cache'

const ALB_POSITION = { x: 360, y: 200 }
const CONTROL_PLANE_Y = ALB_POSITION.y - 330

export const TASK_COLUMN_X = 780
export const TASK_COLUMN_CENTER_Y = ALB_POSITION.y
export const TASK_ROW_GAP = 22
export const FALLBACK_TASK_HEIGHT = 108
export const FALLBACK_TASK_WIDTH = 230
export const NODE_LEAVE_MS = 340

export const TARGET_GROUP_PADDING = 18
export const TARGET_GROUP_HEADER_HEIGHT = 26
export const TARGET_GROUP_MIN_HEIGHT = 96
export const TARGET_GROUP_ZONE_GAP = 46

export const ECS_SERVICE_GAP = 68
export const FALLBACK_ECS_SERVICE_HEIGHT = 150
export const MANAGEMENT_BUS_OFFSET = TARGET_GROUP_PADDING + 42
export const MANAGEMENT_HANDLE_TOP_INSET = 26
export const MANAGEMENT_HANDLE_LEFT_INSET = 22

const ECS_SERVICE_POSITION = { x: TASK_COLUMN_X, y: CONTROL_PLANE_Y }
const RDS_INSTANCE_X = TASK_COLUMN_X + 470

export const RDS_WRITER_POSITION = { x: RDS_INSTANCE_X, y: ALB_POSITION.y - 130 }
export const RDS_READER_POSITION = { x: RDS_INSTANCE_X, y: ALB_POSITION.y + 130 }
export const CLUSTER_VOLUME_POSITION = { x: RDS_INSTANCE_X + 310, y: ALB_POSITION.y - 46 }

export const AURORA_FRAME_PADDING = 26
export const AURORA_FRAME_HEADER_HEIGHT = 30
export const AURORA_FRAME_POSITION = {
  x: RDS_INSTANCE_X - AURORA_FRAME_PADDING,
  y: RDS_WRITER_POSITION.y - AURORA_FRAME_HEADER_HEIGHT - AURORA_FRAME_PADDING,
}
export const AURORA_FRAME_SIZE = { width: 620, height: 430 }

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

export function serviceToTaskEdgeId(taskId: string): string {
  return `${ECS_SERVICE_NODE_ID}-${taskId}`
}

export const NODE_RESOURCE_ID: Record<string, ResourceId> = {
  [WAF_NODE_ID]: 'wafWebAcl',
  [ALB_NODE_ID]: 'alb',
  [ECS_SERVICE_NODE_ID]: 'ecsService',
  [DB_JUNCTION_NODE_ID]: 'ecsService',
  [RDS_CLUSTER_NODE_ID]: 'rdsCluster',
  [CLUSTER_VOLUME_NODE_ID]: 'rdsCluster',
  [RDS_WRITER_NODE_ID]: 'rdsWriter',
  [RDS_READER_NODE_ID]: 'rdsReader',
}

export const EDGE_RESOURCE_ID: Record<string, ResourceId> = {
  [WAF_TO_ALB_EDGE_ID]: 'wafAssociation',
}

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
    id: ECS_SERVICE_NODE_ID,
    type: 'ecsService',
    position: ECS_SERVICE_POSITION,
    data: {
      label: 'ECS Service',
      tooltip:
        'Control plane, not a traffic hop — requests never pass through it. The service holds the desired count, replaces tasks that die, and registers each task it starts into the ALB target group. Autoscaling tracks the ALBRequestCountPerTarget metric to keep the average near 1000 req/min per task. Target tracking is asymmetric: on AWS it scales out after ' +
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
    type: 'auroraCluster',
    position: AURORA_FRAME_POSITION,
    data: {
      label: 'Aurora Cluster',
      tooltip:
        'A DB cluster is compute plus storage: the instances below and one shared cluster volume. Aurora Serverless v2 (Postgres), 0–1 ACU with auto-pause after an hour idle — one ACU is roughly 2 GiB of memory plus matching CPU, and capacity moves in 0.5 ACU steps without dropping connections. The cluster publishes the writer and reader endpoints; it never proxies a query itself, and each endpoint resolves straight to an instance.',
      status: 'idle',
      width: AURORA_FRAME_SIZE.width,
      height: AURORA_FRAME_SIZE.height,
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
        'Reads the exact same cluster volume as the writer — Aurora never copies data between instances, so this replica held no data of its own to build. What does stream from the writer is page cache invalidation, which is what the ReplicaLag metric actually measures. Serves read-only queries and is the promotion target on failover.',
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
    data: { isActive: false, variant: 'association', routing: 'direct' },
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

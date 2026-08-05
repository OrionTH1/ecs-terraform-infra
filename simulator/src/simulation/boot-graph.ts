export type ResourceId =
  | 'alb'
  | 'targetGroup'
  | 'wafWebAcl'
  | 'wafAssociation'
  | 'rdsCluster'
  | 'rdsWriter'
  | 'rdsReader'
  | 'ecsService'

export type ResourceStatus = 'pending' | 'creating' | 'created'

export interface ResourceDefinition {
  terraformAddress: string
  dependsOn: ResourceId[]
  durationMs: number
}

export interface ResourceRuntime {
  status: ResourceStatus
  startedAt: number | null
  createdAt: number | null
}

export type ResourceLedger = Record<ResourceId, ResourceRuntime>

export const BOOT_GRAPH: Record<ResourceId, ResourceDefinition> = {
  alb: {
    terraformAddress: 'module.alb.aws_lb.this',
    dependsOn: [],
    durationMs: 3 * 60_000,
  },
  targetGroup: {
    terraformAddress: 'module.alb.aws_lb_target_group.app',
    dependsOn: [],
    durationMs: 5_000,
  },
  wafWebAcl: {
    terraformAddress: 'module.waf.aws_wafv2_web_acl.this',
    dependsOn: [],
    durationMs: 45_000,
  },
  wafAssociation: {
    terraformAddress: 'module.waf.aws_wafv2_web_acl_association.alb',
    dependsOn: ['wafWebAcl', 'alb'],
    durationMs: 30_000,
  },
  rdsCluster: {
    terraformAddress: 'module.rds.aws_rds_cluster.this',
    dependsOn: [],
    durationMs: 2 * 60_000,
  },
  rdsWriter: {
    terraformAddress: 'module.rds.aws_rds_cluster_instance.this[0]',
    dependsOn: ['rdsCluster'],
    durationMs: 6 * 60_000,
  },
  rdsReader: {
    terraformAddress: 'module.rds.aws_rds_cluster_instance.this[1]',
    dependsOn: ['rdsCluster'],
    durationMs: 7 * 60_000,
  },
  ecsService: {
    terraformAddress: 'module.ecs.aws_ecs_service.backend',
    dependsOn: ['alb', 'targetGroup', 'rdsCluster'],
    durationMs: 60_000,
  },
}

export const RESOURCE_IDS = Object.keys(BOOT_GRAPH) as ResourceId[]

export function createResourceLedger(): ResourceLedger {
  return Object.fromEntries(
    RESOURCE_IDS.map((id) => [id, { status: 'pending', startedAt: null, createdAt: null }]),
  ) as ResourceLedger
}

export function isCreated(ledger: ResourceLedger, id: ResourceId): boolean {
  return ledger[id].status === 'created'
}

export function isVisible(ledger: ResourceLedger, id: ResourceId): boolean {
  return ledger[id].status !== 'pending'
}

export function areAllCreated(ledger: ResourceLedger): boolean {
  return RESOURCE_IDS.every((id) => isCreated(ledger, id))
}

export function advanceResourceLedger(ledger: ResourceLedger, now: number): ResourceLedger {
  let next = ledger
  let hasChanged = true

  while (hasChanged) {
    hasChanged = false

    for (const id of RESOURCE_IDS) {
      const resource = next[id]
      const definition = BOOT_GRAPH[id]

      if (resource.status === 'pending') {
        const dependencies = definition.dependsOn.map((dependency) => next[dependency])
        if (!dependencies.every((dependency) => dependency.status === 'created')) continue

        const startedAt = dependencies.reduce((latest, dependency) => Math.max(latest, dependency.createdAt ?? 0), 0)
        next = { ...next, [id]: { status: 'creating', startedAt, createdAt: null } }
        hasChanged = true
        continue
      }

      if (resource.status === 'creating') {
        const completesAt = (resource.startedAt ?? 0) + definition.durationMs
        if (now < completesAt) continue

        next = { ...next, [id]: { ...resource, status: 'created', createdAt: completesAt } }
        hasChanged = true
      }
    }
  }

  return next
}

function resolveCompletionMs(id: ResourceId, memo: Map<ResourceId, number>): number {
  const cached = memo.get(id)
  if (cached !== undefined) return cached

  const definition = BOOT_GRAPH[id]
  const startedAt = definition.dependsOn.reduce(
    (latest, dependency) => Math.max(latest, resolveCompletionMs(dependency, memo)),
    0,
  )

  const completedAt = startedAt + definition.durationMs
  memo.set(id, completedAt)
  return completedAt
}

export function resourceCompletionMs(id: ResourceId): number {
  return resolveCompletionMs(id, new Map())
}

export const BOOT_CRITICAL_PATH_MS = RESOURCE_IDS.reduce(
  (longest, id) => Math.max(longest, resourceCompletionMs(id)),
  0,
)

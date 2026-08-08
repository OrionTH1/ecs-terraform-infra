import { describe, expect, it } from 'vitest'
import { buildLogShipment, buildSecretFetch, hasEgressToEndpoints, isFetchingSecret } from './task-egress'
import { TASK_STATUS_MESSAGE } from '../types/task-data'

const TASK_TO_JUNCTION = 'task-1-logs-junction'
const JUNCTION_TO_ENDPOINT = 'logs-junction-interface-endpoints'
const ENDPOINT_TO_LOGS = 'interface-endpoints-cloudwatch-logs'

const TASK_TO_ENDPOINT = 'task-1-secrets-manager'
const ENDPOINT_TO_SECRETS = 'interface-endpoints-secrets-manager'

const LOG_LEGS = {
  taskId: 'task-1',
  requestsPerMinute: 600,
  junctionEdgeId: TASK_TO_JUNCTION,
  endpointEdgeId: JUNCTION_TO_ENDPOINT,
  serviceEdgeId: ENDPOINT_TO_LOGS,
}

const SECRET_LEGS = {
  taskId: 'task-1',
  endpointEdgeId: TASK_TO_ENDPOINT,
  serviceEdgeId: ENDPOINT_TO_SECRETS,
}

const LOGS_UP = new Set([TASK_TO_JUNCTION, JUNCTION_TO_ENDPOINT, ENDPOINT_TO_LOGS])
const SECRETS_UP = new Set([TASK_TO_ENDPOINT, ENDPOINT_TO_SECRETS])

describe('shipping a log line', () => {
  it('leaves the task and never comes back, because nothing is waiting on it', () => {
    const legs = buildLogShipment(LOG_LEGS, LOGS_UP)

    expect(legs.map((leg) => leg.edgeId)).toEqual([TASK_TO_JUNCTION, JUNCTION_TO_ENDPOINT, ENDPOINT_TO_LOGS])
    expect(legs.every((leg) => !leg.reversed)).toBe(true)
  })

  it('does not treat the junction as a place the line stops', () => {
    const [toJunction] = buildLogShipment(LOG_LEGS, LOGS_UP)

    expect(toJunction.entersNodeAtEnd).toBe(false)
  })

  it('drops the legs whose edge is gone', () => {
    expect(buildLogShipment(LOG_LEGS, new Set([TASK_TO_JUNCTION]))).toHaveLength(1)
  })
})

describe('fetching the database password', () => {
  it('goes out and comes back, because the container waits for the value', () => {
    const legs = buildSecretFetch(SECRET_LEGS, SECRETS_UP)

    expect(legs.map((leg) => `${leg.edgeId}${leg.reversed ? ' back' : ''}`)).toEqual([
      TASK_TO_ENDPOINT,
      ENDPOINT_TO_SECRETS,
      `${ENDPOINT_TO_SECRETS} back`,
      `${TASK_TO_ENDPOINT} back`,
    ])
  })

  it('gives back nothing when the endpoint is unreachable', () => {
    expect(buildSecretFetch(SECRET_LEGS, new Set())).toEqual([])
  })
})

describe('which tasks keep a way out to the endpoints', () => {
  it('keeps the door open while the task pulls, starts and serves', () => {
    expect(hasEgressToEndpoints('provisioning')).toBe(true)
    expect(hasEgressToEndpoints('starting')).toBe(true)
    expect(hasEgressToEndpoints('healthy')).toBe(true)
  })

  it('closes it once the task has nothing left to send', () => {
    expect(hasEgressToEndpoints('registering')).toBe(false)
    expect(hasEgressToEndpoints('draining')).toBe(false)
    expect(hasEgressToEndpoints('failed')).toBe(false)
  })
})

describe('when a task asks for its secret', () => {
  it('happens in the stage that is starting the container, not the one pulling the image', () => {
    expect(isFetchingSecret('starting')).toBe(true)
    expect(TASK_STATUS_MESSAGE.starting).toContain('starting container')
  })

  it('never happens while the image is still coming down', () => {
    expect(isFetchingSecret('provisioning')).toBe(false)
  })

  it('never happens again once the task is serving traffic', () => {
    expect(isFetchingSecret('healthy')).toBe(false)
    expect(isFetchingSecret('registering')).toBe(false)
  })
})

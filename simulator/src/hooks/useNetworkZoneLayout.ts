import { useMemo } from 'react'
import {
  ALB_NODE_ID,
  ALB_POSITION,
  AUTO_SCALING_NODE_ID,
  ENDPOINT_CARD_HEIGHT,
  FALLBACK_AUTO_SCALING_HEIGHT,
  FALLBACK_CARD_HEIGHT,
  FALLBACK_CARD_WIDTH,
  FALLBACK_WAF_HEIGHT,
  ECR_NODE_ID,
  GATEWAY_ENDPOINT_NODE_ID,
  INTERFACE_ENDPOINTS_NODE_ID,
  LAYER_STORAGE_NODE_ID,
  PRIVATE_SUBNETS_NODE_ID,
  PUBLIC_SUBNETS_NODE_ID,
  TASK_COLUMN_X,
  VPC_NODE_ID,
  WAF_NODE_ID,
  endpointPositions,
  privateTierBoxes,
  regionalServicePositions,
} from '../canvas/initial-graph'
import { networkZoneFrames } from '../canvas/network-zones'
import { useMeasuredNodeSizes } from './useMeasuredNodeSizes'
import type { FrameBox } from '../canvas/frame-metrics'
import type { XYPosition } from '@xyflow/react'

interface NetworkZoneLayoutArgs {
  serviceFrame: FrameBox
}

export interface NetworkZoneLayout {
  framesByNodeId: Map<string, FrameBox>
  positionsByNodeId: Map<string, XYPosition>
  wafPosition: XYPosition
  autoScalingPosition: XYPosition
}

export function useNetworkZoneLayout({ serviceFrame }: NetworkZoneLayoutArgs): NetworkZoneLayout {
  const sizes = useMeasuredNodeSizes()

  return useMemo(() => {
    const alb = sizes.get(ALB_NODE_ID)
    const endpointHeight = sizes.get(INTERFACE_ENDPOINTS_NODE_ID)?.height ?? ENDPOINT_CARD_HEIGHT
    const zones = networkZoneFrames(
      {
        left: ALB_POSITION.x,
        top: ALB_POSITION.y,
        right: ALB_POSITION.x + (alb?.width ?? FALLBACK_CARD_WIDTH),
        bottom: ALB_POSITION.y + (alb?.height ?? FALLBACK_CARD_HEIGHT),
      },
      privateTierBoxes(serviceFrame, endpointHeight),
    )

    const wafHeight = sizes.get(WAF_NODE_ID)?.height ?? FALLBACK_WAF_HEIGHT
    const autoScalingHeight = sizes.get(AUTO_SCALING_NODE_ID)?.height ?? FALLBACK_AUTO_SCALING_HEIGHT
    const endpoints = endpointPositions(serviceFrame)
    const regionalServices = regionalServicePositions(zones.vpc, serviceFrame)

    return {
      framesByNodeId: new Map([
        [VPC_NODE_ID, zones.vpc],
        [PUBLIC_SUBNETS_NODE_ID, zones.publicSubnets],
        [PRIVATE_SUBNETS_NODE_ID, zones.privateSubnets],
      ]),
      positionsByNodeId: new Map([
        [INTERFACE_ENDPOINTS_NODE_ID, endpoints.interface],
        [GATEWAY_ENDPOINT_NODE_ID, endpoints.gateway],
        [ECR_NODE_ID, regionalServices.registry],
        [LAYER_STORAGE_NODE_ID, regionalServices.storage],
      ]),
      wafPosition: { x: ALB_POSITION.x, y: zones.controlPlaneBottom - wafHeight },
      autoScalingPosition: { x: TASK_COLUMN_X, y: zones.controlPlaneBottom - autoScalingHeight },
    }
  }, [sizes, serviceFrame])
}

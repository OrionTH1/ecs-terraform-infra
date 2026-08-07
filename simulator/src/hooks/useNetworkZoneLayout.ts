import { useMemo } from 'react'
import {
  ALB_NODE_ID,
  ALB_POSITION,
  AURORA_FRAME,
  AUTO_SCALING_NODE_ID,
  FALLBACK_AUTO_SCALING_HEIGHT,
  FALLBACK_CARD_HEIGHT,
  FALLBACK_CARD_WIDTH,
  FALLBACK_WAF_HEIGHT,
  PRIVATE_SUBNETS_NODE_ID,
  PUBLIC_SUBNETS_NODE_ID,
  TASK_COLUMN_X,
  VPC_NODE_ID,
  WAF_NODE_ID,
} from '../canvas/initial-graph'
import { networkZoneFrames } from '../canvas/network-zones'
import { useMeasuredNodeSizes } from './useMeasuredNodeSizes'
import type { FrameBox } from '../canvas/frame-metrics'

interface NetworkZoneLayoutArgs {
  serviceFrame: FrameBox
}

export interface NetworkZoneLayout {
  framesByNodeId: Map<string, FrameBox>
  wafPosition: { x: number; y: number }
  autoScalingPosition: { x: number; y: number }
}

export function useNetworkZoneLayout({ serviceFrame }: NetworkZoneLayoutArgs): NetworkZoneLayout {
  const sizes = useMeasuredNodeSizes()

  return useMemo(() => {
    const alb = sizes.get(ALB_NODE_ID)
    const zones = networkZoneFrames(
      {
        left: ALB_POSITION.x,
        top: ALB_POSITION.y,
        right: ALB_POSITION.x + (alb?.width ?? FALLBACK_CARD_WIDTH),
        bottom: ALB_POSITION.y + (alb?.height ?? FALLBACK_CARD_HEIGHT),
      },
      serviceFrame,
      AURORA_FRAME,
    )

    const wafHeight = sizes.get(WAF_NODE_ID)?.height ?? FALLBACK_WAF_HEIGHT
    const autoScalingHeight = sizes.get(AUTO_SCALING_NODE_ID)?.height ?? FALLBACK_AUTO_SCALING_HEIGHT

    return {
      framesByNodeId: new Map([
        [VPC_NODE_ID, zones.vpc],
        [PUBLIC_SUBNETS_NODE_ID, zones.publicSubnets],
        [PRIVATE_SUBNETS_NODE_ID, zones.privateSubnets],
      ]),
      wafPosition: { x: ALB_POSITION.x, y: zones.controlPlaneBottom - wafHeight },
      autoScalingPosition: { x: TASK_COLUMN_X, y: zones.controlPlaneBottom - autoScalingHeight },
    }
  }, [sizes, serviceFrame])
}

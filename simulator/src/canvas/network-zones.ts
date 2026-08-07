import { frameAround, frameContentBox, unionBox, type ContentBox, type FrameBox } from './frame-metrics'

export const CONTROL_PLANE_GAP = 88

export interface NetworkZoneFrames {
  publicSubnets: FrameBox
  privateSubnets: FrameBox
  vpc: FrameBox
  controlPlaneBottom: number
}

export function networkZoneFrames(
  albBox: ContentBox,
  serviceFrame: FrameBox,
  auroraFrame: FrameBox,
): NetworkZoneFrames {
  const publicSubnets = frameAround(albBox)
  const privateSubnets = frameAround(unionBox([frameContentBox(serviceFrame), frameContentBox(auroraFrame)]))
  const vpc = frameAround(unionBox([frameContentBox(publicSubnets), frameContentBox(privateSubnets)]))

  return {
    publicSubnets,
    privateSubnets,
    vpc,
    controlPlaneBottom: vpc.position.y - CONTROL_PLANE_GAP,
  }
}

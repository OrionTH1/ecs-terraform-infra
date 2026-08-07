import {
  frameAround,
  frameContentBox,
  frameLeftFor,
  unionBox,
  type ContentBox,
  type FrameBox,
} from './frame-metrics'

export const CONTROL_PLANE_GAP = 88
export const SUBNET_FRAME_MIN_WIDTH = 480

export interface NetworkZoneFrames {
  publicSubnets: FrameBox
  privateSubnets: FrameBox
  vpc: FrameBox
  controlPlaneBottom: number
}

function subnetTierFrame(content: ContentBox): FrameBox {
  const frame = frameAround(content)
  if (frame.width >= SUBNET_FRAME_MIN_WIDTH) return frame

  const contentWidth = content.right - content.left

  return {
    position: {
      x: frameLeftFor(content.left, contentWidth, SUBNET_FRAME_MIN_WIDTH),
      y: frame.position.y,
    },
    width: SUBNET_FRAME_MIN_WIDTH,
    height: frame.height,
  }
}

export function networkZoneFrames(
  albBox: ContentBox,
  serviceFrame: FrameBox,
  auroraFrame: FrameBox,
): NetworkZoneFrames {
  const privateContent = unionBox([frameContentBox(serviceFrame), frameContentBox(auroraFrame)])
  const band = unionBox([albBox, privateContent])

  const publicSubnets = subnetTierFrame({ ...band, left: albBox.left, right: albBox.right })
  const privateSubnets = subnetTierFrame({ ...band, left: privateContent.left, right: privateContent.right })
  const vpc = frameAround(unionBox([frameContentBox(publicSubnets), frameContentBox(privateSubnets)]))

  return {
    publicSubnets,
    privateSubnets,
    vpc,
    controlPlaneBottom: vpc.position.y - CONTROL_PLANE_GAP,
  }
}

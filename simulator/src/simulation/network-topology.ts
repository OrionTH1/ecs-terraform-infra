export interface SubnetTier {
  label: string
  tooltip: string
  cidrByAvailabilityZone: Record<string, string>
}

export const VPC_CIDR = '10.0.0.0/16'

export const VPC_TOOLTIP =
  `One VPC, ${VPC_CIDR}, with DNS support and DNS hostnames on — the interface endpoints below need both to resolve. ` +
  'Everything inside this frame is an elastic network interface with a private address. What sits outside it is not: the Web ACL and Application Auto Scaling are regional services that act on the load balancer and the ECS service from outside the network, and the users have no address here at all — which is what the 0.0.0.0/0 rule on the load balancer is about.'

export const PUBLIC_SUBNETS: SubnetTier = {
  label: 'Public Subnets',
  tooltip:
    'The only subnets with a route to the internet gateway, and the only place a public address can exist. Nothing but the load balancer lives here — map_public_ip_on_launch is false, so even a task launched into these subnets would get no public address. Two subnets in two Availability Zones because an ALB requires at least two, and losing one zone must not take the entry point with it.',
  cidrByAvailabilityZone: {
    'us-east-1a': '10.0.0.0/24',
    'us-east-1b': '10.0.1.0/24',
  },
}

export const PRIVATE_SUBNETS: SubnetTier = {
  label: 'Private Subnets',
  tooltip:
    'No route to 0.0.0.0/0 and no NAT gateway — nothing in here can reach the internet, and nothing on the internet can address it. The tasks still pull images and write logs because they leave through VPC endpoints instead: an interface endpoint for ECR, CloudWatch Logs and Secrets Manager, and a gateway endpoint for S3 attached to this route table. That is the 443 egress on the task boundary, and it is what a NAT gateway would otherwise have cost.',
  cidrByAvailabilityZone: {
    'us-east-1a': '10.0.10.0/24',
    'us-east-1b': '10.0.11.0/24',
  },
}

export const AVAILABILITY_ZONES = Object.keys(PRIVATE_SUBNETS.cidrByAvailabilityZone)

export function subnetSummary(tier: SubnetTier): string {
  return Object.entries(tier.cidrByAvailabilityZone)
    .map(([zone, cidr]) => `${zone} ${cidr}`)
    .join(' · ')
}

export function availabilityZoneAt(index: number): string {
  return AVAILABILITY_ZONES[index % AVAILABILITY_ZONES.length]
}

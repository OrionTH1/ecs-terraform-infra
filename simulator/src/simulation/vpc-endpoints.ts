import { REGION } from './network-topology'
import type { TaskStatus } from '../types/task-data'

export type VpcEndpointKind = 'interface' | 'gateway'

export interface VpcEndpointGroup {
  kind: VpcEndpointKind
  label: string
  tooltip: string
  services: string[]
  footnote: string
}

const IMAGE_PULL_STATUSES: TaskStatus[] = ['provisioning', 'starting']

export const INTERFACE_ENDPOINTS: VpcEndpointGroup = {
  kind: 'interface',
  label: 'Interface Endpoints',
  tooltip:
    'Each of these is an elastic network interface sitting in your private subnets with an address out of your own CIDR. That is why they answer to a security group at all, and why the task egress rule for them names vpc_endpoints_sg instead of an address range. private_dns_enabled makes the ordinary service hostname resolve to the interface, so the SDK inside the container needs no configuration to use them. Between them they carry the ECR authorization token and image manifest, every log line the awslogs driver ships, and the Secrets Manager call the execution role makes to fetch the database credentials before the container starts.',
  services: ['ecr.api', 'ecr.dkr', 'logs', 'secretsmanager'],
  footnote: 'eni per private subnet · vpc_endpoints_sg',
}

export const GATEWAY_ENDPOINT: VpcEndpointGroup = {
  kind: 'gateway',
  label: 'S3 Gateway Endpoint',
  tooltip:
    'Not an interface: no network interface, no address, no security group, and no hourly charge. It is a prefix list entry added to the private route table, which is why the task egress rule for it names pl-s3 rather than a security group. It exists even though this project owns no S3 bucket — ECR keeps image layers in S3, so pulling a container is ECR for the manifest and S3 for the bytes. Without this route a task in a private subnet with no NAT gateway would authenticate against ECR and then stall downloading layers.',
  services: [`${REGION}.s3`],
  footnote: 'route table entry · no eni, no charge',
}

export const VPC_ENDPOINT_GROUPS = [INTERFACE_ENDPOINTS, GATEWAY_ENDPOINT]

export function isPullingImage(statuses: TaskStatus[]): boolean {
  return statuses.some((status) => IMAGE_PULL_STATUSES.includes(status))
}

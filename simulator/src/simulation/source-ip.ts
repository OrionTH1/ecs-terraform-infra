const RFC_5737_NON_ROUTABLE_PREFIXES = ['192.0.2', '198.51.100', '203.0.113']

const HOSTS_PER_PREFIX = 254
const MAX_ATTEMPTS = 40

function randomIp(): string {
  const prefix = RFC_5737_NON_ROUTABLE_PREFIXES[Math.floor(Math.random() * RFC_5737_NON_ROUTABLE_PREFIXES.length)]
  const host = 1 + Math.floor(Math.random() * HOSTS_PER_PREFIX)
  return `${prefix}.${host}`
}

export function generateSourceIp(taken: Iterable<string>): string {
  const used = new Set(taken)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = randomIp()
    if (!used.has(candidate)) return candidate
  }

  return randomIp()
}

export function distributeRoundRobin(totalRequests: number, targetIds: string[]): Map<string, number> {
  const shares = new Map<string, number>()
  if (targetIds.length === 0) return shares

  const base = Math.floor(totalRequests / targetIds.length)
  const remainder = totalRequests % targetIds.length
  targetIds.forEach((id, index) => shares.set(id, base + (index < remainder ? 1 : 0)))

  return shares
}

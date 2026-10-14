export interface AxialCoordinate {
  readonly q: number
  readonly r: number
}

export interface WorldPosition {
  readonly x: number
  readonly z: number
}

export const HEX_DIRECTIONS: readonly AxialCoordinate[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

export function hexId({ q, r }: AxialCoordinate): string {
  return `hex:${q},${r}`
}

export function hexDistance(a: AxialCoordinate, b: AxialCoordinate): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

export function hexNeighbors(hex: AxialCoordinate): AxialCoordinate[] {
  return HEX_DIRECTIONS.map(({ q, r }) => ({
    q: hex.q + q,
    r: hex.r + r,
  }))
}

export function areHexesAdjacent(
  a: AxialCoordinate,
  b: AxialCoordinate,
): boolean {
  return hexDistance(a, b) === 1
}

export function axialToWorld(
  { q, r }: AxialCoordinate,
  size = 1,
): WorldPosition {
  return {
    x: Math.sqrt(3) * size * (q + r / 2),
    z: 1.5 * size * r,
  }
}

export function hexDisk(radius: number): AxialCoordinate[] {
  const hexes: AxialCoordinate[] = []
  for (let q = -radius; q <= radius; q += 1) {
    const rMin = Math.max(-radius, -q - radius)
    const rMax = Math.min(radius, -q + radius)
    for (let r = rMin; r <= rMax; r += 1) {
      hexes.push({ q, r })
    }
  }
  return hexes
}

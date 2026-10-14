import { describe, expect, it } from 'vitest'
import {
  areHexesAdjacent,
  axialToWorld,
  hexDisk,
  hexDistance,
  hexId,
  hexNeighbors,
} from './coordinates'

describe('axial hex utilities', () => {
  it('assigns a stable unique identity to each coordinate in a disk', () => {
    const cells = hexDisk(4)
    const ids = cells.map(hexId)

    expect(cells).toHaveLength(61)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('hex:0,0')
  })

  it('returns six adjacent neighbors at distance one', () => {
    const origin = { q: 0, r: 0 }
    const neighbors = hexNeighbors(origin)

    expect(neighbors).toHaveLength(6)
    expect(neighbors.every((hex) => areHexesAdjacent(origin, hex))).toBe(true)
    expect(hexDistance(origin, { q: 3, r: -2 })).toBe(3)
    expect(areHexesAdjacent(origin, { q: 1, r: 1 })).toBe(false)
  })

  it('places adjacent pointy-top cells exactly one shared-edge distance apart', () => {
    const radius = 1.25
    const center = axialToWorld({ q: 0, r: 0 }, radius)

    for (const neighbor of hexNeighbors({ q: 0, r: 0 })) {
      const position = axialToWorld(neighbor, radius)
      const distance = Math.hypot(position.x - center.x, position.z - center.z)
      expect(distance).toBeCloseTo(Math.sqrt(3) * radius, 10)
    }
  })

  it('uses consistent pointy-top axial world coordinates', () => {
    expect(axialToWorld({ q: 0, r: 1 })).toEqual({
      x: Math.sqrt(3) / 2,
      z: 1.5,
    })
    expect(axialToWorld({ q: 1, r: 0 })).toEqual({
      x: Math.sqrt(3),
      z: 0,
    })
  })
})

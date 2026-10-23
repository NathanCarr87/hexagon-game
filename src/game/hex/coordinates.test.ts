import { describe, expect, it } from 'vitest'
import {
  areHexesAdjacent,
  axialToWorld,
  HEX_DIRECTIONS,
  HEX_SIZE,
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

  it('shares full edges across all six directions throughout a large grid', () => {
    const cells = hexDisk(4)
    const corners = Array.from({ length: 6 }, (_, index) => {
      const angle = Math.PI / 2 + (index * Math.PI) / 3
      return {
        x: Math.cos(angle) * HEX_SIZE,
        z: Math.sin(angle) * HEX_SIZE,
      }
    })

    for (const cell of cells) {
      const center = axialToWorld(cell)
      for (const direction of HEX_DIRECTIONS) {
        const neighbor = {
          q: cell.q + direction.q,
          r: cell.r + direction.r,
        }
        const neighborCenter = axialToWorld(neighbor)
        const sharedVertices = corners.filter((corner) => {
          const worldX = center.x + corner.x
          const worldZ = center.z + corner.z
          return corners.some((neighborCorner) => {
            const neighborX = neighborCenter.x + neighborCorner.x
            const neighborZ = neighborCenter.z + neighborCorner.z
            return Math.hypot(worldX - neighborX, worldZ - neighborZ) < 1e-9
          })
        })

        expect(sharedVertices).toHaveLength(2)
      }
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

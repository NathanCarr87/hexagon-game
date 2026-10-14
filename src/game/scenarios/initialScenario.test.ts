import { describe, expect, it } from 'vitest'
import { hexId } from '../hex/coordinates'
import { initialScenario } from './initialScenario'

describe('initial battlefield scenario', () => {
  it('provides all requested terrain types with visual elevation data', () => {
    const terrain = new Set(initialScenario.hexes.map((hex) => hex.terrain))

    expect(terrain).toEqual(
      new Set(['grassland', 'hills', 'forest', 'mountains', 'water']),
    )
    expect(
      initialScenario.hexes.some(
        (hex) => hex.terrain === 'hills' && hex.elevation > 0,
      ),
    ).toBe(true)
    expect(
      initialScenario.hexes.some(
        (hex) => hex.terrain === 'mountains' && hex.elevation > 1,
      ),
    ).toBe(true)
  })

  it('assigns every cell to one declared region and every entity to a board cell', () => {
    const cellIds = new Set(initialScenario.hexes.map(({ id }) => id))
    const regionCellIds = initialScenario.regions.flatMap(
      ({ hexIds: regionIds }) => regionIds,
    )

    expect(regionCellIds).toHaveLength(initialScenario.hexes.length)
    expect(new Set(regionCellIds).size).toBe(cellIds.size)
    expect(regionCellIds.every((id) => cellIds.has(id))).toBe(true)
    expect(
      initialScenario.units.every((unit) => cellIds.has(hexId(unit))),
    ).toBe(true)
    expect(
      initialScenario.objectives.every((objective) =>
        cellIds.has(hexId(objective)),
      ),
    ).toBe(true)
    expect(initialScenario.dataStatus).toBe('temporary-placeholder')
  })
})

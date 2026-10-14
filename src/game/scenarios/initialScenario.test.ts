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
    expect(initialScenario.dataStatus).toBe('development-fixture')
  })

  it('keeps setup zones explicitly provisional and matches starting ownership', () => {
    expect(initialScenario.setup.rulesStatus).toBe('provisional')
    expect(initialScenario.setup.allowMultipleUnitsPerHex).toBe(false)
    expect(initialScenario.pointBudgets).toBeUndefined()
    expect(
      initialScenario.units.every((unit) =>
        initialScenario.setup.deploymentZones
          .find(({ owner }) => owner === unit.owner)
          ?.hexIds.includes(hexId(unit)),
      ),
    ).toBe(true)
    expect(initialScenario.playerDefinitions).toEqual([
      { id: 'blueward', name: 'Blueward', color: '#76b8e8' },
      { id: 'redoubt', name: 'Redoubt', color: '#e28a72' },
    ])
  })
})

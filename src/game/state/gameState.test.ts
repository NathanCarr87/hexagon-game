import { describe, expect, it } from 'vitest'
import { initialScenario } from '../scenarios/initialScenario'
import { createInitialGameState, gameReducer } from './gameState'

describe('scenario setup state', () => {
  it('starts with the first scenario unit selected at its actual hex', () => {
    const state = createInitialGameState(initialScenario)

    expect(state.selectedUnitId).toBe('unit-ironwatch-01')
    expect(state.selectedHexId).toBe('hex:-2,0')
    expect(state.mode).toBe('inspection')
  })

  it('selects units and hexes by stable scenario identity', () => {
    const initial = createInitialGameState(initialScenario)
    const unitState = gameReducer(
      initial,
      { type: 'select-unit', unitId: 'unit-ashfall-01' },
      initialScenario,
    )
    const hexState = gameReducer(
      unitState,
      { type: 'select-hex', hexId: 'hex:4,-1' },
      initialScenario,
    )

    expect(unitState.selectedUnitId).toBe('unit-ashfall-01')
    expect(unitState.selectedHexId).toBe('hex:2,-1')
    expect(hexState.selectedUnitId).toBeNull()
    expect(hexState.selectedHexId).toBe('hex:4,-1')
  })

  it('previews and commits a legal placement within the selected owner zone', () => {
    const initial = createInitialGameState(initialScenario)
    const deploymentMode = gameReducer(
      initial,
      { type: 'set-mode', mode: 'deployment' },
      initialScenario,
    )
    const preview = gameReducer(
      deploymentMode,
      { type: 'preview-deployment', hexId: 'hex:-3,0' },
      initialScenario,
    )

    expect(preview.deploymentTargetHexId).toBe('hex:-3,0')
    expect(
      preview.units.find(({ id }) => id === 'unit-ironwatch-01'),
    ).toMatchObject({ q: -2, r: 0 })

    const placed = gameReducer(
      preview,
      { type: 'commit-deployment' },
      initialScenario,
    )
    expect(
      placed.units.find(({ id }) => id === 'unit-ironwatch-01'),
    ).toMatchObject({ q: -3, r: 0 })
    expect(placed.selectedHexId).toBe('hex:-3,0')
    expect(placed.deploymentTargetHexId).toBeNull()
  })

  it('rejects occupied and out-of-zone placement without moving units', () => {
    const initial = gameReducer(
      createInitialGameState(initialScenario),
      { type: 'set-mode', mode: 'deployment' },
      initialScenario,
    )
    const occupied = gameReducer(
      initial,
      { type: 'preview-deployment', hexId: 'hex:-1,1' },
      initialScenario,
    )
    expect(occupied.deploymentError).toMatch(/occupied by Ridge-02/)
    expect(
      gameReducer(
        occupied,
        { type: 'commit-deployment' },
        initialScenario,
      ).units,
    ).toEqual(initial.units)

    const outsideZone = gameReducer(
      initial,
      { type: 'preview-deployment', hexId: 'hex:2,0' },
      initialScenario,
    )
    expect(outsideZone.deploymentError).toMatch(/outside blueward/)
    expect(
      gameReducer(
        outsideZone,
        { type: 'commit-deployment' },
        initialScenario,
      ).units,
    ).toEqual(initial.units)
  })

  it('ignores unknown identities and restores initial setup on reset', () => {
    const initial = createInitialGameState(initialScenario)
    const selected = gameReducer(
      initial,
      { type: 'select-unit', unitId: 'unit-ashfall-01' },
      initialScenario,
    )

    expect(
      gameReducer(
        selected,
        { type: 'select-unit', unitId: 'unknown' },
        initialScenario,
      ),
    ).toBe(selected)
    const deploymentMode = gameReducer(
      initial,
      { type: 'set-mode', mode: 'deployment' },
      initialScenario,
    )
    const moved = gameReducer(
      gameReducer(
        deploymentMode,
        { type: 'preview-deployment', hexId: 'hex:-3,0' },
        initialScenario,
      ),
      { type: 'commit-deployment' },
      initialScenario,
    )
    expect(moved.units).not.toEqual(initial.units)
    expect(gameReducer(moved, { type: 'reset' }, initialScenario)).toEqual(
      initial,
    )
  })
})

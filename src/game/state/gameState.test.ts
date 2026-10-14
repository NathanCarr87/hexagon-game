import { describe, expect, it } from 'vitest'
import { initialScenario } from '../scenarios/initialScenario'
import { createInitialGameState, gameReducer } from './gameState'

describe('scenario selection state', () => {
  it('starts with the first scenario unit selected at its actual hex', () => {
    const state = createInitialGameState(initialScenario)

    expect(state.selectedUnitId).toBe('unit-ironwatch-01')
    expect(state.selectedHexId).toBe('hex:-2,0')
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

    expect(unitState).toEqual({
      selectedUnitId: 'unit-ashfall-01',
      selectedHexId: 'hex:2,-1',
    })
    expect(hexState).toEqual({
      selectedUnitId: null,
      selectedHexId: 'hex:4,-1',
    })
  })

  it('ignores unknown identities and restores the initial selection on reset', () => {
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
    expect(gameReducer(selected, { type: 'reset' }, initialScenario)).toEqual(
      initial,
    )
  })
})

import type { BattlefieldScenario } from '../domain/types'
import { hexId } from '../hex/coordinates'

export interface GameState {
  readonly selectedUnitId: string | null
  readonly selectedHexId: string | null
}

export type GameAction =
  | { readonly type: 'select-unit'; readonly unitId: string }
  | { readonly type: 'select-hex'; readonly hexId: string }
  | { readonly type: 'reset' }

export function createInitialGameState(
  scenario: BattlefieldScenario,
): GameState {
  const firstUnit = scenario.units[0]
  return {
    selectedUnitId: firstUnit?.id ?? null,
    selectedHexId: firstUnit ? hexId(firstUnit) : null,
  }
}

export function gameReducer(
  state: GameState,
  action: GameAction,
  scenario: BattlefieldScenario,
): GameState {
  if (action.type === 'reset') {
    return createInitialGameState(scenario)
  }
  if (action.type === 'select-unit') {
    const unit = scenario.units.find(({ id }) => id === action.unitId)
    return unit
      ? { selectedUnitId: unit.id, selectedHexId: hexId(unit) }
      : state
  }
  return scenario.hexes.some(({ id }) => id === action.hexId)
    ? { selectedUnitId: null, selectedHexId: action.hexId }
    : state
}

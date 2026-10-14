import type { BattlefieldScenario } from '../domain/types'
import { hexId } from '../hex/coordinates'
import { validateDeployment } from './deployment'

export interface GameState {
  readonly selectedUnitId: string | null
  readonly selectedHexId: string | null
  readonly units: BattlefieldScenario['units']
  readonly mode: 'inspection' | 'deployment'
  readonly deploymentTargetHexId: string | null
  readonly deploymentError: string | null
}

export type GameAction =
  | { readonly type: 'select-unit'; readonly unitId: string }
  | { readonly type: 'select-hex'; readonly hexId: string }
  | { readonly type: 'set-mode'; readonly mode: GameState['mode'] }
  | { readonly type: 'preview-deployment'; readonly hexId: string }
  | { readonly type: 'commit-deployment' }
  | { readonly type: 'reset' }

export function createInitialGameState(
  scenario: BattlefieldScenario,
): GameState {
  const firstUnit = scenario.units[0]
  return {
    selectedUnitId: firstUnit?.id ?? null,
    selectedHexId: firstUnit ? hexId(firstUnit) : null,
    units: scenario.units.map((unit) => ({ ...unit })),
    mode: 'inspection',
    deploymentTargetHexId: null,
    deploymentError: null,
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
    const unit = state.units.find(({ id }) => id === action.unitId)
    return unit
      ? {
          ...state,
          selectedUnitId: unit.id,
          selectedHexId: hexId(unit),
          deploymentTargetHexId: null,
          deploymentError: null,
        }
      : state
  }
  if (action.type === 'set-mode') {
    return {
      ...state,
      mode: action.mode,
      deploymentTargetHexId: null,
      deploymentError: null,
    }
  }
  if (action.type === 'preview-deployment') {
    if (
      state.mode !== 'deployment' ||
      !scenario.hexes.some(({ id }) => id === action.hexId)
    ) {
      return state
    }
    const selectedUnit = state.units.find(
      ({ id }) => id === state.selectedUnitId,
    )
    if (!selectedUnit) {
      return {
        ...state,
        selectedHexId: action.hexId,
        deploymentTargetHexId: null,
        deploymentError: 'Select a unit before choosing a deployment hex.',
      }
    }
    return {
      ...state,
      selectedHexId: action.hexId,
      deploymentTargetHexId: action.hexId,
      deploymentError: validateDeployment(
        selectedUnit,
        action.hexId,
        state.units,
        scenario,
      ),
    }
  }
  if (action.type === 'commit-deployment') {
    const unit = state.units.find(({ id }) => id === state.selectedUnitId)
    if (!unit || !state.deploymentTargetHexId) return state
    const error = validateDeployment(
      unit,
      state.deploymentTargetHexId,
      state.units,
      scenario,
    )
    if (error) return { ...state, deploymentError: error }
    const hex = scenario.hexes.find(
      ({ id }) => id === state.deploymentTargetHexId,
    )
    if (!hex) return state
    return {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, q: hex.q, r: hex.r }
          : candidate,
      ),
      selectedHexId: hex.id,
      deploymentTargetHexId: null,
      deploymentError: null,
    }
  }
  if (
    state.mode === 'deployment' &&
    state.selectedUnitId &&
    scenario.hexes.some(({ id }) => id === action.hexId)
  ) {
    return gameReducer(
      state,
      { type: 'preview-deployment', hexId: action.hexId },
      scenario,
    )
  }
  return scenario.hexes.some(({ id }) => id === action.hexId)
    ? {
        ...state,
        selectedUnitId: null,
        selectedHexId: action.hexId,
        deploymentTargetHexId: null,
        deploymentError: null,
      }
    : state
}

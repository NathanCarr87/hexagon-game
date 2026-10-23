import type { BattlefieldScenario } from '../domain/types'
import { getScenarioById, scenarios } from '../scenarios'
import {
  validateScenario,
  validateScenarioCatalog,
} from '../scenarios/validateScenario'
import { hexId } from '../hex/coordinates'
import { validateDeployment } from './deployment'
import {
  attackUnit,
  createBattle,
  endPlayerTurn,
  moveUnit,
  restartBattle,
  type BattleState,
} from './battle'

export interface GameState {
  readonly scenario: BattlefieldScenario
  readonly selectedUnitId: string | null
  readonly selectedHexId: string | null
  readonly units: BattlefieldScenario['units']
  readonly mode: 'inspection' | 'deployment' | 'battle'
  readonly battle: BattleState | null
  readonly battleActionMode: 'select' | 'move' | 'attack'
  readonly battleMessage: string | null
  readonly deploymentTargetHexId: string | null
  readonly deploymentError: string | null
}

export type GameAction =
  | { readonly type: 'select-scenario'; readonly scenarioId: string }
  | { readonly type: 'select-unit'; readonly unitId: string }
  | { readonly type: 'select-hex'; readonly hexId: string }
  | {
      readonly type: 'set-mode'
      readonly mode: 'inspection' | 'deployment'
    }
  | { readonly type: 'preview-deployment'; readonly hexId: string }
  | { readonly type: 'commit-deployment' }
  | { readonly type: 'start-battle' }
  | { readonly type: 'restart-battle' }
  | { readonly type: 'return-to-setup' }
  | { readonly type: 'set-battle-action'; readonly mode: GameState['battleActionMode'] }
  | { readonly type: 'move-unit'; readonly unitId: string; readonly hexId: string }
  | { readonly type: 'attack-unit'; readonly attackerId: string; readonly targetId: string }
  | { readonly type: 'end-turn' }
  | { readonly type: 'reset' }

export function createInitialGameState(
  scenario: BattlefieldScenario,
): GameState {
  const firstUnit = scenario.units[0]
  return {
    scenario,
    selectedUnitId: firstUnit?.id ?? null,
    selectedHexId: firstUnit ? hexId(firstUnit) : null,
    units: scenario.units.map((unit) => ({ ...unit })),
    mode: 'inspection',
    battle: null,
    battleActionMode: 'select',
    battleMessage: null,
    deploymentTargetHexId: null,
    deploymentError: null,
  }
}

export function gameReducer(
  state: GameState,
  action: GameAction,
  scenario: BattlefieldScenario = state.scenario,
): GameState {
  if (action.type === 'select-scenario') {
    if (state.battle) return state
    const catalogError = validateScenarioCatalog(scenarios)[0]
    if (catalogError) return { ...state, battleMessage: catalogError }
    const nextScenario = getScenarioById(action.scenarioId)
    return nextScenario && nextScenario.id !== state.scenario.id
      ? createInitialGameState(nextScenario)
      : state
  }
  if (action.type === 'reset') {
    return createInitialGameState(state.scenario)
  }
  if (action.type === 'return-to-setup') {
    if (!state.battle) return state
    const firstUnit = state.units[0]
    return {
      ...state,
      mode: 'deployment',
      battle: null,
      battleActionMode: 'select',
      battleMessage: null,
      selectedUnitId: firstUnit?.id ?? null,
      selectedHexId: firstUnit ? hexId(firstUnit) : null,
      deploymentTargetHexId: null,
      deploymentError: null,
    }
  }
  if (action.type === 'start-battle') {
    if (state.battle || state.mode === 'battle') return state
    const scenarioErrors = [
      ...validateScenarioCatalog(scenarios),
      ...validateScenario(scenario),
    ]
    if (scenarioErrors.length > 0) {
      return { ...state, battleMessage: scenarioErrors[0] ?? null }
    }
    const { battle, error } = createBattle(state.units, scenario)
    return battle
      ? {
          ...state,
          mode: 'battle',
          battle,
          battleActionMode: 'select',
          battleMessage: null,
          selectedUnitId: null,
          selectedHexId: null,
          deploymentTargetHexId: null,
          deploymentError: null,
        }
      : { ...state, battleMessage: error }
  }
  if (action.type === 'restart-battle') {
    if (!state.battle) return state
    return {
      ...state,
      battle: restartBattle(state.battle, scenario),
      battleActionMode: 'select',
      battleMessage: null,
      selectedUnitId: null,
      selectedHexId: null,
    }
  }
  if (action.type === 'set-battle-action') {
    if (!state.battle || state.battle.phase !== 'active') return state
    return { ...state, battleActionMode: action.mode, battleMessage: null }
  }
  if (action.type === 'move-unit') {
    if (!state.battle) return state
    const result = moveUnit(state.battle, action.unitId, action.hexId, scenario)
    return result.error
      ? { ...state, battleMessage: result.error }
      : {
          ...state,
          battle: result.state,
          battleActionMode: 'select',
          battleMessage: null,
          selectedUnitId: action.unitId,
          selectedHexId: action.hexId,
        }
  }
  if (action.type === 'attack-unit') {
    if (!state.battle) return state
    const result = attackUnit(
      state.battle,
      action.attackerId,
      action.targetId,
      scenario,
    )
    if (result.error) return { ...state, battleMessage: result.error }
    const selectedAfterAttack = result.state.units.find(
      ({ id }) => id === action.attackerId,
    )
    return {
      ...state,
      battle: result.state,
      battleActionMode: 'select',
      battleMessage: null,
      selectedUnitId: selectedAfterAttack?.id ?? null,
      selectedHexId: selectedAfterAttack ? hexId(selectedAfterAttack) : null,
    }
  }
  if (action.type === 'end-turn') {
    if (!state.battle) return state
    const result = endPlayerTurn(state.battle, scenario)
    return result.error
      ? { ...state, battleMessage: result.error }
      : {
          ...state,
          battle: result.state,
          battleActionMode: 'select',
          battleMessage: null,
          selectedUnitId: null,
          selectedHexId: null,
        }
  }
  if (state.mode === 'battle') {
    if (action.type === 'select-unit') {
      const unit = state.battle?.units.find(({ id }) => id === action.unitId)
      return unit
        ? {
            ...state,
            selectedUnitId: unit.id,
            selectedHexId: hexId(unit),
            battleMessage: null,
          }
        : state
    }
    if (action.type === 'select-hex') {
      const selectedUnit = state.battle?.units.find(
        ({ id }) => id === state.selectedUnitId,
      )
      if (state.battleActionMode === 'move' && selectedUnit) {
        return gameReducer(
          state,
          {
            type: 'move-unit',
            unitId: selectedUnit.id,
            hexId: action.hexId,
          },
          scenario,
        )
      }
      return scenario.hexes.some(({ id }) => id === action.hexId)
        ? {
            ...state,
            selectedUnitId: null,
            selectedHexId: action.hexId,
            battleMessage: null,
          }
        : state
    }
    return state
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
    if (state.battle) return state
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

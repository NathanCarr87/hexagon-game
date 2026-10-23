import type {
  BattlefieldScenario,
  ScenarioUnit,
} from '../domain/types'
import { hexDistance, hexId } from '../hex/coordinates'
import {
  attackUnit,
  createBattle,
  endPlayerTurn,
  getAttackPreview,
  getAttackTargets,
  getMovementDestinations,
  moveUnit,
  type BattleResult,
  type BattleState,
} from '../state/battle'

export interface SimulationAction {
  readonly round: number
  readonly playerId: string
  readonly type: 'move' | 'attack' | 'end-turn'
  readonly unitId?: string
  readonly fromHexId?: string
  readonly toHexId?: string
  readonly targetUnitId?: string
  readonly damage?: number
  readonly objectiveScores?: Readonly<Record<string, number>>
  readonly controlledObjectiveIds?: readonly string[]
}

export interface SimulationOptions {
  readonly scenario: BattlefieldScenario
  readonly seed: number
  readonly maxRounds: number
  readonly units?: readonly ScenarioUnit[]
}

export interface SimulationBatchOptions {
  readonly scenario: BattlefieldScenario
  readonly seeds: readonly number[]
  readonly maxRounds: number
  readonly units?: readonly ScenarioUnit[]
}

export interface SimulationResult {
  readonly seed: number
  readonly startingPlayerId: string
  readonly battle: BattleState
  readonly actions: readonly SimulationAction[]
}

export interface UnitSimulationMetrics {
  readonly deployed: number
  readonly destroyed: number
  readonly surviving: number
  readonly damageDealt: number
  readonly damageReceived: number
}

type MutableUnitSimulationMetrics = {
  -readonly [Key in keyof UnitSimulationMetrics]: UnitSimulationMetrics[Key]
}

export interface SimulationSummary {
  readonly sampleSize: number
  readonly playerOutcomes: Readonly<
    Record<string, { readonly wins: number; readonly losses: number; readonly draws: number }>
  >
  readonly averageRounds: number
  readonly averageActions: number
  readonly actionCounts: Readonly<Record<'move' | 'attack' | 'end-turn', number>>
  readonly objectivePoints: Readonly<Record<string, number>>
  readonly objectiveControlTurns: Readonly<Record<string, number>>
  readonly victoryReasons: Readonly<Record<BattleResult['reason'], number>>
  readonly unitMetrics: Readonly<Record<string, UnitSimulationMetrics>>
}

export interface SimulationBatch {
  readonly results: readonly SimulationResult[]
  readonly summary: SimulationSummary
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000
  }
}

function chooseAttack(
  battle: BattleState,
  unitId: string,
  scenario: BattlefieldScenario,
): string | undefined {
  return getAttackTargets(battle, unitId, scenario)
    .map((targetId) => ({
      targetId,
      preview: getAttackPreview(battle, unitId, targetId, scenario),
    }))
    .filter(
      (
        target,
      ): target is {
        readonly targetId: string
        readonly preview: NonNullable<typeof target.preview>
      } => target.preview !== null,
    )
    .sort(
      (a, b) =>
        Number(b.preview.willDefeat) - Number(a.preview.willDefeat) ||
        b.preview.damage - a.preview.damage ||
        a.preview.remainingHp - b.preview.remainingHp ||
        a.targetId.localeCompare(b.targetId),
    )[0]?.targetId
}

function strategicTargets(
  battle: BattleState,
  scenario: BattlefieldScenario,
): readonly { readonly q: number; readonly r: number }[] {
  if (scenario.battleRules.victory.mode !== 'elimination') {
    const uncontrolled = scenario.objectives.filter(
      ({ q, r }) =>
        !battle.units.some(
          (unit) =>
            unit.q === q &&
            unit.r === r &&
            unit.owner === battle.activePlayerId,
        ),
    )
    if (uncontrolled.length > 0) return uncontrolled
  }
  return battle.units
    .filter(({ owner }) => owner !== battle.activePlayerId)
    .map(({ q, r }) => ({ q, r }))
}

function chooseMove(
  battle: BattleState,
  unitId: string,
  scenario: BattlefieldScenario,
): string | undefined {
  const unit = battle.units.find(({ id }) => id === unitId)
  if (!unit) return undefined
  const targets = strategicTargets(battle, scenario)
  if (targets.length === 0) return undefined
  const currentDistance = Math.min(
    ...targets.map((target) => hexDistance(unit, target)),
  )
  return getMovementDestinations(battle, unitId, scenario)
    .map((destination) => {
      const hex = scenario.hexes.find(({ id }) => id === destination.hexId)
      if (!hex) return null
      return {
        ...destination,
        distance: Math.min(
          ...targets.map((target) => hexDistance(hex, target)),
        ),
      }
    })
    .filter(
      (
        destination,
      ): destination is NonNullable<typeof destination> =>
        destination !== null && destination.distance < currentDistance,
    )
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        a.movementCost - b.movementCost ||
        a.hexId.localeCompare(b.hexId),
    )[0]?.hexId
}

export function simulateBaselineBattle({
  scenario,
  seed,
  maxRounds,
  units = scenario.units,
}: SimulationOptions): SimulationResult {
  if (!Number.isInteger(seed)) {
    throw new Error('Simulation seed must be an integer.')
  }
  if (!Number.isInteger(maxRounds) || maxRounds < 1) {
    throw new Error('Simulation maximum rounds must be a positive integer.')
  }

  const configuredRoundLimit = scenario.battleRules.victory.roundLimit
  const cappedScenario: BattlefieldScenario = {
    ...scenario,
    battleRules: {
      ...scenario.battleRules,
      victory: {
        ...scenario.battleRules.victory,
        roundLimit:
          configuredRoundLimit === undefined
            ? maxRounds
            : Math.min(configuredRoundLimit, maxRounds),
      },
    },
  }
  const created = createBattle(units, cappedScenario, seededRandom(seed))
  if (!created.battle) {
    throw new Error(created.error ?? 'Simulation battle could not be created.')
  }

  let battle = created.battle
  const actions: SimulationAction[] = []
  while (battle.phase === 'active') {
    const playerId = battle.activePlayerId
    for (const unitId of battle.units
      .filter(({ owner }) => owner === playerId)
      .map(({ id }) => id)) {
      while (battle.phase === 'active') {
        const unit = battle.units.find(({ id }) => id === unitId)
        if (
          !unit ||
          unit.combatApRemaining <
            Math.min(
              cappedScenario.battleRules.movementApCost,
              cappedScenario.battleRules.attackApCost,
            )
        ) {
          break
        }
        const targetId = chooseAttack(battle, unitId, cappedScenario)
        if (targetId) {
          const target = battle.units.find(({ id }) => id === targetId)
          const preview = getAttackPreview(
            battle,
            unitId,
            targetId,
            cappedScenario,
          )
          if (!target || !preview) {
            throw new Error('Baseline policy selected an invalid attack target.')
          }
          const result = attackUnit(battle, unitId, targetId, cappedScenario)
          if (result.error) throw new Error(result.error)
          battle = result.state
          actions.push({
            round: battle.round,
            playerId,
            type: 'attack',
            unitId,
            targetUnitId: targetId,
            damage: preview.damage,
          })
          continue
        }

        const destinationHexId = chooseMove(battle, unitId, cappedScenario)
        if (!destinationHexId) break
        const fromHexId = hexId(unit)
        const result = moveUnit(
          battle,
          unitId,
          destinationHexId,
          cappedScenario,
        )
        if (result.error) throw new Error(result.error)
        battle = result.state
        actions.push({
          round: battle.round,
          playerId,
          type: 'move',
          unitId,
          fromHexId,
          toHexId: destinationHexId,
        })
      }
    }
    if (battle.phase !== 'active') break
    const completedRound = battle.round
    const result = endPlayerTurn(battle, cappedScenario)
    if (result.error) throw new Error(result.error)
    battle = result.state
    actions.push({
      round: completedRound,
      playerId,
      type: 'end-turn',
      objectiveScores: result.state.objectiveScores,
      controlledObjectiveIds: scenario.objectives
        .filter((objective) =>
          result.state.units.some(
            (unit) =>
              unit.owner === playerId &&
              unit.q === objective.q &&
              unit.r === objective.r,
          ),
        )
        .map(({ id }) => id),
    })
  }

  return {
    seed,
    startingPlayerId: created.battle.activePlayerId,
    battle,
    actions,
  }
}

export function summarizeSimulations(
  results: readonly SimulationResult[],
  scenario: BattlefieldScenario,
): SimulationSummary {
  const playerOutcomes = Object.fromEntries(
    scenario.players.map((playerId) => [
      playerId,
      { wins: 0, losses: 0, draws: 0 },
    ]),
  )
  const victoryReasons: Record<BattleResult['reason'], number> = {
    objectives: 0,
    elimination: 0,
    combined: 0,
    'round-limit': 0,
    draw: 0,
  }
  const actionCounts = { move: 0, attack: 0, 'end-turn': 0 }
  const objectivePoints = Object.fromEntries(
    scenario.players.map((playerId) => [playerId, 0]),
  )
  const objectiveControlTurns = Object.fromEntries(
    scenario.players.map((playerId) => [playerId, 0]),
  )
  const unitMetrics: Record<string, MutableUnitSimulationMetrics> = {}

  for (const result of results) {
    const battleResult = result.battle.result
    if (!battleResult) throw new Error('Cannot summarize an unfinished simulation.')
    victoryReasons[battleResult.reason] += 1
    for (const playerId of scenario.players) {
      objectivePoints[playerId] =
        (objectivePoints[playerId] ?? 0) +
        (result.battle.objectiveScores[playerId] ?? 0)
      const outcome = playerOutcomes[playerId]
      if (!outcome) continue
      if (battleResult.winnerId === null) outcome.draws += 1
      else if (battleResult.winnerId === playerId) outcome.wins += 1
      else outcome.losses += 1
    }
    for (const unit of result.battle.initialUnits) {
      const definitionId = unit.definitionId
      const metrics = unitMetrics[definitionId] ??= {
        deployed: 0,
        destroyed: 0,
        surviving: 0,
        damageDealt: 0,
        damageReceived: 0,
      }
      metrics.deployed += 1
      const survivor = result.battle.units.find(({ id }) => id === unit.id)
      if (survivor) metrics.surviving += 1
      else metrics.destroyed += 1
    }
    for (const action of result.actions) {
      actionCounts[action.type] += 1
      if (action.type === 'end-turn') {
        objectiveControlTurns[action.playerId] =
          (objectiveControlTurns[action.playerId] ?? 0) +
          (action.controlledObjectiveIds?.length ?? 0)
      }
      if (action.type !== 'attack' || action.damage === undefined) continue
      const attacker = result.battle.initialUnits.find(
        ({ id }) => id === action.unitId,
      )
      const target = result.battle.initialUnits.find(
        ({ id }) => id === action.targetUnitId,
      )
      if (!attacker || !target) continue
      const attackerMetrics = unitMetrics[attacker.definitionId]
      const targetMetrics = unitMetrics[target.definitionId]
      if (attackerMetrics) attackerMetrics.damageDealt += action.damage
      if (targetMetrics) targetMetrics.damageReceived += action.damage
    }
  }

  return {
    sampleSize: results.length,
    playerOutcomes,
    averageRounds:
      results.length === 0
        ? 0
        : results.reduce((sum, result) => sum + result.battle.round, 0) /
          results.length,
    averageActions:
      results.length === 0
        ? 0
        : results.reduce((sum, result) => sum + result.actions.length, 0) /
          results.length,
    actionCounts,
    objectivePoints,
    objectiveControlTurns,
    victoryReasons,
    unitMetrics,
  }
}

export function runBaselineBatch({
  scenario,
  seeds,
  maxRounds,
  units,
}: SimulationBatchOptions): SimulationBatch {
  const results = seeds.map((seed) =>
    simulateBaselineBattle({ scenario, seed, maxRounds, units }),
  )
  return {
    results,
    summary: summarizeSimulations(results, scenario),
  }
}

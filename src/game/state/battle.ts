import type {
  BattlefieldScenario,
  BattlefieldHex,
  ScenarioUnit,
  TerrainType,
} from '../domain/types'
import {
  hexDistance,
  hexId,
  hexNeighbors,
  type AxialCoordinate,
} from '../hex/coordinates'
import { validateScenario } from '../scenarios/validateScenario'

export interface CombatUnit extends ScenarioUnit {
  readonly combatApRemaining: number
}

export interface BattleEvent {
  readonly id: number
  readonly round: number
  readonly message: string
}

export interface BattleResult {
  readonly winnerId: string | null
  readonly reason: 'objectives' | 'elimination' | 'combined' | 'round-limit' | 'draw'
}

export interface BattleState {
  readonly phase: 'active' | 'ended'
  readonly round: number
  readonly initialStartingPlayerId: string
  readonly startingPlayerId: string
  readonly activePlayerId: string
  readonly units: readonly CombatUnit[]
  readonly initialUnits: readonly ScenarioUnit[]
  readonly objectiveScores: Readonly<Record<string, number>>
  readonly log: readonly BattleEvent[]
  readonly result: BattleResult | null
  readonly nextEventId: number
}

export interface BattleActionResult {
  readonly state: BattleState
  readonly error: string | null
}

export interface MovementDestination {
  readonly hexId: string
  readonly movementCost: number
}

const terrainElevation = (
  terrain: TerrainType,
  scenario: BattlefieldScenario,
): number => scenario.battleRules.elevationByTerrain[terrain]

function appendEvent(
  state: BattleState,
  message: string,
): Pick<BattleState, 'log' | 'nextEventId'> {
  return {
    log: [
      ...state.log,
      { id: state.nextEventId, round: state.round, message },
    ],
    nextEventId: state.nextEventId + 1,
  }
}

export function validateBattleSetup(
  units: readonly ScenarioUnit[],
  scenario: BattlefieldScenario,
): string | null {
  const scenarioError = validateScenario(scenario)[0]
  if (scenarioError) return scenarioError
  if (scenario.players.length !== 2) {
    return 'Version 1 battles require exactly two configured players.'
  }
  if (new Set(scenario.players).size !== 2) {
    return 'Player identities must be unique.'
  }
  if (
    scenario.battleRules.startingPlayerId &&
    !scenario.players.includes(scenario.battleRules.startingPlayerId)
  ) {
    return 'The configured starting player is not part of this scenario.'
  }
  const { battleRules } = scenario
  if (
    !Number.isInteger(battleRules.combatApPerTurn) ||
    battleRules.combatApPerTurn < 1 ||
    !Number.isInteger(battleRules.movementApCost) ||
    battleRules.movementApCost < 1 ||
    !Number.isInteger(battleRules.attackApCost) ||
    battleRules.attackApCost < 1 ||
    !Number.isInteger(battleRules.defaultAttackRange) ||
    battleRules.defaultAttackRange < 1
  ) {
    return 'Scenario combat action costs and attack range must be positive integers.'
  }
  if (
    ['objectives', 'either', 'both'].includes(battleRules.victory.mode) &&
    (!Number.isInteger(battleRules.victory.objectiveScoreToWin) ||
      (battleRules.victory.objectiveScoreToWin ?? 0) < 1)
  ) {
    return 'This victory mode requires a positive objective score threshold.'
  }
  if (
    battleRules.victory.roundLimit !== undefined &&
    (!Number.isInteger(battleRules.victory.roundLimit) ||
      battleRules.victory.roundLimit < 1)
  ) {
    return 'The scenario round limit must be a positive integer.'
  }
  const hexes = new Map(scenario.hexes.map((hex) => [hex.id, hex]))
  const occupied = new Set<string>()
  const unitIds = new Set<string>()
  for (const unit of units) {
    const id = hexId(unit)
    if (!hexes.has(id)) return `${unit.name} is not deployed on the battlefield.`
    if (unitIds.has(unit.id)) return `Unit identity ${unit.id} is duplicated.`
    unitIds.add(unit.id)
    if (
      !Number.isFinite(unit.currentHp) ||
      unit.currentHp <= 0 ||
      !Number.isFinite(unit.maxHp) ||
      unit.maxHp < unit.currentHp
    ) {
      return `${unit.name} has invalid starting health.`
    }
    if (!scenario.players.includes(unit.owner)) {
      return `${unit.name} has an owner not configured for this scenario.`
    }
    if (
      !Number.isFinite(unit.stats.Mobility) ||
      unit.stats.Mobility <= 0 ||
      !Number.isFinite(unit.stats.Power) ||
      !Number.isFinite(unit.stats.Guard)
    ) {
      return `${unit.name} is missing valid provisional combat statistics.`
    }
    if (
      unit.combat?.attackRange !== undefined &&
      (!Number.isInteger(unit.combat.attackRange) ||
        unit.combat.attackRange < 1)
    ) {
      return `${unit.name} has an invalid attack range.`
    }
    if (occupied.has(id)) return `More than one unit occupies ${id}.`
    occupied.add(id)
    const zone = scenario.setup.deploymentZones.find(
      ({ owner }) => owner === unit.owner,
    )
    if (!zone?.hexIds.includes(id)) {
      return `${unit.name} is outside its owner's deployment zone.`
    }
  }
  if (!units.some((unit) => unit.owner === scenario.players[0])) {
    return `${scenario.players[0]} has no deployed units.`
  }
  if (!units.some((unit) => unit.owner === scenario.players[1])) {
    return `${scenario.players[1]} has no deployed units.`
  }
  return null
}

export function createBattle(
  units: readonly ScenarioUnit[],
  scenario: BattlefieldScenario,
  random: () => number = Math.random,
): { readonly battle: BattleState | null; readonly error: string | null } {
  const scenarioError = validateScenario(scenario)[0]
  if (scenarioError) {
    return { battle: null, error: scenarioError }
  }
  const error = validateBattleSetup(units, scenario)
  if (error) return { battle: null, error }
  const startingPlayerId =
    scenario.battleRules.startingPlayerId ??
    scenario.players[
      Math.min(
        scenario.players.length - 1,
        Math.floor(random() * scenario.players.length),
      )
    ]
  if (!startingPlayerId) {
    return { battle: null, error: 'A starting player could not be selected.' }
  }

  const battle: BattleState = {
    phase: 'active',
    round: 1,
    initialStartingPlayerId: startingPlayerId,
    startingPlayerId,
    activePlayerId: startingPlayerId,
    units: units.map((unit) => ({
      ...unit,
      combatApRemaining:
        unit.owner === startingPlayerId
          ? scenario.battleRules.combatApPerTurn
          : 0,
    })),
    initialUnits: units.map((unit) => ({ ...unit })),
    objectiveScores: Object.fromEntries(
      scenario.players.map((playerId) => [playerId, 0]),
    ),
    log: [],
    result: null,
    nextEventId: 1,
  }
  const event = appendEvent(
    battle,
    `${startingPlayerId} starts round 1.`,
  )
  return { battle: { ...battle, ...event }, error: null }
}

function hexFor(
  coordinate: AxialCoordinate,
  scenario: BattlefieldScenario,
): BattlefieldHex | undefined {
  return scenario.hexes.find(({ id }) => id === hexId(coordinate))
}

function passableCost(
  hex: BattlefieldHex,
  scenario: BattlefieldScenario,
): number | null {
  return scenario.battleRules.terrain[hex.terrain].movementCost
}

export function getMovementDestinations(
  battle: BattleState,
  unitId: string,
  scenario: BattlefieldScenario,
): readonly MovementDestination[] {
  if (battle.phase !== 'active') return []
  const unit = battle.units.find(({ id }) => id === unitId)
  if (
    !unit ||
    unit.owner !== battle.activePlayerId ||
    unit.combatApRemaining < scenario.battleRules.movementApCost
  ) {
    return []
  }
  const mobility = unit.stats.Mobility
  if (!Number.isFinite(mobility) || mobility <= 0) return []
  const occupied = new Set(
    battle.units
      .filter(({ id }) => id !== unit.id)
      .map((candidate) => hexId(candidate)),
  )
  const startId = hexId(unit)
  const bestCost = new Map<string, number>([[startId, 0]])
  const pending: Array<{ coordinate: AxialCoordinate; cost: number }> = [
    { coordinate: unit, cost: 0 },
  ]

  while (pending.length > 0) {
    pending.sort((a, b) => a.cost - b.cost)
    const current = pending.shift()
    if (!current) break
    const currentId = hexId(current.coordinate)
    if (current.cost !== bestCost.get(currentId)) continue
    for (const neighbor of hexNeighbors(current.coordinate)) {
      const neighborId = hexId(neighbor)
      if (occupied.has(neighborId)) continue
      const hex = hexFor(neighbor, scenario)
      if (!hex) continue
      const stepCost = passableCost(hex, scenario)
      if (stepCost === null) continue
      const cost = current.cost + stepCost
      if (cost > mobility || cost >= (bestCost.get(neighborId) ?? Infinity)) {
        continue
      }
      bestCost.set(neighborId, cost)
      pending.push({ coordinate: neighbor, cost })
    }
  }

  return [...bestCost.entries()]
    .filter(([id]) => id !== startId)
    .map(([id, movementCost]) => ({ hexId: id, movementCost }))
    .sort((a, b) => a.movementCost - b.movementCost || a.hexId.localeCompare(b.hexId))
}

export function moveUnit(
  battle: BattleState,
  unitId: string,
  destinationHexId: string,
  scenario: BattlefieldScenario,
): BattleActionResult {
  if (battle.phase !== 'active') {
    return { state: battle, error: 'The battle is not active.' }
  }
  const unit = battle.units.find(({ id }) => id === unitId)
  if (!unit || unit.owner !== battle.activePlayerId) {
    return { state: battle, error: 'Only an active-player unit may move.' }
  }
  const destination = getMovementDestinations(battle, unitId, scenario).find(
    ({ hexId: id }) => id === destinationHexId,
  )
  if (!destination) {
    return { state: battle, error: 'That is not a legal movement destination.' }
  }
  const hex = scenario.hexes.find(({ id }) => id === destinationHexId)
  if (!hex) return { state: battle, error: 'That hex is not on the board.' }
  const updated: BattleState = {
    ...battle,
    units: battle.units.map((candidate) =>
      candidate.id === unitId
        ? {
            ...candidate,
            q: hex.q,
            r: hex.r,
            combatApRemaining:
              candidate.combatApRemaining - scenario.battleRules.movementApCost,
          }
        : candidate,
    ),
  }
  const event = appendEvent(
    updated,
    `${unit.name} moved to ${destinationHexId} (${destination.movementCost} movement).`,
  )
  return { state: finishIfWon({ ...updated, ...event }, scenario), error: null }
}

function cubeRound(q: number, r: number): AxialCoordinate {
  const x = q
  const z = r
  const y = -x - z
  let rx = Math.round(x)
  let ry = Math.round(y)
  let rz = Math.round(z)
  const dx = Math.abs(rx - x)
  const dy = Math.abs(ry - y)
  const dz = Math.abs(rz - z)
  if (dx > dy && dx > dz) rx = -ry - rz
  else if (dy > dz) ry = -rx - rz
  else rz = -rx - ry
  return { q: rx, r: rz }
}

function lineOfSightBlocker(
  attacker: CombatUnit,
  target: CombatUnit,
  battle: BattleState,
  scenario: BattlefieldScenario,
): string | null {
  const distance = hexDistance(attacker, target)
  if (distance <= 1) return null
  for (let step = 1; step < distance; step += 1) {
    const ratio = step / distance
    const coordinate = cubeRound(
      attacker.q + (target.q - attacker.q) * ratio,
      attacker.r + (target.r - attacker.r) * ratio,
    )
    const id = hexId(coordinate)
    const hex = scenario.hexes.find((candidate) => candidate.id === id)
    if (!hex) return `Line of sight is blocked by the board edge at ${id}.`
    if (scenario.battleRules.terrain[hex.terrain].blocksLineOfSight) {
      return `Line of sight is blocked by ${hex.terrain} at ${id}.`
    }
    const blockingUnit = battle.units.find(
      (unit) =>
        unit.id !== attacker.id &&
        unit.id !== target.id &&
        hexId(unit) === id,
    )
    if (blockingUnit) {
      return `Line of sight is blocked by ${blockingUnit.name} at ${id}.`
    }
  }
  return null
}

export interface AttackTargetStatus {
  readonly legal: boolean
  readonly reason: string | null
}

export function getAttackTargetStatus(
  battle: BattleState,
  attackerId: string,
  targetId: string,
  scenario: BattlefieldScenario,
): AttackTargetStatus {
  if (battle.phase !== 'active') {
    return { legal: false, reason: 'The battle is not active.' }
  }
  const attacker = battle.units.find(({ id }) => id === attackerId)
  if (!attacker || attacker.owner !== battle.activePlayerId) {
    return { legal: false, reason: 'Only an active-player unit may attack.' }
  }
  const target = battle.units.find(({ id }) => id === targetId)
  if (!target || target.currentHp <= 0) {
    return { legal: false, reason: 'The target is not a living unit.' }
  }
  if (target.owner === attacker.owner) {
    return { legal: false, reason: 'A unit cannot attack an ally.' }
  }
  if (
    attacker.combatApRemaining < scenario.battleRules.attackApCost
  ) {
    return { legal: false, reason: 'The attacker has no combat AP remaining.' }
  }
  const distance = hexDistance(attacker, target)
  const attackRange =
    attacker.combat?.attackRange ?? scenario.battleRules.defaultAttackRange
  if (distance < 1 || distance > attackRange) {
    return {
      legal: false,
      reason: `Target is out of range (${distance} hexes; range ${attackRange}).`,
    }
  }
  const blocker = lineOfSightBlocker(attacker, target, battle, scenario)
  if (blocker) return { legal: false, reason: blocker }
  return { legal: true, reason: null }
}

export function getAttackTargets(
  battle: BattleState,
  unitId: string,
  scenario: BattlefieldScenario,
): readonly string[] {
  if (battle.phase !== 'active') return []
  const attacker = battle.units.find(({ id }) => id === unitId)
  if (!attacker) return []
  return battle.units
    .filter(({ id }) => getAttackTargetStatus(battle, unitId, id, scenario).legal)
    .map(({ id }) => id)
}

function objectiveConditionMet(
  playerId: string,
  scores: Readonly<Record<string, number>>,
  scenario: BattlefieldScenario,
): boolean {
  const threshold = scenario.battleRules.victory.objectiveScoreToWin
  return (
    scenario.objectives.length > 0 &&
    threshold !== undefined &&
    (scores[playerId] ?? 0) >= threshold
  )
}

function eliminationWinner(
  units: readonly CombatUnit[],
  players: readonly string[],
): string | null | undefined {
  const surviving = players.filter((playerId) =>
    units.some((unit) => unit.owner === playerId && unit.currentHp > 0),
  )
  if (surviving.length === 1) return surviving[0]
  if (surviving.length === 0) return null
  return undefined
}

export function evaluateVictory(
  battle: BattleState,
  scenario: BattlefieldScenario,
): BattleResult | null {
  const mode = scenario.battleRules.victory.mode
  const eliminatedWinner = eliminationWinner(battle.units, scenario.players)
  const objectiveWinners = scenario.players.filter((playerId) =>
    objectiveConditionMet(playerId, battle.objectiveScores, scenario),
  )
  const objectiveResult: BattleResult | null =
    objectiveWinners.length > 1
      ? { winnerId: null, reason: 'draw' }
      : objectiveWinners.length === 1
        ? { winnerId: objectiveWinners[0] ?? null, reason: 'objectives' }
        : null

  if (mode === 'elimination' && eliminatedWinner !== undefined) {
    return {
      winnerId: eliminatedWinner,
      reason: eliminatedWinner ? 'elimination' : 'draw',
    }
  }
  if (mode === 'objectives') {
    return objectiveResult ??
      (eliminatedWinner === null ? { winnerId: null, reason: 'draw' } : null)
  }
  if (mode === 'either') {
    const possibleWinners = [
      ...objectiveWinners,
      ...(eliminatedWinner ? [eliminatedWinner] : []),
    ]
    const distinctWinners = new Set(possibleWinners)
    if (distinctWinners.size > 1) return { winnerId: null, reason: 'draw' }
    if (possibleWinners[0]) {
      return objectiveWinners.length > 0
        ? { winnerId: possibleWinners[0], reason: 'objectives' }
        : { winnerId: possibleWinners[0], reason: 'elimination' }
    }
    if (objectiveResult?.winnerId === null || eliminatedWinner === null) {
      return { winnerId: null, reason: 'draw' }
    }
  }
  if (mode === 'both') {
    if (
      eliminatedWinner &&
      objectiveWinners.includes(eliminatedWinner)
    ) {
      return { winnerId: eliminatedWinner, reason: 'combined' }
    }
    if (eliminatedWinner === null) return { winnerId: null, reason: 'draw' }
  }
  return null
}

function finishBattle(
  battle: BattleState,
  result: BattleResult,
): BattleState {
  const ended = { ...battle, phase: 'ended' as const, result }
  const event = appendEvent(
    ended,
    result.winnerId
      ? `${result.winnerId} wins (${result.reason}).`
      : `Battle ends in a draw (${result.reason}).`,
  )
  return { ...ended, ...event }
}

function finishIfWon(
  battle: BattleState,
  scenario: BattlefieldScenario,
): BattleState {
  const result = evaluateVictory(battle, scenario)
  return result ? finishBattle(battle, result) : battle
}

export function attackUnit(
  battle: BattleState,
  attackerId: string,
  targetId: string,
  scenario: BattlefieldScenario,
): BattleActionResult {
  if (battle.phase !== 'active') {
    return { state: battle, error: 'The battle is not active.' }
  }
  const attacker = battle.units.find(({ id }) => id === attackerId)
  const target = battle.units.find(({ id }) => id === targetId)
  if (!attacker || attacker.owner !== battle.activePlayerId) {
    return { state: battle, error: 'Only an active-player unit may attack.' }
  }
  if (!target) {
    return { state: battle, error: 'That unit is not a legal attack target.' }
  }
  const targetStatus = getAttackTargetStatus(
    battle,
    attackerId,
    targetId,
    scenario,
  )
  if (!targetStatus.legal) {
    return {
      state: battle,
      error: `That unit is not a legal attack target. ${targetStatus.reason ?? ''}`.trim(),
    }
  }
  const attackerHex = hexFor(attacker, scenario)
  const targetHex = hexFor(target, scenario)
  if (!attackerHex || !targetHex) {
    return { state: battle, error: 'An attack unit is not on the battlefield.' }
  }
  const elevationBonus =
    terrainElevation(attackerHex.terrain, scenario) >
    terrainElevation(targetHex.terrain, scenario)
      ? 1
      : 0
  const power = attacker.stats.Power
  const guard = target.stats.Guard
  if (!Number.isFinite(power) || !Number.isFinite(guard)) {
    return { state: battle, error: 'Attack requires configured Power and Guard.' }
  }
  const damage = Math.max(1, power + elevationBonus - guard)
  const remainingHp = Math.max(0, target.currentHp - damage)
  let updated: BattleState = {
    ...battle,
    units: battle.units
      .map((unit) =>
        unit.id === attacker.id
          ? {
              ...unit,
              combatApRemaining:
                unit.combatApRemaining - scenario.battleRules.attackApCost,
            }
          : unit.id === target.id
            ? { ...unit, currentHp: remainingHp }
            : unit,
      )
      .filter((unit) => unit.currentHp > 0),
  }
  const messages = [
    `${attacker.name} attacked ${target.name} for ${damage} damage.`,
  ]
  if (remainingHp === 0) messages.push(`${target.name} was destroyed.`)
  for (const message of messages) {
    const event = appendEvent(updated, message)
    updated = { ...updated, ...event }
  }
  return { state: finishIfWon(updated, scenario), error: null }
}

function awardObjectives(
  battle: BattleState,
  scenario: BattlefieldScenario,
): BattleState {
  const ownedObjectives = scenario.objectives.filter((objective) =>
    battle.units.some(
      (unit) =>
        unit.owner === battle.activePlayerId &&
        unit.q === objective.q &&
        unit.r === objective.r,
    ),
  )
  if (ownedObjectives.length === 0) return battle
  const objectiveScores = {
    ...battle.objectiveScores,
    [battle.activePlayerId]:
      (battle.objectiveScores[battle.activePlayerId] ?? 0) +
      ownedObjectives.length,
  }
  let updated = { ...battle, objectiveScores }
  const event = appendEvent(
    updated,
    `${battle.activePlayerId} scored ${ownedObjectives.length} objective point${ownedObjectives.length === 1 ? '' : 's'}.`,
  )
  updated = { ...updated, ...event }
  return updated
}

export function endPlayerTurn(
  battle: BattleState,
  scenario: BattlefieldScenario,
): BattleActionResult {
  if (battle.phase !== 'active') {
    return { state: battle, error: 'The battle is not active.' }
  }
  const players = scenario.players
  const activeIndex = players.indexOf(battle.activePlayerId)
  if (activeIndex < 0 || players.length !== 2) {
    return { state: battle, error: 'The active player turn is invalid.' }
  }
  let updated = awardObjectives(battle, scenario)
  updated = finishIfWon(updated, scenario)
  if (updated.phase === 'ended') return { state: updated, error: null }

  const isLastTurnOfRound = battle.activePlayerId !== battle.startingPlayerId
  const nextRound = isLastTurnOfRound ? battle.round + 1 : battle.round
  const nextStartingPlayerId = isLastTurnOfRound
    ? players[1 - players.indexOf(battle.startingPlayerId)]
    : battle.startingPlayerId
  const nextPlayerId = isLastTurnOfRound
    ? nextStartingPlayerId
    : players[1 - activeIndex]
  if (!nextPlayerId || !nextStartingPlayerId) {
    return { state: battle, error: 'The next player turn is invalid.' }
  }
  const roundLimit = scenario.battleRules.victory.roundLimit
  if (roundLimit !== undefined && nextRound > roundLimit) {
    const scoreValues = players.map(
      (playerId) => updated.objectiveScores[playerId] ?? 0,
    )
    const hasObjectiveScoring = scenario.objectives.length > 0
    const roundLimitResolution =
      scenario.battleRules.victory.roundLimitResolution ??
      'highest-objective-score-draw-on-tie'
    const winnerId =
      roundLimitResolution === 'highest-objective-score-draw-on-tie' &&
      hasObjectiveScoring &&
      scoreValues[0] !== scoreValues[1]
        ? players[scoreValues[0] > scoreValues[1] ? 0 : 1]
        : null
    const limitEvent = appendEvent(
      updated,
      `Round limit ${roundLimit} reached.`,
    )
    updated = { ...updated, ...limitEvent }
    return {
      state: finishBattle(updated, {
        winnerId,
        reason: winnerId ? 'round-limit' : 'draw',
      }),
      error: null,
    }
  }
  updated = {
    ...updated,
    activePlayerId: nextPlayerId,
    startingPlayerId: nextStartingPlayerId,
    round: nextRound,
    units: updated.units.map((unit) =>
      unit.owner === nextPlayerId
        ? {
            ...unit,
            combatApRemaining: scenario.battleRules.combatApPerTurn,
          }
        : unit,
    ),
  }
  const transition = appendEvent(
    updated,
    `${nextPlayerId} begins ${nextRound === battle.round ? `their turn in round ${nextRound}` : `round ${nextRound}`}.`,
  )
  updated = { ...updated, ...transition }
  return { state: finishIfWon(updated, scenario), error: null }
}

export function restartBattle(
  battle: BattleState,
  scenario: BattlefieldScenario,
): BattleState {
  const restarted = createBattle(
    battle.initialUnits,
    {
      ...scenario,
      startingPlayerPolicy: 'configured',
      battleRules: {
        ...scenario.battleRules,
          startingPlayerId: battle.initialStartingPlayerId,
      },
    },
    () => 0,
  ).battle
  return restarted ?? battle
}

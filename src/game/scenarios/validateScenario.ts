import type {
  BattlefieldScenario,
  TerrainType,
  VictoryMode,
} from '../domain/types'
import { hexDistance, hexId } from '../hex/coordinates'

const TERRAIN_TYPES: readonly TerrainType[] = [
  'grassland',
  'hills',
  'forest',
  'mountains',
  'water',
]
const TERRAIN_IDS: readonly string[] = TERRAIN_TYPES
const VICTORY_MODES: readonly VictoryMode[] = [
  'objectives',
  'elimination',
  'either',
  'both',
]

export function validateScenarioCatalog(
  scenarios: readonly BattlefieldScenario[],
): readonly string[] {
  const errors: string[] = []
  const ids = new Set<string>()
  for (const scenario of scenarios) {
    if (ids.has(scenario.id)) {
      errors.push(`Scenario ID ${scenario.id} is duplicated in the catalog.`)
    }
    ids.add(scenario.id)
  }
  return errors
}

export function validateScenario(
  scenario: BattlefieldScenario,
): readonly string[] {
  const errors: string[] = []
  const add = (message: string) => errors.push(message)

  if (!scenario.id.trim()) add('Scenario ID must not be empty.')
  if (!scenario.title.trim()) add('Scenario display name must not be empty.')
  if (!scenario.description.trim()) add('Scenario description must not be empty.')
  if (
    !Number.isInteger(scenario.boardRadius) ||
    scenario.boardRadius < 1
  ) {
    add('Board radius must be a positive integer.')
  }

  const hexById = new Map<string, (typeof scenario.hexes)[number]>()
  const seenCoordinates = new Set<string>()
  for (const hex of scenario.hexes) {
    const coordinateIsValid =
      Number.isInteger(hex.q) &&
      Number.isInteger(hex.r) &&
      hexDistance({ q: 0, r: 0 }, hex) <= scenario.boardRadius
    if (!coordinateIsValid) {
      add(`${hex.id} has coordinates outside the configured board radius.`)
      continue
    }
    const expectedId = hexId(hex)
    if (hex.id !== expectedId) {
      add(`Board hex ${hex.id} must use coordinate ID ${expectedId}.`)
    }
    if (hexById.has(hex.id)) add(`Board hex ID ${hex.id} is duplicated.`)
    const coordinateKey = `${hex.q},${hex.r}`
    if (seenCoordinates.has(coordinateKey)) {
      add(`Board coordinate ${coordinateKey} is duplicated.`)
    }
    seenCoordinates.add(coordinateKey)
    hexById.set(hex.id, hex)
    if (!TERRAIN_TYPES.includes(hex.terrain)) {
      add(`${hex.id} uses unsupported terrain ${String(hex.terrain)}.`)
    }
    if (!Number.isFinite(hex.elevation) || hex.elevation < 0) {
      add(`${hex.id} must have a finite, non-negative elevation.`)
    }
  }
  if (scenario.hexes.length === 0) add('Scenario board must contain at least one hex.')

  const regionIds = new Set<string>()
  const assignedHexIds = new Set<string>()
  for (const region of scenario.regions) {
    if (!region.id.trim()) add('Every geographic region needs an ID.')
    if (regionIds.has(region.id)) add(`Region ID ${region.id} is duplicated.`)
    regionIds.add(region.id)
    if (!region.name.trim()) add(`Region ${region.id} needs a display name.`)
    for (const id of region.hexIds) {
      if (!hexById.has(id)) {
        add(`Region ${region.name} references unknown board hex ${id}.`)
        continue
      }
      if (assignedHexIds.has(id)) {
        add(`Board hex ${id} belongs to more than one geographic region.`)
      }
      assignedHexIds.add(id)
    }
  }
  for (const hex of scenario.hexes) {
    if (!regionIds.has(hex.regionId)) {
      add(`${hex.id} references unknown geographic region ${hex.regionId}.`)
    }
    if (!assignedHexIds.has(hex.id)) {
      add(`${hex.id} is not assigned to a geographic region.`)
    }
  }

  const playerIds = new Set(scenario.players)
  if (scenario.players.length !== 2 || playerIds.size !== scenario.players.length) {
    add('Version 1 scenarios require exactly two uniquely identified players.')
  }
  const definitionIds = scenario.playerDefinitions.map(({ id }) => id)
  if (
    definitionIds.length !== playerIds.size ||
    new Set(definitionIds).size !== definitionIds.length ||
    definitionIds.some((id) => !playerIds.has(id))
  ) {
    add('Player definitions must match the configured player identities exactly.')
  }
  if (
    scenario.startingPlayerPolicy === 'configured' &&
    (!scenario.battleRules.startingPlayerId ||
      !playerIds.has(scenario.battleRules.startingPlayerId))
  ) {
    add('Configured starting-player policy requires a valid starting player ID.')
  }
  if (
    scenario.startingPlayerPolicy === 'random' &&
    scenario.battleRules.startingPlayerId !== undefined
  ) {
    add('Random starting-player policy cannot also set a fixed starting player.')
  }
  if (!['random', 'configured'].includes(scenario.startingPlayerPolicy)) {
    add('Scenario starting-player policy is not supported.')
  }

  const zoneOwners = new Set<string>()
  const zoneByOwner = new Map(
    scenario.setup.deploymentZones.map((zone) => [zone.owner, zone]),
  )
  if (zoneByOwner.size !== scenario.setup.deploymentZones.length) {
    add('Each player may have only one deployment zone.')
  }
  for (const zone of scenario.setup.deploymentZones) {
    if (!playerIds.has(zone.owner)) {
      add(`Deployment zone references unknown player ${zone.owner}.`)
    }
    zoneOwners.add(zone.owner)
    if (zone.hexIds.length === 0) {
      add(`${zone.owner} deployment zone must contain at least one valid hex.`)
    }
    for (const id of zone.hexIds) {
      if (!hexById.has(id)) {
        add(`${zone.owner} deployment zone references unknown hex ${id}.`)
      }
    }
  }
  for (const playerId of scenario.players) {
    if (!zoneOwners.has(playerId)) {
      add(`${playerId} needs a configured deployment zone.`)
    }
  }

  const objectiveIds = new Set<string>()
  for (const objective of scenario.objectives) {
    if (!objective.id.trim()) add('Every objective needs an ID.')
    if (objectiveIds.has(objective.id)) {
      add(`Objective ID ${objective.id} is duplicated.`)
    }
    objectiveIds.add(objective.id)
    if (!Number.isInteger(objective.q) || !Number.isInteger(objective.r)) {
      add(`Objective ${objective.name} must use integer axial coordinates.`)
    } else if (!hexById.has(hexId(objective))) {
      add(`Objective ${objective.name} is not located on a valid board hex.`)
    }
  }

  const { battleRules } = scenario
  for (const terrain of [
    ...Object.keys(battleRules.terrain),
    ...Object.keys(battleRules.elevationByTerrain),
  ]) {
    if (!TERRAIN_IDS.includes(terrain)) {
      add(`Scenario rules reference unsupported terrain ${terrain}.`)
    }
  }
  for (const terrain of TERRAIN_TYPES) {
    const movement = battleRules.terrain[terrain]?.movementCost
    const blocksLineOfSight = battleRules.terrain[terrain]?.blocksLineOfSight
    if (
      movement !== null &&
      (!Number.isFinite(movement) || movement <= 0)
    ) {
      add(`${terrain} movement cost must be positive or explicitly impassable.`)
    }
    if (typeof blocksLineOfSight !== 'boolean') {
      add(`${terrain} needs an explicit line-of-sight rule.`)
    }
    const elevation = battleRules.elevationByTerrain[terrain]
    if (!Number.isFinite(elevation) || elevation < 0) {
      add(`${terrain} needs a finite, non-negative combat elevation value.`)
    }
  }
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
    add('Combat AP costs and default attack range must be positive integers.')
  }
  const victory = battleRules.victory
  if (!VICTORY_MODES.includes(victory.mode)) {
    add(`Victory mode ${String(victory.mode)} is not supported.`)
  }
  if (['objectives', 'either', 'both'].includes(victory.mode)) {
    if (scenario.objectives.length === 0) {
      add(`${victory.mode} victory requires at least one objective.`)
    }
    if (
      !Number.isInteger(victory.objectiveScoreToWin) ||
      (victory.objectiveScoreToWin ?? 0) < 1
    ) {
      add(`${victory.mode} victory requires a positive objective score threshold.`)
    }
  }
  if (
    victory.roundLimit !== undefined &&
    (!Number.isInteger(victory.roundLimit) || victory.roundLimit < 1)
  ) {
    add('Round limit must be a positive integer when configured.')
  }
  if (
    victory.roundLimitResolution !== undefined &&
    victory.roundLimitResolution !== 'highest-objective-score-draw-on-tie'
  ) {
    add('Scenario round-limit resolution is not supported.')
  }

  if (scenario.pointBudgets) {
    if (Object.keys(scenario.pointBudgets).length > 0) {
      add(
        'Scenario point budgets cannot be validated until authoritative unit pricing is available.',
      )
    }
    for (const [playerId, budget] of Object.entries(scenario.pointBudgets)) {
      if (!playerIds.has(playerId)) {
        add(`Point budget references unknown player ${playerId}.`)
      }
      if (!Number.isFinite(budget) || budget < 0) {
        add(`${playerId} point budget must be finite and non-negative.`)
      }
    }
  }

  const unitIds = new Set<string>()
  const occupied = new Set<string>()
  const unitsPerPlayer = new Map<string, number>()
  for (const unit of scenario.units) {
    if (!unit.id.trim()) add('Every starting unit needs an ID.')
    if (unitIds.has(unit.id)) add(`Starting unit ID ${unit.id} is duplicated.`)
    unitIds.add(unit.id)
    if (!playerIds.has(unit.owner)) {
      add(`${unit.name} references unknown player ${unit.owner}.`)
    }
    const coordinateIsValid = Number.isInteger(unit.q) && Number.isInteger(unit.r)
    const id = coordinateIsValid ? hexId(unit) : ''
    if (!coordinateIsValid || !hexById.has(id)) {
      add(`${unit.name} is not placed on a valid board hex.`)
    }
    if (occupied.has(id)) add(`More than one starting unit occupies ${id}.`)
    occupied.add(id)
    unitsPerPlayer.set(unit.owner, (unitsPerPlayer.get(unit.owner) ?? 0) + 1)
    if (!zoneByOwner.get(unit.owner)?.hexIds.includes(id)) {
      add(`${unit.name} is outside its owner's deployment zone.`)
    }
    if (
      !Number.isFinite(unit.currentHp) ||
      unit.currentHp <= 0 ||
      !Number.isFinite(unit.maxHp) ||
      unit.maxHp < unit.currentHp
    ) {
      add(`${unit.name} has invalid starting health.`)
    }
    for (const stat of ['Power', 'Guard', 'Mobility']) {
      if (!Number.isFinite(unit.stats[stat])) {
        add(`${unit.name} needs a finite ${stat} combat value.`)
      }
    }
    if (Number.isFinite(unit.stats.Mobility) && unit.stats.Mobility <= 0) {
      add(`${unit.name} must have positive Mobility to move.`)
    }
    if (
      !Number.isFinite(unit.actionPointsRemaining) ||
      unit.actionPointsRemaining < 0
    ) {
      add(`${unit.name} has invalid starting action points.`)
    }
  }
  for (const playerId of scenario.players) {
    const unitCount = unitsPerPlayer.get(playerId) ?? 0
    if (unitCount < 1) add(`${playerId} needs at least one starting unit.`)
    const zone = zoneByOwner.get(playerId)
    if (
      !scenario.setup.allowMultipleUnitsPerHex &&
      zone &&
      zone.hexIds.length < unitCount
    ) {
      add(`${playerId} deployment zone has fewer hexes than its starting units.`)
    }
  }

  return errors
}

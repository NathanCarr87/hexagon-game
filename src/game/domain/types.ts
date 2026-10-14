import type { AxialCoordinate } from '../hex/coordinates'

export type TerrainType =
  | 'grassland'
  | 'hills'
  | 'forest'
  | 'mountains'
  | 'water'

export interface TerrainRule {
  readonly movementCost: number | null
  readonly blocksLineOfSight: boolean
}

export type VictoryMode = 'objectives' | 'elimination' | 'either' | 'both'

export interface ScenarioVictoryRules {
  readonly mode: VictoryMode
  readonly objectiveScoreToWin?: number
  readonly roundLimit?: number
  readonly roundLimitResolution?: 'highest-objective-score-draw-on-tie'
}

export interface ScenarioBattleRules {
  readonly combatDataStatus: 'provisional'
  readonly combatApPerTurn: number
  readonly movementApCost: number
  readonly attackApCost: number
  readonly defaultAttackRange: number
  readonly terrain: Readonly<Record<TerrainType, TerrainRule>>
  readonly elevationByTerrain: Readonly<Record<TerrainType, number>>
  readonly victory: ScenarioVictoryRules
  readonly startingPlayerId?: string
}

export interface BattlefieldHex extends AxialCoordinate {
  readonly id: string
  readonly terrain: TerrainType
  readonly elevation: number
  readonly regionId: string
}

export interface ScenarioRegion {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly hexIds: readonly string[]
}

export interface ScenarioObjective extends AxialCoordinate {
  readonly id: string
  readonly name: string
}

export interface ScenarioPlayer {
  readonly id: string
  readonly name: string
  readonly color: string
}

export interface DeploymentZone {
  readonly owner: string
  readonly hexIds: readonly string[]
}

export interface ScenarioSetup {
  readonly rulesStatus: 'provisional'
  readonly allowReposition: boolean
  readonly allowMultipleUnitsPerHex: false
  readonly deploymentZones: readonly DeploymentZone[]
}

export type UnitDefinitionStatus = 'authoritative' | 'development-fixture'

export type UnitVisualArchetype = 'line-infantry' | 'scout'

export interface UnitDefinition {
  readonly id: string
  readonly displayName: string
  readonly description: string
  readonly role: string
  readonly status: UnitDefinitionStatus
  readonly combat: {
    readonly maxHealth: number
    readonly power: number
    readonly guard: number
    readonly mobility: number
    readonly attackRange?: number
  }
  readonly presentation: {
    readonly archetype: UnitVisualArchetype
  }
}

export interface ScenarioUnit extends AxialCoordinate {
  readonly id: string
  readonly name: string
  readonly definitionId: string
  readonly owner: string
  readonly currentHp: number
  readonly actionPointsRemaining: number
}

export interface BattlefieldScenario {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly subtitle: string
  readonly recommendedForceSize: string
  readonly boardRadius: number
  readonly dataStatus: 'authoritative' | 'development-fixture'
  readonly hexes: readonly BattlefieldHex[]
  readonly regions: readonly ScenarioRegion[]
  readonly objectives: readonly ScenarioObjective[]
  readonly unitDefinitions: readonly UnitDefinition[]
  readonly units: readonly ScenarioUnit[]
  readonly players: readonly string[]
  readonly playerDefinitions: readonly ScenarioPlayer[]
  readonly setup: ScenarioSetup
  readonly startingPlayerPolicy: 'random' | 'configured'
  readonly pointBudgets?: Readonly<Record<string, number>>
  readonly battleRules: ScenarioBattleRules
}

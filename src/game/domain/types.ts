import type { AxialCoordinate } from '../hex/coordinates'

export type TerrainType =
  | 'grassland'
  | 'hills'
  | 'forest'
  | 'mountains'
  | 'water'

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

export interface ScenarioUnit extends AxialCoordinate {
  readonly id: string
  readonly name: string
  readonly owner: string
  readonly unitType: string
  readonly currentHp: number
  readonly maxHp: number
  readonly stats: Readonly<Record<string, number>>
  readonly actionPointsRemaining: number
}

export interface BattlefieldScenario {
  readonly id: string
  readonly title: string
  readonly subtitle: string
  readonly dataStatus: 'temporary-placeholder'
  readonly hexes: readonly BattlefieldHex[]
  readonly regions: readonly ScenarioRegion[]
  readonly objectives: readonly ScenarioObjective[]
  readonly units: readonly ScenarioUnit[]
  readonly players: readonly string[]
  readonly playerDefinitions: readonly ScenarioPlayer[]
  readonly setup: ScenarioSetup
  readonly pointBudgets?: Readonly<Record<string, number>>
}

import type {
  BattlefieldHex,
  BattlefieldScenario,
  TerrainType,
} from '../domain/types'
import { hexDisk, hexId } from '../hex/coordinates'
import { developmentUnitCatalog } from '../domain/unitCatalog'

const BOARD_RADIUS = 4

const terrainByCoordinate: Readonly<Record<string, TerrainType>> = {
  '-4,1': 'water',
  '-4,2': 'water',
  '-3,1': 'water',
  '-3,2': 'water',
  '-2,2': 'water',
  '-2,-1': 'hills',
  '-1,-2': 'hills',
  '0,-3': 'hills',
  '1,-3': 'hills',
  '2,-3': 'hills',
  '2,0': 'forest',
  '2,1': 'forest',
  '3,-1': 'forest',
  '3,0': 'forest',
  '1,2': 'forest',
  '0,2': 'forest',
  '-1,3': 'mountains',
  '0,3': 'mountains',
  '1,1': 'mountains',
}

const visualElevation: Readonly<Record<TerrainType, number>> = {
  grassland: 0,
  water: 0,
  forest: 0,
  hills: 1,
  mountains: 2,
}

const coordinates = hexDisk(BOARD_RADIUS)
const westHexIds = coordinates
  .filter(({ q }) => q < 0)
  .map((coordinate) => hexId(coordinate))
const eastHexIds = coordinates
  .filter(({ q }) => q >= 0)
  .map((coordinate) => hexId(coordinate))

const regionByHexId = new Map<string, string>([
  ...westHexIds.map((id) => [id, 'western-approach'] as const),
  ...eastHexIds.map((id) => [id, 'eastern-highlands'] as const),
])

const hexes: BattlefieldHex[] = coordinates.map((coordinate) => {
  const id = hexId(coordinate)
  const terrain = terrainByCoordinate[`${coordinate.q},${coordinate.r}`] ?? 'grassland'
  return {
    ...coordinate,
    id,
    terrain,
    elevation: visualElevation[terrain],
    regionId: regionByHexId.get(id) ?? 'western-approach',
  }
})

export const initialScenario: BattlefieldScenario = {
  id: 'the-narrows',
  title: 'The Narrows',
  description:
    'A provisional terrain-focused test battlefield with a central crossing, wooded approaches, and a broken mountain chain.',
  subtitle: 'A temporary field study across the western approach and eastern highlands.',
  recommendedForceSize: '2 scenario units per player (provisional values)',
  boardRadius: BOARD_RADIUS,
  dataStatus: 'development-fixture',
  hexes,
  regions: [
    {
      id: 'western-approach',
      name: 'Western Approach',
      description: 'Low ground, shoreline and the outer approach.',
      hexIds: westHexIds,
    },
    {
      id: 'eastern-highlands',
      name: 'Eastern Highlands',
      description: 'Elevated ground and wooded terrain.',
      hexIds: eastHexIds,
    },
  ],
  objectives: [
    { id: 'objective-north', name: 'North Marker', q: 0, r: -2 },
    { id: 'objective-crossing', name: 'Crossing Marker', q: 0, r: 1 },
  ],
  unitDefinitions: developmentUnitCatalog,
  players: ['blueward', 'redoubt'],
  playerDefinitions: [
    { id: 'blueward', name: 'Blueward', color: '#76b8e8' },
    { id: 'redoubt', name: 'Redoubt', color: '#e28a72' },
  ],
  setup: {
    rulesStatus: 'provisional',
    allowReposition: true,
    allowMultipleUnitsPerHex: false,
    deploymentZones: [
      { owner: 'blueward', hexIds: westHexIds },
      { owner: 'redoubt', hexIds: eastHexIds },
    ],
  },
  startingPlayerPolicy: 'random',
  battleRules: {
    combatDataStatus: 'provisional',
    combatApPerTurn: 2,
    movementApCost: 1,
    attackApCost: 1,
    defaultAttackRange: 1,
    terrain: {
      grassland: { movementCost: 1, blocksLineOfSight: false },
      hills: { movementCost: 2, blocksLineOfSight: false },
      forest: { movementCost: 2, blocksLineOfSight: true },
      mountains: { movementCost: null, blocksLineOfSight: true },
      water: { movementCost: null, blocksLineOfSight: false },
    },
    elevationByTerrain: {
      grassland: 0,
      hills: 1,
      forest: 0,
      mountains: 2,
      water: 0,
    },
    victory: {
      mode: 'either',
      objectiveScoreToWin: 3,
      roundLimitResolution: 'highest-objective-score-draw-on-tie',
    },
  },
  units: [
    {
      id: 'unit-ironwatch-01',
      name: 'Ironwatch-01',
      definitionId: 'development.line-infantry',
      owner: 'blueward',
      q: -2,
      r: 0,
      currentHp: 8,
      actionPointsRemaining: 2,
    },
    {
      id: 'unit-ridge-02',
      name: 'Ridge-02',
      definitionId: 'development.scout',
      owner: 'blueward',
      q: -1,
      r: 1,
      currentHp: 6,
      actionPointsRemaining: 2,
    },
    {
      id: 'unit-ashfall-01',
      name: 'Ashfall-01',
      definitionId: 'development.line-infantry',
      owner: 'redoubt',
      q: 2,
      r: -1,
      currentHp: 8,
      actionPointsRemaining: 2,
    },
    {
      id: 'unit-ashfall-02',
      name: 'Ashfall-02',
      definitionId: 'development.scout',
      owner: 'redoubt',
      q: 1,
      r: 0,
      currentHp: 6,
      actionPointsRemaining: 2,
    },
  ],
}

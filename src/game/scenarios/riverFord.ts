import type {
  BattlefieldScenario,
  TerrainType,
} from '../domain/types'
import { initialScenario } from './initialScenario'

const watercourse: ReadonlySet<string> = new Set([
  '-4,4',
  '-3,3',
  '-2,2',
  '-1,1',
  '1,-1',
  '2,-2',
  '3,-3',
  '4,-4',
])
const hills: ReadonlySet<string> = new Set([
  '-2,-2',
  '-1,-3',
  '0,-3',
  '1,-3',
  '2,-3',
  '2,-2',
])
const forests: ReadonlySet<string> = new Set([
  '-3,0',
  '-2,0',
  '-2,1',
  '1,1',
  '2,1',
  '2,2',
  '3,1',
])
const mountains: ReadonlySet<string> = new Set([
  '-1,-3',
  '0,-4',
  '1,-4',
])

function terrainAt(q: number, r: number): TerrainType {
  const coordinate = `${q},${r}`
  if (watercourse.has(coordinate)) return 'water'
  if (mountains.has(coordinate)) return 'mountains'
  if (hills.has(coordinate)) return 'hills'
  if (forests.has(coordinate)) return 'forest'
  return 'grassland'
}

const hexes = initialScenario.hexes.map((hex) => ({
  ...hex,
  terrain: terrainAt(hex.q, hex.r),
  elevation: initialScenario.battleRules.elevationByTerrain[terrainAt(hex.q, hex.r)],
  regionId: hex.q < 0 ? 'western-bank' : 'eastern-bank',
}))
const regions = [
  {
    id: 'western-bank',
    name: 'Western Bank',
    description: 'Low approaches and wooded ground west of the river.',
    hexIds: hexes.filter(({ q }) => q < 0).map(({ id }) => id),
  },
  {
    id: 'eastern-bank',
    name: 'Eastern Bank',
    description: 'Open eastern approaches beneath the northern ridge.',
    hexIds: hexes.filter(({ q }) => q >= 0).map(({ id }) => id),
  },
]
const deploymentZones = [
  {
    owner: 'blueward',
    hexIds: hexes
      .filter(
        ({ q, terrain }) =>
          q < 0 &&
          initialScenario.battleRules.terrain[terrain].movementCost !== null,
      )
      .map(({ id }) => id),
  },
  {
    owner: 'redoubt',
    hexIds: hexes
      .filter(
        ({ q, terrain }) =>
          q >= 0 &&
          initialScenario.battleRules.terrain[terrain].movementCost !== null,
      )
      .map(({ id }) => id),
  },
]

export const riverFordScenario: BattlefieldScenario = {
  ...initialScenario,
  id: 'river-ford',
  title: 'The River Ford',
  description:
    'A river divides the approaches, with a central ford overlooked by a northern ridge and wooded southern banks.',
  subtitle: 'Hold the ford or use the open end-runs to contest three markers.',
  recommendedForceSize: '2 scenario units per player (provisional values)',
  hexes,
  regions,
  objectives: [
    { id: 'ford-marker', name: 'The Ford', q: 0, r: 0 },
    { id: 'north-bank-marker', name: 'North Bank', q: 0, r: -2 },
    { id: 'south-bank-marker', name: 'South Bank', q: 1, r: 1 },
  ],
  units: initialScenario.units.map((unit, index) => {
    const placement = [
      { q: -3, r: 0 },
      { q: -2, r: -1 },
      { q: 3, r: 0 },
      { q: 2, r: 0 },
    ][index]
    return placement
      ? { ...unit, q: placement.q, r: placement.r, id: `river-ford-${unit.id}` }
      : { ...unit, id: `river-ford-${unit.id}` }
  }),
  setup: {
    ...initialScenario.setup,
    deploymentZones,
  },
}

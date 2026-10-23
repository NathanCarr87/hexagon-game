import type {
  BattlefieldScenario,
  ScenarioRegion,
} from '../domain/types'
import { initialScenario } from './initialScenario'

const northHexIds = initialScenario.hexes
  .filter(({ r }) => r < 0)
  .map(({ id }) => id)
const southHexIds = initialScenario.hexes
  .filter(({ r }) => r >= 0)
  .map(({ id }) => id)
const westHexIds =
  initialScenario.setup.deploymentZones.find(({ owner }) => owner === 'blueward')
    ?.hexIds ?? []
const eastHexIds =
  initialScenario.setup.deploymentZones.find(({ owner }) => owner === 'redoubt')
    ?.hexIds ?? []

const regions: readonly ScenarioRegion[] = [
  {
    id: 'northern-lane',
    name: 'Northern Lane',
    description: 'Open ground with an uninterrupted approach across the north.',
    hexIds: northHexIds,
  },
  {
    id: 'southern-lane',
    name: 'Southern Lane',
    description: 'Open ground with an uninterrupted approach across the south.',
    hexIds: southHexIds,
  },
]

export const openGroundScenario: BattlefieldScenario = {
  ...initialScenario,
  id: 'open-ground',
  title: 'Open Ground',
  description:
    'A deterministic test scenario with clear movement lanes and no terrain line-of-sight blockers.',
  subtitle: 'An open engagement across two approach lanes.',
  recommendedForceSize: '2 scenario units per player (provisional values)',
  startingPlayerPolicy: 'configured',
  regions,
  hexes: initialScenario.hexes.map((hex) => ({
    ...hex,
    terrain: 'grassland',
    elevation: 0,
    regionId: hex.r < 0 ? 'northern-lane' : 'southern-lane',
  })),
  objectives: [
    { id: 'open-objective-north', name: 'North Marker', q: 0, r: -2 },
    { id: 'open-objective-south', name: 'South Marker', q: 0, r: 2 },
  ],
  setup: {
    ...initialScenario.setup,
    deploymentZones: [
      { owner: 'blueward', hexIds: westHexIds },
      { owner: 'redoubt', hexIds: eastHexIds },
    ],
  },
  battleRules: {
    ...initialScenario.battleRules,
    startingPlayerId: 'blueward',
    victory: {
      mode: 'elimination',
    },
  },
  units: initialScenario.units.map((unit) => ({
    ...unit,
    id: `open-ground-${unit.id}`,
  })),
}

import type {
  BattlefieldScenario,
  ScenarioUnit,
} from '../domain/types'
import { hexId } from '../hex/coordinates'

export function validateDeployment(
  unit: ScenarioUnit,
  destinationHexId: string,
  units: readonly ScenarioUnit[],
  scenario: BattlefieldScenario,
): string | null {
  const destination = scenario.hexes.find(({ id }) => id === destinationHexId)
  if (!destination) return 'That hex is not part of this battlefield.'

  const movementCost =
    scenario.battleRules?.terrain?.[destination.terrain]?.movementCost
  if (movementCost === null) {
    return 'That terrain is impassable under this scenario\'s rules.'
  }
  if (movementCost === undefined) {
    return 'This scenario does not define whether that terrain is passable.'
  }

  const zone = scenario.setup.deploymentZones.find(
    ({ owner }) => owner === unit.owner,
  )
  if (!zone || !zone.hexIds.includes(destinationHexId)) {
    return `That hex is outside ${unit.owner}'s provisional deployment area.`
  }

  if (
    !scenario.setup.allowReposition &&
    destinationHexId !== hexId(unit)
  ) {
    return 'Repositioning is not allowed during this setup.'
  }

  const occupant = units.find(
    (candidate) =>
      candidate.id !== unit.id && hexId(candidate) === destinationHexId,
  )
  if (occupant && !scenario.setup.allowMultipleUnitsPerHex) {
    return `That hex is occupied by ${occupant.name}.`
  }

  return null
}

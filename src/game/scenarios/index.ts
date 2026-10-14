import type { BattlefieldScenario } from '../domain/types'
import { initialScenario } from './initialScenario'
import { openGroundScenario } from './openGround'

export const scenarios: readonly BattlefieldScenario[] = [
  initialScenario,
  openGroundScenario,
]

export function getScenarioById(id: string): BattlefieldScenario | undefined {
  return scenarios.find((scenario) => scenario.id === id)
}

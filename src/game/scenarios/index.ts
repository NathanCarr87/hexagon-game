import type { BattlefieldScenario } from '../domain/types'
import { initialScenario } from './initialScenario'
import { openGroundScenario } from './openGround'
import { riverFordScenario } from './riverFord'

export const scenarios: readonly BattlefieldScenario[] = [
  initialScenario,
  openGroundScenario,
  riverFordScenario,
]

export function getScenarioById(id: string): BattlefieldScenario | undefined {
  return scenarios.find((scenario) => scenario.id === id)
}

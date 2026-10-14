import { describe, expect, it } from 'vitest'
import { initialScenario } from '../scenarios/initialScenario'
import { validateDeployment } from './deployment'

describe('deployment validation', () => {
  const unit = initialScenario.units[0]!

  it('allows an unoccupied, passable hex in the unit owner’s zone', () => {
    expect(
      validateDeployment(unit, 'hex:-3,0', initialScenario.units, initialScenario),
    ).toBeNull()
  })

  it('rejects terrain that the scenario marks impassable', () => {
    expect(
      validateDeployment(unit, 'hex:-3,2', initialScenario.units, initialScenario),
    ).toMatch(/terrain is impassable/)
  })

  it('rejects occupied hexes', () => {
    expect(
      validateDeployment(unit, 'hex:-1,1', initialScenario.units, initialScenario),
    ).toMatch(/occupied by Ridge-02/)
  })

  it('rejects hexes outside the unit owner’s deployment zone', () => {
    expect(
      validateDeployment(unit, 'hex:2,0', initialScenario.units, initialScenario),
    ).toMatch(/outside blueward/)
  })
})

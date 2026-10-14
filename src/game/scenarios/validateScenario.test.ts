import { describe, expect, it } from 'vitest'
import type { BattlefieldScenario } from '../domain/types'
import { openGroundScenario } from './openGround'
import { initialScenario } from './initialScenario'
import { scenarios } from './index'
import {
  createBattle,
  evaluateVictory,
} from '../state/battle'
import {
  validateScenario,
  validateScenarioCatalog,
} from './validateScenario'

describe('scenario definitions', () => {
  it('loads the terrain-focused and open-ground scenarios as valid definitions', () => {
    expect(scenarios.map(({ id }) => id)).toEqual([
      'the-narrows',
      'open-ground',
    ])
    expect(validateScenarioCatalog(scenarios)).toEqual([])
    expect(validateScenario(initialScenario)).toEqual([])
    expect(validateScenario(openGroundScenario)).toEqual([])
    expect(initialScenario.battleRules.victory.mode).toBe('either')
    expect(
      new Set(openGroundScenario.hexes.map(({ terrain }) => terrain)),
    ).toEqual(new Set(['grassland']))
    expect(openGroundScenario.battleRules.victory.mode).toBe('elimination')
    expect(openGroundScenario.battleRules.startingPlayerId).toBe('blueward')
  })

  it('applies the open-ground elimination policy to its playable starting force', () => {
    const { battle, error } = createBattle(
      openGroundScenario.units,
      openGroundScenario,
      () => 0,
    )
    expect(error).toBeNull()
    expect(battle).not.toBeNull()
    expect(
      evaluateVictory(
        {
          ...battle!,
          units: battle!.units.filter(({ owner }) => owner === 'redoubt'),
        },
        openGroundScenario,
      ),
    ).toEqual({ winnerId: 'redoubt', reason: 'elimination' })
  })

  it('rejects duplicate scenario identities in a catalog', () => {
    expect(
      validateScenarioCatalog([initialScenario, { ...openGroundScenario, id: initialScenario.id }]),
    ).toContain('Scenario ID the-narrows is duplicated in the catalog.')
  })

  it('rejects duplicate objectives, invalid objective coordinates, and invalid round limits', () => {
    const invalid = {
      ...initialScenario,
      objectives: [
        initialScenario.objectives[0]!,
        {
          ...initialScenario.objectives[1]!,
          id: initialScenario.objectives[0]!.id,
          q: 20,
        },
      ],
      battleRules: {
        ...initialScenario.battleRules,
        victory: {
          ...initialScenario.battleRules.victory,
          roundLimit: 0,
        },
      },
    }
    const errors = validateScenario(invalid)
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Objective ID .* duplicated/),
        expect.stringMatching(/not located on a valid board hex/),
        expect.stringMatching(/Round limit must be a positive integer/),
      ]),
    )
  })

  it('prevents the domain battle API from starting an invalid scenario', () => {
    const invalid = { ...initialScenario, objectives: [] }
    const result = createBattle(invalid.units, invalid, () => 0)
    expect(result.battle).toBeNull()
    expect(result.error).toMatch(/requires at least one objective/)
  })

  it('returns actionable errors for malformed scenario containers instead of throwing', () => {
    const missingHexes = {
      ...initialScenario,
      hexes: undefined,
    } as never
    expect(validateScenario(missingHexes)).toContain(
      'Board hexes must be an array of objects.',
    )
    expect(createBattle(initialScenario.units, missingHexes).error).toMatch(
      /Board hexes must be an array/,
    )

    const missingVictory = {
      ...initialScenario,
      battleRules: {
        ...initialScenario.battleRules,
        victory: undefined,
      },
    } as never
    expect(validateScenario(missingVictory)).toContain(
      'Battle rules must define terrain, elevation, and victory configuration objects.',
    )
  })

  it('rejects starting units on terrain marked impassable by scenario rules', () => {
    const invalid = {
      ...initialScenario,
      units: initialScenario.units.map((unit, index) =>
        index === 0 ? { ...unit, q: -3, r: 2 } : unit,
      ),
    }
    expect(validateScenario(invalid)).toContain(
      'Ironwatch-01 is placed on terrain marked impassable by this scenario.',
    )
  })

  it('rejects unknown definitions and refuses development fixtures in authoritative scenarios', () => {
    const unknownDefinition = {
      ...initialScenario,
      units: initialScenario.units.map((unit, index) =>
        index === 0 ? { ...unit, definitionId: 'missing-definition' } : unit,
      ),
    }
    expect(validateScenario(unknownDefinition)).toContain(
      'Ironwatch-01 references unknown unit definition missing-definition.',
    )

    const falselyAuthoritative = {
      ...initialScenario,
      dataStatus: 'authoritative' as const,
    }
    expect(validateScenario(falselyAuthoritative)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/is development-fixture, not authoritative/),
      ]),
    )
    expect(
      createBattle(
        falselyAuthoritative.units,
        falselyAuthoritative,
      ).battle,
    ).toBeNull()
  })

  it('reports malformed definition combat data without throwing', () => {
    const malformed = {
      ...initialScenario,
      unitDefinitions: initialScenario.unitDefinitions.map((definition, index) =>
        index === 0 ? { ...definition, combat: null } : definition,
      ),
    } as BattlefieldScenario

    expect(() => validateScenario(malformed)).not.toThrow()
    expect(validateScenario(malformed)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/needs positive finite maximum health/),
      ]),
    )
  })

  it('rejects unsupported board references, occupancy conflicts, and impossible zones', () => {
    const firstUnit = initialScenario.units[0]!
    const secondUnit = initialScenario.units[1]!
    const invalid = {
      ...initialScenario,
      units: [
        firstUnit,
        { ...secondUnit, id: 'overlap-unit', q: firstUnit.q, r: firstUnit.r },
        ...initialScenario.units.slice(2),
      ],
      setup: {
        ...initialScenario.setup,
        deploymentZones: [
          {
            owner: 'blueward',
            hexIds: [firstUnit.q === -2 ? 'hex:-2,0' : 'missing-hex'],
          },
          initialScenario.setup.deploymentZones[1]!,
        ],
      },
      hexes: initialScenario.hexes.map((hex, index) =>
        index === 0 ? { ...hex, regionId: 'missing-region' } : hex,
      ),
    }
    const errors = validateScenario(invalid)
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/More than one starting unit occupies/),
        expect.stringMatching(/unknown geographic region/),
        expect.stringMatching(/fewer hexes than its starting units/),
      ]),
    )
  })

  it('blocks uncheckable configured budgets and rejects unsupported terrain rules', () => {
    const invalid = {
      ...initialScenario,
      pointBudgets: { blueward: 100, redoubt: 100 },
      battleRules: {
        ...initialScenario.battleRules,
        terrain: {
          ...initialScenario.battleRules.terrain,
          forest: {
            movementCost: 0,
            blocksLineOfSight: false,
          },
        },
      },
    }
    expect(validateScenario(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/cannot be validated until authoritative unit pricing/),
        expect.stringMatching(/forest movement cost must be positive/),
      ]),
    )
  })
})

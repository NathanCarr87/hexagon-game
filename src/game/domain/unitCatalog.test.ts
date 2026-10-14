import { describe, expect, it } from 'vitest'
import type { UnitDefinition } from './types'
import {
  authoritativeUnitCatalog,
  developmentUnitCatalog,
  validateUnitCatalog,
  validateUnitDefinition,
} from './unitCatalog'

describe('unit definition catalog', () => {
  it('keeps the authoritative catalog empty and validates the development fixtures as fixtures', () => {
    expect(authoritativeUnitCatalog).toEqual([])
    expect(validateUnitCatalog(developmentUnitCatalog, 'development-fixture'))
      .toEqual([])
    expect(developmentUnitCatalog.map(({ id }) => id)).toEqual([
      'development.line-infantry',
      'development.scout',
    ])
  })

  it('rejects duplicate definition identifiers', () => {
    expect(
      validateUnitCatalog([
        ...developmentUnitCatalog,
        developmentUnitCatalog[0]!,
      ]),
    ).toContain(
      'Unit definition ID development.line-infantry is duplicated.',
    )
  })

  it('rejects invalid and unsupported combat attributes', () => {
    const invalid = {
      ...developmentUnitCatalog[0]!,
      combat: {
        ...developmentUnitCatalog[0]!.combat,
        power: Number.NaN,
        mobility: 0,
        initiative: 5,
      },
      presentation: {
        ...developmentUnitCatalog[0]!.presentation,
        model: 'unconfigured',
      },
    } as UnitDefinition

    expect(validateUnitDefinition(invalid)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/finite Power and Guard/),
        expect.stringMatching(/positive finite Mobility/),
        expect.stringMatching(/unsupported combat stat initiative/),
        expect.stringMatching(/unsupported presentation field model/),
      ]),
    )
  })

  it('does not accept development fixtures as authoritative definitions', () => {
    expect(
      validateUnitCatalog(developmentUnitCatalog, 'authoritative'),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/is development-fixture, not authoritative/),
      ]),
    )
  })
})

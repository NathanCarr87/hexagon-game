import type { UnitDefinition, UnitDefinitionStatus } from './types'

export const authoritativeUnitCatalog: readonly UnitDefinition[] = []

export const developmentUnitCatalog: readonly UnitDefinition[] = [
  {
    id: 'development.line-infantry',
    displayName: 'Line Infantry',
    description: 'Development-only combat fixture for exercising V1 rules.',
    role: 'Line infantry',
    status: 'development-fixture',
    combat: {
      maxHealth: 8,
      power: 3,
      guard: 2,
      mobility: 2,
    },
    presentation: { archetype: 'line-infantry' },
  },
  {
    id: 'development.scout',
    displayName: 'Scout',
    description: 'Development-only combat fixture for exercising V1 rules.',
    role: 'Scout',
    status: 'development-fixture',
    combat: {
      maxHealth: 6,
      power: 2,
      guard: 1,
      mobility: 4,
    },
    presentation: { archetype: 'scout' },
  },
]

export function getUnitDefinition(
  unitDefinitions: readonly UnitDefinition[],
  definitionId: string,
): UnitDefinition | undefined {
  return unitDefinitions.find(({ id }) => id === definitionId)
}

export function validateUnitDefinition(
  definition: UnitDefinition,
  expectedStatus?: UnitDefinitionStatus,
): readonly string[] {
  const errors: string[] = []
  const add = (message: string) => errors.push(message)

  if (typeof definition.id !== 'string' || !definition.id.trim()) {
    add('Unit definition ID must be a non-empty string.')
  }
  if (
    typeof definition.displayName !== 'string' ||
    !definition.displayName.trim()
  ) {
    add(`Unit definition ${definition.id} needs a display name.`)
  }
  if (
    typeof definition.description !== 'string' ||
    !definition.description.trim()
  ) {
    add(`Unit definition ${definition.id} needs a description.`)
  }
  if (typeof definition.role !== 'string' || !definition.role.trim()) {
    add(`Unit definition ${definition.id} needs a role or classification.`)
  }
  if (
    definition.status !== 'authoritative' &&
    definition.status !== 'development-fixture'
  ) {
    add(`Unit definition ${definition.id} has an unsupported data status.`)
  } else if (expectedStatus && definition.status !== expectedStatus) {
    add(
      `Unit definition ${definition.id} is ${definition.status}, not ${expectedStatus}.`,
    )
  }
  if (
    !definition.combat ||
    !Number.isFinite(definition.combat.maxHealth) ||
    definition.combat.maxHealth <= 0
  ) {
    add(`Unit definition ${definition.id} needs positive finite maximum health.`)
  }
  if (
    !definition.combat ||
    !Number.isFinite(definition.combat.power) ||
    !Number.isFinite(definition.combat.guard)
  ) {
    add(`Unit definition ${definition.id} needs finite Power and Guard values.`)
  }
  if (
    !definition.combat ||
    !Number.isFinite(definition.combat.mobility) ||
    definition.combat.mobility <= 0
  ) {
    add(`Unit definition ${definition.id} needs positive finite Mobility.`)
  }
  if (
    definition.combat?.attackRange !== undefined &&
    (!Number.isInteger(definition.combat.attackRange) ||
      definition.combat.attackRange < 1)
  ) {
    add(`Unit definition ${definition.id} has an invalid attack range.`)
  }
  if (
    !definition.presentation ||
    !['line-infantry', 'scout'].includes(definition.presentation.archetype)
  ) {
    add(`Unit definition ${definition.id} has an unsupported visual archetype.`)
  } else {
    for (const key of Object.keys(definition.presentation)) {
      if (key !== 'archetype') {
        add(
          `Unit definition ${definition.id} contains unsupported presentation field ${key}.`,
        )
      }
    }
  }
  const allowedKeys = new Set([
    'id',
    'displayName',
    'description',
    'role',
    'status',
    'combat',
    'presentation',
  ])
  for (const key of Object.keys(definition)) {
    if (!allowedKeys.has(key)) {
      add(`Unit definition ${definition.id} contains unsupported field ${key}.`)
    }
  }
  if (definition.combat && typeof definition.combat === 'object') {
    const allowedCombatKeys = new Set([
      'maxHealth',
      'power',
      'guard',
      'mobility',
      'attackRange',
    ])
    for (const key of Object.keys(definition.combat)) {
      if (!allowedCombatKeys.has(key)) {
        add(`Unit definition ${definition.id} contains unsupported combat stat ${key}.`)
      }
    }
  }
  return errors
}

export function validateUnitCatalog(
  definitions: readonly UnitDefinition[],
  expectedStatus?: UnitDefinitionStatus,
): readonly string[] {
  if (!Array.isArray(definitions)) {
    return ['Unit catalog must be an array.']
  }
  const errors: string[] = []
  const ids = new Set<string>()
  for (const [index, definition] of definitions.entries()) {
    if (
      typeof definition !== 'object' ||
      definition === null ||
      Array.isArray(definition)
    ) {
      errors.push(`Unit catalog entry ${index + 1} must be an object.`)
      continue
    }
    errors.push(...validateUnitDefinition(definition, expectedStatus))
    if (ids.has(definition.id)) {
      errors.push(`Unit definition ID ${definition.id} is duplicated.`)
    }
    ids.add(definition.id)
  }
  return errors
}

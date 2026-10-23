import { describe, expect, it } from 'vitest'
import type {
  BattlefieldScenario,
  ScenarioBattleRules,
  ScenarioUnit,
  UnitDefinition,
} from '../domain/types'
import { hexId } from '../hex/coordinates'
import { initialScenario } from '../scenarios/initialScenario'
import {
  attackUnit,
  createBattle,
  endPlayerTurn,
  evaluateVictory,
  getAttackTargets,
  getAttackTargetStatus,
  getMovementDestinations,
  moveUnit,
  restartBattle,
  validateBattleSetup,
} from './battle'

function scenarioWith(
  units: readonly ScenarioUnit[] = initialScenario.units,
  rules: Partial<ScenarioBattleRules> = {},
  terrain: Partial<ScenarioBattleRules['terrain']> = {},
  objectives = initialScenario.objectives,
  unitDefinitions: readonly UnitDefinition[] =
    initialScenario.unitDefinitions,
): BattlefieldScenario {
  const occupiedHexIds = new Set(units.map((unit) => hexId(unit)))
  const terrainRules = {
    ...initialScenario.battleRules.terrain,
    ...terrain,
  }
  const hexes = initialScenario.hexes.map((hex) =>
    occupiedHexIds.has(hex.id) &&
    initialScenario.battleRules.terrain[hex.terrain].movementCost === null
      ? { ...hex, terrain: 'grassland' as const, elevation: 0 }
      : hex,
  )
  const deployableHexIds = hexes
    .filter(
      ({ terrain: hexTerrain }) =>
        terrainRules[hexTerrain].movementCost !== null,
    )
    .map(({ id }) => id)
  return {
    ...initialScenario,
    hexes,
    units,
    objectives,
    unitDefinitions,
    setup: {
      ...initialScenario.setup,
      deploymentZones: initialScenario.players.map((owner) => ({
        owner,
        hexIds: deployableHexIds,
      })),
    },
    startingPlayerPolicy: rules.startingPlayerId
      ? 'configured'
      : initialScenario.startingPlayerPolicy,
    battleRules: {
      ...initialScenario.battleRules,
      ...rules,
      terrain: terrainRules,
    },
  }
}

function positionedUnits(
  positions: readonly { readonly q: number; readonly r: number }[],
): ScenarioUnit[] {
  return initialScenario.units.map((unit, index) => ({
    ...unit,
    ...positions[index],
  }))
}

function start(scenario: BattlefieldScenario) {
  const result = createBattle(scenario.units, scenario, () => 0)
  if (!result.battle) throw new Error(result.error ?? 'Battle failed to start')
  return result.battle
}

describe('battle lifecycle and turn rules', () => {
  it('chooses a configured or injected starting player and initializes separate combat AP', () => {
    const scenario = scenarioWith()
    expect(createBattle(scenario.units, scenario, () => 0).battle?.activePlayerId)
      .toBe('blueward')
    expect(createBattle(scenario.units, scenario, () => 0.99).battle?.activePlayerId)
      .toBe('redoubt')
    const configured = scenarioWith(scenario.units, {
      startingPlayerId: 'redoubt',
    })
    const battle = start(configured)
    expect(battle.activePlayerId).toBe('redoubt')
    expect(
      battle.units.find(({ owner }) => owner === battle.activePlayerId)
        ?.combatApRemaining,
    ).toBe(2)
    expect(
      battle.units.find(({ owner }) => owner !== battle.activePlayerId)
        ?.combatApRemaining,
    ).toBe(0)
    expect(battle.units[0]?.actionPointsRemaining).toBe(
      scenario.units[0]?.actionPointsRemaining,
    )
  })

  it('rejects invalid deployment without creating a battle', () => {
    const scenario = scenarioWith([
      ...initialScenario.units.slice(0, 1),
      { ...initialScenario.units[1]!, q: -2, r: 0 },
    ])
    expect(validateBattleSetup(scenario.units, scenario)).toMatch(/occupies/)
    expect(createBattle(scenario.units, scenario).battle).toBeNull()
  })

  it('advances the whole-player turn and refreshes AP only for the incoming player', () => {
    const scenario = scenarioWith()
    const battle = start(scenario)
    const moved = moveUnit(battle, 'unit-ironwatch-01', 'hex:-3,0', scenario)
    expect(moved.error).toBeNull()
    expect(moved.state.units.find(({ id }) => id === 'unit-ironwatch-01')?.combatApRemaining)
      .toBe(1)

    const redTurn = endPlayerTurn(moved.state, scenario).state
    expect(redTurn.activePlayerId).toBe('redoubt')
    expect(redTurn.round).toBe(1)
    expect(redTurn.units.find(({ id }) => id === 'unit-ironwatch-01')?.combatApRemaining)
      .toBe(1)
    expect(redTurn.units.find(({ id }) => id === 'unit-ashfall-01')?.combatApRemaining)
      .toBe(2)

    const redMove = moveUnit(
      redTurn,
      'unit-ashfall-01',
      'hex:3,-1',
      scenario,
    )
    expect(redMove.state.units.find(({ id }) => id === 'unit-ashfall-01')?.combatApRemaining)
      .toBe(1)
    const redRoundTwo = endPlayerTurn(redMove.state, scenario).state
    expect(redRoundTwo.activePlayerId).toBe('redoubt')
    expect(redRoundTwo.round).toBe(2)
    expect(redRoundTwo.startingPlayerId).toBe('redoubt')
    expect(redRoundTwo.units.find(({ id }) => id === 'unit-ironwatch-01')?.combatApRemaining)
      .toBe(1)
    expect(redRoundTwo.units.find(({ id }) => id === 'unit-ashfall-01')?.combatApRemaining)
      .toBe(2)
    const alternatingOrder = endPlayerTurn(redRoundTwo, scenario).state
    expect(alternatingOrder.activePlayerId).toBe('blueward')
    expect(alternatingOrder.round).toBe(2)
    expect(
      alternatingOrder.units.find(({ id }) => id === 'unit-ironwatch-01')
        ?.combatApRemaining,
    ).toBe(2)
    const nextRound = endPlayerTurn(alternatingOrder, scenario).state
    expect(nextRound.activePlayerId).toBe('blueward')
    expect(nextRound.startingPlayerId).toBe('blueward')
    expect(nextRound.round).toBe(3)
  })

  it('completes three rounds with alternating starters, boundary turns, AP refresh, and scoring', () => {
    const units = positionedUnits([
      { q: 0, r: -2 },
      { q: -3, r: 1 },
      { q: 0, r: 1 },
      { q: 3, r: 0 },
    ])
    const scenario = scenarioWith(units, {
      victory: {
        mode: 'objectives',
        objectiveScoreToWin: 99,
        roundLimit: 3,
      },
    })
    let battle = start(scenario)
    const sequence: Array<{
      readonly round: number
      readonly playerId: string
      readonly startingPlayerId: string
    }> = []

    for (let turn = 0; turn < 6; turn += 1) {
      sequence.push({
        round: battle.round,
        playerId: battle.activePlayerId,
        startingPlayerId: battle.startingPlayerId,
      })
      const endingPlayerId = battle.activePlayerId
      const spent = {
        ...battle,
        units: battle.units.map((unit) =>
          unit.owner === endingPlayerId
            ? { ...unit, combatApRemaining: 0 }
            : unit,
        ),
      }
      const transition = endPlayerTurn(spent, scenario)
      expect(transition.error).toBeNull()
      battle = transition.state

      if (battle.phase === 'active') {
        expect(
          battle.units
            .filter(({ owner }) => owner === battle.activePlayerId)
            .every(
              ({ combatApRemaining }) =>
                combatApRemaining === scenario.battleRules.combatApPerTurn,
            ),
        ).toBe(true)
      }
    }

    expect(sequence).toEqual([
      { round: 1, playerId: 'blueward', startingPlayerId: 'blueward' },
      { round: 1, playerId: 'redoubt', startingPlayerId: 'blueward' },
      { round: 2, playerId: 'redoubt', startingPlayerId: 'redoubt' },
      { round: 2, playerId: 'blueward', startingPlayerId: 'redoubt' },
      { round: 3, playerId: 'blueward', startingPlayerId: 'blueward' },
      { round: 3, playerId: 'redoubt', startingPlayerId: 'blueward' },
    ])
    expect(battle.round).toBe(3)
    expect(battle.objectiveScores).toEqual({ blueward: 3, redoubt: 3 })
    expect(battle.phase).toBe('ended')
    expect(battle.result).toEqual({ winnerId: null, reason: 'draw' })
    expect(
      battle.log.filter(({ message }) => message.includes('scored 1 objective point')),
    ).toHaveLength(6)
  })
})

describe('battle movement', () => {
  it('calculates connected terrain movement costs within Mobility', () => {
    const scenario = scenarioWith()
    const battle = start(scenario)
    const destinations = getMovementDestinations(
      battle,
      'unit-ironwatch-01',
      scenario,
    )
    expect(destinations).toContainEqual({
      hexId: 'hex:-2,-1',
      movementCost: 2,
    })
    expect(destinations).not.toContainEqual(
      expect.objectContaining({ hexId: 'hex:1,0' }),
    )
  })

  it('blocks occupied and impassable terrain and leaves state unchanged on invalid movement', () => {
    const scenario = scenarioWith()
    const battle = start(scenario)
    expect(
      getMovementDestinations(battle, 'unit-ironwatch-01', scenario).some(
        ({ hexId: id }) => id === 'hex:-1,1',
      ),
    ).toBe(false)
    const result = moveUnit(battle, 'unit-ironwatch-01', 'hex:-4,1', scenario)
    expect(result.error).toMatch(/legal movement/)
    expect(result.state).toBe(battle)
    expect(result.state.units).toEqual(battle.units)

    const nearImpassableTerrain = scenarioWith(
      positionedUnits([
        { q: -4, r: 0 },
        { q: -2, r: 0 },
        { q: 3, r: 0 },
        { q: 2, r: -1 },
      ]),
    )
    const reachable = getMovementDestinations(
      start(nearImpassableTerrain),
      'unit-ironwatch-01',
      nearImpassableTerrain,
    )
    expect(reachable.map(({ hexId: id }) => id)).not.toContain('hex:-4,1')
    expect(reachable.map(({ hexId: id }) => id)).not.toContain('hex:-5,0')
  })

  it('rejects movement by a non-active player and movement to the current hex', () => {
    const scenario = scenarioWith()
    const battle = start(scenario)
    expect(
      moveUnit(battle, 'unit-ashfall-01', 'hex:3,-1', scenario).error,
    ).toMatch(/active-player/)
    expect(
      moveUnit(battle, 'unit-ironwatch-01', hexId(battle.units[0]!), scenario)
        .error,
    ).toMatch(/legal movement/)
  })

  it('prevents movement after a unit spends both combat AP', () => {
    const scenario = scenarioWith()
    const battle = start(scenario)
    const firstMove = moveUnit(
      battle,
      'unit-ironwatch-01',
      'hex:-3,0',
      scenario,
    )
    const secondMove = moveUnit(
      firstMove.state,
      'unit-ironwatch-01',
      'hex:-3,-1',
      scenario,
    )
    expect(secondMove.error).toBeNull()
    expect(
      getMovementDestinations(
        secondMove.state,
        'unit-ironwatch-01',
        scenario,
      ),
    ).toEqual([])
    expect(
      moveUnit(
        secondMove.state,
        'unit-ironwatch-01',
        'hex:-4,-1',
        scenario,
      ).state,
    ).toBe(secondMove.state)
  })
})

describe('battle attacks', () => {
  it('limits targets to living enemies in range and rejects invalid attacks unchanged', () => {
    const scenario = scenarioWith(
      positionedUnits([
        { q: -1, r: 0 },
        { q: -3, r: 0 },
        { q: 0, r: 0 },
        { q: 3, r: 0 },
      ]),
    )
    const battle = start(scenario)
    expect(getAttackTargets(battle, 'unit-ironwatch-01', scenario)).toContain(
      'unit-ashfall-01',
    )
    const invalid = attackUnit(
      battle,
      'unit-ironwatch-01',
      'unit-ashfall-02',
      scenario,
    )
    expect(invalid.error).toMatch(/legal attack target/)
    expect(invalid.state).toBe(battle)
  })

  it('blocks line of sight through configured terrain and intermediate units', () => {
    const units = positionedUnits([
      { q: -2, r: 0 },
      { q: -3, r: 2 },
      { q: 1, r: 0 },
      { q: 3, r: 0 },
    ])
    const forest = scenarioWith(
      units,
      { defaultAttackRange: 3 },
      { grassland: { movementCost: 1, blocksLineOfSight: false } },
    )
    const blockedTerrain = {
      ...forest,
      hexes: forest.hexes.map((hex) =>
        hex.id === 'hex:-1,0' ? { ...hex, terrain: 'forest' as const } : hex,
      ),
    }
    expect(
      getAttackTargets(
        start(blockedTerrain),
        'unit-ironwatch-01',
        blockedTerrain,
      ),
    ).not.toContain('unit-ashfall-01')
    expect(
      getAttackTargetStatus(
        start(blockedTerrain),
        'unit-ironwatch-01',
        'unit-ashfall-01',
        blockedTerrain,
      ).reason,
    ).toMatch(/Line of sight is blocked by forest/)

    const blockerUnits = positionedUnits([
      { q: -2, r: 0 },
      { q: -1, r: 0 },
      { q: 1, r: 0 },
      { q: 3, r: 0 },
    ])
    const blockedUnit = scenarioWith(blockerUnits, { defaultAttackRange: 3 })
    expect(
      getAttackTargets(
        start(blockedUnit),
        'unit-ironwatch-01',
        blockedUnit,
      ),
    ).not.toContain('unit-ashfall-01')
  })

  it('supports unit-specific range and does not let hills block line of sight', () => {
    const units = positionedUnits([
      { q: -2, r: 0 },
      { q: -3, r: 2 },
      { q: 1, r: 0 },
      { q: 3, r: 0 },
    ])
    const unitDefinitions = initialScenario.unitDefinitions.map((definition) =>
      definition.id === 'development.line-infantry'
        ? {
            ...definition,
            combat: { ...definition.combat, attackRange: 3 },
          }
        : definition,
    )
    const scenario = scenarioWith(
      units,
      {},
      {},
      initialScenario.objectives,
      unitDefinitions,
    )
    const withHill = {
      ...scenario,
      hexes: scenario.hexes.map((hex) =>
        hex.id === 'hex:-1,0' ? { ...hex, terrain: 'hills' as const } : hex,
      ),
    }
    expect(
      getAttackTargets(start(withHill), 'unit-ironwatch-01', withHill),
    ).toContain('unit-ashfall-01')
  })

  it('applies deterministic damage, elevation bonus, AP use, and destruction', () => {
    const units = positionedUnits([
      { q: -2, r: -1 },
      { q: -3, r: 1 },
      { q: -1, r: -1 },
      { q: 3, r: 0 },
    ]).map((unit) =>
      unit.id === 'unit-ashfall-01'
        ? { ...unit, currentHp: 1 }
        : unit,
    )
    const scenario = scenarioWith(units)
    const battle = start(scenario)
    const attack = attackUnit(
      battle,
      'unit-ironwatch-01',
      'unit-ashfall-01',
      scenario,
    )
    expect(attack.error).toBeNull()
    expect(attack.state.units.some(({ id }) => id === 'unit-ashfall-01')).toBe(
      false,
    )
    expect(
      attack.state.units.find(({ id }) => id === 'unit-ironwatch-01')
        ?.combatApRemaining,
    ).toBe(1)
    expect(attack.state.log.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/attacked Ashfall-01 for 2 damage/),
        'Ashfall-01 was destroyed.',
      ]),
    )
  })

  it('enforces minimum one damage', () => {
    const units = positionedUnits([
      { q: -1, r: 0 },
      { q: -3, r: 0 },
      { q: 0, r: 0 },
      { q: 3, r: 0 },
    ]).map((unit) =>
      unit.id === 'unit-ironwatch-01'
        ? { ...unit, definitionId: 'test.low-power' }
        : unit.id === 'unit-ashfall-01'
          ? { ...unit, definitionId: 'test.high-guard' }
          : unit,
    )
    const lineInfantry = initialScenario.unitDefinitions[0]!
    const unitDefinitions: UnitDefinition[] = [
      ...initialScenario.unitDefinitions,
      {
        ...lineInfantry,
        id: 'test.low-power',
        combat: { ...lineInfantry.combat, power: 1 },
      },
      {
        ...lineInfantry,
        id: 'test.high-guard',
        combat: { ...lineInfantry.combat, guard: 5 },
      },
    ]
    const scenario = scenarioWith(
      units,
      {},
      {},
      initialScenario.objectives,
      unitDefinitions,
    )
    const attack = attackUnit(
      start(scenario),
      'unit-ironwatch-01',
      'unit-ashfall-01',
      scenario,
    )
    expect(
      attack.state.units.find(({ id }) => id === 'unit-ashfall-01')?.currentHp,
    ).toBe(7)
  })

  it('prevents non-active players from attacking', () => {
    const scenario = scenarioWith(
      positionedUnits([
        { q: -1, r: 0 },
        { q: -3, r: 0 },
        { q: 0, r: 0 },
        { q: 3, r: 0 },
      ]),
    )
    const battle = start(scenario)
    expect(
      attackUnit(
        battle,
        'unit-ashfall-01',
        'unit-ironwatch-01',
        scenario,
      ).error,
    ).toMatch(/active-player/)
  })

  it('rejects attacks when combat AP is exhausted without mutating the battle', () => {
    const scenario = scenarioWith(
      positionedUnits([
        { q: -1, r: 0 },
        { q: -3, r: 0 },
        { q: 0, r: 0 },
        { q: 3, r: 0 },
      ]),
    )
    const battle = start(scenario)
    const first = attackUnit(
      battle,
      'unit-ironwatch-01',
      'unit-ashfall-01',
      scenario,
    )
    const second = attackUnit(
      first.state,
      'unit-ironwatch-01',
      'unit-ashfall-01',
      scenario,
    )
    expect(second.error).toBeNull()
    const exhausted = attackUnit(
      second.state,
      'unit-ironwatch-01',
      'unit-ashfall-01',
      scenario,
    )
    expect(exhausted.error).toMatch(/legal attack target/)
    expect(exhausted.state).toBe(second.state)
  })
})

describe('battle objectives and victory', () => {
  it('scores objectives at end of active turn and ends on configured objective score', () => {
    const units = positionedUnits([
      { q: 0, r: -2 },
      { q: -3, r: 1 },
      { q: 2, r: -1 },
      { q: 3, r: 0 },
    ])
    const scenario = scenarioWith(units, {
      victory: { mode: 'objectives', objectiveScoreToWin: 1 },
    })
    const end = endPlayerTurn(start(scenario), scenario)
    expect(end.state.objectiveScores.blueward).toBe(1)
    expect(end.state.phase).toBe('ended')
    expect(end.state.result).toEqual({
      winnerId: 'blueward',
      reason: 'objectives',
    })
  })

  it('supports elimination, combined, round-limit tie, and terminal action rejection', () => {
    const eliminationUnits = positionedUnits([
        { q: -1, r: 0 },
        { q: -3, r: 0 },
        { q: 0, r: 0 },
        { q: 3, r: 0 },
      ])
    const eliminationScenario = scenarioWith(
      [
        eliminationUnits[0]!,
        eliminationUnits[1]!,
        { ...eliminationUnits[2]!, currentHp: 1 },
      ],
      { victory: { mode: 'elimination' } },
    )
    const eliminationBattle = start(eliminationScenario)
    const defeated = attackUnit(
      eliminationBattle,
      'unit-ironwatch-01',
      'unit-ashfall-01',
      eliminationScenario,
    )
    expect(defeated.state.phase).toBe('ended')
    expect(defeated.state.result?.winnerId).toBe('blueward')
    expect(
      moveUnit(
        defeated.state,
        'unit-ironwatch-01',
        'hex:-2,0',
        eliminationScenario,
      ).state,
    ).toBe(defeated.state)
    expect(endPlayerTurn(defeated.state, eliminationScenario).state).toBe(
      defeated.state,
    )
    expect(
      attackUnit(
        defeated.state,
        'unit-ironwatch-01',
        'unit-ashfall-01',
        eliminationScenario,
      ).state,
    ).toBe(defeated.state)

    const bothScenario = scenarioWith(initialScenario.units, {
      victory: { mode: 'both', objectiveScoreToWin: 2 },
    })

    const eitherScenario = scenarioWith(initialScenario.units, {
      victory: { mode: 'either', objectiveScoreToWin: 1 },
    })
    const eitherBattle = {
      ...start(eitherScenario),
      objectiveScores: { blueward: 1, redoubt: 0 },
    }
    expect(evaluateVictory(eitherBattle, eitherScenario)).toEqual({
      winnerId: 'blueward',
      reason: 'objectives',
    })

    const cappedScenario = scenarioWith(initialScenario.units, {
      victory: {
        mode: 'objectives',
        objectiveScoreToWin: 99,
        roundLimit: 1,
      },
    })
    const firstTurn = endPlayerTurn(start(cappedScenario), cappedScenario).state
    const ahead = {
      ...firstTurn,
      objectiveScores: { blueward: 2, redoubt: 1 },
    }
    const limitResult = endPlayerTurn(ahead, cappedScenario).state
    expect(limitResult.result).toEqual({
      winnerId: 'blueward',
      reason: 'round-limit',
    })
    const eliminated = {
      ...start(bothScenario),
      units: start(bothScenario).units.filter(
        ({ owner }) => owner === 'blueward',
      ),
      objectiveScores: { blueward: 2, redoubt: 0 },
    }
    expect(evaluateVictory(eliminated, bothScenario)).toEqual({
      winnerId: 'blueward',
      reason: 'combined',
    })

    const roundScenario = scenarioWith(initialScenario.units, {
      victory: { mode: 'objectives', objectiveScoreToWin: 99, roundLimit: 1 },
    })
    const afterFirst = endPlayerTurn(start(roundScenario), roundScenario).state
    const afterRound = endPlayerTurn(afterFirst, roundScenario).state
    expect(afterRound.phase).toBe('ended')
    expect(afterRound.result).toEqual({ winnerId: null, reason: 'draw' })
  })

  it('resolves every victory mode and simultaneous winning conditions without player-order bias', () => {
    const scenario = scenarioWith(initialScenario.units, {
      victory: { mode: 'objectives', objectiveScoreToWin: 2 },
    })
    const battle = start(scenario)
    expect(
      evaluateVictory(
        { ...battle, objectiveScores: { blueward: 2, redoubt: 0 } },
        scenario,
      ),
    ).toEqual({ winnerId: 'blueward', reason: 'objectives' })
    expect(
      evaluateVictory(
        { ...battle, objectiveScores: { blueward: 2, redoubt: 2 } },
        scenario,
      ),
    ).toEqual({ winnerId: null, reason: 'draw' })
    expect(
      evaluateVictory({ ...battle, units: [] }, scenario),
    ).toEqual({ winnerId: null, reason: 'draw' })

    const elimination = scenarioWith(initialScenario.units, {
      victory: { mode: 'elimination' },
    })
    const eliminationBattle = start(elimination)
    expect(
      evaluateVictory(
        {
          ...eliminationBattle,
          units: eliminationBattle.units.filter(
            ({ owner }) => owner === 'blueward',
          ),
        },
        elimination,
      ),
    ).toEqual({ winnerId: 'blueward', reason: 'elimination' })
    expect(
      evaluateVictory({ ...eliminationBattle, units: [] }, elimination),
    ).toEqual({ winnerId: null, reason: 'draw' })

    const either = scenarioWith(initialScenario.units, {
      victory: { mode: 'either', objectiveScoreToWin: 2 },
    })
    const eitherBattle = start(either)
    expect(
      evaluateVictory(
        {
          ...eitherBattle,
          units: eitherBattle.units.filter(
            ({ owner }) => owner === 'blueward',
          ),
          objectiveScores: { blueward: 0, redoubt: 0 },
        },
        either,
      ),
    ).toEqual({ winnerId: 'blueward', reason: 'elimination' })
    expect(
      evaluateVictory(
        {
          ...eitherBattle,
          units: eitherBattle.units.filter(
            ({ owner }) => owner === 'blueward',
          ),
          objectiveScores: { blueward: 0, redoubt: 2 },
        },
        either,
      ),
    ).toEqual({ winnerId: null, reason: 'draw' })
    expect(
      evaluateVictory(
        {
          ...eitherBattle,
          units: eitherBattle.units.filter(
            ({ owner }) => owner === 'blueward',
          ),
          objectiveScores: { blueward: 2, redoubt: 0 },
        },
        either,
      ),
    ).toEqual({ winnerId: 'blueward', reason: 'objectives' })

    const both = scenarioWith(initialScenario.units, {
      victory: { mode: 'both', objectiveScoreToWin: 2 },
    })
    const bothBattle = start(both)
    const opposingForceEliminated = {
      ...bothBattle,
      units: bothBattle.units.filter(({ owner }) => owner === 'blueward'),
      objectiveScores: { blueward: 2, redoubt: 0 },
    }
    expect(evaluateVictory(opposingForceEliminated, both)).toEqual({
      winnerId: 'blueward',
      reason: 'combined',
    })
    expect(
      evaluateVictory(
        { ...opposingForceEliminated, objectiveScores: { blueward: 0, redoubt: 2 } },
        both,
      ),
    ).toBeNull()
  })

  it('restarts from the deployed setup with the same starting player', () => {
    const scenario = scenarioWith()
    const battle = start(scenario)
    const moved = moveUnit(battle, 'unit-ironwatch-01', 'hex:-3,0', scenario)
      .state
    const restarted = restartBattle(moved, scenario)
    expect(restarted.phase).toBe('active')
    expect(restarted.round).toBe(1)
    expect(restarted.startingPlayerId).toBe('blueward')
    expect(restarted.initialStartingPlayerId).toBe('blueward')
    expect(restarted.units.find(({ id }) => id === 'unit-ironwatch-01')).toMatchObject({
      q: -2,
      r: 0,
      combatApRemaining: 2,
    })
  })
})

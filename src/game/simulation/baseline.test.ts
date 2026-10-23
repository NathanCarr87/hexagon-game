import { describe, expect, it } from 'vitest'
import { scenarios } from '../scenarios'
import { initialScenario } from '../scenarios/initialScenario'
import { openGroundScenario } from '../scenarios/openGround'
import {
  runBaselineBatch,
  simulateBaselineBattle,
} from './baseline'

describe('headless baseline simulation', () => {
  it('replays the same seeded battle and action history exactly', () => {
    const first = simulateBaselineBattle({
      scenario: initialScenario,
      seed: 173,
      maxRounds: 6,
    })
    const replay = simulateBaselineBattle({
      scenario: initialScenario,
      seed: 173,
      maxRounds: 6,
    })

    expect(replay.startingPlayerId).toBe(first.startingPlayerId)
    expect(replay.actions).toEqual(first.actions)
    expect(replay.battle.result).toEqual(first.battle.result)
    expect(replay.battle.objectiveScores).toEqual(first.battle.objectiveScores)
  })

  it('distributes sequential seeds across both starting players', () => {
    const starters = new Set(
      Array.from({ length: 20 }, (_, index) =>
        simulateBaselineBattle({
          scenario: initialScenario,
          seed: index + 1,
          maxRounds: 1,
        }).startingPlayerId,
      ),
    )

    expect(starters).toEqual(new Set(initialScenario.players))
  })

  it('uses the real engine round-limit resolution and summarizes results', () => {
    const batch = runBaselineBatch({
      scenario: initialScenario,
      seeds: [1, 2],
      maxRounds: 1,
    })
    const first = batch.results[0]!
    const summary = batch.summary

    expect(first.battle.phase).toBe('ended')
    expect(first.battle.result?.reason).toMatch(/round-limit|draw/)
    expect(summary.sampleSize).toBe(2)
    expect(
      summary.playerOutcomes.blueward!.wins +
        summary.playerOutcomes.blueward!.draws +
        summary.playerOutcomes.blueward!.losses,
    ).toBe(2)
    expect(summary.victoryReasons.draw + summary.victoryReasons['round-limit'])
      .toBe(2)
    expect(summary.unitMetrics['development.line-infantry']?.deployed).toBe(4)
  })

  it('records the round being completed rather than the incoming round', () => {
    const result = simulateBaselineBattle({
      scenario: openGroundScenario,
      seed: 12,
      maxRounds: 2,
    })

    expect(
      result.actions
        .filter(({ type }) => type === 'end-turn')
        .map(({ round }) => round),
    ).toEqual([1, 1, 2, 2])
  })

  it('runs each registered scenario through the battle engine', () => {
    for (const scenario of scenarios) {
      const result = simulateBaselineBattle({
        scenario,
        seed: 41,
        maxRounds: 2,
      })
      expect(result.battle.phase).toBe('ended')
      expect(result.battle.result).not.toBeNull()
    }
  })

  it('rejects invalid seeds and maximum-round limits', () => {
    expect(() =>
      simulateBaselineBattle({
        scenario: initialScenario,
        seed: Number.NaN,
        maxRounds: 2,
      }),
    ).toThrow(/seed must be an integer/)
    expect(() =>
      simulateBaselineBattle({
        scenario: initialScenario,
        seed: 1,
        maxRounds: 0,
      }),
    ).toThrow(/maximum rounds must be a positive integer/)
  })
})

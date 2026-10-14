import type { BattlefieldScenario } from '../domain/types'
import type { ScenarioUnit } from '../domain/types'
import {
  getAttackTargets,
  getAttackTargetStatus,
  getMovementDestinations,
  validateBattleSetup,
  type BattleState,
} from '../state/battle'
import type { GameAction } from '../state/gameState'
import { scenarios } from '../scenarios'
import {
  validateScenario,
  validateScenarioCatalog,
} from '../scenarios/validateScenario'

interface BattlePanelProps {
  readonly scenario: BattlefieldScenario
  readonly units: readonly ScenarioUnit[]
  readonly battle: BattleState | null
  readonly selectedUnitId: string | null
  readonly actionMode: 'select' | 'move' | 'attack'
  readonly message: string | null
  readonly dispatch: (action: GameAction) => void
}

export function BattlePanel({
  scenario,
  units,
  battle,
  selectedUnitId,
  actionMode,
  message,
  dispatch,
}: BattlePanelProps) {
  const scenarioErrors = [
    ...validateScenarioCatalog(scenarios),
    ...validateScenario(scenario),
  ]
  const battleSetupError = validateBattleSetup(units, scenario)
  const setupErrors = [
    ...scenarioErrors,
    ...(battleSetupError ? [battleSetupError] : []),
  ]
  const startError = setupErrors[0] ?? null
  const activePlayer = scenario.playerDefinitions.find(
    ({ id }) => id === battle?.activePlayerId,
  )
  const scores = battle?.objectiveScores ?? {}
  const selectedUnit = battle?.units.find(({ id }) => id === selectedUnitId)
  const selectedMovement = battle && selectedUnit
    ? getMovementDestinations(battle, selectedUnit.id, scenario)
    : []
  const selectedTargets = battle && selectedUnit
    ? getAttackTargets(battle, selectedUnit.id, scenario)
    : []
  const enemyTargetChecks =
    battle && selectedUnit
      ? battle.units
          .filter(
            (unit) =>
              unit.owner !== selectedUnit.owner && unit.currentHp > 0,
          )
          .map((unit) => ({
            unit,
            ...getAttackTargetStatus(
              battle,
              selectedUnit.id,
              unit.id,
              scenario,
            ),
          }))
      : []
  const unavailableReason =
    battle?.phase !== 'active' || actionMode === 'select'
      ? null
      : !selectedUnit
        ? 'Select a unit before choosing an action.'
        : selectedUnit.owner !== battle.activePlayerId
          ? 'Only the active player’s units can act.'
          : selectedUnit.combatApRemaining <
              (actionMode === 'move'
                ? scenario.battleRules.movementApCost
                : scenario.battleRules.attackApCost)
            ? 'This unit has no combat AP remaining. End the turn to refresh it.'
            : actionMode === 'move' && selectedMovement.length === 0
              ? 'No legal movement destinations are available.'
              : actionMode === 'attack' && selectedTargets.length === 0
                ? enemyTargetChecks.length === 0
                  ? 'No living enemy units remain.'
                  : enemyTargetChecks.find(({ reason }) =>
                        reason?.startsWith('Line of sight is blocked'),
                      )?.reason ??
                    enemyTargetChecks[0]?.reason ??
                    'No legal attack target is available.'
                : null
  const controlledObjectives = scenario.objectives.map((objective) => ({
    ...objective,
    controller: battle?.units.find(
      (unit) => unit.q === objective.q && unit.r === objective.r,
    )?.owner,
  }))

  return (
    <section className="panel setup-panel battle-panel" aria-labelledby="battle-title">
      <div className="panel-heading">
        <h2 id="battle-title">Battle</h2>
        <span className="setup-status">
          {battle?.phase === 'ended' ? 'COMPLETE' : battle ? 'ACTIVE' : 'SETUP'}
        </span>
      </div>
      {!battle ? (
        <>
          <p className="setup-message">
            Start when both players have valid deployments. Combat statistics
            in this scenario are provisional.
          </p>
          {setupErrors.map((error, index) => (
            <p className="battle-error" key={`${index}:${error}`}>
              {error}
            </p>
          ))}
          {message && <p className="battle-error">{message}</p>}
          <button
            className="control-button battle-control"
            disabled={Boolean(startError)}
            onClick={() => dispatch({ type: 'start-battle' })}
            type="button"
          >
            Start battle
          </button>
        </>
      ) : (
        <>
          {battle.phase === 'active' ? (
            <>
              <div className="battle-turn">
                <strong>{activePlayer?.name ?? battle.activePlayerId}</strong>
                <span>Round {battle.round}</span>
              </div>
              {selectedUnitId && (
                <p className="deployment-rules">
                  Selected: {battle.units.find(({ id }) => id === selectedUnitId)?.name ?? 'none'}
                </p>
              )}
            </>
          ) : (
            <div className="battle-result" role="status">
              {battle.result?.winnerId
                ? `${scenario.playerDefinitions.find(({ id }) => id === battle.result?.winnerId)?.name ?? battle.result.winnerId} wins`
                : 'Draw'}
              <small>{battle.result?.reason.replaceAll('-', ' ')}</small>
            </div>
          )}
          <div className="score-list" aria-label="Objective scores">
            {scenario.players.map((playerId) => (
              <div key={playerId}>
                <span>
                  {scenario.playerDefinitions.find(({ id }) => id === playerId)?.name ??
                    playerId}
                </span>
                <strong>{scores[playerId] ?? 0}</strong>
              </div>
            ))}
          </div>
          <div className="objective-list">
            {controlledObjectives.map((objective) => (
              <p key={objective.id}>
                {objective.name}:{' '}
                {objective.controller
                  ? scenario.playerDefinitions.find(
                      ({ id }) => id === objective.controller,
                    )?.name ?? objective.controller
                  : 'uncontrolled'}
              </p>
            ))}
          </div>
          {battle.phase === 'active' && (
            <>
              <div className="mode-actions">
                {(['select', 'move', 'attack'] as const).map((mode) => (
                  <button
                    className={`mode-button${actionMode === mode ? ' active' : ''}`}
                    key={mode}
                    onClick={() =>
                      dispatch({ type: 'set-battle-action', mode })
                    }
                    type="button"
                  >
                    {mode === 'select' ? 'Select' : mode}
                  </button>
                ))}
              </div>
              <p className="deployment-rules">
                Movement costs {scenario.battleRules.movementApCost} AP and
                attacks cost {scenario.battleRules.attackApCost} AP. Each unit
                receives {scenario.battleRules.combatApPerTurn} AP on its
                owner’s turn.
              </p>
              {unavailableReason && (
                <p className="action-guidance" aria-live="polite">
                  {unavailableReason}
                </p>
              )}
              {actionMode === 'attack' && enemyTargetChecks.length > 0 && (
                <div className="attack-readout" aria-label="Attack target checks">
                  <strong>Enemy target checks</strong>
                  {enemyTargetChecks.map(({ unit, legal, reason }) => (
                    <p className={legal ? 'target-legal' : ''} key={unit.id}>
                      <span>{unit.name}</span>
                      <small>
                        HP {unit.currentHp}/{unit.definition.combat.maxHealth} · Power{' '}
                        {unit.definition.combat.power} · Guard{' '}
                        {unit.definition.combat.guard}
                      </small>
                      <small>{legal ? 'Valid target' : reason}</small>
                    </p>
                  ))}
                </div>
              )}
              <button
                className="control-button battle-control"
                onClick={() => dispatch({ type: 'end-turn' })}
                type="button"
              >
                End {activePlayer?.name ?? 'player'} turn
              </button>
            </>
          )}
          {message && <p className="battle-error">{message}</p>}
          <button
            className="mode-button restart-battle"
            onClick={() => dispatch({ type: 'restart-battle' })}
            type="button"
          >
            Restart battle
          </button>
          <button
            className="mode-button return-setup"
            onClick={() => dispatch({ type: 'return-to-setup' })}
            type="button"
          >
            Return to setup
          </button>
          <div className="battle-log" aria-label="Battle log" aria-live="polite">
            {battle.log.slice().reverse().map((event) => (
              <p key={event.id}>
                <small>R{event.round}</small> {event.message}
              </p>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

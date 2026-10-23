import type { BattlefieldScenario } from '../domain/types'
import type { GameAction, GameState } from '../state/gameState'
import { getUnitDefinition } from '../domain/unitCatalog'

interface ForceSetupPanelProps {
  readonly scenario: BattlefieldScenario
  readonly state: GameState
  readonly dispatch: (action: GameAction) => void
}

export function ForceSetupPanel({
  scenario,
  state,
  dispatch,
}: ForceSetupPanelProps) {
  const selectedUnit = state.units.find(
    ({ id }) => id === state.selectedUnitId,
  )
  const targetHex = scenario.hexes.find(
    ({ id }) => id === state.deploymentTargetHexId,
  )

  return (
    <>
      <section className="panel setup-panel" aria-labelledby="construction-title">
        <div className="panel-heading">
          <h2 id="construction-title">Force rosters</h2>
          <span className="setup-status">DEVELOPMENT FIXTURES</span>
        </div>
        <p className="setup-message">
          No authoritative unit definitions are available. The pricing formula,
          stat costs, prefab templates, and construction rules are also
          unspecified, so these development fixtures cannot be purchased or
          edited.
        </p>
        <p className="deployment-rules">
          Recommended: {scenario.recommendedForceSize}. No budget is configured.
        </p>
        {scenario.players.map((playerId) => {
          const player = scenario.playerDefinitions.find(
            ({ id }) => id === playerId,
          )
          const roster = state.units.filter(({ owner }) => owner === playerId)
          return (
            <div className="force-roster" key={playerId}>
              <div className="roster-heading">
                <span>
                  <span
                    className="owner-swatch"
                    style={{ backgroundColor: player?.color ?? '#ded9bf' }}
                  />{' '}
                  {player?.name ?? playerId}
                </span>
                <strong>{roster.length} units</strong>
              </div>
              <p className="roster-cost">
                Total cost <strong>Unavailable — no pricing rules</strong>
              </p>
              <ul className="starting-units">
                {roster.map((unit) => {
                  const definition = getUnitDefinition(
                    scenario.unitDefinitions,
                    unit.definitionId,
                  )
                  return (
                    <li key={unit.id}>
                      <button
                        className={`starting-unit${selectedUnit?.id === unit.id ? ' selected' : ''}`}
                        onClick={() =>
                          dispatch({ type: 'select-unit', unitId: unit.id })
                        }
                        type="button"
                      >
                        <span>
                          <strong>{unit.name}</strong>
                          <small>
                            {definition
                              ? `${definition.displayName} — ${definition.role}`
                              : 'Unknown unit definition'}
                          </small>
                        </span>
                        <span className="starting-unit-coordinate">
                          q{unit.q} / r{unit.r}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </section>

      <section className="panel setup-panel" aria-labelledby="deployment-title">
        <div className="panel-heading">
          <h2 id="deployment-title">Setup &amp; deployment</h2>
          <span className="setup-status">PROVISIONAL</span>
        </div>
        <p className="setup-message">
          {state.mode === 'deployment'
            ? 'Choose a starting unit, preview a hex, then confirm its placement.'
            : 'Starting pieces are temporary scenario placeholders, not a constructed army.'}
        </p>
        <div className="mode-actions">
          <button
            className={`mode-button${state.mode === 'inspection' ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'set-mode', mode: 'inspection' })}
            type="button"
          >
            Inspect
          </button>
          <button
            className={`mode-button${state.mode === 'deployment' ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'set-mode', mode: 'deployment' })}
            type="button"
          >
            Deployment
          </button>
        </div>
        <p className="deployment-rules">
          Player-colored hexes show each side’s deployable area. Stacking is
          disallowed, and terrain marked impassable by this scenario cannot be
          used for deployment.
        </p>
        {state.mode === 'deployment' && (
          <div className="placement-status" aria-live="polite">
            {targetHex && (
              <p>
                Preview: {selectedUnit?.name} at q{targetHex.q} / r{targetHex.r}
              </p>
            )}
            {state.deploymentError && (
              <p className="deployment-error">{state.deploymentError}</p>
            )}
            <button
              className="control-button deploy-button"
              disabled={!targetHex || Boolean(state.deploymentError)}
              onClick={() => dispatch({ type: 'commit-deployment' })}
              type="button"
            >
              Confirm placement
            </button>
          </div>
        )}
      </section>
    </>
  )
}

import type { BattlefieldScenario } from '../domain/types'
import type { GameAction, GameState } from '../state/gameState'

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
          <h2 id="construction-title">Force construction</h2>
          <span className="setup-status">RULES NEEDED</span>
        </div>
        <p className="setup-message">
          Unit stat costs, construction limits, prefab templates, and a point
          budget are not defined in this repository. Construction is
          intentionally unavailable until those rules are supplied.
        </p>
        <div className="setup-budget">
          <span>Scenario point budget</span>
          <strong>
            {scenario.pointBudgets ? 'Configured' : 'Not configured'}
          </strong>
        </div>
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
          Provisional zones split the map by q coordinate. Stacking is
          disallowed; terrain restrictions and ownership rules are otherwise
          not defined.
        </p>
        <div className="roster-heading">
          <span>Starting pieces</span>
          <strong>{state.units.length}</strong>
        </div>
        <ul className="starting-units">
          {state.units.map((unit) => {
            const player = scenario.playerDefinitions.find(
              ({ id }) => id === unit.owner,
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
                  <span
                    className="owner-swatch"
                    style={{ backgroundColor: player?.color ?? '#ded9bf' }}
                  />
                  <span>
                    <strong>{unit.name}</strong>
                    <small>{unit.unitType.replaceAll('-', ' ')}</small>
                  </span>
                  <span className="starting-unit-coordinate">
                    q{unit.q} / r{unit.r}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
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

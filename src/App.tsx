import { useReducer } from 'react'
import { initialScenario } from './game/scenarios/initialScenario'
import { createInitialGameState, gameReducer } from './game/state/gameState'
import type { GameAction, GameState } from './game/state/gameState'
import { Battlefield } from './game/scene/Battlefield'
import { SelectedInfoPanel } from './game/ui/SelectedInfoPanel'
import { TerrainLegend } from './game/ui/TerrainLegend'
import { ForceSetupPanel } from './game/ui/ForceSetupPanel'

const scenarioReducer = (state: GameState, action: GameAction): GameState =>
  gameReducer(state, action, initialScenario)

function App() {
  const [gameState, dispatch] = useReducer(
    scenarioReducer,
    initialScenario,
    createInitialGameState,
  )
  const selectedHex = initialScenario.hexes.find(
    (hex) => hex.id === gameState.selectedHexId,
  )
  const selectedUnit = gameState.units.find(
    (unit) => unit.id === gameState.selectedUnitId,
  )
  const eligibleHexIds = selectedUnit
    ? initialScenario.setup.deploymentZones.find(
        ({ owner }) => owner === selectedUnit.owner,
      )?.hexIds ?? []
    : []
  const occupiedHexIds = gameState.units
    .filter((unit) => unit.id !== gameState.selectedUnitId)
    .map((unit) => `hex:${unit.q},${unit.r}`)

  return (
    <main className="game-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="Hexagon Game home">
          <span className="wordmark-mark" aria-hidden="true">
            H
          </span>
          <span>HEXAGON</span>
        </a>
        <div className="topbar-right">
          <span className="topbar-label">TACTICAL WARGAME</span>
          <span className="online-indicator">
            <span className="status-dot" />
            LOCAL SCENARIO
          </span>
        </div>
      </header>

      <section className="battle-header" aria-label="Scenario">
        <div>
          <p className="eyebrow">FIELD STUDY&nbsp; / &nbsp;01</p>
          <h1>{initialScenario.title}</h1>
          <p className="scenario-subtitle">{initialScenario.subtitle}</p>
        </div>
        <div className="header-actions">
          <button
            className="control-button"
            onClick={() => dispatch({ type: 'reset' })}
            type="button"
          >
            Reset scenario
          </button>
        </div>
      </section>

      <section className="battle-layout" aria-label="Battlefield">
        <div className="battlefield-column">
          <div className="scene-frame">
            <Battlefield
              scenario={initialScenario}
              units={gameState.units}
              selectedHexId={gameState.selectedHexId}
              selectedUnitId={gameState.selectedUnitId}
              deploymentMode={gameState.mode === 'deployment'}
              eligibleHexIds={eligibleHexIds}
              occupiedHexIds={occupiedHexIds}
              deploymentTargetHexId={gameState.deploymentTargetHexId}
              onSelectHex={(hexId) => dispatch({ type: 'select-hex', hexId })}
              onSelectUnit={(unitId) =>
                dispatch({ type: 'select-unit', unitId })
              }
            />
            <div className="scene-caption">
              <span>
                {gameState.mode === 'deployment' ? 'DEPLOYMENT SETUP' : 'AXIAL GRID'}
                &nbsp; / &nbsp;{initialScenario.hexes.length} HEXES
              </span>
              <span>DRAG TO ORBIT&nbsp; · &nbsp;SCROLL TO ZOOM</span>
            </div>
          </div>
          <TerrainLegend players={initialScenario.playerDefinitions} />
        </div>

        <aside className="sidebar" aria-label="Battlefield information">
          <SelectedInfoPanel
            unit={selectedUnit}
            hex={selectedHex}
            ownerColor={
              initialScenario.playerDefinitions.find(
                ({ id }) => id === selectedUnit?.owner,
              )?.color
            }
          />
          <ForceSetupPanel
            scenario={initialScenario}
            state={gameState}
            dispatch={dispatch}
          />
          <section className="panel event-panel" aria-labelledby="event-title">
            <div className="panel-heading">
              <h2 id="event-title">Field log</h2>
              <span className="panel-count">0</span>
            </div>
            <p className="empty-log">
              No events yet. Messages will appear here when game actions are
              introduced.
            </p>
          </section>
          <p className="temporary-note">
            TEMPORARY SCENARIO DATA
            <span>Unit values are visual placeholders, not game rules.</span>
          </p>
        </aside>
      </section>

      <footer className="footer">
        <span>HEXAGON GAME</span>
        <span>FOUNDATION MILESTONE&nbsp; / &nbsp;2026</span>
      </footer>
    </main>
  )
}

export default App

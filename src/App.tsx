import { useReducer } from 'react'
import { initialScenario } from './game/scenarios/initialScenario'
import { createInitialGameState, gameReducer } from './game/state/gameState'
import type { GameAction, GameState } from './game/state/gameState'
import { Battlefield } from './game/scene/Battlefield'
import { SelectedInfoPanel } from './game/ui/SelectedInfoPanel'
import { TerrainLegend } from './game/ui/TerrainLegend'

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
  const selectedUnit = initialScenario.units.find(
    (unit) => unit.id === gameState.selectedUnitId,
  )

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
              selectedHexId={gameState.selectedHexId}
              selectedUnitId={gameState.selectedUnitId}
              onSelectHex={(hexId) => dispatch({ type: 'select-hex', hexId })}
              onSelectUnit={(unitId) =>
                dispatch({ type: 'select-unit', unitId })
              }
            />
            <div className="scene-caption">
              <span>AXIAL GRID&nbsp; / &nbsp;{initialScenario.hexes.length} HEXES</span>
              <span>DRAG TO ORBIT&nbsp; · &nbsp;SCROLL TO ZOOM</span>
            </div>
          </div>
          <TerrainLegend />
        </div>

        <aside className="sidebar" aria-label="Battlefield information">
          <SelectedInfoPanel unit={selectedUnit} hex={selectedHex} />
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

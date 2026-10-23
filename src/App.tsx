import { useReducer } from 'react'
import { initialScenario } from './game/scenarios/initialScenario'
import { scenarios } from './game/scenarios'
import { createInitialGameState, gameReducer } from './game/state/gameState'
import type { GameAction, GameState } from './game/state/gameState'
import { Battlefield } from './game/scene/Battlefield'
import { SelectedInfoPanel } from './game/ui/SelectedInfoPanel'
import { TerrainLegend } from './game/ui/TerrainLegend'
import { ForceSetupPanel } from './game/ui/ForceSetupPanel'
import { BattlePanel } from './game/ui/BattlePanel'
import { getAttackTargets, getMovementDestinations } from './game/state/battle'
import { getUnitDefinition } from './game/domain/unitCatalog'

function App() {
  const [gameState, dispatch] = useReducer(
    (state: GameState, action: GameAction) => gameReducer(state, action),
    initialScenario,
    createInitialGameState,
  )
  const scenario = gameState.scenario
  const activeUnits = gameState.battle?.units ?? gameState.units
  const selectedHex = scenario.hexes.find(
    (hex) => hex.id === gameState.selectedHexId,
  )
  const selectedUnit = activeUnits.find(
    (unit) => unit.id === gameState.selectedUnitId,
  )
  const selectedDefinition = selectedUnit
    ? getUnitDefinition(scenario.unitDefinitions, selectedUnit.definitionId)
    : undefined
  const eligibleHexIds = gameState.mode !== 'battle' && selectedUnit
    ? scenario.setup.deploymentZones.find(
        ({ owner }) => owner === selectedUnit.owner,
      )?.hexIds ?? []
    : []
  const deploymentZoneOwnerByHex = Object.fromEntries(
    scenario.setup.deploymentZones.flatMap((zone) =>
      zone.hexIds.map((hexId) => [hexId, zone.owner]),
    ),
  )
  const occupiedHexIds = activeUnits
    .filter((unit) => unit.id !== gameState.selectedUnitId)
    .map((unit) => `hex:${unit.q},${unit.r}`)
  const movementHexIds =
    gameState.battle && selectedUnit
      ? getMovementDestinations(
          gameState.battle,
          selectedUnit.id,
          scenario,
        ).map(({ hexId }) => hexId)
      : []
  const attackUnitIds =
    gameState.battle && selectedUnit
      ? getAttackTargets(gameState.battle, selectedUnit.id, scenario)
      : []
  const attackHexIds = attackUnitIds
    .map((unitId) => activeUnits.find(({ id }) => id === unitId))
    .filter((unit): unit is NonNullable<typeof unit> => Boolean(unit))
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
          <p className="eyebrow">FIELD STUDY&nbsp; / &nbsp;SCENARIO</p>
          <h1>{scenario.title}</h1>
          <p className="scenario-subtitle">{scenario.description}</p>
        </div>
        <div className="header-actions">
          <label className="scenario-picker">
            <span>Scenario</span>
            <select
              aria-label="Choose scenario"
              disabled={Boolean(gameState.battle)}
              onChange={(event) =>
                dispatch({
                  type: 'select-scenario',
                  scenarioId: event.currentTarget.value,
                })
              }
              value={scenario.id}
            >
              {scenarios.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
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
              scenario={scenario}
              units={activeUnits}
              selectedHexId={gameState.selectedHexId}
              selectedUnitId={gameState.selectedUnitId}
              deploymentMode={gameState.mode === 'deployment'}
              battleMode={gameState.mode === 'battle'}
              battleActionMode={gameState.battleActionMode}
              movementHexIds={movementHexIds}
              attackHexIds={attackHexIds}
              eligibleHexIds={eligibleHexIds}
              deploymentZoneOwnerByHex={deploymentZoneOwnerByHex}
              occupiedHexIds={occupiedHexIds}
              deploymentTargetHexId={gameState.deploymentTargetHexId}
              onSelectHex={(hexId) => {
                if (
                  gameState.battle &&
                  gameState.battleActionMode === 'move' &&
                  selectedUnit
                ) {
                  dispatch({
                    type: 'move-unit',
                    unitId: selectedUnit.id,
                    hexId,
                  })
                } else {
                  dispatch({ type: 'select-hex', hexId })
                }
              }}
              onSelectUnit={(unitId) => {
                const clicked = activeUnits.find(({ id }) => id === unitId)
                if (
                  gameState.battle &&
                  gameState.battleActionMode === 'attack' &&
                  selectedUnit &&
                  clicked &&
                  clicked.owner !== selectedUnit.owner
                ) {
                  dispatch({
                    type: 'attack-unit',
                    attackerId: selectedUnit.id,
                    targetId: clicked.id,
                  })
                } else {
                  dispatch({ type: 'select-unit', unitId })
                }
              }}
            />
            <div className="scene-caption">
              <span>
                {gameState.mode === 'deployment'
                  ? 'DEPLOYMENT SETUP'
                  : gameState.mode === 'battle'
                    ? `BATTLE · ROUND ${gameState.battle?.round ?? 1}`
                    : 'AXIAL GRID'}
                &nbsp; / &nbsp;{scenario.hexes.length} HEXES
              </span>
              <span>DRAG TO ORBIT&nbsp; · &nbsp;SCROLL TO ZOOM</span>
            </div>
          </div>
          <TerrainLegend scenario={scenario} />
        </div>

        <aside className="sidebar" aria-label="Battlefield information">
          <SelectedInfoPanel
            unit={selectedUnit}
            definition={selectedDefinition}
            hex={selectedHex}
            ownerColor={
              scenario.playerDefinitions.find(
                ({ id }) => id === selectedUnit?.owner,
              )?.color
            }
            combatApRemaining={
              gameState.battle?.units.find(
                ({ id }) => id === selectedUnit?.id,
              )?.combatApRemaining
            }
          />
          {gameState.mode === 'battle' ? (
            <BattlePanel
              scenario={scenario}
              units={gameState.battle?.units ?? gameState.units}
              battle={gameState.battle}
              selectedUnitId={gameState.selectedUnitId}
              actionMode={gameState.battleActionMode}
              message={gameState.battleMessage}
              dispatch={dispatch}
            />
          ) : (
            <>
              <ForceSetupPanel
                scenario={scenario}
                state={gameState}
                dispatch={dispatch}
              />
              <BattlePanel
                scenario={scenario}
                units={gameState.units}
                battle={null}
                selectedUnitId={gameState.selectedUnitId}
                actionMode={gameState.battleActionMode}
                message={gameState.battleMessage}
                dispatch={dispatch}
              />
            </>
          )}
          <p className="temporary-note">
            TEMPORARY SCENARIO DATA
            <span>Unit values are visual placeholders, not game rules.</span>
          </p>
        </aside>
      </section>

      <footer className="footer">
        <span>HEXAGON GAME</span>
        <span>COMBAT MILESTONE&nbsp; / &nbsp;2026</span>
      </footer>
    </main>
  )
}

export default App

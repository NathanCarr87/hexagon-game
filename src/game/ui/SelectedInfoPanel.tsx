import type {
  BattlefieldHex,
  ScenarioObjective,
  ScenarioPlayer,
  ScenarioUnit,
  UnitDefinition,
} from '../domain/types'

interface SelectedInfoPanelProps {
  readonly unit: ScenarioUnit | undefined
  readonly definition: UnitDefinition | undefined
  readonly hex: BattlefieldHex | undefined
  readonly ownerColor: string | undefined
  readonly combatApRemaining?: number
  readonly maxCombatAp?: number
  readonly attackRange?: number
  readonly objective: ScenarioObjective | undefined
  readonly objectiveController: ScenarioPlayer | undefined
  readonly objectiveScores: Readonly<Record<string, number>>
  readonly objectiveScoreToWin: number | undefined
  readonly battleStarted: boolean
  readonly playerNames: readonly ScenarioPlayer[]
}

export function SelectedInfoPanel({
  unit,
  definition,
  hex,
  ownerColor,
  combatApRemaining,
  maxCombatAp,
  attackRange,
  objective,
  objectiveController,
  objectiveScores,
  objectiveScoreToWin,
  battleStarted,
  playerNames,
}: SelectedInfoPanelProps) {
  return (
    <section
      className="panel selected-panel"
      aria-labelledby="selection-title"
    >
      <div className="panel-heading">
        <h2 id="selection-title">
          {unit
            ? 'Selected unit'
            : objective
              ? 'Selected objective'
              : hex
                ? 'Selected hex'
                : 'Selection'}
        </h2>
        <span className="selection-mark" aria-hidden="true" />
      </div>
      {objective && (
        <div className="objective-inspection" aria-label="Objective details">
          <span className="objective-inspection-type">BATTLE OBJECTIVE</span>
          <p className="objective-inspection-name">{objective.name}</p>
          <p className="objective-inspection-status">
            {objectiveController
              ? `Occupied by ${objectiveController.name}`
              : 'Unoccupied'}
          </p>
          {battleStarted ? (
            <>
              <div className="objective-inspection-scores">
                {playerNames.map((player) => (
                  <span key={player.id}>
                    {player.name} <strong>{objectiveScores[player.id] ?? 0}</strong>
                  </span>
                ))}
              </div>
              <p className="objective-inspection-rule">
                Scores 1 point at the end of a turn when occupied by the active player.
                {objectiveScoreToWin !== undefined &&
                  ` First to ${objectiveScoreToWin} objective points wins.`}
              </p>
            </>
          ) : (
            <p className="objective-inspection-rule">
              Scores 1 point at the end of a turn when occupied by the active player.
              Scoring begins when battle starts.
            </p>
          )}
        </div>
      )}
      {unit ? (
        <>
          <p className="unit-name">{unit.name}</p>
          <p className="unit-type">
            {definition?.displayName ?? 'Unknown definition'}
          </p>
          {definition && (
            <>
              <p className="deployment-rules">{definition.role}</p>
              <p className="deployment-rules">{definition.description}</p>
            </>
          )}
          <div className="unit-owner">
            <span
              className="owner-swatch"
              style={{ backgroundColor: ownerColor ?? '#ded9bf' }}
            />
            {unit.owner}
            <span className="coordinate">
              q{unit.q} / r{unit.r}
            </span>
          </div>
          <div className="unit-vitals">
            <div className="vital">
              <span>HP</span>
              <strong>
                {unit.currentHp}
                <small> / {definition?.combat.maxHealth ?? '?'}</small>
              </strong>
            </div>
            <div className="vital">
              <span>{combatApRemaining === undefined ? 'AP' : 'COMBAT AP'}</span>
              <strong>
                {combatApRemaining === undefined
                  ? unit.actionPointsRemaining
                  : `${combatApRemaining}${maxCombatAp === undefined ? '' : ` / ${maxCombatAp}`}`}
              </strong>
            </div>
          </div>
          <div className="stats-list" aria-label="Unit combat attributes">
            {definition &&
              (
                [
                  ['Power', definition.combat.power],
                  ['Guard', definition.combat.guard],
                  ['Mobility', definition.combat.mobility],
                ] as const
              ).map(([name, value]) => (
                <div className="stat-row" key={name}>
                  <span>{name}</span>
                  <span className="stat-track">
                    <span style={{ width: `${Math.min(value * 18, 100)}%` }} />
                  </span>
                  <strong>{value}</strong>
                </div>
              ))}
            {attackRange !== undefined && (
              <div className="stat-row">
                <span>Attack range</span>
                <strong>{attackRange}</strong>
              </div>
            )}
          </div>
          {hex && (
            <div className="hex-details unit-terrain">
              <span>Current terrain</span>
              <strong>{hex.terrain}</strong>
              <span>Elevation</span>
              <strong>{hex.elevation}</strong>
            </div>
          )}
        </>
      ) : hex ? (
        <>
          <p className="unit-name hex-selection">
            {objective ? 'Objective hex' : 'Unoccupied hex'}
          </p>
          <p className="unit-type">{hex.terrain}</p>
          <div className="unit-owner">
            <span className="coordinate">
              q{hex.q} / r{hex.r}
            </span>
          </div>
          <div className="hex-details">
            <span>Region</span>
            <strong>{hex.regionId.replaceAll('-', ' ')}</strong>
            <span>Visual elevation</span>
            <strong>{hex.elevation}</strong>
          </div>
        </>
      ) : (
        <p className="empty-selection">Select a unit or hex to inspect it.</p>
      )}
    </section>
  )
}

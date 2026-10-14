import type { BattlefieldHex, ScenarioUnit } from '../domain/types'

interface SelectedInfoPanelProps {
  readonly unit: ScenarioUnit | undefined
  readonly hex: BattlefieldHex | undefined
  readonly ownerColor: string | undefined
  readonly combatApRemaining?: number
}

export function SelectedInfoPanel({
  unit,
  hex,
  ownerColor,
  combatApRemaining,
}: SelectedInfoPanelProps) {
  return (
    <section className="panel selected-panel" aria-labelledby="selection-title">
      <div className="panel-heading">
        <h2 id="selection-title">Selected unit</h2>
        <span className="selection-mark" aria-hidden="true" />
      </div>
      {unit ? (
        <>
          <p className="unit-name">{unit.name}</p>
          <p className="unit-type">{unit.unitType.replaceAll('-', ' ')}</p>
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
                <small> / {unit.maxHp}</small>
              </strong>
            </div>
            <div className="vital">
              <span>{combatApRemaining === undefined ? 'AP' : 'COMBAT AP'}</span>
              <strong>{combatApRemaining ?? unit.actionPointsRemaining}</strong>
            </div>
          </div>
          <div className="stats-list" aria-label="Temporary unit stats">
            {Object.entries(unit.stats).map(([name, value]) => (
              <div className="stat-row" key={name}>
                <span>{name}</span>
                <span className="stat-track">
                  <span style={{ width: `${Math.min(value * 18, 100)}%` }} />
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </>
      ) : hex ? (
        <>
          <p className="unit-name hex-selection">Unoccupied hex</p>
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

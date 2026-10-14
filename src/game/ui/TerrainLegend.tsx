import type { ScenarioPlayer, TerrainType } from '../domain/types'
import { TERRAIN_APPEARANCE } from '../scene/terrainAppearance'

const terrainTypes: readonly TerrainType[] = [
  'grassland',
  'hills',
  'forest',
  'mountains',
  'water',
]

export function TerrainLegend({
  players,
}: {
  readonly players: readonly ScenarioPlayer[]
}) {
  return (
    <div className="legend-bar" aria-label="Terrain and ownership legend">
      <div className="legend-group">
        <span className="legend-heading">TERRAIN</span>
        {terrainTypes.map((terrain) => (
          <span className="legend-item" key={terrain}>
            <span
              className="legend-swatch"
              style={{ backgroundColor: TERRAIN_APPEARANCE[terrain].color }}
            />
            {terrain}
          </span>
        ))}
      </div>
      <div className="legend-group ownership-legend">
        <span className="legend-heading">FORCES</span>
        {players.map(({ id, name, color }) => (
          <span className="legend-item" key={id}>
            <span
              className="legend-swatch owner-swatch"
              style={{ backgroundColor: color }}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

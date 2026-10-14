import type { TerrainType } from '../domain/types'
import { OWNER_COLORS, TERRAIN_APPEARANCE } from '../scene/terrainAppearance'

const terrainTypes: readonly TerrainType[] = [
  'grassland',
  'hills',
  'forest',
  'mountains',
  'water',
]

export function TerrainLegend() {
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
        {Object.entries(OWNER_COLORS).map(([owner, color]) => (
          <span className="legend-item" key={owner}>
            <span
              className="legend-swatch owner-swatch"
              style={{ backgroundColor: color }}
            />
            {owner}
          </span>
        ))}
      </div>
    </div>
  )
}

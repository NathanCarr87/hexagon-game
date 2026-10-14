import type { TerrainType } from '../domain/types'

export interface TerrainAppearance {
  readonly color: string
  readonly sideColor: string
  readonly roughness: number
  readonly surfaceHeight: number
}

export const TERRAIN_APPEARANCE: Readonly<
  Record<TerrainType, TerrainAppearance>
> = {
  grassland: {
    color: '#91a966',
    sideColor: '#536746',
    roughness: 0.96,
    surfaceHeight: 0.16,
  },
  hills: {
    color: '#a7a466',
    sideColor: '#686744',
    roughness: 1,
    surfaceHeight: 0.5,
  },
  forest: {
    color: '#67835a',
    sideColor: '#435944',
    roughness: 1,
    surfaceHeight: 0.16,
  },
  mountains: {
    color: '#9b927c',
    sideColor: '#615d52',
    roughness: 0.94,
    surfaceHeight: 0.94,
  },
  water: {
    color: '#557f88',
    sideColor: '#385b65',
    roughness: 0.38,
    surfaceHeight: 0.08,
  },
}

export const OWNER_COLORS: Readonly<Record<string, string>> = {
  blueward: '#76b8e8',
  redoubt: '#e28a72',
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type {
  BattlefieldHex,
  BattlefieldScenario,
  ScenarioUnit,
  UnitDefinition,
} from '../domain/types'
import { axialToWorld } from '../hex/coordinates'
import { TERRAIN_APPEARANCE } from './terrainAppearance'
import { getUnitDefinition } from '../domain/unitCatalog'

interface BattlefieldProps {
  readonly scenario: BattlefieldScenario
  readonly units: readonly ScenarioUnit[]
  readonly selectedHexId: string | null
  readonly selectedUnitId: string | null
  readonly deploymentMode: boolean
  readonly battleMode: boolean
  readonly battleActionMode: 'select' | 'move' | 'attack'
  readonly movementHexIds: readonly string[]
  readonly attackHexIds: readonly string[]
  readonly eligibleHexIds: readonly string[]
  readonly deploymentZoneOwnerByHex: Readonly<Record<string, string>>
  readonly occupiedHexIds: readonly string[]
  readonly deploymentTargetHexId: string | null
  readonly onSelectHex: (hexId: string) => void
  readonly onSelectUnit: (unitId: string) => void
}

const HEX_RADIUS = 1
const HEX_BASE = -0.2

function elevationAt(hex: BattlefieldHex): number {
  return TERRAIN_APPEARANCE[hex.terrain].surfaceHeight
}

function HexTile({
  hex,
  selected,
  deploymentStatus,
  deploymentZoneColor,
  isTarget,
  onSelect,
}: {
  readonly hex: BattlefieldHex
  readonly selected: boolean
  readonly deploymentStatus:
    | 'eligible'
    | 'ineligible'
    | 'occupied'
    | 'move'
    | 'attack'
    | null
  readonly deploymentZoneColor: string | null
  readonly isTarget: boolean
  readonly onSelect: () => void
}) {
  const appearance = TERRAIN_APPEARANCE[hex.terrain]
  const position = axialToWorld(hex)
  const top = appearance.surfaceHeight
  const height = top - HEX_BASE
  return (
    <group
      position={[position.x, 0, position.z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onPointerEnter={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerLeave={() => {
        document.body.style.cursor = ''
      }}
    >
      <mesh
        position={[0, HEX_BASE + height / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry args={[HEX_RADIUS, HEX_RADIUS, height, 6]} />
        <meshStandardMaterial
          color={selected ? '#c8df8a' : appearance.color}
          emissive={selected ? '#5a7232' : '#000000'}
          emissiveIntensity={selected ? 0.28 : 0}
          roughness={appearance.roughness}
          side={2}
        />
        <Edges
          color={selected ? '#e5f4b5' : '#344236'}
          scale={1.001}
          threshold={15}
        />
      </mesh>
      {deploymentStatus && (
        <mesh position={[0, top + 0.012, 0]}>
          <cylinderGeometry args={[0.91, 0.91, 0.025, 6]} />
          <meshBasicMaterial
            color={
              deploymentStatus === 'eligible'
                ? deploymentZoneColor ?? '#b8e37f'
                : deploymentStatus === 'occupied'
                  ? '#ee7864'
                  : deploymentStatus === 'move'
                    ? '#64d9c4'
                    : deploymentStatus === 'attack'
                      ? '#f08c73'
                      : deploymentZoneColor ?? '#b65b4f'
            }
            depthWrite={false}
            opacity={
              deploymentStatus === 'eligible'
                ? 0.4
                : deploymentStatus === 'occupied'
                  ? 0.48
                  : deploymentStatus === 'move' || deploymentStatus === 'attack'
                    ? 0.45
                    : deploymentZoneColor
                      ? 0.32
                      : 0.2
            }
            side={2}
            transparent
          />
        </mesh>
      )}
      {isTarget && (
        <mesh
          position={[0, top + 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.7, 0.78, 6]} />
          <meshBasicMaterial color="#f2d78e" side={2} />
        </mesh>
      )}
      {hex.terrain === 'hills' && <Hilltop height={top} />}
      {hex.terrain === 'forest' && <ForestCanopy height={top} seed={hex.q * 7 + hex.r * 11} />}
      {hex.terrain === 'mountains' && <MountainPeak height={top} />}
    </group>
  )
}

function Hilltop({ height }: { readonly height: number }) {
  return (
    <mesh position={[0, height + 0.04, 0]} scale={[0.76, 0.24, 0.76]} castShadow>
      <sphereGeometry args={[1, 10, 7]} />
      <meshStandardMaterial color="#b9ad70" roughness={1} />
    </mesh>
  )
}

function ForestCanopy({
  height,
  seed,
}: {
  readonly height: number
  readonly seed: number
}) {
  const offset = (seed % 3) * 0.12
  return (
    <group position={[0, height, 0]}>
      <mesh position={[-0.27, 0.24, 0.12]} castShadow>
        <coneGeometry args={[0.27, 0.62, 6]} />
        <meshStandardMaterial color="#385b45" roughness={1} />
      </mesh>
      <mesh position={[0.22 + offset, 0.2, -0.18]} castShadow>
        <coneGeometry args={[0.23, 0.52, 6]} />
        <meshStandardMaterial color="#4c704e" roughness={1} />
      </mesh>
      <mesh position={[0, 0.18, 0.31]} castShadow>
        <coneGeometry args={[0.18, 0.45, 6]} />
        <meshStandardMaterial color="#739064" roughness={1} />
      </mesh>
    </group>
  )
}

function MountainPeak({ height }: { readonly height: number }) {
  return (
    <group position={[0, height, 0]}>
      <mesh position={[-0.08, 0.25, 0]} rotation={[0.04, 0.2, -0.08]} castShadow>
        <coneGeometry args={[0.58, 0.62, 6]} />
        <meshStandardMaterial color="#777568" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.32, 0.12, 0.25]} rotation={[0, 0.1, 0.1]} castShadow>
        <coneGeometry args={[0.3, 0.34, 6]} />
        <meshStandardMaterial color="#8b8572" roughness={1} flatShading />
      </mesh>
    </group>
  )
}

function ObjectiveMarker({
  name,
  position,
  height,
  ownerColor,
  onSelect,
}: {
  readonly name: string
  readonly position: readonly [number, number, number]
  readonly height: number
  readonly ownerColor: string | null
  readonly onSelect: () => void
}) {
  return (
    <group
      position={[position[0], height + 0.025, position[2]]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.27, 0.32, 24]} />
        <meshBasicMaterial color={ownerColor ?? '#ead28a'} side={2} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 6]} />
        <meshStandardMaterial color={ownerColor ?? '#ead28a'} />
      </mesh>
      <mesh position={[0.09, 0.25, 0]}>
        <coneGeometry args={[0.1, 0.12, 4]} />
        <meshStandardMaterial color={ownerColor ?? '#ead28a'} />
      </mesh>
      <group name={name} />
    </group>
  )
}

function UnitFigure({
  unit,
  definition,
  selected,
  hex,
  ownerColor,
  preview = false,
  onSelect,
}: {
  readonly unit: ScenarioUnit
  readonly definition: UnitDefinition
  readonly selected: boolean
  readonly hex: BattlefieldHex
  readonly ownerColor: string
  readonly preview?: boolean
  readonly onSelect: () => void
}) {
  const position = axialToWorld(unit)
  const color = ownerColor
  const y = elevationAt(hex) + 0.07
  const scout = definition.presentation.archetype === 'scout'
  return (
    <group
      position={[position.x, y, position.z]}
      onClick={
        preview
          ? undefined
          : (event) => {
              event.stopPropagation()
              onSelect()
            }
      }
      onPointerEnter={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerLeave={() => {
        document.body.style.cursor = ''
      }}
    >
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.31, 0.35, 0.12, 10]} />
        <meshStandardMaterial
          color={selected ? '#f2e3a4' : color}
          emissive={selected ? '#665523' : '#000000'}
          emissiveIntensity={selected ? 0.3 : 0}
          transparent={preview}
          opacity={preview ? 0.48 : 1}
          roughness={0.68}
        />
      </mesh>
      <mesh position={[0, scout ? 0.32 : 0.37, 0]} castShadow>
        {scout ? (
          <coneGeometry args={[0.2, 0.5, 7]} />
        ) : (
          <capsuleGeometry args={[0.16, 0.32, 3, 6]} />
        )}
        <meshStandardMaterial
          color={color}
          transparent={preview}
          opacity={preview ? 0.48 : 1}
          roughness={0.75}
        />
      </mesh>
      <mesh position={[0, scout ? 0.6 : 0.67, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial
          color="#d2c6a6"
          transparent={preview}
          opacity={preview ? 0.48 : 1}
          roughness={0.8}
        />
      </mesh>
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.47, 28]} />
          <meshBasicMaterial color="#fff0af" side={2} />
        </mesh>
      )}
    </group>
  )
}

function CameraController({ resetVersion }: { readonly resetVersion: number }) {
  const controls = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    const current = controls.current
    if (!current) return
    const constrainTarget = () => {
      if (current.target.length() > 5) {
        current.target.setLength(5)
        current.update()
      }
    }
    current.target.set(0, 0, 0)
    current.object.position.set(9, 10, 12)
    current.addEventListener('change', constrainTarget)
    current.update()
    return () => current.removeEventListener('change', constrainTarget)
  }, [resetVersion])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan
      minDistance={7}
      maxDistance={22}
      minPolarAngle={0.18}
      maxPolarAngle={1.42}
      target={[0, 0, 0]}
    />
  )
}

function BattlefieldScene({
  scenario,
  units,
  selectedHexId,
  selectedUnitId,
  deploymentMode,
  battleMode,
  battleActionMode,
  movementHexIds,
  attackHexIds,
  eligibleHexIds,
  deploymentZoneOwnerByHex,
  occupiedHexIds,
  deploymentTargetHexId,
  onSelectHex,
  onSelectUnit,
  resetVersion,
}: BattlefieldProps & { readonly resetVersion: number }) {
  const hexById = useMemo(
    () => new Map(scenario.hexes.map((hex) => [hex.id, hex])),
    [scenario.hexes],
  )

  return (
    <>
      <color attach="background" args={['#19221e']} />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={['#e1e6d5', '#485447', 1.15]} />
      <directionalLight
        position={[-5, 11, 7]}
        intensity={2.25}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, HEX_BASE - 0.025, 0]}
        receiveShadow
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#303b32" roughness={1} />
      </mesh>
      {scenario.hexes.map((hex) => (
        <HexTile
          key={hex.id}
          hex={hex}
          selected={selectedHexId === hex.id}
          deploymentStatus={
            deploymentMode
              ? occupiedHexIds.includes(hex.id)
                ? 'occupied'
                : eligibleHexIds.includes(hex.id)
                  ? 'eligible'
                  : 'ineligible'
              : battleMode && battleActionMode === 'move' && movementHexIds.includes(hex.id)
                ? 'move'
                : battleMode && battleActionMode === 'attack' && attackHexIds.includes(hex.id)
                  ? 'attack'
                  : null
          }
          deploymentZoneColor={
            deploymentMode
              ? scenario.playerDefinitions.find(
                  ({ id }) => id === deploymentZoneOwnerByHex[hex.id],
                )?.color ?? null
              : null
          }
          isTarget={deploymentTargetHexId === hex.id}
          onSelect={() => onSelectHex(hex.id)}
        />
      ))}
      {scenario.objectives.map((objective) => {
        const hex = hexById.get(`hex:${objective.q},${objective.r}`)
        if (!hex) return null
        const position = axialToWorld(objective)
        return (
          <ObjectiveMarker
            key={objective.id}
            name={objective.name}
            position={[position.x, 0, position.z]}
            height={elevationAt(hex)}
            ownerColor={
              scenario.playerDefinitions.find(
                ({ id }) =>
                  id ===
                  units.find(
                    (unit) => unit.q === objective.q && unit.r === objective.r,
                  )?.owner,
              )?.color ?? null
            }
            onSelect={() => onSelectHex(hex.id)}
          />
        )
      })}
      {units.map((unit) => {
        const unitHex = hexById.get(`hex:${unit.q},${unit.r}`)
        const definition = getUnitDefinition(
          scenario.unitDefinitions,
          unit.definitionId,
        )
        if (!unitHex || !definition) return null
        return (
          <UnitFigure
            key={unit.id}
            unit={unit}
            definition={definition}
            hex={unitHex}
            ownerColor={
              scenario.playerDefinitions.find(
                ({ id }) => id === unit.owner,
              )?.color ?? '#ded9bf'
            }
            selected={unit.id === selectedUnitId}
            onSelect={() =>
              deploymentMode
                ? onSelectHex(unitHex.id)
                : battleMode &&
                    battleActionMode === 'move' &&
                    selectedUnitId
                  ? onSelectHex(unitHex.id)
                  : onSelectUnit(unit.id)
            }
          />
        )
      })}
      {deploymentTargetHexId && selectedUnitId && (() => {
        const unit = units.find(({ id }) => id === selectedUnitId)
        const targetHex = hexById.get(deploymentTargetHexId)
        const definition = unit
          ? getUnitDefinition(scenario.unitDefinitions, unit.definitionId)
          : undefined
        if (!unit || !definition || !targetHex) return null
        const previewUnit = { ...unit, q: targetHex.q, r: targetHex.r }
        return (
          <UnitFigure
            key={`preview:${unit.id}`}
            unit={previewUnit}
            definition={definition}
            hex={targetHex}
            ownerColor={
              scenario.playerDefinitions.find(
                ({ id }) => id === unit.owner,
              )?.color ?? '#ded9bf'
            }
            selected={false}
            preview
            onSelect={() => undefined}
          />
        )
      })()}
      <CameraController resetVersion={resetVersion} />
    </>
  )
}

export function Battlefield(props: BattlefieldProps) {
  const [resetVersion, setResetVersion] = useState(0)
  const resetCamera = () => setResetVersion((version) => version + 1)

  return (
    <div className="battlefield-canvas">
      <Canvas
        camera={{ position: [9, 10, 12], fov: 38, near: 0.1, far: 100 }}
        dpr={[1, 1.5]}
        shadows
        onCreated={({ gl }) => {
          gl.setClearColor('#19221e')
        }}
      >
        <BattlefieldScene {...props} resetVersion={resetVersion} />
      </Canvas>
      <button
        className="camera-reset"
        type="button"
        onClick={resetCamera}
        aria-label="Reset camera"
      >
        <span aria-hidden="true">↻</span>
        Reset camera
      </button>
    </div>
  )
}

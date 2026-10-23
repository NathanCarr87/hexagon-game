import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Edges, Html, OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3 } from 'three'
import type { Camera, Object3D } from 'three'
import type {
  BattlefieldHex,
  BattlefieldScenario,
  ScenarioUnit,
  UnitDefinition,
} from '../domain/types'
import { axialToWorld, HEX_SIZE } from '../hex/coordinates'
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
  readonly battlePhase: 'active' | 'ended' | null
  readonly activePlayerId: string | null
  readonly combatApRemaining: number | undefined
  readonly moveDisabledReason: string | null
  readonly attackDisabledReason: string | null
  readonly movementHexIds: readonly string[]
  readonly movementRouteHexIds: readonly string[]
  readonly attackHexIds: readonly string[]
  readonly eligibleHexIds: readonly string[]
  readonly deploymentZoneOwnerByHex: Readonly<Record<string, string>>
  readonly occupiedHexIds: readonly string[]
  readonly deploymentTargetHexId: string | null
  readonly onSelectHex: (hexId: string) => void
  readonly onSelectUnit: (unitId: string) => void
  readonly onHoverHex: (hexId: string | null) => void
  readonly onSetBattleAction: (
    mode: 'select' | 'move' | 'attack',
  ) => void
}

const HEX_BASE = -0.2
const ACTION_MENU_WIDTH = 218
const ACTION_MENU_HEIGHT = 154
const ACTION_MENU_MARGIN = 8

function calculateActionMenuPosition(
  object: Object3D,
  camera: Camera,
  size: { readonly width: number; readonly height: number },
): number[] {
  const projected = object.getWorldPosition(new Vector3()).project(camera)
  if (projected.z > 1) {
    return [-ACTION_MENU_WIDTH, -ACTION_MENU_HEIGHT]
  }
  const x = ((projected.x + 1) * size.width) / 2
  const y = ((1 - projected.y) * size.height) / 2
  return [
    Math.min(
      Math.max(x, ACTION_MENU_MARGIN),
      Math.max(ACTION_MENU_MARGIN, size.width - ACTION_MENU_WIDTH - ACTION_MENU_MARGIN),
    ),
    Math.min(
      Math.max(y, ACTION_MENU_MARGIN),
      Math.max(ACTION_MENU_MARGIN, size.height - ACTION_MENU_HEIGHT - ACTION_MENU_MARGIN),
    ),
  ]
}

function elevationAt(hex: BattlefieldHex): number {
  return TERRAIN_APPEARANCE[hex.terrain].surfaceHeight
}

function HexTile({
  hex,
  selected,
  deploymentStatus,
  deploymentZoneColor,
  isTarget,
  isRouteHex,
  onSelect,
  onHover,
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
  readonly isRouteHex: boolean
  readonly onSelect: () => void
  readonly onHover: (hovered: boolean) => void
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
        onHover(true)
      }}
      onPointerLeave={() => {
        document.body.style.cursor = ''
        onHover(false)
      }}
    >
      <mesh
        position={[0, HEX_BASE + height / 2, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry args={[HEX_SIZE, HEX_SIZE, height, 6]} />
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
      {isRouteHex && (
        <mesh
          position={[0, top + 0.035, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.45, 0.53, 6, 1, Math.PI / 2]} />
          <meshBasicMaterial color="#d5ef91" side={2} />
        </mesh>
      )}
      {isTarget && (
        <mesh
          position={[0, top + 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.7, 0.78, 6, 1, Math.PI / 2]} />
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
  selected,
  onSelect,
}: {
  readonly name: string
  readonly position: readonly [number, number, number]
  readonly height: number
  readonly ownerColor: string | null
  readonly selected: boolean
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
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.57, 0.57, 0.09, 12]} />
        <meshStandardMaterial color="#252c27" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.51, 12]} />
        <meshBasicMaterial color={ownerColor ?? '#f0c85c'} side={2} />
      </mesh>
      <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <octahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial
          color="#f3d477"
          emissive="#805d18"
          emissiveIntensity={0.22}
          roughness={0.48}
        />
      </mesh>
      {selected && (
        <mesh position={[0, 0.105, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.57, 0.62, 12]} />
          <meshBasicMaterial color="#f4f0dc" side={2} />
        </mesh>
      )}
      {selected && (
        <Html
          center
          distanceFactor={10}
          position={[0, 0.82, 0]}
          style={{ pointerEvents: 'none' }}
          zIndexRange={[5, 0]}
        >
          <div className="objective-map-label">
            <strong>{name}</strong>
            <span>OBJECTIVE</span>
          </div>
        </Html>
      )}
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

function ContextualUnitMenu({
  unit,
  position,
  battlePhase,
  activePlayerId,
  combatApRemaining,
  actionMode,
  moveDisabledReason,
  attackDisabledReason,
  onSetBattleAction,
}: {
  readonly unit: ScenarioUnit
  readonly position: readonly [number, number, number]
  readonly battlePhase: 'active' | 'ended'
  readonly activePlayerId: string
  readonly combatApRemaining: number | undefined
  readonly actionMode: 'select' | 'move' | 'attack'
  readonly moveDisabledReason: string
  readonly attackDisabledReason: string
  readonly onSetBattleAction: (
    mode: 'select' | 'move' | 'attack',
  ) => void
}) {
  const isActivePlayerUnit = unit.owner === activePlayerId
  return (
    <Html
      calculatePosition={calculateActionMenuPosition}
      center={false}
      pointerEvents="auto"
      position={position}
      zIndexRange={[30, 0]}
    >
      <div
        className="context-action-menu"
        role="group"
        aria-label={`Actions for ${unit.name}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="context-action-heading">
          <strong>{unit.name}</strong>
          <span>
            {combatApRemaining === undefined
              ? unit.owner
              : `${combatApRemaining} AP`}
          </span>
        </div>
        {battlePhase === 'active' && isActivePlayerUnit ? (
          <>
            <div className="context-action-buttons">
              <button
                type="button"
                className={`context-action-button${actionMode === 'move' ? ' active' : ''}`}
                disabled={Boolean(moveDisabledReason)}
                title={moveDisabledReason || 'Move to a highlighted hex'}
                aria-label={
                  moveDisabledReason
                    ? `Move unavailable: ${moveDisabledReason}`
                    : 'Move'
                }
                onClick={() => onSetBattleAction('move')}
              >
                <span aria-hidden="true">↗</span> Move
              </button>
              <button
                type="button"
                className={`context-action-button${actionMode === 'attack' ? ' active' : ''}`}
                disabled={Boolean(attackDisabledReason)}
                title={attackDisabledReason || 'Choose a highlighted enemy target'}
                aria-label={
                  attackDisabledReason
                    ? `Attack unavailable: ${attackDisabledReason}`
                    : 'Attack'
                }
                onClick={() => onSetBattleAction('attack')}
              >
                <span aria-hidden="true">⌖</span> Attack
              </button>
              {actionMode !== 'select' && (
                <button
                  type="button"
                  className="context-action-cancel"
                  onClick={() => onSetBattleAction('select')}
                >
                  Cancel
                </button>
              )}
            </div>
            {actionMode !== 'select' && (
              <small className="context-action-hint">
                {actionMode === 'move'
                  ? 'Choose a highlighted destination.'
                  : 'Choose a highlighted enemy.'}
              </small>
            )}
            {(moveDisabledReason || attackDisabledReason) && (
              <small className="context-action-reason">
                {moveDisabledReason && attackDisabledReason
                  ? moveDisabledReason === attackDisabledReason
                    ? moveDisabledReason
                    : `${moveDisabledReason} ${attackDisabledReason}`
                  : moveDisabledReason ?? attackDisabledReason}
              </small>
            )}
          </>
        ) : (
          <small className="context-action-reason">
            {battlePhase === 'ended'
              ? 'Battle complete.'
              : `Only ${activePlayerId} units can act.`}
          </small>
        )}
      </div>
    </Html>
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
  battlePhase,
  activePlayerId,
  combatApRemaining,
  moveDisabledReason,
  attackDisabledReason,
  movementHexIds,
  movementRouteHexIds,
  attackHexIds,
  eligibleHexIds,
  deploymentZoneOwnerByHex,
  occupiedHexIds,
  deploymentTargetHexId,
  onSelectHex,
  onSelectUnit,
  onHoverHex,
  onSetBattleAction,
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
          isRouteHex={movementRouteHexIds.includes(hex.id)}
          onSelect={() => onSelectHex(hex.id)}
          onHover={(hovered) => onHoverHex(hovered ? hex.id : null)}
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
            selected={selectedHexId === hex.id}
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
                : onSelectUnit(unit.id)
            }
          />
        )
      })}
      {battleMode &&
        battlePhase &&
        activePlayerId &&
        selectedUnitId &&
        (() => {
          const selectedUnit = units.find(({ id }) => id === selectedUnitId)
          if (!selectedUnit) return null
          const position = axialToWorld(selectedUnit)
          const hex = hexById.get(`hex:${selectedUnit.q},${selectedUnit.r}`)
          if (!hex) return null
          return (
            <ContextualUnitMenu
              unit={selectedUnit}
              position={[
                position.x + 0.72,
                elevationAt(hex) + 1.2,
                position.z,
              ]}
              battlePhase={battlePhase}
              activePlayerId={activePlayerId}
              combatApRemaining={combatApRemaining}
              actionMode={battleActionMode}
              moveDisabledReason={moveDisabledReason ?? ''}
              attackDisabledReason={attackDisabledReason ?? ''}
              onSetBattleAction={onSetBattleAction}
            />
          )
        })()}
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

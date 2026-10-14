# Hexagon Game

Hexagon Game is a browser-based 3D tactical wargame foundation built with React,
TypeScript, Vite, Three.js, and React Three Fiber.

## Local development

```sh
npm install
npm run dev
```

Run the unit tests with `npm test`, and create a production build with
`npm run build`.

## Foundation architecture

- `src/game/hex/` contains pure axial-coordinate and pointy-top world geometry
  utilities.
- `src/game/domain/` defines scenario, terrain, region, objective, and unit data
  contracts without depending on React or Three.js.
- `src/game/scenarios/` provides the temporary initial battlefield data.
- `src/game/state/` owns immutable selection, provisional deployment, and
  scenario-reset behavior.
- `src/game/scene/` maps scenario data to terrain, units, lighting, and camera.
- `src/game/ui/` contains React inspection/setup panels and the
  terrain/ownership legend.

Terrain appearance and surface height are visual-only. They do not define
movement cost, line of sight, or any other game rule.

## Specification status

The repository did not contain an existing game specification, unit stat or
pricing formula, prefab templates, action economy, combat or movement rules,
victory conditions, or map specifications when this foundation was created.
The `The Narrows` battlefield, its regions, objectives, player ownership,
unit identities, HP, AP, and displayed stats are temporary scenario placeholders,
not authoritative rules or prices. Replace or connect them when the established
specification is available. No gameplay resolution is implemented.

The current setup panel intentionally disables force construction: no stat
names/costs, pricing formula, unit constraints, prefab definitions, or army
point budget are established here. The deployment interface is a provisional
setup scaffold only. Its scenario-defined zones split the current map by axial
`q`, prohibit stacking, and allow repositioning the existing placeholder units;
these are clearly marked provisional and do not establish final game rules.
Terrain deployment restrictions and a turn/active-game state are not defined.

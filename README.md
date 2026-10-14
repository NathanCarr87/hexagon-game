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
- `src/game/state/` owns immutable setup, deployment, battle lifecycle,
  movement, combat, and victory behavior.
- `src/game/scene/` maps scenario data to terrain, units, lighting, and camera.
- `src/game/ui/` contains React inspection, setup, and battle panels plus the
  terrain/ownership legend.

Terrain appearance and surface height are visual-only. They do not define
movement cost, line of sight, or any other game rule.

## Rules status

Version 1 battle behavior is documented in
[docs/rules/combat-v1.md](./docs/rules/combat-v1.md). It covers turn order,
movement, combat, action points, objectives, and victory. The scenario's unit
HP, Power, Guard, and Mobility values remain temporary provisional inputs for
exercising those rules, not authoritative unit designs.

The current setup panel intentionally disables force construction: no stat
names/costs, pricing formula, unit constraints, prefab definitions, or army
point budget are established here. The deployment interface is a provisional
setup scaffold only. Its scenario-defined zones split the current map by axial
`q`, prohibit stacking, and allow repositioning the existing placeholder units;
these are clearly marked provisional and do not establish final game rules.

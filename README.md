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
- `src/game/scenarios/` provides the selectable scenario registry, deterministic
  scenario definitions, and rendering-independent scenario validation.
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

The scenario catalog and setup workflow are documented in
[docs/scenarios.md](./docs/scenarios.md). Players can select either The Narrows
or Open Ground, inspect and deploy its scenario roster, start a battle, return
to setup, or reset the selected scenario. Scenario validation runs before
battle start.

Force construction remains intentionally unavailable: this repository has no
authoritative stat costs, pricing formula, construction constraints, prefab
definitions, or army budget. Current rosters and deployment zones are
scenario-provided provisional test data, not constructed forces or templates.
Configured scenario budgets are rejected until they can be validated against
an authoritative pricing service.

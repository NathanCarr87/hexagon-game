# Milestone 8: Playtesting, Balance, and Rules Validation

## Scope and evidence

This report reflects the repository as inspected for this milestone. It
distinguishes existing rules/tests, reproducible simulation output, and
provisional design concerns. No canonical costs, constructed units, prefabs,
or production AI were present.

### Baseline

Before changes:

- `npm test -- --reporter=dot`: 8 test files passed; 67 tests passed.
- `npm run build`: TypeScript and Vite build passed. Vite reported that the
  generated Three.js chunks exceed 500 kB after minification.
- The worktree had no existing source changes.

After changes:

- `npm test -- --reporter=dot`: 9 test files passed; 72 tests passed.
- Final `npm test -- --reporter=dot`: 9 test files passed; 73 tests passed.
- `npm run build`: passed with the same large-chunk warning.

### Canonical sources

- Unit definitions and validation: `src/game/domain/unitCatalog.ts`.
- Combat, movement, action points, objectives, turn transitions, and victory:
  `src/game/state/battle.ts`.
- Deployment validation and UI actions: `src/game/state/deployment.ts`,
  `src/game/state/gameState.ts`, and the battle UI.
- Scenario registry and data: `src/game/scenarios/index.ts`,
  `initialScenario.ts`, `openGround.ts`, and `riverFord.ts`.
- Scenario/unit validation: `src/game/scenarios/validateScenario.ts` and
  `unitCatalog.ts`.
- Existing V1 rules: `docs/rules/combat-v1.md`.

## Rules audit

The domain/state code is independent of React and Three.js. The UI obtains
movement destinations, routes, and attack targets from the same battle
functions used when actions are committed. Attack previews use the same
calculation as attacks. Existing tests exercise invalid actions, AP usage,
movement/path reachability, line of sight, damage and destruction, victory
modes, scoring, round limits, and turn/AP progression.

The implemented rules remain provisional: movement costs are terrain data,
mountains and water are impassable, movement is cost-limited by Mobility, and
movement/attacks consume configured combat AP. Attacks are deterministic;
damage is `max(1, Power + elevationBonus - Guard)`. Objective points accrue at
turn end for each objective occupied by a living unit. Turn order intentionally
alternates the round starter with the whole-player-turn boundary behavior
documented in `docs/rules/combat-v1.md`.

Destroyed units are removed from the battle array, so cannot move, score,
block line of sight, or be targeted. Failed movement and attacks return the
unchanged battle state. Ended battles reject further actions. Existing tests
cover restart/turn behavior and the scenario validator checks every registered
scenario.

No pre-existing combat, movement, AP, scoring, or terminal-state defect was
confirmed during this audit. No authoritative game rules were changed.

## Unit catalog and pricing

`authoritativeUnitCatalog` is empty. The only definitions are development
fixtures, with no prefab templates or pricing inputs:

| Definition | Health | Power | Guard | Mobility | Status |
|---|---:|---:|---:|---:|---|
| Line Infantry | 8 | 3 | 2 | 2 | Development fixture |
| Scout | 6 | 2 | 1 | 4 | Development fixture |

There is no pricing formula, unit cost, construction schema, or configured
budget in the repository. Canonical costs, prefab consistency, price/value
efficiency, and authoritative balance therefore cannot be calculated or
validated. The existing UI accurately identifies costs as unavailable. No
prices or statistics were invented.

The fixtures do have different tactical profiles: the scout trades health,
power, and guard for mobility. The baseline simulations recorded more scout
deaths in these scenarios, but this depends on a deliberately simplistic
policy and is not evidence that the scout is underpowered in human play.

## Scenario fairness and playability

All three registered scenarios pass `validateScenario`, including board
coverage, legal starting positions, deployment capacity, objective locations,
and movement reachability. The following structural asymmetries are present:

| Scenario | Terrain and victory | Blueward deployment | Redoubt deployment | Objective deployment access |
|---|---|---:|---:|---|
| The Narrows | 42 grassland, 5 hills, 6 forest, 3 mountains, 5 water; objectives or elimination | 20 hexes | 33 hexes | Both objectives are inside Redoubt's zone; neither is in Blueward's |
| Open Ground | 61 grassland; elimination | 20 hexes | 33 hexes | Both objectives are inside Redoubt's zone; neither is in Blueward's |
| The River Ford | 39 grassland, 4 hills, 7 forest, 3 mountains, 8 water; objectives or elimination | 21 hexes | 29 hexes | All three objectives are inside Redoubt's zone; none are in Blueward's |

These are facts about the current deployment-zone definitions, not a claim
that a human-selected deployment must exploit them. Each scenario permits
repositioning during setup, so Redoubt can legally deploy directly onto every
objective while Blueward cannot. The zones also offer different numbers of
usable hexes. This is the clearest fairness concern found by static analysis.
The scenarios do remain playable: each player has legal deployment capacity,
and every objective is reachable from each player's zone under movement rules.

Other map characteristics:

- **The Narrows:** mixed terrain creates passability and line-of-sight choices.
  The objective locations are close to the central q=0 split.
- **Open Ground:** all board hexes are grassland, but its deployment zones are
  inherited from the terrain map before it is flattened. It always gives
  Blueward the first turn. Its elimination-only victory makes first-turn
  advantage especially important to test.
- **The River Ford:** the watercourse constrains central movement, while its
  three objectives create more scoring routes. Blueward's nearest deployment
  distances to the objectives are 1, 1, and 2 hexes; Redoubt can deploy on all
  three.

### Recommended scenario improvements

1. **High priority — resolve the exclusive objective deployment access.**
   Consider symmetric, non-overlapping deployment zones that leave objective
   hexes neutral, and add a scenario fairness assertion for comparable access.
   Preserve the current setups until the intended deployment design is
   approved; this report does not silently rebalance them.
2. **High priority — test Open Ground with player/starting-side assignments
   swapped.** Its fixed Blueward start is currently inseparable from its
   observed baseline outcome.
3. **Medium priority — human-playtest River Ford approaches.** Check whether
   the ford and end-runs offer genuine counterplay despite the eastern
   objective placements.

## Headless simulation

Added `src/game/simulation/baseline.ts`. It calls the actual engine's
`createBattle`, `getAttackTargets`, `getAttackPreview`,
`getMovementDestinations`, `moveUnit`, `attackUnit`, and `endPlayerTurn`.
It does not reimplement rules or import the renderer. Callers can select a
scenario, supply a roster of scenario units, choose a seed, and set a maximum
round count. Results contain structured move/attack/end-turn actions, the
battle event log and final state; batch summaries include player outcomes,
duration, victory reason, unit survival, and damage by definition.

The labeled **baseline policy** attacks legal targets (preferring a defeat,
then higher damage) and otherwise moves toward an uncontrolled objective, or
an enemy for elimination-only battles. It does not understand tactical
formations, sacrifice, terrain denial, threat assessment, or deliberate
detours. It is suitable only for checking engine integration and identifying
obvious map/policy interactions, not for balance certification.

### Reproducible sample

Ran seeds 1–100 for each scenario with a 30-round cap:

| Scenario | Blueward W-L-D | Redoubt W-L-D | Mean rounds | Mean actions | End reason |
|---|---:|---:|---:|---:|---|
| The Narrows | 50-50-0 | 50-50-0 | 2.5 | 22.5 | 100 objective victories |
| Open Ground | 100-0-0 | 0-100-0 | 5.0 | 35.0 | 100 eliminations |
| The River Ford | 50-50-0 | 50-50-0 | 2.0 | 19.0 | 100 objective victories |

Aggregate unit metrics (200 deployments per definition per scenario):

| Scenario | Line Infantry destroyed | Line Infantry damage dealt / received | Scouts destroyed | Scout damage dealt / received |
|---|---:|---:|---:|---:|
| The Narrows | 0 | 700 / 600 | 50 | 750 / 850 |
| Open Ground | 100 | 1,900 / 1,400 | 200 | 800 / 1,300 |
| The River Ford | 0 | 550 / 50 | 50 | 350 / 850 |

Across the batch, action totals (move / attack / end turn) were 450 / 1,350 /
450 for The Narrows, 400 / 2,300 / 800 for Open Ground, and 850 / 650 / 400
for The River Ford. Accumulated objective points were 150 / 200 for Blueward /
Redoubt in The Narrows and 200 / 250 in The River Ford; Open Ground scored no
objective points because it is elimination-only.

The Narrows and River Ford seeds selected each starting player 50 times, and
the winner followed that starting player in the sample. Open Ground is
configured to always start Blueward. Since the game has no randomness after
starting-player selection and the policy is deterministic, these 100 runs
represent only one or two distinct battle traces per scenario; they are not
100 independent tactical trials. Conventional confidence intervals would be
misleading. The Open Ground outcome is a warning about the fixed first-player
advantage under this policy, not a definitive human-play balance result.

No cap was reached in this sample. Reproduce it with
`runBaselineBatch({ scenario, seeds: Array.from({ length: 100 }, (_, i) => i + 1), maxRounds: 30 })`
for each scenario from `src/game/simulation/baseline.ts`. Simulation tests also
verify exact replay for a repeated seed, that sequential seeds cover both
randomized starting players, round-limit termination, and a run through every
scenario.

## Fixes, remaining uncertainty, and next steps

- **Simulation harness correction:** the first seed generator version did not
  distribute sequential small seeds across both starting players. The new
  seeded generator uses a mixed 32-bit sequence; a regression test verifies
  that seeds 1–20 select both players. Additional tests verify replay
  determinism and that end-turn records identify the round being completed.
  These were harness issues introduced during this milestone, not defects in
  the game engine.
- No gameplay rule, authoritative cost/stat, victory condition, or scenario
  geometry was changed. No confirmed pre-existing gameplay defect was found.
- Pricing, prefab audit, authoritative unit balance, and meaningful human
  strategy comparisons remain blocked by absent canonical game-design data
  and lack of human playtesting.
- Next recommended milestone: agree on fair deployment-zone intent and
  starting-player policy, then run paired human playtests (swapping sides and
  starting player) across all maps before considering any unit-stat or
  combat-rule changes.

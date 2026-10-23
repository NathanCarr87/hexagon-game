# Scenario playtests

The scenario registry in `src/game/scenarios/index.ts` contains three repeatable
maps. Each definition owns its board, terrain, regions, deployment zones,
objectives, starting-player policy, and victory configuration. Terrain layouts
are deterministic scenario data; the registry does not generate random maps.

| Scenario | Tactical focus | Start policy | Victory |
| --- | --- | --- | --- |
| The Narrows | Hills, forests, water, and mountain restrictions around a central approach | Random player; deterministic tests inject the random source | Objective threshold or elimination |
| Open Ground | Clear movement and attack lanes without terrain line-of-sight blockers | Blueward starts | Elimination |
| The River Ford | An edge-to-edge river with a central ford, a northern ridge, wooded banks, and three objectives | Random player | Objective threshold or elimination |

All maps currently use the same two development-fixture unit definitions per
side so their combat data remains explicitly provisional. The definitions are
centralized in `src/game/domain/unitCatalog.ts`; the scenario rosters store
stable definition IDs plus instance identity, owner, position, current health,
and placeholder AP. They are not prefab templates. Use the Open Ground
scenario for repeatable manual battle playback; domain tests use fixed scenario
data and inject the starting-player random source when testing The Narrows.

## Setup limitations

Scenario selection, read-only roster inspection, deployment, battle start,
reset, and return-to-setup are implemented. `authoritativeUnitCatalog` is
intentionally empty. The repository does not contain authoritative unit
definitions, a pricing formula or stat costs, prefab templates, documented
construction constraints, or army budgets. The setup UI labels the current
catalog entries as development fixtures and does not calculate costs or allow
unpriced force editing. A scenario with configured budgets is rejected until
authoritative pricing is available to enforce them.

The canonical `UnitDefinition` schema separates immutable definition data
(description, role, combat attributes, and visual archetype) from roster
instances (stable instance ID, definition ID, owner, position, current health,
and scenario placeholder AP). Pricing fields are intentionally absent until
their authoritative inputs and rules are provided. No authoritative prefab
templates or costs are available.

Deployment remains limited to the selected unit's configured player zone,
unoccupied hexes, and terrain the scenario marks as passable. The player zones
contain only passable hexes and are shown with their player colors; rejected
placements include a specific reason. An invalid placement is not committed.
Scenario validation checks complete board layouts, terrain and region
references, usable deployment capacity, reachable objectives for objective
victory modes, valid objective locations, and legal starting deployments.
Objective markers derive their owner from the unit currently on the objective;
the battle panel displays those controllers alongside the actual accumulated
victory scores.

The maps are authored as fixed terrain assignments over the project's axial
hex disk. The River Ford creates geographic features from fixed coordinate
sets, not random assignment, so it needs no generation seed and remains
reproducible.

The existing provisional deployment rules and V1 combat rules are documented
in [combat-v1.md](./rules/combat-v1.md); this scenario catalog does not redefine
them.

# Scenario playtests

The scenario registry in `src/game/scenarios/index.ts` contains two repeatable
test maps. Each definition owns its board, terrain, regions, deployment zones,
objectives, starting-player policy, and victory configuration.

| Scenario | Tactical focus | Start policy | Victory |
| --- | --- | --- | --- |
| The Narrows | Hills, forests, water, and mountain restrictions around a central approach | Random player; deterministic tests inject the random source | Objective threshold or elimination |
| Open Ground | Clear movement and attack lanes without terrain line-of-sight blockers | Blueward starts | Elimination |

Both maps currently use the same two scenario-provided units per side so their
combat data remains unchanged and explicitly provisional. They are not prefab
templates. Use the Open Ground scenario for repeatable manual battle playback;
domain tests use fixed scenario data and inject the starting-player random
source when testing The Narrows.

## Setup limitations

Scenario selection, roster inspection, deployment, battle start, reset, and
return-to-setup are implemented. The repository does not contain an
authoritative unit pricing formula, prefab catalog, configurable force
construction rules, or point budgets. The setup UI therefore identifies these
units as scenario presets and does not pretend to calculate force costs or
allow unpriced force editing. A scenario with configured budgets is rejected
until a pricing service is available to enforce them.

The existing provisional deployment rules and V1 combat rules are documented
in [combat-v1.md](./rules/combat-v1.md); this scenario catalog does not redefine
them.

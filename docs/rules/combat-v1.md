# Combat Rules — Version 1

This document records the V1 battle defaults supplied for Milestone 3 and the
scenario settings used by the current implementation. Scenario-specific values
are data in `src/game/scenarios/initialScenario.ts`; combat logic is independent
of React and Three.js in `src/game/state/battle.ts`.

## Battle and turns

- V1 requires exactly two configured players.
- Battle start requires at least one living, uniquely placed unit for each
  player. Units must occupy board hexes in their configured deployment zone.
- A scenario may set `startingPlayerId`. If omitted, a player is selected
  uniformly at random once at battle start. The selection is recorded in the
  battle log.
- Turns alternate as whole-player turns within each round. Units of the active
  player can act in any order. The starting player alternates each round: the
  second player in one round starts the next, so that player begins consecutive
  turns across the round boundary.
- Units of the starting player receive 2 **combat AP** when battle begins.
  Other units start with no combat AP until their first turn. Each unit then
  receives 2 combat AP at the beginning of its owner's turn.
  Movement and an attack each cost 1 combat AP. Unspent AP is not carried over.
  Ending a turn costs no AP; the incoming player's units refresh at the start of
  that turn, including a player who starts the next round immediately after
  ending their previous-round turn. Combat AP is state separate from the
  scenario's placeholder AP.
- An invalid action does not modify battle state or consume AP.

## Movement

- Movement uses connected axial hexes and the unit's `Mobility` value as the
  maximum movement cost for one movement action.
- Grassland costs 1; hills and forests cost 2; mountains and water are
  impassable. These values are configured per scenario.
- Occupied hexes block traversal and cannot be destinations. Units cannot move
  outside the board. A move to the unit's current hex is not an action.
- Each movement action costs 1 combat AP, regardless of movement cost.
- Elevation does not add movement cost.

## Attacks

- An attack targets a living enemy at a hex distance of at least 1 and no more
  than the configured range. The scenario default range is 1; a unit may
  provide an optional non-priced `combat.attackRange` override.
- Intermediate forests, mountains, and occupied hexes block line of sight.
  Attacker and target hexes are excluded from this check; hills do not block.
- A legal attack always hits and costs 1 combat AP. Damage is deterministic:

  ```text
  damage = max(1, Power + elevationBonus - target Guard)
  ```

- `elevationBonus` is 1 when the attacker is on higher terrain than its target,
  otherwise 0. The versioned terrain-to-elevation mapping is grassland 0,
  hills 1, forest 0, mountains 2, water 0. This mapping is rule data, not
  rendered mesh height.
- A unit at 0 HP is removed from the battle and no longer blocks movement or
  line of sight.
- No hit rolls, critical hits, extra modifiers, abilities, or status effects
  are used.

## Objectives and victory

- A living unit controls an objective by occupying its hex. At the end of the
  active player's turn, that player receives one point for each objective they
  control. Scores persist.
- Victory mode is configured as `objectives`, `elimination`, `either`, or
  `both`. Objective victory requires the scenario's configured score threshold.
- Victory is checked after attacks, after objective scoring, and at turn
  transitions. Further battle actions are rejected after battle end.
- A scenario may set a round limit. When exceeded, the player with the higher
  objective score wins; tied scores (or no objective scoring) result in a draw.

## Current scenario policy and provisional data

`The Narrows` uses `either` victory with an objective score threshold of 3 and
has no round limit. If a round limit is configured, its policy is the highest
objective score with a draw on ties. Its starting player is randomly selected.
Movement terrain costs and combat AP values use the V1 defaults above.

The current unit HP, Power, Guard, and Mobility values remain temporary
scenario placeholders. The scenario marks its combat data `provisional`, and
the UI labels it accordingly. The engine uses these values to exercise the V1
loop, but they are not authoritative constructed-unit or prefab statistics.
The old `actionPointsRemaining` placeholder is preserved and is not used as
combat AP.

Deployment zones remain explicitly provisional and split this test map by
axial `q`. Terrain movement, line-of-sight, elevation, and victory policy are
configured as scenario battle rules. Pricing, templates, army construction,
and budgets remain unspecified and are not changed by this ruleset.

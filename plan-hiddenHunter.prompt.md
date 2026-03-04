DRAFT Plan: Logic Hardening & Cleanup

Goal: Make the game loop and data flows safer and easier to extend, without changing the core gameplay rules.

1) Host lifecycle hardening
- Review host checks in useGameLoop.ts and host-related helpers in gameService.ts.
- Add explicit handling of mid-game host exits and eliminations so a new host is promoted immediately and the game loop can continue without waiting for periodic checks.
- Ensure a host cannot remain marked as is_host = true and is_alive = true after closing their tab or being eliminated.

2) Auto-fill safety guards
- In gameService.ts, add defensive checks around autoFillAttacks to ensure it only runs when there are at least two alive players.
- If the target list is empty, safely no-op (or log) instead of attempting to access target.id.
- Document the invariant: auto-fill is only valid with 2+ alive players.

3) Strongly typed action payloads
- In stateMachine.ts, introduce well-typed payload shapes for mission actions and attack actions instead of generic Record<string, unknown>.
- For missions, use a discriminated union, e.g.:
  - { type: 'number_1_100'; value: number }
  - { type: 'rock_paper_scissors'; value: 'rock' | 'paper' | 'scissors' }
  - { type: 'symbol_pick'; value: 'flame' | 'droplet' | 'leaf' | 'zap' | 'moon' | 'sun' }
- For attacks, use a clear shape like { type: 'attack'; targetId: string }.
- Update gameService.ts, usePlayerActions.ts, and all readers/writers of payload to use these types and drop magic string property access.

4) Phase transition consolidation
- Extract per-phase decision logic from useGameLoop.ts into pure helpers in stateMachine.ts (e.g., functions that decide when to move from mission -> reveal -> attack -> damage -> next_round / game_over).
- Let useGameLoop primarily handle timers, Supabase calls, and invoking these helpers.
- Aim for a single, testable source of truth about phase transitions, separate from React hooks and side effects.

5) Round state reset semantics
- In GameContext.tsx, add a reducer action that explicitly resets round-scoped state (mission results, mission winner info, damage reports, eliminated IDs) when moving into a new mission.
- Use that action whenever transitioning from next_round to mission.
- Make sure UI components assume these fields are only meaningful in the relevant phases (reveal, damage, etc.).

Verification checklist
- Manual tests via npm run dev:
  - Host leaves or refreshes mid-mission and mid-attack: another player’s client should take over the loop, and the game should keep progressing.
  - Rounds with only two players left, then one player left: auto-fill never crashes, and the game ends cleanly.
  - Missions and attacks where some players do nothing before timeout: auto-fill still resolves the round correctly.
- Automated checks:
  - Run npx tsc --noEmit to keep type safety intact after refactors.
  - Optionally add a few unit tests around mission winner resolution, damage application, and phase transitions once logic is centralized.
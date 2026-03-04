// ── Types ────────────────────────────────────────────────────

export interface Room {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  current_phase: Phase;
  mission_type: MissionType | null;
  mission_hidden_number: number | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  nickname: string;
  lives: number;
  is_alive: boolean;
  target_id: string | null;
  immunity: boolean;
  bonus_damage: boolean;
  is_host: boolean;
  created_at: string;
}

// ── Action Payload Types ─────────────────────────────────────

export type SymbolValue = typeof SYMBOLS[number];
export type RPSValue = 'rock' | 'paper' | 'scissors';

export interface MissionPayload {
  value: number | RPSValue | SymbolValue;
}

export interface AttackPayload {
  target_id: string;
}

export type ActionPayload = MissionPayload | AttackPayload;

export interface RoundAction {
  id: string;
  room_id: string;
  round_number: number;
  player_id: string;
  action_type: 'mission' | 'attack';
  payload: Record<string, unknown>;
  created_at: string;
}

/** Type-safe accessor for mission payload value. */
export function getMissionValue(action: RoundAction): number | string {
  return (action.payload.value as number | string) ?? 0;
}

/** Type-safe accessor for attack payload target. */
export function getAttackTargetId(action: RoundAction): string {
  return action.payload.target_id as string;
}

// ── Phases ───────────────────────────────────────────────────

export const PHASES = [
  'waiting',
  'assigning_targets',
  'mission',
  'reveal',
  'attack',
  'damage_resolution',
  'elimination_check',
  'next_round',
  'finished',
] as const;

export type Phase = (typeof PHASES)[number];

export const NEXT_PHASE: Record<Phase, Phase | null> = {
  waiting: 'assigning_targets',
  assigning_targets: 'mission',
  mission: 'reveal',
  reveal: 'attack',
  attack: 'damage_resolution',
  damage_resolution: 'elimination_check',
  elimination_check: 'next_round', // or 'finished' — decided by logic
  next_round: 'mission',
  finished: null,
};

// ── Missions ─────────────────────────────────────────────────

export const MISSION_TYPES = [
  'number_1_100',
  'rock_paper_scissors',
  'symbol_pick',
] as const;

export type MissionType = (typeof MISSION_TYPES)[number];

export const SYMBOLS = ['flame', 'droplet', 'leaf', 'zap', 'moon', 'sun'] as const;

export function getRandomMission(): MissionType {
  return MISSION_TYPES[Math.floor(Math.random() * MISSION_TYPES.length)];
}

export function generateRandomMissionPayload(
  missionType: MissionType,
): MissionPayload {
  switch (missionType) {
    case 'number_1_100':
      return { value: Math.floor(Math.random() * 100) + 1 };
    case 'rock_paper_scissors': {
      const choices: RPSValue[] = ['rock', 'paper', 'scissors'];
      return { value: choices[Math.floor(Math.random() * choices.length)] };
    }
    case 'symbol_pick':
      return { value: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] };
  }
}

// ── Mission Descriptions (shown in UI) ───────────────────────

export const MISSION_INFO: Record<MissionType, { label: string; description: string; reward: string }> = {
  number_1_100: {
    label: 'Number Hunt',
    description: 'Pick a number 1–100. Closest to the hidden target wins!',
    reward: 'Winner gets +1 bonus damage on next attack',
  },
  rock_paper_scissors: {
    label: 'Rock Paper Scissors',
    description: 'Classic RPS! Beat the most opponents to win.',
    reward: 'Winner gets +1 bonus damage on next attack',
  },
  symbol_pick: {
    label: 'Symbol Gambit',
    description: 'Pick a symbol. The rarest pick wins!',
    reward: 'Winner gets +1 bonus damage on next attack',
  },
};

// ── Mission Resolution ───────────────────────────────────────

/**
 * Determine the mission winner from the submitted actions.
 * Returns the winning player_id, or null if no clear winner.
 */
export function resolveMissionWinner(
  missionType: MissionType,
  actions: RoundAction[],
  hiddenNumber: number | null,
): string | null {
  if (actions.length === 0) return null;

  switch (missionType) {
    case 'number_1_100': {
      const target = hiddenNumber ?? 50;
      let closestId: string | null = null;
      let closestDist = Infinity;
      for (const a of actions) {
        const val = Number(getMissionValue(a));
        const dist = Math.abs(val - target);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = a.player_id;
        }
      }
      return closestId;
    }

    case 'rock_paper_scissors': {
      const beats: Record<string, string> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
      const scores = new Map<string, number>();
      for (const a of actions) {
        const choice = String(getMissionValue(a)).toLowerCase();
        let wins = 0;
        for (const b of actions) {
          if (a.player_id === b.player_id) continue;
          const other = String(getMissionValue(b)).toLowerCase();
          if (beats[choice] === other) wins++;
        }
        scores.set(a.player_id, wins);
      }
      let maxWins = 0;
      let winnerId: string | null = null;
      for (const [pid, w] of scores) {
        if (w > maxWins) {
          maxWins = w;
          winnerId = pid;
        }
      }
      return maxWins > 0 ? winnerId : null; // No winner if all tied
    }

    case 'symbol_pick': {
      // Count frequency of each symbol
      const freq = new Map<string, number>();
      for (const a of actions) {
        const sym = String(getMissionValue(a));
        freq.set(sym, (freq.get(sym) ?? 0) + 1);
      }
      // Find the minimum frequency (rarest)
      let minFreq = Infinity;
      for (const f of freq.values()) {
        if (f < minFreq) minFreq = f;
      }
      // First player who picked a rarest symbol wins
      const rareSymbols = new Set(
        [...freq.entries()].filter(([, f]) => f === minFreq).map(([s]) => s),
      );
      for (const a of actions) {
        const sym = String(getMissionValue(a));
        if (rareSymbols.has(sym)) return a.player_id;
      }
      return null;
    }
  }
}

// ── Timeouts ─────────────────────────────────────────────────

export const MISSION_TIMEOUT = 30_000;  // 30 seconds
export const ATTACK_TIMEOUT = 25_000;   // 25 seconds
export const REVEAL_DURATION = 8_000;   // 8 seconds
export const DAMAGE_REPORT_DURATION = 8_000; // 8 seconds

// ── Phase Transition Helpers ─────────────────────────────────

/** Check if all alive players have submitted for a given action type. */
export function allSubmitted(actionCount: number, aliveCount: number): boolean {
  return actionCount >= aliveCount;
}

/** Decide the phase after elimination check: 'finished' | 'next_round'. */
export function phaseAfterElimination(aliveCount: number): 'finished' | 'next_round' {
  return aliveCount <= 1 ? 'finished' : 'next_round';
}

/** Generate the hidden number for a mission (only for number_1_100). */
export function generateHiddenNumber(missionType: MissionType): number | null {
  return missionType === 'number_1_100'
    ? Math.floor(Math.random() * 100) + 1
    : null;
}

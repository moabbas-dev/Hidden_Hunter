// ── Types ────────────────────────────────────────────────────

export interface Room {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  current_phase: Phase;
  mission_type: MissionType | null;
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
  is_host: boolean;
  created_at: string;
}

export interface RoundAction {
  id: string;
  room_id: string;
  round_number: number;
  player_id: string;
  action_type: 'mission' | 'attack';
  payload: Record<string, unknown>;
  created_at: string;
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

export const SYMBOLS = ['🔥', '💧', '🌿', '⚡', '🌙', '☀️'] as const;

export function getRandomMission(): MissionType {
  return MISSION_TYPES[Math.floor(Math.random() * MISSION_TYPES.length)];
}

export function generateRandomMissionPayload(
  missionType: MissionType,
): Record<string, unknown> {
  switch (missionType) {
    case 'number_1_100':
      return { value: Math.floor(Math.random() * 100) + 1 };
    case 'rock_paper_scissors':
      return { value: ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)] };
    case 'symbol_pick':
      return { value: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] };
  }
}

// ── Timeouts ─────────────────────────────────────────────────

export const MISSION_TIMEOUT = 20_000;
export const ATTACK_TIMEOUT = 15_000;
export const REVEAL_DURATION = 5_000;
export const DAMAGE_REPORT_DURATION = 5_000;

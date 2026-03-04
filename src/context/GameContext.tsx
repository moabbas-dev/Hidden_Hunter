import React, { createContext, useContext, useReducer, type Dispatch } from 'react';
import type { Room, Player, Phase } from '../lib/stateMachine';
import type { DamageReport } from '../lib/gameService';

// ── State ────────────────────────────────────────────────────

export interface GameState {
  room: Room | null;
  players: Player[];
  currentPlayer: Player | null;
  roomCode: string;
  nickname: string;
  phase: Phase;
  round: number;
  missionType: string | null;
  roundResults: Record<string, unknown>[] | null;
  missionWinnerId: string | null;
  missionWinnerNickname: string | null;
  hiddenNumber: number | null;
  damageReports: DamageReport[] | null;
  eliminatedIds: string[];
  winnerId: string | null;
  error: string | null;
}

const initialState: GameState = {
  room: null,
  players: [],
  currentPlayer: null,
  roomCode: '',
  nickname: '',
  phase: 'waiting',
  round: 0,
  missionType: null,
  roundResults: null,
  missionWinnerId: null,
  missionWinnerNickname: null,
  hiddenNumber: null,
  damageReports: null,
  eliminatedIds: [],
  winnerId: null,
  error: null,
};

// ── Actions ──────────────────────────────────────────────────

export type GameAction =
  | { type: 'SET_ROOM'; room: Room }
  | { type: 'SET_PLAYERS'; players: Player[] }
  | { type: 'SET_CURRENT_PLAYER'; player: Player }
  | { type: 'SET_CREDENTIALS'; roomCode: string; nickname: string }
  | { type: 'SET_ROUND_RESULTS'; results: Record<string, unknown>[]; winnerId?: string | null; winnerNickname?: string | null; hiddenNumber?: number | null }
  | { type: 'SET_DAMAGE_REPORTS'; reports: DamageReport[] }
  | { type: 'SET_ELIMINATED'; ids: string[] }
  | { type: 'SET_WINNER'; winnerId: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_ROUND' }
  | { type: 'RESET' };

// ── Reducer ──────────────────────────────────────────────────

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_ROOM':
      return {
        ...state,
        room: action.room,
        phase: action.room.current_phase,
        round: action.room.current_round,
        missionType: action.room.mission_type,
      };
    case 'SET_PLAYERS': {
      const currentPlayer = state.currentPlayer
        ? action.players.find((p) => p.id === state.currentPlayer!.id) ?? state.currentPlayer
        : state.currentPlayer;
      return { ...state, players: action.players, currentPlayer };
    }
    case 'SET_CURRENT_PLAYER':
      return { ...state, currentPlayer: action.player };
    case 'SET_CREDENTIALS':
      return { ...state, roomCode: action.roomCode, nickname: action.nickname };
    case 'SET_ROUND_RESULTS':
      return {
        ...state,
        roundResults: action.results,
        missionWinnerId: action.winnerId ?? null,
        missionWinnerNickname: action.winnerNickname ?? null,
        hiddenNumber: action.hiddenNumber ?? null,
      };
    case 'SET_DAMAGE_REPORTS':
      return { ...state, damageReports: action.reports };
    case 'SET_ELIMINATED':
      return { ...state, eliminatedIds: action.ids };
    case 'SET_WINNER':
      return { ...state, winnerId: action.winnerId };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'RESET_ROUND':
      return {
        ...state,
        roundResults: null,
        missionWinnerId: null,
        missionWinnerNickname: null,
        hiddenNumber: null,
        damageReports: null,
        eliminatedIds: [],
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────

const GameContext = createContext<{
  state: GameState;
  dispatch: Dispatch<GameAction>;
}>({ state: initialState, dispatch: () => {} });

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  return useContext(GameContext);
}

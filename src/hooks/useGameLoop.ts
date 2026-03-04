import { useEffect, useRef, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import * as gs from '../lib/gameService';
import {
  getRandomMission,
  resolveMissionWinner,
  allSubmitted,
  phaseAfterElimination,
  generateHiddenNumber,
  MISSION_TIMEOUT,
  ATTACK_TIMEOUT,
  REVEAL_DURATION,
  DAMAGE_REPORT_DURATION,
  type MissionType,
} from '../lib/stateMachine';

/**
 * This hook runs ONLY for the host player.
 * It drives the game state machine by writing phase transitions to the DB.
 */
export function useGameLoop(
  broadcast: (payload: Record<string, unknown>) => void,
) {
  const { state, dispatch } = useGame();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const lastProcessedRef = useRef<string>('');

  const isHost = state.currentPlayer?.is_host === true;
  const room = state.room;
  const phase = state.phase;
  const round = state.round;

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isHost || !room) return;

    // Deduplicate: only process each phase+round combo once
    const phaseKey = `${phase}:${round}`;
    if (phaseKey === lastProcessedRef.current) return;
    if (processingRef.current) return;

    const roomId = room.id;

    const runPhase = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      lastProcessedRef.current = phaseKey;

      try {
        switch (phase) {
          // ── HOST STARTS GAME ──────────────────────────────
          case 'assigning_targets': {
            await gs.assignTargets(roomId);
            const mission = getRandomMission();
            const hiddenNumber = generateHiddenNumber(mission);
            await gs.updateRoomPhase(roomId, 'mission', {
              current_round: 1,
              mission_type: mission,
              mission_hidden_number: hiddenNumber,
              status: 'playing',
            });
            break;
          }

          // ── MISSION PHASE ─────────────────────────────────
          case 'mission': {
            const alivePlayers = await gs.getAlivePlayers(roomId);
            const aliveCount = alivePlayers.length;
            const missionType = room.mission_type as MissionType;

            // Poll for submissions every 2s
            pollingRef.current = setInterval(async () => {
              const count = await gs.getActionCount(roomId, room.current_round, 'mission');
              if (allSubmitted(count, aliveCount)) {
                clearTimers();
                const alive = await gs.getAlivePlayers(roomId);
                await gs.autoFillMissions(roomId, room.current_round, alive, missionType);
                await gs.updateRoomPhase(roomId, 'reveal');
              }
            }, 2000);

            // Timeout: auto-fill and advance
            timerRef.current = setTimeout(async () => {
              clearTimers();
              const alive = await gs.getAlivePlayers(roomId);
              await gs.autoFillMissions(roomId, room.current_round, alive, missionType);
              await gs.updateRoomPhase(roomId, 'reveal');
            }, MISSION_TIMEOUT);

            break;
          }

          // ── REVEAL PHASE ──────────────────────────────────
          case 'reveal': {
            const results = await gs.getActions(roomId, room.current_round, 'mission');
            const alivePlayers = await gs.getAlivePlayers(roomId);
            const playerMap = new Map(alivePlayers.map((p) => [p.id, p.nickname]));

            const missionType = room.mission_type as MissionType;
            const hiddenNumber = room.mission_hidden_number ?? null;

            // Resolve mission winner
            const winnerId = resolveMissionWinner(missionType, results, hiddenNumber);
            const winnerNickname = winnerId ? (playerMap.get(winnerId) ?? null) : null;

            // Award bonus damage to winner
            if (winnerId) {
              await gs.awardMissionBonus(roomId, winnerId);
            }

            const formattedResults = results.map((r) => ({
              playerId: r.player_id,
              nickname: playerMap.get(r.player_id) ?? 'Unknown',
              value: r.payload.value,
            }));

            broadcast({
              type: 'ROUND_RESULTS',
              results: formattedResults,
              winnerId,
              winnerNickname,
              hiddenNumber,
            });
            dispatch({ type: 'SET_ROUND_RESULTS', results: formattedResults, winnerId, winnerNickname, hiddenNumber });

            timerRef.current = setTimeout(async () => {
              clearTimers();
              await gs.updateRoomPhase(roomId, 'attack');
            }, REVEAL_DURATION);

            break;
          }

          // ── ATTACK PHASE ──────────────────────────────────
          case 'attack': {
            const alivePlayers = await gs.getAlivePlayers(roomId);
            const aliveCount = alivePlayers.length;

            pollingRef.current = setInterval(async () => {
              const count = await gs.getActionCount(roomId, room.current_round, 'attack');
              if (allSubmitted(count, aliveCount)) {
                clearTimers();
                const alive = await gs.getAlivePlayers(roomId);
                await gs.autoFillAttacks(roomId, room.current_round, alive);
                await gs.updateRoomPhase(roomId, 'damage_resolution');
              }
            }, 2000);

            timerRef.current = setTimeout(async () => {
              clearTimers();
              const alive = await gs.getAlivePlayers(roomId);
              await gs.autoFillAttacks(roomId, room.current_round, alive);
              await gs.updateRoomPhase(roomId, 'damage_resolution');
            }, ATTACK_TIMEOUT);

            break;
          }

          // ── DAMAGE RESOLUTION ─────────────────────────────
          case 'damage_resolution': {
            const reports = await gs.applyDamage(roomId, room.current_round);
            broadcast({ type: 'DAMAGE_REPORT', reports });
            dispatch({ type: 'SET_DAMAGE_REPORTS', reports });

            timerRef.current = setTimeout(async () => {
              clearTimers();
              await gs.updateRoomPhase(roomId, 'elimination_check');
            }, DAMAGE_REPORT_DURATION);

            break;
          }

          // ── ELIMINATION CHECK ─────────────────────────────
          case 'elimination_check': {
            const eliminatedIds = await gs.eliminatePlayers(roomId);

            if (eliminatedIds.length > 0) {
              broadcast({ type: 'PLAYER_ELIMINATED', playerIds: eliminatedIds });
              dispatch({ type: 'SET_ELIMINATED', ids: eliminatedIds });
            }

            const alive = await gs.getAlivePlayers(roomId);
            const nextPhase = phaseAfterElimination(alive.length);

            if (nextPhase === 'finished') {
              const winnerId = alive.length === 1 ? alive[0].id : null;
              broadcast({ type: 'GAME_FINISHED', winnerId });
              if (winnerId) dispatch({ type: 'SET_WINNER', winnerId });
              await gs.updateRoomPhase(roomId, 'finished', { status: 'finished' });
            } else {
              await gs.updateRoomPhase(roomId, 'next_round');
            }

            break;
          }

          // ── NEXT ROUND ────────────────────────────────────
          case 'next_round': {
            await gs.rebuildTargetChain(roomId);
            const nextRound = room.current_round + 1;
            const mission = getRandomMission();
            const hiddenNumber = generateHiddenNumber(mission);
            // Dispatch round reset to clear stale round-scoped state
            dispatch({ type: 'RESET_ROUND' });
            await gs.updateRoomPhase(roomId, 'mission', {
              current_round: nextRound,
              mission_type: mission,
              mission_hidden_number: hiddenNumber,
            });
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error('[GameLoop] Error in phase', phase, err);
        // Allow retry on error
        lastProcessedRef.current = '';
      } finally {
        processingRef.current = false;
      }
    };

    runPhase();

    return () => {
      clearTimers();
    };
  }, [isHost, phase, round, broadcast, dispatch, clearTimers, room]);

  // Host promotion check (non-host only) — runs every 5s
  useEffect(() => {
    if (isHost || !room || room.status !== 'playing') return;

    const interval = setInterval(async () => {
      const players = await gs.getAlivePlayers(room.id);
      const currentHost = players.find((p) => p.is_host);
      if (!currentHost || !currentHost.is_alive) {
        await gs.promoteNextHost(room.id);
      }
    }, 5_000);

    return () => clearInterval(interval);
  }, [isHost, room]);
}

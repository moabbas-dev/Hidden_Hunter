import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as gs from '../lib/gameService';
import { useGame } from '../context/GameContext';
import type { Room } from '../lib/stateMachine';
import type { RealtimeChannel } from '@supabase/supabase-js';

const STORAGE_KEY = 'hidden-hunter-session';

interface StoredSession {
  roomCode: string;
  nickname: string;
  playerId: string;
}

function saveSession(roomCode: string, nickname: string, playerId: string) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ roomCode, nickname, playerId }));
}

export function loadSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function useRoom() {
  const { state, dispatch } = useGame();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch players helper
  const refreshPlayers = useCallback(
    async (roomId: string) => {
      const players = await gs.getPlayers(roomId);
      dispatch({ type: 'SET_PLAYERS', players });
    },
    [dispatch],
  );

  // Subscribe to realtime channel
  const subscribe = useCallback(
    (room: Room) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel(`room-${room.room_code}`);

      // Room row changes (phase, round, mission_type)
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          dispatch({ type: 'SET_ROOM', room: payload.new as Room });
        },
      );

      // Player changes (lives, is_alive, etc.)
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`,
        },
        () => {
          refreshPlayers(room.id);
        },
      );

      // Broadcast events (round results, eliminations, game over)
      channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
        if (!payload) return;
        switch (payload.type) {
          case 'ROUND_RESULTS':
            dispatch({ type: 'SET_ROUND_RESULTS', results: payload.results });
            break;
          case 'DAMAGE_REPORT':
            dispatch({ type: 'SET_DAMAGE_REPORTS', reports: payload.reports });
            break;
          case 'PLAYER_ELIMINATED':
            dispatch({ type: 'SET_ELIMINATED', ids: payload.playerIds });
            break;
          case 'GAME_FINISHED':
            dispatch({ type: 'SET_WINNER', winnerId: payload.winnerId });
            break;
        }
      });

      channel.subscribe();
      channelRef.current = channel;
    },
    [dispatch, refreshPlayers],
  );

  // Broadcast helper (for host)
  const broadcast = useCallback(
    (eventPayload: Record<string, unknown>) => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'game_event',
          payload: eventPayload,
        });
      }
    },
    [],
  );

  // Create room
  const createRoom = useCallback(
    async (roomCode: string, nickname: string) => {
      dispatch({ type: 'CLEAR_ERROR' });
      try {
        const room = await gs.createRoom(roomCode);
        const { player } = await gs.joinRoom(roomCode, nickname, true);
        dispatch({ type: 'SET_CREDENTIALS', roomCode, nickname });
        dispatch({ type: 'SET_ROOM', room });
        dispatch({ type: 'SET_CURRENT_PLAYER', player });
        saveSession(roomCode, nickname, player.id);
        subscribe(room);
        await refreshPlayers(room.id);
      } catch (err: unknown) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },
    [dispatch, subscribe, refreshPlayers],
  );

  // Join room
  const joinRoom = useCallback(
    async (roomCode: string, nickname: string) => {
      dispatch({ type: 'CLEAR_ERROR' });
      try {
        const { room, player } = await gs.joinRoom(roomCode, nickname);
        dispatch({ type: 'SET_CREDENTIALS', roomCode, nickname });
        dispatch({ type: 'SET_ROOM', room });
        dispatch({ type: 'SET_CURRENT_PLAYER', player });
        saveSession(roomCode, nickname, player.id);
        subscribe(room);
        await refreshPlayers(room.id);
      } catch (err: unknown) {
        dispatch({ type: 'SET_ERROR', error: (err as Error).message });
      }
    },
    [dispatch, subscribe, refreshPlayers],
  );

  // Reconnect from saved session (uses player ID, not nickname)
  const reconnect = useCallback(async () => {
    const session = loadSession();
    if (!session || !session.playerId) {
      clearSession();
      return false;
    }
    try {
      const result = await gs.reconnectPlayer(session.roomCode, session.playerId);
      if (!result) {
        clearSession();
        return false;
      }
      const { room, player } = result;
      dispatch({ type: 'SET_CREDENTIALS', roomCode: session.roomCode, nickname: session.nickname });
      dispatch({ type: 'SET_ROOM', room });
      dispatch({ type: 'SET_CURRENT_PLAYER', player });
      subscribe(room);
      await refreshPlayers(room.id);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [dispatch, subscribe, refreshPlayers]);

  // Leave room (just unsubscribe + clear local state)
  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    clearSession();
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // Leave waiting room (remove player from DB, then reset local)
  const leaveWaitingRoom = useCallback(async () => {
    if (state.currentPlayer && state.room) {
      try {
        await gs.leavePlayer(state.currentPlayer.id, state.room.id);
      } catch (err) {
        console.error('Failed to leave room:', err);
      }
    }
    leaveRoom();
  }, [state.currentPlayer, state.room, leaveRoom]);

  // Kill room (host only — deletes room + all players)
  const killRoom = useCallback(async () => {
    if (state.room) {
      try {
        await gs.killRoom(state.room.id);
      } catch (err) {
        console.error('Failed to kill room:', err);
      }
    }
    leaveRoom();
  }, [state.room, leaveRoom]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return {
    state,
    createRoom,
    joinRoom,
    reconnect,
    leaveRoom,
    leaveWaitingRoom,
    killRoom,
    broadcast,
    refreshPlayers,
  };
}



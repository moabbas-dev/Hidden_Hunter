import { useState, useCallback, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import * as gs from '../lib/gameService';

export function usePlayerActions() {
  const { state } = useGame();
  const [hasSubmittedMission, setHasSubmittedMission] = useState(false);
  const [hasSubmittedAttack, setHasSubmittedAttack] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset submission flags when phase changes
  useEffect(() => {
    if (state.phase === 'mission') {
      setHasSubmittedMission(false);
    }
    if (state.phase === 'attack') {
      setHasSubmittedAttack(false);
    }
  }, [state.phase]);

  const submitMission = useCallback(
    async (value: string | number) => {
      if (!state.room || !state.currentPlayer || hasSubmittedMission || submitting) return;
      setSubmitting(true);
      try {
        await gs.submitAction(
          state.room.id,
          state.room.current_round,
          state.currentPlayer.id,
          'mission',
          { value },
        );
        setHasSubmittedMission(true);
      } catch (err) {
        console.error('Failed to submit mission:', err);
      } finally {
        setSubmitting(false);
      }
    },
    [state.room, state.currentPlayer, hasSubmittedMission, submitting],
  );

  const submitAttack = useCallback(
    async (targetPlayerId: string) => {
      if (!state.room || !state.currentPlayer || hasSubmittedAttack || submitting) return;
      if (targetPlayerId === state.currentPlayer.id) return; // Cannot attack self
      setSubmitting(true);
      try {
        await gs.submitAction(
          state.room.id,
          state.room.current_round,
          state.currentPlayer.id,
          'attack',
          { target_id: targetPlayerId },
        );
        setHasSubmittedAttack(true);
      } catch (err) {
        console.error('Failed to submit attack:', err);
      } finally {
        setSubmitting(false);
      }
    },
    [state.room, state.currentPlayer, hasSubmittedAttack, submitting],
  );

  return {
    submitMission,
    submitAttack,
    hasSubmittedMission,
    hasSubmittedAttack,
    submitting,
  };
}

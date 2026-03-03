import { useState } from 'react';
import type { Player } from '../lib/stateMachine';
import { PlayerList } from './PlayerList';
import * as gs from '../lib/gameService';
import styles from './Lobby.module.css';

interface Props {
  roomCode: string;
  players: Player[];
  currentPlayer: Player;
  roomId: string;
  onLeave: () => void;
  onKillRoom: () => void;
}

export function Lobby({ roomCode, players, currentPlayer, roomId, onLeave, onKillRoom }: Props) {
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = currentPlayer.is_host;
  const canStart = isHost && players.length >= 3;

  const handleStart = async () => {
    if (!canStart) return;
    setStarting(true);
    try {
      await gs.updateRoomPhase(roomId, 'assigning_targets');
    } catch (err) {
      console.error('Failed to start:', err);
    }
    setStarting(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Waiting Room</h2>
          <div className={styles.codeRow}>
            <span className={styles.codeLabel}>Room Code</span>
            <button className={styles.codeBtn} onClick={handleCopy}>
              <span className={styles.code}>{roomCode}</span>
              <span className={styles.copyHint}>{copied ? '✓ Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Players ({players.length})
            {players.length < 3 && (
              <span className={styles.minHint}> — need at least 3</span>
            )}
          </h3>
          <PlayerList
            players={players}
            currentPlayerId={currentPlayer.id}
            showLives={false}
          />
        </div>

        <div className={styles.footer}>
          {isHost ? (
            <>
              <button
                className={styles.startBtn}
                onClick={handleStart}
                disabled={!canStart || starting}
              >
                {starting
                  ? 'Starting...'
                  : players.length < 3
                    ? `Need ${3 - players.length} more player${3 - players.length > 1 ? 's' : ''}`
                    : 'Start Game'}
              </button>
              <div className={styles.footerActions}>
                <button className={styles.leaveBtn} onClick={onLeave}>
                  Leave Room
                </button>
                <button className={styles.killBtn} onClick={onKillRoom}>
                  Kill Room
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.waitingMsg}>Waiting for host to start...</div>
              <button className={styles.leaveBtn} onClick={onLeave}>
                Leave Room
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

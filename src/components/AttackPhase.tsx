import { useState, useEffect } from 'react';
import { Swords, Crosshair, Trophy, Heart, Check } from 'lucide-react';
import type { Player } from '../lib/stateMachine';
import styles from './AttackPhase.module.css';

interface Props {
  alivePlayers: Player[];
  currentPlayer: Player;
  timeoutMs: number;
  hasSubmitted: boolean;
  submitting: boolean;
  onSubmit: (targetPlayerId: string) => void;
}

export function AttackPhase({
  alivePlayers,
  currentPlayer,
  timeoutMs,
  hasSubmitted,
  submitting,
  onSubmit,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(timeoutMs / 1000));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const targets = alivePlayers.filter((p) => p.id !== currentPlayer.id);
  const secretTargetName = alivePlayers.find(
    (p) => p.id === currentPlayer.target_id,
  )?.nickname;
  const hasBonusDamage = currentPlayer.bonus_damage;

  if (hasSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.submitted}>
            <span className={styles.checkmark}><Swords size={32} /></span>
            <p>Attack submitted! Waiting for others...</p>
          </div>
          <div className={styles.timer}>{secondsLeft}s</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.phase}>ATTACK</span>
          <div className={styles.timer}>{secondsLeft}s</div>
        </div>

        <h2 className={styles.title}>Choose your target</h2>

        <div className={styles.rulesBox}>
          <div className={styles.rule}><Swords size={14} /> Regular target: <strong>1 damage</strong></div>
          <div className={styles.rule}><Crosshair size={14} /> Secret target: <strong>2 damage + immunity</strong></div>
          {hasBonusDamage && (
            <div className={styles.bonusActive}><Trophy size={14} /> You have +1 bonus damage from mission win!</div>
          )}
        </div>

        {secretTargetName && (
          <div className={styles.secretHint}>
            <span className={styles.secretIcon}><Crosshair size={18} /></span>
            <span>
              Your secret target: <strong>{secretTargetName}</strong>
            </span>
          </div>
        )}

        <div className={styles.targetList}>
          {targets.map((player) => (
            <button
              key={player.id}
              className={`${styles.targetBtn} ${
                selectedId === player.id ? styles.selected : ''
              } ${player.id === currentPlayer.target_id ? styles.secretTarget : ''}`}
              onClick={() => setSelectedId(player.id)}
              disabled={submitting}
            >
              <span className={styles.targetName}>{player.nickname}</span>
              <span className={styles.targetLives}>
                {Array.from({ length: player.lives }).map((_, i) => (
                  <Heart key={i} size={14} fill="currentColor" />
                ))}
              </span>
              {player.id === currentPlayer.target_id && (
                <span className={styles.targetBadge}><Crosshair size={14} /></span>
              )}
            </button>
          ))}
        </div>

        <button
          className={styles.confirmBtn}
          disabled={!selectedId || submitting}
          onClick={() => selectedId && onSubmit(selectedId)}
        >
          {submitting ? 'Attacking...' : 'Confirm Attack'}
        </button>
      </div>
    </div>
  );
}

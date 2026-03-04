import { Crown, Heart, Skull } from 'lucide-react';
import type { Player } from '../lib/stateMachine';
import styles from './GameOver.module.css';

interface Props {
  winnerId: string | null;
  players: Player[];
  onLeave: () => void;
}

export function GameOver({ winnerId, players, onLeave }: Props) {
  const winner = players.find((p) => p.id === winnerId);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.crown}><Crown size={48} /></div>
        <h1 className={styles.title}>Game Over</h1>

        {winner ? (
          <>
            <p className={styles.winnerLabel}>Winner</p>
            <p className={styles.winnerName}>{winner.nickname}</p>
          </>
        ) : (
          <p className={styles.draw}>No survivors — it's a draw!</p>
        )}

        <div className={styles.scoreboard}>
          <h3 className={styles.scoreTitle}>Final Standings</h3>
          {[...players]
            .sort((a, b) => b.lives - a.lives)
            .map((p, i) => (
              <div
                key={p.id}
                className={`${styles.scoreRow} ${p.id === winnerId ? styles.winner : ''}`}
              >
                <span className={styles.rank}>#{i + 1}</span>
                <span className={styles.name}>{p.nickname}</span>
                <span className={styles.lives}>
                  {Array.from({ length: Math.max(0, p.lives) }).map((_, i) => (
                    <Heart key={i} size={14} fill="currentColor" />
                  ))}
                  {p.lives <= 0 && <Skull size={14} />}
                </span>
              </div>
            ))}
        </div>

        <button className={styles.leaveBtn} onClick={onLeave}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}

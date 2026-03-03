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
        <div className={styles.crown}>👑</div>
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
                  {'♥'.repeat(Math.max(0, p.lives))}
                  {p.lives <= 0 && '💀'}
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

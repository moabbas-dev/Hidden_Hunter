import type { Player } from '../lib/stateMachine';
import styles from './PlayerList.module.css';

interface Props {
  players: Player[];
  currentPlayerId: string | null;
  showLives?: boolean;
}

export function PlayerList({ players, currentPlayerId, showLives = true }: Props) {
  return (
    <div className={styles.list}>
      {players.map((player) => (
        <div
          key={player.id}
          className={`${styles.player} ${
            !player.is_alive ? styles.dead : ''
          } ${player.id === currentPlayerId ? styles.self : ''}`}
        >
          <div className={styles.info}>
            <span className={styles.nickname}>
              {player.nickname}
              {player.is_host && <span className={styles.hostBadge}>HOST</span>}
              {player.id === currentPlayerId && (
                <span className={styles.youBadge}>YOU</span>
              )}
            </span>
            {!player.is_alive && <span className={styles.deadTag}>ELIMINATED</span>}
          </div>
          {showLives && (
            <div className={styles.lives}>
              {Array.from({ length: 3 }).map((_, i) => (
                <span
                  key={i}
                  className={`${styles.heart} ${i < player.lives ? styles.heartFull : styles.heartEmpty}`}
                >
                  ♥
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

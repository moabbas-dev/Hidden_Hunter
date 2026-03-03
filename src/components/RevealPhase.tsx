import { useEffect, useState } from 'react';
import { REVEAL_DURATION } from '../lib/stateMachine';
import styles from './RevealPhase.module.css';

interface ResultItem {
  playerId: string;
  nickname: string;
  value: unknown;
}

interface Props {
  results: ResultItem[];
  missionType: string;
}

export function RevealPhase({ results, missionType }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(REVEAL_DURATION / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const missionLabel =
    missionType === 'number_1_100'
      ? 'Number (1–100)'
      : missionType === 'rock_paper_scissors'
        ? 'Rock Paper Scissors'
        : 'Symbol Pick';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.phase}>REVEAL</span>
          <div className={styles.timer}>{secondsLeft}s</div>
        </div>

        <h2 className={styles.title}>{missionLabel} Results</h2>

        <div className={styles.resultList}>
          {results.map((r) => (
            <div key={r.playerId} className={styles.resultRow}>
              <span className={styles.playerName}>{r.nickname}</span>
              <span className={styles.value}>{String(r.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

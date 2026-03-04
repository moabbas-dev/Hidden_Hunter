import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { Crown, Trophy, Hash, Swords as SwordsIcon, Sparkles, Flame, Droplets, Leaf, Zap, Moon, Sun, Gem, FileText, Scissors } from 'lucide-react';
import { REVEAL_DURATION, MISSION_INFO, type MissionType } from '../lib/stateMachine';
import styles from './RevealPhase.module.css';

const MISSION_ICONS: Record<string, ReactElement> = {
  number_1_100: <Hash size={20} />,
  rock_paper_scissors: <SwordsIcon size={20} />,
  symbol_pick: <Sparkles size={20} />,
};

const SYMBOL_ICONS: Record<string, ReactElement> = {
  flame: <Flame size={16} />,
  droplet: <Droplets size={16} />,
  leaf: <Leaf size={16} />,
  zap: <Zap size={16} />,
  moon: <Moon size={16} />,
  sun: <Sun size={16} />,
};

const RPS_ICONS: Record<string, ReactElement> = {
  rock: <Gem size={16} />,
  paper: <FileText size={16} />,
  scissors: <Scissors size={16} />,
};

function renderValue(missionType: string, value: unknown): ReactNode {
  const v = String(value);
  if (missionType === 'symbol_pick' && SYMBOL_ICONS[v]) return SYMBOL_ICONS[v];
  if (missionType === 'rock_paper_scissors' && RPS_ICONS[v]) return <>{RPS_ICONS[v]} {v}</>;
  return v;
}

interface ResultItem {
  playerId: string;
  nickname: string;
  value: unknown;
}

interface Props {
  results: ResultItem[];
  missionType: string;
  winnerId?: string | null;
  winnerNickname?: string | null;
  hiddenNumber?: number | null;
}

export function RevealPhase({ results, missionType, winnerId, winnerNickname, hiddenNumber }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(REVEAL_DURATION / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const info = MISSION_INFO[missionType as MissionType] ?? MISSION_INFO.number_1_100;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.phase}>REVEAL</span>
          <div className={styles.timer}>{secondsLeft}s</div>
        </div>

        <h2 className={styles.title}>{MISSION_ICONS[missionType as MissionType]} {info.label} — Results</h2>

        {missionType === 'number_1_100' && hiddenNumber != null && (
          <div className={styles.hiddenNumber}>
            The hidden number was: <strong>{hiddenNumber}</strong>
          </div>
        )}

        <div className={styles.resultList}>
          {results.map((r) => (
            <div
              key={r.playerId}
              className={`${styles.resultRow} ${r.playerId === winnerId ? styles.winnerRow : ''}`}
            >
              <span className={styles.playerName}>
                {r.playerId === winnerId && <span className={styles.crownIcon}><Crown size={16} /></span>}
                {r.nickname}
              </span>
              <span className={styles.value}>{renderValue(missionType, r.value)}</span>
            </div>
          ))}
        </div>

        {winnerNickname && (
          <div className={styles.winnerBanner}>
            <Trophy size={16} /> <strong>{winnerNickname}</strong> wins the mission! +1 bonus damage next attack
          </div>
        )}

        {!winnerNickname && (
          <div className={styles.noWinner}>
            No clear winner — it's a tie!
          </div>
        )}
      </div>
    </div>
  );
}

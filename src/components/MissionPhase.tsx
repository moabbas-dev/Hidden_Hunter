import { useState, useEffect, type ReactElement } from 'react';
import { Check, Eye, Trophy, Hash, Swords as SwordsIcon, Sparkles, Flame, Droplets, Leaf, Zap, Moon, Sun, Gem, FileText, Scissors } from 'lucide-react';
import { SYMBOLS, MISSION_INFO, type MissionType } from '../lib/stateMachine';
import styles from './MissionPhase.module.css';

const MISSION_ICONS: Record<string, ReactElement> = {
  number_1_100: <Hash size={20} />,
  rock_paper_scissors: <SwordsIcon size={20} />,
  symbol_pick: <Sparkles size={20} />,
};

const SYMBOL_ICONS: Record<string, ReactElement> = {
  flame: <Flame size={24} />,
  droplet: <Droplets size={24} />,
  leaf: <Leaf size={24} />,
  zap: <Zap size={24} />,
  moon: <Moon size={24} />,
  sun: <Sun size={24} />,
};

const RPS_ICONS: Record<string, ReactElement> = {
  rock: <Gem size={24} />,
  paper: <FileText size={24} />,
  scissors: <Scissors size={24} />,
};

interface Props {
  missionType: string;
  timeoutMs: number;
  hasSubmitted: boolean;
  submitting: boolean;
  onSubmit: (value: string | number) => void;
  spectator?: boolean;
}

export function MissionPhase({
  missionType,
  timeoutMs,
  hasSubmitted,
  submitting,
  onSubmit,
  spectator,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(timeoutMs / 1000));
  const [numberValue, setNumberValue] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const info = MISSION_INFO[missionType as MissionType] ?? MISSION_INFO.number_1_100;

  if (hasSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.submitted}>
            <span className={styles.checkmark}>
              {spectator ? <Eye size={32} /> : <Check size={32} />}
            </span>
            <p>{spectator ? 'Spectating — Mission in progress...' : 'Submitted! Waiting for others...'}</p>
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
          <span className={styles.phase}>MISSION</span>
          <div className={styles.timer}>{secondsLeft}s</div>
        </div>

        <h2 className={styles.title}>{MISSION_ICONS[missionType as MissionType]} {info.label}</h2>
        <p className={styles.description}>{info.description}</p>
        <div className={styles.reward}><Trophy size={16} /> {info.reward}</div>

        {missionType === 'number_1_100' && (
          <div className={styles.numberForm}>
            <input
              className={styles.numberInput}
              type="number"
              min={1}
              max={100}
              placeholder="1 – 100"
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
              disabled={submitting}
            />
            <button
              className={styles.submitBtn}
              disabled={
                submitting ||
                !numberValue ||
                Number(numberValue) < 1 ||
                Number(numberValue) > 100
              }
              onClick={() => onSubmit(Number(numberValue))}
            >
              Submit
            </button>
          </div>
        )}

        {missionType === 'rock_paper_scissors' && (
          <div className={styles.choices}>
            {(['rock', 'paper', 'scissors'] as const).map((choice) => (
              <button
                key={choice}
                className={styles.choiceBtn}
                disabled={submitting}
                onClick={() => onSubmit(choice)}
              >
                <span className={styles.choiceEmoji}>
                  {RPS_ICONS[choice]}
                </span>
                <span className={styles.choiceLabel}>{choice}</span>
              </button>
            ))}
          </div>
        )}

        {missionType === 'symbol_pick' && (
          <div className={styles.symbolGrid}>
            {SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                className={styles.symbolBtn}
                disabled={submitting}
                onClick={() => onSubmit(symbol)}
              >
                {SYMBOL_ICONS[symbol] ?? symbol}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

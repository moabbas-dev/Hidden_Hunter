import { useState, useEffect } from 'react';
import { SYMBOLS } from '../lib/stateMachine';
import styles from './MissionPhase.module.css';

interface Props {
  missionType: string;
  timeoutMs: number;
  hasSubmitted: boolean;
  submitting: boolean;
  onSubmit: (value: string | number) => void;
}

export function MissionPhase({
  missionType,
  timeoutMs,
  hasSubmitted,
  submitting,
  onSubmit,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(timeoutMs / 1000));
  const [numberValue, setNumberValue] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const missionLabel =
    missionType === 'number_1_100'
      ? 'Pick a Number (1–100)'
      : missionType === 'rock_paper_scissors'
        ? 'Rock, Paper, Scissors'
        : 'Pick a Symbol';

  if (hasSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.submitted}>
            <span className={styles.checkmark}>✓</span>
            <p>Submitted! Waiting for others...</p>
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

        <h2 className={styles.title}>{missionLabel}</h2>

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
                  {choice === 'rock' ? '🪨' : choice === 'paper' ? '📄' : '✂️'}
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
                {symbol}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

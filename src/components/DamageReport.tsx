import { useEffect, useState } from 'react';
import type { DamageReport } from '../lib/gameService';
import { DAMAGE_REPORT_DURATION } from '../lib/stateMachine';
import styles from './DamageReport.module.css';

interface Props {
  reports: DamageReport[];
}

export function DamageReportView({ reports }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(DAMAGE_REPORT_DURATION / 1000),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.phase}>DAMAGE REPORT</span>
          <div className={styles.timer}>{secondsLeft}s</div>
        </div>

        <div className={styles.reportList}>
          {reports.map((r) => (
            <div
              key={r.playerId}
              className={`${styles.reportRow} ${r.eliminated ? styles.eliminated : ''}`}
            >
              <div className={styles.reportInfo}>
                <span className={styles.name}>{r.nickname}</span>
                <div className={styles.badges}>
                  {r.damageBlocked && (
                    <span className={styles.shieldBadge}>🛡️ Blocked</span>
                  )}
                  {r.gainedImmunity && (
                    <span className={styles.immunityBadge}>🎯 Immunity!</span>
                  )}
                  {r.eliminated && (
                    <span className={styles.eliminatedBadge}>💀 Eliminated</span>
                  )}
                </div>
              </div>
              <div className={styles.reportStats}>
                {r.attacksReceived > 0 && (
                  <span className={styles.attacks}>
                    -{r.damageBlocked ? 0 : r.attacksReceived} ♥
                  </span>
                )}
                <span className={styles.livesLeft}>
                  {'♥'.repeat(r.livesRemaining)}
                  {'♡'.repeat(Math.max(0, 3 - r.livesRemaining))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

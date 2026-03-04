import { useEffect, useState } from 'react';
import { Shield, Crosshair, Trophy, Skull, Heart } from 'lucide-react';
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
                    <span className={styles.shieldBadge}><Shield size={12} /> Blocked</span>
                  )}
                  {r.gainedImmunity && (
                    <span className={styles.immunityBadge}><Crosshair size={12} /> Immunity gained!</span>
                  )}
                  {r.hadBonusDamage && (
                    <span className={styles.bonusBadge}><Trophy size={12} /> Bonus DMG</span>
                  )}
                  {r.eliminated && (
                    <span className={styles.eliminatedBadge}><Skull size={12} /> Eliminated</span>
                  )}
                </div>
              </div>
              <div className={styles.reportStats}>
                {r.totalDamage > 0 && (
                  <span className={styles.attacks}>
                    -{r.totalDamage} <Heart size={12} fill="currentColor" />
                  </span>
                )}
                {r.damageBlocked && r.attacksReceived > 0 && (
                  <span className={styles.blockedText}>
                    ({r.attacksReceived} blocked)
                  </span>
                )}
                <span className={styles.livesLeft}>
                  {Array.from({ length: r.livesRemaining }).map((_, i) => (
                    <Heart key={`f${i}`} size={14} fill="currentColor" />
                  ))}
                  {Array.from({ length: Math.max(0, 3 - r.livesRemaining) }).map((_, i) => (
                    <Heart key={`e${i}`} size={14} />
                  ))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

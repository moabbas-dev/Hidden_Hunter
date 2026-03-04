import { useState } from 'react';
import { Info } from 'lucide-react';
import styles from './JoinScreen.module.css';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface Props {
  onCreateRoom: (roomCode: string, nickname: string) => Promise<void>;
  onJoinRoom: (roomCode: string, nickname: string) => Promise<void>;
  error: string | null;
}

export function JoinScreen({ onCreateRoom, onJoinRoom, error }: Props) {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const valid = nickname.trim().length >= 1 && nickname.trim().length <= 20;
  const canSubmit =
    mode === 'create'
      ? valid
      : valid && roomCode.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      if (mode === 'create') {
        const code = generateRoomCode();
        await onCreateRoom(code, nickname.trim());
      } else {
        await onJoinRoom(roomCode.trim().toUpperCase(), nickname.trim());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <button
          className={styles.helpBtn}
          onClick={() => setShowRules(true)}
          aria-label="How to play"
        >
          <Info size={18} />
        </button>

        <div className={styles.logo}>
          <img src="/logo.svg" alt="Hidden Hunter" className={styles.logoImg} />
          <h1 className={styles.title}>Hidden Hunter</h1>
          <p className={styles.subtitle}>Real-time elimination strategy</p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'create' ? styles.tabActive : ''}`}
            onClick={() => setMode('create')}
            disabled={loading}
          >
            Create Room
          </button>
          <button
            className={`${styles.tab} ${mode === 'join' ? styles.tabActive : ''}`}
            onClick={() => setMode('join')}
            disabled={loading}
          >
            Join Room
          </button>
        </div>

        <div className={styles.form}>
          <label className={styles.label}>
            Nickname
            <input
              className={styles.input}
              type="text"
              placeholder="Enter your name"
              maxLength={20}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading}
            />
          </label>

          {mode === 'join' && (
            <label className={styles.label}>
              Room Code
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. ABC123"
                maxLength={6}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </label>
          )}

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
          >
            {loading
              ? mode === 'create'
                ? 'Creating...'
                : 'Joining...'
              : mode === 'create'
                ? 'Create Room'
                : 'Join Room'}
          </button>
        </div>
      </div>

      {showRules && (
        <div className={styles.overlay} onClick={() => setShowRules(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>How to Play</h2>

            <div className={styles.ruleSection}>
              <h3>Overview</h3>
              <p>Hidden Hunter is a real-time multiplayer elimination game. Every player secretly hunts one target while being hunted by someone else.</p>
            </div>

            <div className={styles.ruleSection}>
              <h3>Game Flow</h3>
              <ol className={styles.ruleList}>
                <li>Create or join a room (minimum 3 players to start).</li>
                <li>Each round begins with a <strong>Mission</strong> — pick a number, play rock-paper-scissors, or choose a symbol.</li>
                <li>The mission winner gets <strong>+1 bonus damage</strong> on their next attack.</li>
                <li>In the <strong>Attack</strong> phase, choose someone to attack before time runs out.</li>
                <li>A <strong>Damage Report</strong> shows the results. Players with 0 lives are eliminated.</li>
                <li>Rounds continue until one player remains — the winner!</li>
              </ol>
            </div>

            <div className={styles.ruleSection}>
              <h3>Damage Rules</h3>
              <ul className={styles.ruleList}>
                <li>Hitting a <strong>regular target</strong> deals <strong>1 damage</strong>.</li>
                <li>Hitting your <strong>secret target</strong> deals <strong>2 damage</strong> and gives you <strong>immunity</strong> (block all damage next round).</li>
                <li>Mission bonus adds <strong>+1 extra damage</strong> to your attack.</li>
              </ul>
            </div>

            <button className={styles.modalClose} onClick={() => setShowRules(false)}>Got it!</button>
          </div>
        </div>
      )}
    </div>
  );
}

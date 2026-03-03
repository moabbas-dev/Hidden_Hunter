import { useState } from 'react';
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
    </div>
  );
}

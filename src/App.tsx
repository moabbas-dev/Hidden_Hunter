import { useEffect, useState } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { useRoom } from './hooks/useRoom';
import { useGameLoop } from './hooks/useGameLoop';
import { usePlayerActions } from './hooks/usePlayerActions';
import { JoinScreen } from './components/JoinScreen';
import { Lobby } from './components/Lobby';
import { MissionPhase } from './components/MissionPhase';
import { RevealPhase } from './components/RevealPhase';
import { AttackPhase } from './components/AttackPhase';
import { DamageReportView } from './components/DamageReport';
import { GameOver } from './components/GameOver';
import { MISSION_TIMEOUT, ATTACK_TIMEOUT } from './lib/stateMachine';
import { PlayerList } from './components/PlayerList';
import './App.css';

function GameApp() {
  const { state } = useGame();
  const {
    createRoom,
    joinRoom,
    reconnect,
    leaveRoom,
    leaveWaitingRoom,
    leaveMidGame,
    killRoom,
    broadcast,
  } = useRoom();
  const {
    submitMission,
    submitAttack,
    hasSubmittedMission,
    hasSubmittedAttack,
    submitting,
  } = usePlayerActions();

  const [reconnecting, setReconnecting] = useState(true);

  // Drive the game loop (host-only, noop for non-host)
  useGameLoop(broadcast);

  // Try to reconnect on mount
  useEffect(() => {
    reconnect().finally(() => setReconnecting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark player as left when closing during an active game
  useEffect(() => {
    const handleUnload = () => {
      if (state.room && state.currentPlayer && state.room.status === 'playing') {
        // Use sendBeacon for best-effort async leave on tab close
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/players?id=eq.${state.currentPlayer.id}`;
        const headers = {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        };
        navigator.sendBeacon(
          url,
          new Blob(
            [JSON.stringify({ is_alive: false, is_host: false })],
            { type: 'application/json' },
          ),
        );
        // sendBeacon doesn't support PATCH, so we also try fetch as fallback
        fetch(url, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ is_alive: false, is_host: false }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [state.room, state.currentPlayer]);

  if (reconnecting) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Reconnecting...</p>
      </div>
    );
  }

  // No room → join screen
  if (!state.room || !state.currentPlayer) {
    return (
      <JoinScreen
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        error={state.error}
      />
    );
  }

  const { phase, room, currentPlayer, players } = state;
  const alivePlayers = players.filter((p) => p.is_alive);
  const isAlive = currentPlayer.is_alive;

  // Phase-based routing
  switch (phase) {
    case 'waiting':
      return (
        <Lobby
          roomCode={state.roomCode}
          players={players}
          currentPlayer={currentPlayer}
          roomId={room.id}
          onLeave={leaveWaitingRoom}
          onKillRoom={killRoom}
        />
      );

    case 'assigning_targets':
    case 'next_round':
      return (
        <div className="loading-screen">
          <div className="spinner" />
          <p>{phase === 'assigning_targets' ? 'Assigning targets...' : 'Next round...'}</p>
        </div>
      );

    case 'mission':
      return (
        <div className="game-layout">
          {isAlive ? (
            <MissionPhase
              missionType={state.missionType ?? 'number_1_100'}
              timeoutMs={MISSION_TIMEOUT}
              hasSubmitted={hasSubmittedMission}
              submitting={submitting}
              onSubmit={submitMission}
            />
          ) : (
            <div className="spectator-banner">
              <span className="spectator-icon">👻</span>
              <h2>You have been eliminated</h2>
              <p>Watching the mission phase...</p>
            </div>
          )}
          <aside className="sidebar">
            <div className="round-badge">Round {state.round}</div>
            <PlayerList
              players={players}
              currentPlayerId={currentPlayer.id}
            />
          </aside>
        </div>
      );

    case 'reveal':
      return (
        <div className="game-layout">
          <RevealPhase
            results={(state.roundResults ?? []) as { playerId: string; nickname: string; value: unknown }[]}
            missionType={state.missionType ?? 'number_1_100'}
            winnerId={state.missionWinnerId ?? undefined}
            winnerNickname={state.missionWinnerNickname ?? undefined}
            hiddenNumber={state.hiddenNumber ?? undefined}
          />
          <aside className="sidebar">
            <div className="round-badge">Round {state.round}</div>
            <PlayerList
              players={players}
              currentPlayerId={currentPlayer.id}
            />
          </aside>
        </div>
      );

    case 'attack':
      return (
        <div className="game-layout">
          {isAlive ? (
            <AttackPhase
              alivePlayers={alivePlayers}
              currentPlayer={currentPlayer}
              timeoutMs={ATTACK_TIMEOUT}
              hasSubmitted={hasSubmittedAttack}
              submitting={submitting}
              onSubmit={submitAttack}
            />
          ) : (
            <div className="spectator-banner">
              <span className="spectator-icon">👻</span>
              <h2>You have been eliminated</h2>
              <p>Watching the attack phase...</p>
            </div>
          )}
          <aside className="sidebar">
            <div className="round-badge">Round {state.round}</div>
            <PlayerList
              players={players}
              currentPlayerId={currentPlayer.id}
            />
          </aside>
        </div>
      );

    case 'damage_resolution':
    case 'elimination_check':
      return (
        <div className="game-layout">
          {state.damageReports ? (
            <DamageReportView reports={state.damageReports} />
          ) : (
            <div className="loading-screen">
              <div className="spinner" />
              <p>Resolving damage...</p>
            </div>
          )}
          <aside className="sidebar">
            <div className="round-badge">Round {state.round}</div>
            <PlayerList
              players={players}
              currentPlayerId={currentPlayer.id}
            />
          </aside>
        </div>
      );

    case 'finished':
      return (
        <GameOver
          winnerId={state.winnerId}
          players={players}
          onLeave={leaveRoom}
        />
      );

    default:
      return (
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      );
  }
}

export default function App() {
  return (
    <GameProvider>
      <GameApp />
    </GameProvider>
  );
}

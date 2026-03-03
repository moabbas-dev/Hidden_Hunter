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
          <MissionPhase
            missionType={state.missionType ?? 'number_1_100'}
            timeoutMs={MISSION_TIMEOUT}
            hasSubmitted={hasSubmittedMission}
            submitting={submitting}
            onSubmit={submitMission}
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

    case 'reveal':
      return (
        <div className="game-layout">
          <RevealPhase
            results={(state.roundResults ?? []) as { playerId: string; nickname: string; value: unknown }[]}
            missionType={state.missionType ?? 'number_1_100'}
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
          <AttackPhase
            alivePlayers={alivePlayers}
            currentPlayer={currentPlayer}
            timeoutMs={ATTACK_TIMEOUT}
            hasSubmitted={hasSubmittedAttack}
            submitting={submitting}
            onSubmit={submitAttack}
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

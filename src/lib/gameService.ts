import { supabase } from './supabase';
import type { Room, Player, RoundAction } from './stateMachine';
import { generateRandomMissionPayload, type MissionType, type Phase } from './stateMachine';

// ── Room Operations ──────────────────────────────────────────

export async function createRoom(roomCode: string): Promise<Room> {
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      room_code: roomCode,
      status: 'waiting',
      current_round: 0,
      current_phase: 'waiting',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Room;
}

export async function getRoom(roomCode: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as Room) ?? null;
}

export async function getRoomById(roomId: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as Room) ?? null;
}

export async function updateRoomPhase(
  roomId: string,
  phase: Phase,
  extras?: Partial<Pick<Room, 'current_round' | 'mission_type' | 'status'>>,
): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({ current_phase: phase, ...extras })
    .eq('id', roomId);
  if (error) throw error;
}

// ── Leave / Kill Room ────────────────────────────────────────

export async function leavePlayer(playerId: string, roomId: string): Promise<void> {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId);
  if (error) throw error;

  // If the leaving player was host, promote next player
  const remaining = await getPlayers(roomId);
  if (remaining.length > 0 && !remaining.some((p) => p.is_host)) {
    await supabase
      .from('players')
      .update({ is_host: true })
      .eq('id', remaining[0].id);
  }
}

export async function killRoom(roomId: string): Promise<void> {
  // Cascade deletes players & round_actions
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', roomId);
  if (error) throw error;
}

// ── Player Operations ────────────────────────────────────────

export async function joinRoom(
  roomCode: string,
  nickname: string,
): Promise<{ room: Room; player: Player }> {
  // Find or fail
  const room = await getRoom(roomCode);
  if (!room) throw new Error('Room not found');
  if (room.status !== 'waiting') throw new Error('Game already started');

  // Check if already joined (reconnect)
  const existing = await getPlayerByNickname(room.id, nickname);
  if (existing) {
    return { room, player: existing };
  }

  // Check if first player → host
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id);

  const isHost = (count ?? 0) === 0;

  const { data, error } = await supabase
    .from('players')
    .insert({
      room_id: room.id,
      nickname,
      is_host: isHost,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Nickname already taken in this room');
    throw error;
  }

  return { room, player: data as Player };
}

export async function getPlayerByNickname(
  roomId: string,
  nickname: string,
): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('nickname', nickname)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as Player) ?? null;
}

export async function getPlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Player[]) ?? [];
}

export async function getAlivePlayers(roomId: string): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_alive', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Player[]) ?? [];
}

export async function getPlayerById(playerId: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return (data as Player) ?? null;
}

// ── Target Assignment ────────────────────────────────────────

export async function assignTargets(roomId: string): Promise<void> {
  const players = await getAlivePlayers(roomId);
  if (players.length < 2) return;

  const updates = players.map((player, i) => ({
    id: player.id,
    target_id: players[(i + 1) % players.length].id,
  }));

  for (const u of updates) {
    const { error } = await supabase
      .from('players')
      .update({ target_id: u.target_id })
      .eq('id', u.id);
    if (error) throw error;
  }
}

export async function rebuildTargetChain(roomId: string): Promise<void> {
  await assignTargets(roomId); // Same logic, only alive players
}

// ── Round Actions ────────────────────────────────────────────

export async function submitAction(
  roomId: string,
  roundNumber: number,
  playerId: string,
  actionType: 'mission' | 'attack',
  payload: Record<string, unknown>,
): Promise<RoundAction> {
  const { data, error } = await supabase
    .from('round_actions')
    .upsert(
      {
        room_id: roomId,
        round_number: roundNumber,
        player_id: playerId,
        action_type: actionType,
        payload,
      },
      { onConflict: 'room_id,round_number,player_id,action_type' },
    )
    .select()
    .single();
  if (error) throw error;
  return data as RoundAction;
}

export async function getActions(
  roomId: string,
  roundNumber: number,
  actionType: 'mission' | 'attack',
): Promise<RoundAction[]> {
  const { data, error } = await supabase
    .from('round_actions')
    .select('*')
    .eq('room_id', roomId)
    .eq('round_number', roundNumber)
    .eq('action_type', actionType);
  if (error) throw error;
  return (data as RoundAction[]) ?? [];
}

export async function getActionCount(
  roomId: string,
  roundNumber: number,
  actionType: 'mission' | 'attack',
): Promise<number> {
  const { count, error } = await supabase
    .from('round_actions')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .eq('round_number', roundNumber)
    .eq('action_type', actionType);
  if (error) throw error;
  return count ?? 0;
}

// ── Auto-Fill ────────────────────────────────────────────────

export async function autoFillMissions(
  roomId: string,
  roundNumber: number,
  alivePlayers: Player[],
  missionType: MissionType,
): Promise<void> {
  const existing = await getActions(roomId, roundNumber, 'mission');
  const submittedIds = new Set(existing.map((a) => a.player_id));

  for (const player of alivePlayers) {
    if (!submittedIds.has(player.id)) {
      const payload = generateRandomMissionPayload(missionType);
      await submitAction(roomId, roundNumber, player.id, 'mission', payload);
    }
  }
}

export async function autoFillAttacks(
  roomId: string,
  roundNumber: number,
  alivePlayers: Player[],
): Promise<void> {
  const existing = await getActions(roomId, roundNumber, 'attack');
  const submittedIds = new Set(existing.map((a) => a.player_id));

  for (const player of alivePlayers) {
    if (!submittedIds.has(player.id)) {
      // Pick a random alive player that is not self
      const targets = alivePlayers.filter((p) => p.id !== player.id);
      const target = targets[Math.floor(Math.random() * targets.length)];
      await submitAction(roomId, roundNumber, player.id, 'attack', {
        target_id: target.id,
      });
    }
  }
}

// ── Damage Resolution ────────────────────────────────────────

export interface DamageReport {
  playerId: string;
  nickname: string;
  attacksReceived: number;
  damageBlocked: boolean;
  livesRemaining: number;
  eliminated: boolean;
  gainedImmunity: boolean;
}

export async function applyDamage(
  roomId: string,
  roundNumber: number,
): Promise<DamageReport[]> {
  const attacks = await getActions(roomId, roundNumber, 'attack');
  const alivePlayers = await getAlivePlayers(roomId);
  const playerMap = new Map(alivePlayers.map((p) => [p.id, { ...p }]));

  // Count attacks on each player
  const attackCount = new Map<string, number>();
  const attackerTargets = new Map<string, string>(); // attackerId → targetId

  for (const action of attacks) {
    const targetId = action.payload.target_id as string;
    attackerTargets.set(action.player_id, targetId);
    attackCount.set(targetId, (attackCount.get(targetId) ?? 0) + 1);
  }

  // Track who had immunity this round (to reset AFTER processing)
  const hadImmunity = new Set<string>();
  // Track who gains immunity from hitting secret target
  const gainsImmunity = new Set<string>();

  // Check who hit their secret target → gains immunity for next round
  for (const [attackerId, targetId] of attackerTargets) {
    const attacker = playerMap.get(attackerId);
    if (attacker && attacker.target_id === targetId) {
      gainsImmunity.add(attackerId);
    }
  }

  const reports: DamageReport[] = [];

  for (const player of alivePlayers) {
    const p = playerMap.get(player.id)!;
    const received = attackCount.get(p.id) ?? 0;
    const blocked = p.immunity;

    if (blocked) {
      hadImmunity.add(p.id);
    }

    const damage = blocked ? 0 : received;
    const newLives = p.lives - damage;
    const eliminated = newLives <= 0;

    reports.push({
      playerId: p.id,
      nickname: p.nickname,
      attacksReceived: received,
      damageBlocked: blocked,
      livesRemaining: Math.max(0, newLives),
      eliminated,
      gainedImmunity: gainsImmunity.has(p.id),
    });

    // Update player in DB
    const updatePayload: Record<string, unknown> = {
      lives: Math.max(0, newLives),
    };

    // Set immunity: true if gained from secret target hit, false if used this round, otherwise keep
    if (gainsImmunity.has(p.id)) {
      updatePayload.immunity = true;
    } else if (hadImmunity.has(p.id)) {
      updatePayload.immunity = false;
    }

    const { error } = await supabase
      .from('players')
      .update(updatePayload)
      .eq('id', p.id);
    if (error) throw error;
  }

  return reports;
}

// ── Elimination ──────────────────────────────────────────────

export async function eliminatePlayers(roomId: string): Promise<string[]> {
  // Mark dead
  const { data: eliminated, error } = await supabase
    .from('players')
    .update({ is_alive: false })
    .eq('room_id', roomId)
    .eq('is_alive', true)
    .lte('lives', 0)
    .select();
  if (error) throw error;

  const eliminatedIds = (eliminated ?? []).map((p: Player) => p.id);

  if (eliminatedIds.length > 0) {
    await rebuildTargetChain(roomId);
  }

  return eliminatedIds;
}

// ── Host Promotion ───────────────────────────────────────────

export async function promoteNextHost(roomId: string): Promise<void> {
  const alive = await getAlivePlayers(roomId);
  if (alive.length === 0) return;

  // Clear all hosts first
  await supabase
    .from('players')
    .update({ is_host: false })
    .eq('room_id', roomId);

  // Promote earliest alive player
  await supabase
    .from('players')
    .update({ is_host: true })
    .eq('id', alive[0].id);
}

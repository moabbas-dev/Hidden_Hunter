-- ============================================================
-- Hidden Hunter — Supabase SQL Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- ROOMS
-- ============================================================
create table if not exists rooms (
  id uuid primary key default uuid_generate_v4(),
  room_code text unique not null,
  status text not null default 'waiting'
    check (status in ('waiting', 'playing', 'finished')),
  current_round integer not null default 0,
  current_phase text not null default 'waiting'
    check (current_phase in (
      'waiting',
      'assigning_targets',
      'mission',
      'reveal',
      'attack',
      'damage_resolution',
      'elimination_check',
      'next_round',
      'finished'
    )),
  mission_type text default null
    check (mission_type is null or mission_type in (
      'number_1_100',
      'rock_paper_scissors',
      'symbol_pick'
    )),
  created_at timestamptz default now()
);

-- ============================================================
-- PLAYERS
-- ============================================================
create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  lives integer not null default 3,
  is_alive boolean not null default true,
  target_id uuid default null references players(id) on delete set null,
  immunity boolean not null default false,
  is_host boolean not null default false,
  created_at timestamptz default now(),

  constraint unique_nickname_per_room unique (room_id, nickname)
);

create index if not exists idx_players_room_id on players(room_id);

-- ============================================================
-- ROUND ACTIONS
-- ============================================================
create table if not exists round_actions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references rooms(id) on delete cascade,
  round_number integer not null,
  player_id uuid not null references players(id) on delete cascade,
  action_type text not null
    check (action_type in ('mission', 'attack')),
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

-- Prevent duplicate submissions per player per round per action type
create unique index if not exists idx_unique_round_action
  on round_actions(room_id, round_number, player_id, action_type);

create index if not exists idx_round_actions_lookup
  on round_actions(room_id, round_number, action_type);

-- ============================================================
-- REALTIME — Enable realtime on all tables
-- (Also enable via Dashboard → Database → Replication)
-- ============================================================
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table round_actions;

-- ============================================================
-- RLS — Disable for simplicity (room-code gated, no auth)
-- ============================================================
alter table rooms enable row level security;
alter table players enable row level security;
alter table round_actions enable row level security;

create policy "Allow all on rooms" on rooms for all using (true) with check (true);
create policy "Allow all on players" on players for all using (true) with check (true);
create policy "Allow all on round_actions" on round_actions for all using (true) with check (true);

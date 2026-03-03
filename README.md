# Hidden Hunter

Real-time multiplayer elimination strategy game built with **React**, **TypeScript**, and **Supabase**.

Players join a room, complete neutral missions, then secretly attack each other. Last player standing wins.

---

## Tech Stack

| Layer       | Technology                          |
| ----------- | ----------------------------------- |
| Frontend    | React 19 + TypeScript (Vite)        |
| Backend/DB  | Supabase (PostgreSQL + Realtime)    |
| State Mgmt  | React Context + useReducer          |
| Styling     | CSS Modules (dark theme)            |
| Auth        | None — room code + nickname access  |

## Features

- **Room-based multiplayer** — create or join with a 6-character code
- **Circular target chain** — every player hunts exactly one secret target
- **3 mission types** — Number (1–100), Rock Paper Scissors, Symbol Pick
- **Real-time sync** — all state changes broadcast via Supabase Realtime
- **Deterministic state machine** — 9 phases with strict transitions
- **Immunity mechanic** — hitting your secret target grants damage immunity
- **Auto-fill on timeout** — unresponsive players get random valid actions
- **Host promotion** — if host disconnects, next player takes over
- **Reconnect support** — refresh the page and rejoin seamlessly

## Game Flow

```
Waiting → Assign Targets → Mission → Reveal → Attack → Damage Resolution → Elimination Check → Next Round → ...
                                                                                                  ↓
                                                                                               Finished
```

Each round:

1. **Mission** — All players complete a random neutral task (20s timeout)
2. **Reveal** — Results shown to everyone (5s)
3. **Attack** — Each player secretly picks a target to attack (15s timeout)
4. **Damage Resolution** — Attacks tallied, immunity applied, lives updated
5. **Elimination Check** — Dead players removed, target chain rebuilt
6. Repeat until one player remains

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- A [Supabase](https://supabase.com/) project (free tier works)

## Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd hidden-hunter
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. Open the **SQL Editor** and run the contents of [`supabase-schema.sql`](supabase-schema.sql)
3. Go to **Database → Replication** and enable Realtime for: `rooms`, `players`, `round_actions`

### 4. Configure environment

Copy `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Production Build

```bash
npm run build
```

Output goes to `dist/`. Serve with any static host (Vercel, Netlify, Cloudflare Pages, etc.).

## Testing Locally

1. Open **3 browser tabs** to `http://localhost:5173`
2. Tab 1: Create a room → copy the room code
3. Tab 2 & 3: Join with different nicknames using the code
4. Tab 1 (host): Click **Start Game**
5. Play through rounds — verify real-time sync across all tabs

## Project Structure

```
src/
  lib/
    supabase.ts          Supabase client singleton
    gameService.ts        All DB read/write operations
    stateMachine.ts       Phase constants, types, helpers
  context/
    GameContext.tsx        React Context + useReducer
  hooks/
    useRoom.ts            Room join/create, realtime subscriptions
    useGameLoop.ts        Host-only game state machine driver
    usePlayerActions.ts   Mission & attack submission
  components/
    JoinScreen.tsx        Create / Join room UI
    Lobby.tsx             Waiting room with player list
    PlayerList.tsx        Player cards with lives display
    MissionPhase.tsx      3 mission type UIs
    RevealPhase.tsx       Mission results display
    AttackPhase.tsx       Target selection with secret hint
    DamageReport.tsx      Damage & elimination summary
    GameOver.tsx          Winner announcement & scoreboard
  App.tsx                 Phase-based screen router
  main.tsx               Entry point
```

## License

MIT

# NovusIDE

A collaborative cloud IDE that runs in the browser — with **real Docker containers**, a **real terminal**, and **realtime multiplayer editing**. No fake panels: the terminal is a server-side pty attached to your project's container, edits sync through Yjs CRDTs, and the live preview frames the dev server actually running inside Docker.

## Stack

| Layer | Tech |
| --- | --- |
| Client | React 18 · TypeScript · Vite · TailwindCSS · Framer Motion · Zustand · TanStack Query · Monaco · xterm.js · Yjs + y-monaco |
| Server | Node 20 · Express · MongoDB (Mongoose) · Socket.IO · JWT (access + rotating refresh) · dockerode · node-pty · simple-git |
| Runtime | Per-project Docker container (`novuside-runtime`: Node 20, Python 3, git, zsh, build tools) |

## Prerequisites

- Node.js ≥ 20 and npm
- Docker Desktop (running)

## Setup

```bash
npm install               # installs client + server workspaces
npm run db:up             # MongoDB via docker compose (host port 27018)
npm run runtime:build     # builds the novuside-runtime container image (once)
npm run dev               # server on :4000, client on :5173
```

Open http://localhost:5173, sign up, create a project from a template (React + Vite, Express, Next.js, Node, Python, or blank) — the IDE opens, the container starts, and you can `npm install && npm run dev` in the terminal. Ports 3000 / 5173 / 8000 / 8080 opened inside the container are mapped to host ports and appear in the Preview panel.

## How it works

- **Files** live on the host at `server/data/workspaces/<projectId>/`, bind-mounted into the container at `/workspace`. Editor, terminal, git and Docker all see the same files — zero sync code.
- **Terminal**: node-pty spawns `docker exec -it <container> /bin/bash` (falls back to a local shell at the workspace when Docker is unavailable). Sessions persist server-side with scrollback replay across page reloads.
- **Collaboration**: the server holds an authoritative Y.Doc per open file and relays updates/awareness over the `/collab` Socket.IO namespace; y-monaco renders remote cursors. Docs are debounce-persisted to disk and flushed before every git operation.
- **Auth**: short-lived access token (in memory) + rotating refresh token (httpOnly cookie) with revocable sessions.
- **Permissions**: per-project roles — owner / editor / viewer (viewers get read-only editor, no terminal, read-only chat).

## Environment (optional)

Copy `server/.env.example` to `server/.env`. Everything works with zero configuration in development:

- **SMTP unset** → verification / reset links are logged to the server console (and surfaced in the UI in dev).
- **GitHub / Google OAuth unset** → the buttons explain how to enable them; email+password always works.
- `MONGO_URI` defaults to `mongodb://localhost:27018/novuside` (matching `docker-compose.yml`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | server + client concurrently |
| `npm run build` | production build of both workspaces |
| `npm run typecheck` | `tsc --noEmit` for both workspaces |
| `npm run runtime:build` | rebuild the project runtime image |
| `npm run db:up` | start MongoDB |

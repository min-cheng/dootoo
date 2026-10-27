# dootoo

A personal to-do app for Min and family. Live at **https://dootoo.vercel.app**.

Each person signs up with their own email and password and sees only their own tasks. It works in a desktop browser and on a phone, where it can be added to the home screen like an app.

New to the app? Read the plain-language guide: [docs/getting-started.html](docs/getting-started.html).

## How it fits together

| Piece | What it does | Where to manage it |
| --- | --- | --- |
| **GitHub** | Stores the code. The `main` branch is the official copy. | github.com/min-cheng/dootoo |
| **Vercel** | Runs the website. Rebuilds it automatically whenever `main` changes on GitHub. | vercel.com → team `min-creative` → project `dootoo` |
| **Supabase** | Stores accounts, passwords, tasks and labels. | supabase.com → project `wdpjkgsipfktutqkffqs` |

So a change travels like this: edit code → push to GitHub `main` → Vercel rebuilds (about 30 seconds) → live at dootoo.vercel.app.

The app used to be published at `min-cheng.github.io/dootoo` through GitHub Pages. That was switched off on 2026-10-27. Vercel is the only host now.

## Tech stack

- **React 19 + TypeScript**, built with **Vite**
- **Tailwind CSS** for styling, **lucide-react** for icons
- **Zustand** for app state (`src/store/useStore.ts`)
- **Supabase** (`@supabase/supabase-js`) for login and the database
- **date-fns** for dates, **@dnd-kit** for drag-and-drop on the board

## Features

- Views: Today, Upcoming, All, Board (to do / in progress / done), Calendar, Starred, Waiting, and one per label
- Natural-language quick add, e.g. `call mom tomorrow at 3pm #family !!` (see `src/utils/nlp.ts`)
  - Dates: `today`, `tomorrow`, `next week`, `next month`, a weekday (`friday`, `next friday`), a full month name and day (`june 15`)
  - Time: `at 3pm`, `at 3:30pm`, `at 15:00`
  - Repeats: `every day`/`daily`, `every week`/`weekly`, `every month`/`monthly`, `every weekday`, `first sunday of every month`, `last friday of the month`
  - `#label` adds a label, `!!` stars it, `~name` marks it as waiting on someone
- Subtasks, notes, labels with colors, starred tasks, "waiting on" tasks
- Keyboard shortcuts on desktop: `Q` or `⌘K` to add, `1`–`5` to switch views, `Esc` to close
- Dark mode and a serif-font mode (saved per device)
- Email + password login with sign up and "Forgot password?"

## Project layout

```
src/
  App.tsx            Login gate, layout, keyboard shortcuts
  main.tsx           Entry point
  components/        Screens and UI (Auth, TaskList, BoardView, CalendarView, TaskDetail, QuickAdd, Sidebar, BottomNav…)
  store/useStore.ts  All app state, plus reading/writing Supabase
  lib/supabase.ts    Supabase client
  types/index.ts     Task, Label, view types
  utils/nlp.ts       Quick-add sentence parsing
  utils/date.ts      Date helpers, repeat logic
public/              Static files (favicon, home-screen manifest)
docs/                Human-facing guides
```

## Database (Supabase)

Two tables, both with a `user_id` column tied to the signed-in user:

- **tasks**: `id, user_id, title, notes, completed, completed_at, due_date, due_time, label_ids, subtasks (json), recurring (json), status, starred, waiting, waiting_on, created_at, updated_at, order`
- **labels**: `id, user_id, name, color`

Row-level security is on: a logged-out visitor gets zero rows back (checked 2026-10-27). The table definitions and security rules live only in the Supabase dashboard, not in this repo.

The column mapping lives in `taskToRow` / `rowToTask` in `src/store/useStore.ts`. To add a field, add the column in Supabase **and** update both functions.

Supabase settings that matter (Authentication → URL Configuration):
- **Site URL**: `https://dootoo.vercel.app`
- **Redirect URLs**: include `https://dootoo.vercel.app`

Without these, password-reset and confirmation emails send people to the wrong place.

## Running it locally

1. Create `.env.local` in this folder with:
   ```
   VITE_SUPABASE_URL=https://wdpjkgsipfktutqkffqs.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key from Supabase → Project Settings → API>
   ```
2. `npm install`
3. `npm run dev`, then open http://localhost:5173

Local runs use the **same** Supabase database as the live site, so you're working with real accounts and tasks.

## Deploying

Push to `main`. Vercel builds and publishes automatically.

- Check status: `vercel ls`, then `vercel inspect <deployment-url>`
- Don't use `vercel --prod` for normal deploys. It uploads straight from your laptop and skips GitHub, so the live site can drift from the code on GitHub.
- The two `VITE_SUPABASE_*` values are also stored in Vercel (Project → Settings → Environment Variables). Vite bakes them in at build time, so after changing one there, trigger a fresh build (push a commit, or `vercel redeploy <url>`).

## Contributing

- **Request a feature or report a bug:** open an issue at https://github.com/min-cheng/dootoo/issues (free GitHub account needed).
- **Change the code:** ask Min to add you as a collaborator, then work on a branch and open a pull request. Every pull request gets its own Vercel preview link, so you can try a change before it goes live.
- Working with Claude Code? It reads [CLAUDE.md](CLAUDE.md) automatically.

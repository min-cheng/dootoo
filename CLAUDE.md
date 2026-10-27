# CLAUDE.md

Instructions for Claude Code working in this repo. Read README.md for the full stack, schema, and layout.

## Working with Min

- Min is not a developer. Explain things in plain words, the way you'd brief a smart reporter who has never coded. Name the thing ("the database", "the live site") before the jargon.
- When Min has to act (a dashboard setting, a terminal command), give one step at a time, say exactly where to click or what to paste, and say what they'll see when it worked.
- Do steps yourself when you can rather than handing them to Min.

## The setup in one paragraph

Code lives on GitHub (`min-cheng/dootoo`, public). Vercel (team `min-creative`, project `dootoo`) watches the `main` branch and rebuilds https://dootoo.vercel.app on every push. Supabase holds auth and data (tables `tasks` and `labels`, each with `user_id`). GitHub Pages hosting was removed on 2026-10-27; don't bring it back.

## Rules

- **Deploy = push to `main`.** Don't run `vercel --prod`; it bypasses GitHub. Pushing to `main` changes the live site, so confirm with Min before pushing anything Min didn't ask for.
- **Keep Vite `base: '/'`.** The old `/dootoo/` base path was for GitHub Pages. `public/manifest.json` and `index.html` use root paths too.
- **Run `npm run build` before pushing.** It type-checks (`tsc -b`). The "chunks larger than 500 kB" warning is known and harmless.
- **Check UI changes in the browser.** Dev server: `npm run dev` → http://localhost:5173 (or `preview_start` with name `dootoo`). After a push, load https://dootoo.vercel.app and check the console.
- **Never commit `.claude/settings.local.json`.** Stage files by name.
- **Keep the two user guides in sync.** The in-app About page (`src/components/AboutView.tsx`) and `docs/getting-started.html` (published as a shareable page) say the same things. When a feature or instruction changes, update both.
- **Checking screens behind login:** there's no test account. To check a component visually, make a throwaway `*.html` + `*.tsx` pair in the repo root that renders it (set store state with `useStore.setState`), open it on the dev server, then delete both files.
- **Local dev uses the production database.** There is no staging Supabase. Don't create test data or test accounts without asking.

## Secrets and env vars

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` live in `.env.local` (gitignored) and in Vercel project env vars (Production, Preview, Development).
- Reading `.env.local` with `cat` gets blocked. To use the values in a script, load them without printing: `node -e 'process.loadEnvFile(".env.local"); …'`.
- Vite inlines env vars at build time. After changing one in Vercel, trigger a fresh build; a cached build keeps the old values.
- `vercel env add` flags `VITE_SUPABASE_ANON_KEY` as a credential and offers to rename it to `SUPABASE_ANON_KEY`. Pick "keep VITE_SUPABASE_ANON_KEY as Config", or the app loads with "supabaseKey is required" and a blank page.

## Supabase

- Schema and row-level security live only in the Supabase dashboard; there are no migrations in the repo. You can't change them yourself. Write the exact SQL, then tell Min where to paste it (Supabase → SQL Editor) and what success looks like.
- New task field: add the column in Supabase, then update `taskToRow` and `rowToTask` in `src/store/useStore.ts` and the `Task` type in `src/types/index.ts`.
- Auth is email + password. Sign up, sign in and "Forgot password?" are in `src/components/Auth.tsx`. Password-reset links come back with `#…type=recovery`. `src/lib/supabase.ts` records that before the client clears the URL, and `App.tsx` then shows `SetPassword`.
- Supabase Auth → URL Configuration must have Site URL `https://dootoo.vercel.app`. A wrong value shows up as `{"error":"requested path is invalid"}` when someone clicks an email link.
- The built-in Supabase email sender only sends a few emails per hour. "No email arrived" is often this limit.

## Checking a deploy

- `vercel ls` lists deployments. When its output is piped, it prints only URLs, so use `vercel inspect <url>` to read the status (`● Ready`).
- Quick privacy check: a logged-out request to `/rest/v1/tasks?select=id` with the anon key should return `[]`.

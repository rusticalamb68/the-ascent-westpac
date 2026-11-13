# The Ascent: Westpac NZ edition

A SQL climbing competition for Snowflake analysts. Six camps, 27 challenges, team boards and a sign-in-only leaderboard for Westpac NZ staff. Queries run in the player's browser (DuckDB-WASM) against a synthetic ski-resort dataset; the server only grades results and keeps scores.

## Deploy to Vercel

1. Put this folder in a GitHub repository (or run `npx vercel` from inside it).
2. In Vercel: Add New > Project, import the repository. Framework is detected as Next.js; keep the defaults.
3. In the project's Storage tab, create a Neon Postgres database and connect it to the project. This sets `DATABASE_URL`.
4. In Settings > Environment Variables, add `ADMIN_KEY` with a long random value.
5. Redeploy. Tables are created automatically on the first visit.

Node 22.18 or later is required (Vercel's Node 22 or 24 setting).

## Run locally

```
npm install
npm run dev
```

With no `DATABASE_URL`, local development uses an embedded Postgres stored in `.pglite/`.

## Things you will want to edit

| What | Where |
|---|---|
| Season dates, team goal, team size | `src/content/season.ts` |
| Challenges, camps, daily questions | `src/content/challenges.ts` then `npm run answers` |
| Badges | `src/content/badges.ts` |
| Colours and type | top of `src/app/globals.css` |
| Dataset | `scripts/gen-data.mjs` then `npm run data` |

`npm run answers` recomputes the expected results (`src/server/answers.generated.json`) with the same engine the browser uses, and fails if any solution returns nothing or a "fix the query" starter already passes. Commit the regenerated file.

## Organiser endpoints

Send the header `x-admin-key: <ADMIN_KEY>`.

- `GET /api/admin/players` — everyone, with altitude
- `GET /api/admin/suggestions` — challenge ideas from players
- `GET /api/admin/audit?top=20` — the winning SQL for the top climbers, for prize checks
- `POST /api/admin/hide` with `{"name": "Climber Name"}` — hide a climber from the boards (`"hidden": false` to restore)

## How grading works

Each player gets one of several variants of most challenges. The browser runs the query and sends the result rows; the server compares them with the expected rows, which never leave the server. The submitted SQL is stored with every correct answer so results can be re-run before prizes are awarded.

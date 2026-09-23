# Play with Jev

A little arcade with a clever opponent. Play **Heist**, **Chess**, and **Minesweeper** with [TypeSafe Jev](https://vercel.com/ai-gateway/models/jev), using Vercel AI Gateway for its decisions.

**[Play the games →](https://play-with-jev.vercel.app)**

Made by [Hussain Fakhruddin](https://github.com/hussainanjar).

## The games

| Game      | Challenge                                                                                                                    | Play                                             |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Jev Heist | Collect three gems and escape in 40 turns while Jev controls the guard. Use dashes and noise decoys to get away.             | [/heist](https://play-with-jev.vercel.app/heist) |
| Jev Chess | Play either color against Jev, with legal move hints, promotion choices, move history, PGN export, and browser-local resume. | [/chess](https://play-with-jev.vercel.app/chess) |

All three games support keyboard and touch controls, explain their controls in-game, and display Jev's actual choice probabilities. There are no player accounts or public leaderboards.

### Minesweeper

**[Play Minesweeper →](https://play-with-jev.vercel.app/minesweeper)**

Clear every safe square on Easy (9 × 9, 10 mines) or Tricky (12 × 12, 24 mines). Your first reveal and its neighbors are always mine-free. Empty areas open automatically. Right-click, press F, or use the touch-friendly Flag mode to mark suspected mines. Reveal an open number with the matching number of neighboring flags to open its remaining neighbors; incorrect flags can trigger a mine.

Jev is an optional hint partner. The browser sends only visible numbers, player flags, and hidden-square markers to `POST /api/minesweeper/hint`. Hidden mine locations are never sent to the model. Jev selects a suggested reveal through the same `typesafe-ai/jev` evaluation API; the player decides whether to use it. Choice percentages are not safety probabilities, and a hint can be wrong. Model failures leave the board playable and offer a retry.

The field and timer live in browser memory and reset when you leave or reload the page. There is no leaderboard or signed Minesweeper session. The shared origin checks and per-instance throttling apply to hint requests. Ordinary reveals and flags do not make AI calls.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
cp .env.example .env.local
```

Set these **server-only** values in `.env.local`:

- `AI_GATEWAY_API_KEY`: an API key for your Vercel AI Gateway account.
- `GAME_SIGNING_SECRET`: a cryptographically random secret of at least 32 bytes.

Alternatively, link your own Vercel project with `vercel link` and run `vercel env pull .env.local` to use its short-lived OIDC token. Pull before adding any local values, because this command replaces the file.

```sh
npm run dev
```

Open http://localhost:3000. Refresh local OIDC credentials when they expire. Never prefix either secret with `NEXT_PUBLIC_` or commit `.env.local`.

## Deploy your own

Import this repository into Vercel as a Next.js project. Configure `GAME_SIGNING_SECRET` for each deployment environment and ensure AI Gateway access and credits are available. Vercel provides OIDC authentication automatically on deployments.

The project uses Node.js 24 and the `iad1` function region. `vercel.json` specifies the framework. You can also deploy a linked project with:

```sh
vercel --prod
```

Update the public URLs in `src/lib/site.ts` and `package.json` for your fork.

## How Jev makes decisions

The server generates the legal choices and calls AI SDK `experimental_evaluate` with `typesafe-ai/jev`. Jev selects a move from those choices. No alternate model or scripted opponent replaces Jev on an AI failure; the UI allows retrying instead.

For Heist, Jev receives the map, sensed target, recent positions, objectives, and legal guard moves with path distances. Noise decoys temporarily redirect its target.

For Chess, `chess.js` validates moves and outcomes. Jev receives the board, FEN, history, and tactical facts about legal candidates such as checks, captures, promotions, and immediate recapture risk. This is a casual opponent with no claimed Elo rating. The displayed percentages describe move choices, not win probabilities.

Chess automatically ends on threefold repetition and the 50-move rule, as well as checkmate, stalemate, and insufficient material.

## Project structure

```text
src/app/page.tsx                 Arcade homepage
src/app/heist/                   Heist interface
src/app/chess/                   Chess interface
src/app/minesweeper/             Minesweeper interface
src/app/api/minesweeper/hint/     Jev hints from visible clues only
src/lib/minesweeper.ts           Minesweeper rules and visible board serialization
src/app/api/start/               Start a Heist session
src/app/api/turn/                Apply a turn and ask Jev for its guard move
src/app/api/chess/start/         Start Chess, including Jev's opening as White
src/app/api/chess/move/          Validate a move and ask Jev for its reply
src/lib/game.ts                 Heist rules
src/lib/session.ts              Signing, origin checks, request throttling
src/lib/chess-game.ts           Shared Chess types and game helpers
src/lib/chess-server.ts         Chess session validation and Jev evaluation
```

Built with Next.js, React, TypeScript, the Vercel AI SDK, and chess.js. Dependencies are pinned because the evaluation API is experimental.

## Session and hosting limits

Game state is signed with HMAC on the server. Heist sessions last one hour; Chess sessions last 24 hours. Chess replays the full signed move history to preserve repetition, castling, and en passant state. Signing prevents edited state but does not prevent replaying a previously signed turn.

Request throttling is best effort per server instance. It is not a distributed quota or a spending cap. Configure Gateway budgets and platform rate limits appropriate to your deployment's traffic. Scores and saved games live in the player's browser; saved games from another hostname do not automatically transfer.

## License and artwork

Application code is licensed under [MIT](LICENSE). Chess piece SVGs by Cburnett and Wikimedia Commons contributors are licensed separately under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). See [artwork credits](public/chess/ATTRIBUTION.md).

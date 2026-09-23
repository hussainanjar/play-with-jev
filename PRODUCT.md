# Product
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Delegated by user: Next.js and TypeScript, deployed to Vercel. AI SDK 7 evaluation API uses typesafe-ai/jev through Vercel AI Gateway.

## Product Purpose
Build a fun playable game that uses TypeSafe Jev for decision making, and deploy it to Vercel (confirmed user request).

## Users
Assumption: casual players seeking a short browser game on desktop or phone.

## Capabilities and Constraints
Confirmed: actual Jev decisions through AI Gateway, Vercel deployment. Live evaluation succeeded using Vercel OIDC on 2026-09-22.
User accepted recommendation: an arcade heist, collect three gems, avoid a Jev-controlled guard, and escape. Short turns, keyboard and touch controls, replay, clear win/loss, and honest connection errors. No fabricated AI fallback.

## Product Principles
- Play immediately with understandable rules.
- Make AI choices visible after each turn.
- Keep credentials and evaluation requests on the server.

## Chess addition — 2026-09-23

User requested a chess game using Jev. Added standard casual chess at `/chess`, alongside the original heist. Players choose White or Black; Jev selects a legal opponent move through the same Vercel AI Gateway integration. The implementation includes all standard special moves, automatic draw handling, keyboard/touch input, local recovery, and PGN export. No chess Elo or competitive strength claim is made.

## Arcade homepage — 2026-09-23

The collection is branded Play with Jev at `https://play-with-jev.vercel.app`. The homepage links to Heist at `/heist` and Chess at `/chess`. Both game headers offer an All games link. The source is published under `hussainanjar/play-with-jev` on GitHub. Browsing the homepage makes no model requests.

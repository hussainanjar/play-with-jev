import { createHmac, timingSafeEqual } from "node:crypto";
import { stateSchema, type GameState } from "./game";

function secret() {
  const value = process.env.GAME_SIGNING_SECRET;
  if (!value) throw new Error("Game session signing is not configured.");
  return value;
}
export function signState(
  state: GameState,
  expires = Date.now() + 60 * 60 * 1000,
) {
  const payload = JSON.stringify({ state, expires });
  return {
    state,
    expires,
    signature: createHmac("sha256", secret()).update(payload).digest("hex"),
  };
}
export function verifyState(input: {
  state: unknown;
  expires: number;
  signature: string;
}) {
  if (!Number.isFinite(input.expires) || input.expires < Date.now())
    throw new Error("This session expired. Start a new heist.");
  const state = stateSchema.parse(input.state);
  const expected = signState(state, input.expires).signature;
  const actual = Buffer.from(input.signature, "hex");
  if (
    actual.length !== 32 ||
    !timingSafeEqual(Buffer.from(expected, "hex"), actual)
  )
    throw new Error("Invalid game session. Start a new heist.");
  return state;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
// Best effort per-instance abuse control. A distributed quota belongs in the platform firewall.
const buckets = new Map<string, { count: number; until: number }>();
export function allowRequest(request: Request) {
  const now = Date.now();
  if (buckets.size > 1000)
    for (const [key, b] of buckets) if (b.until < now) buckets.delete(key);
  const key =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "local";
  const b = buckets.get(key);
  if (!b || b.until < now) {
    buckets.set(key, { count: 1, until: now + 60000 });
    return true;
  }
  return ++b.count <= 90;
}

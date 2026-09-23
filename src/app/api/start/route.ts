import { randomInt } from "node:crypto";
import { newGame } from "@/lib/game";
import { allowRequest, sameOrigin, signState } from "@/lib/session";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowRequest(request))
    return Response.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  try {
    return Response.json(signState(newGame(randomInt(3))), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error:
          "The game server is not configured yet. Please try again shortly.",
      },
      { status: 503 },
    );
  }
}

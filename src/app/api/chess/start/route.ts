import { Chess } from "chess.js";
import { z } from "zod";
import { allowRequest, sameOrigin } from "@/lib/session";
import {
  chooseChessMove,
  chessServiceError,
  signChess,
} from "@/lib/chess-server";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowRequest(request))
    return Response.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  let player: "w" | "b";
  try {
    const text = await request.text();
    if (text.length > 200) throw new Error();
    player = z
      .object({ player: z.enum(["w", "b"]) })
      .parse(JSON.parse(text)).player;
  } catch {
    return Response.json({ error: "Choose White or Black." }, { status: 400 });
  }
  try {
    const chess = new Chess();
    const decision = player === "b" ? await chooseChessMove(chess) : null;
    return Response.json(
      {
        ...signChess({ moves: chess.history(), player, resigned: false }),
        decision,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return chessServiceError(e);
  }
}

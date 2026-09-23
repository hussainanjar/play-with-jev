import { z } from "zod";
import { allowRequest, sameOrigin } from "@/lib/session";
import { chessOutcome, replayChess } from "@/lib/chess-game";
import {
  chessEnvelopeSchema,
  chooseChessMove,
  chessServiceError,
  signChess,
  verifyChess,
} from "@/lib/chess-server";
export const runtime = "nodejs";
export const maxDuration = 30;
const schema = chessEnvelopeSchema.extend({
  action: z.enum(["move", "resign"]),
  move: z
    .object({
      from: z.string().regex(/^[a-h][1-8]$/),
      to: z.string().regex(/^[a-h][1-8]$/),
      promotion: z.enum(["q", "r", "b", "n"]).optional(),
    })
    .optional(),
});
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowRequest(request))
    return Response.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  let body: z.infer<typeof schema>;
  let chess;
  let state;
  try {
    const text = await request.text();
    if (text.length > 24000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    body = schema.parse(JSON.parse(text));
    state = verifyChess(body);
    chess = replayChess(state.moves);
    if (chessOutcome(chess, state).over)
      throw new Error("This game has ended. Start a new game.");
    if (chess.turn() !== state.player) throw new Error("It is not your turn.");
    if (body.action === "resign")
      return Response.json({
        ...signChess({ ...state, resigned: true }, body.expires),
        decision: null,
      });
    if (!body.move) throw new Error("Select a move.");
    chess.move(body.move);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Invalid chess request."
            : e instanceof Error
              ? e.message
              : "Invalid move.",
      },
      { status: 400 },
    );
  }
  try {
    const decision = chess.isGameOver() ? null : await chooseChessMove(chess);
    return Response.json(
      {
        ...signChess({ ...state, moves: chess.history() }, body.expires),
        decision,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return chessServiceError(e);
  }
}

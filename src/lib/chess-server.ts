import { createHmac, timingSafeEqual } from "node:crypto";
import { experimental_evaluate as evaluate } from "ai";
import { Chess, type Color } from "chess.js";
import { z } from "zod";
import {
  colorName,
  PIECE_NAMES,
  PIECE_VALUES,
  type ChessState,
  type ChessDecision,
} from "./chess-game";

export const chessStateSchema = z.object({
  moves: z.array(z.string().min(2).max(12)).max(1200),
  player: z.enum(["w", "b"]),
  resigned: z.boolean(),
});
export const chessEnvelopeSchema = z.object({
  state: chessStateSchema,
  expires: z.number().finite(),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});
function digest(state: ChessState, expires: number) {
  const secret = process.env.GAME_SIGNING_SECRET;
  if (!secret) throw new Error("Game server is not configured.");
  return createHmac("sha256", secret)
    .update("chess:v1:" + JSON.stringify({ state, expires }))
    .digest("hex");
}
export function signChess(
  state: ChessState,
  expires = Date.now() + 24 * 60 * 60 * 1000,
) {
  return { state, expires, signature: digest(state, expires) };
}
export function verifyChess(input: z.infer<typeof chessEnvelopeSchema>) {
  if (input.expires < Date.now())
    throw new Error("This game session expired. Start a new game.");
  if (
    !timingSafeEqual(
      Buffer.from(input.signature, "hex"),
      Buffer.from(digest(input.state, input.expires), "hex"),
    )
  )
    throw new Error("Invalid game session. Start a new game.");
  return input.state;
}
export async function chooseChessMove(chess: Chess): Promise<ChessDecision> {
  const legal = chess.moves({ verbose: true });
  if (!legal.length) throw new Error("No legal moves remain.");
  const side = chess.turn();
  const opponent: Color = side === "w" ? "b" : "w";
  const criteria = Object.fromEntries(
    legal.map((move) => {
      chess.move(move);
      const replies = chess.moves({ verbose: true });
      const recaptures = replies.filter((r) => r.to === move.to && r.captured);
      const immediateCaptureLoss = recaptures.length
        ? PIECE_VALUES[move.promotion ?? move.piece]
        : 0;
      const detail = {
        san: move.san,
        piece: PIECE_NAMES[move.piece],
        from: move.from,
        to: move.to,
        captures: move.captured ? PIECE_NAMES[move.captured] : null,
        promotion: move.promotion ? PIECE_NAMES[move.promotion] : null,
        checkmate: chess.isCheckmate(),
        check: chess.isCheck(),
        draw: chess.isDraw(),
        castling: move.isKingsideCastle() || move.isQueensideCastle(),
        canBeCapturedNext: recaptures.length > 0,
        immediateCaptureTrade:
          (move.captured ? PIECE_VALUES[move.captured] : 0) -
          immediateCaptureLoss,
        opponentBestCapture: Math.max(
          0,
          ...replies.map((r) => (r.captured ? PIECE_VALUES[r.captured] : 0)),
        ),
        pieceDefended: chess.isAttacked(move.to, side),
        opponent: colorName(opponent),
      };
      chess.undo();
      return [move.from + move.to + (move.promotion ?? ""), detail];
    }),
  );
  const started = performance.now();
  const result = await evaluate({
    model: "typesafe-ai/jev",
    state: {
      game: "Standard chess",
      youPlay: colorName(side),
      fen: chess.fen(),
      board: chess.ascii(),
      history: chess.history().slice(-24),
      inCheck: chess.isCheck(),
      pieceValues: PIECE_VALUES,
    },
    questions: {
      move: {
        type: "choice",
        instructions:
          "Play the strongest legal chess move. Choose checkmate immediately if available. Otherwise keep your king safe, avoid losing valuable pieces, win material when safe, develop knights and bishops, contest central squares, and castle when useful. Tactical descriptors are shallow facts, not engine scores: consider the whole position and avoid obvious recaptures and repeated aimless moves. All supplied options are legal. Choose exactly one.",
        criteria,
      },
    },
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(22000),
  });
  const answer = result.answers.move;
  const chosen = legal.find(
    (m) => m.from + m.to + (m.promotion ?? "") === answer.choice,
  );
  if (!chosen) throw new Error("Jev selected an invalid move.");
  chess.move(chosen);
  const ranked = legal
    .map((m) => ({
      san: m.san,
      probability:
        answer.probabilities?.[m.from + m.to + (m.promotion ?? "")] ?? null,
    }))
    .sort(
      (a, b) =>
        (b.probability ?? 0) - (a.probability ?? 0) ||
        Number(b.san === chosen.san) - Number(a.san === chosen.san),
    );
  return {
    san: chosen.san,
    from: chosen.from,
    to: chosen.to,
    latencyMs: Math.round(performance.now() - started),
    options: ranked.slice(0, 4),
    legalCount: legal.length,
    model: "typesafe-ai/jev",
  };
}
export function chessServiceError(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "statusCode" in error
      ? Number(error.statusCode)
      : 0;
  console.error("Chess Jev request failed", {
    name: error instanceof Error ? error.name : "Unknown",
    status,
  });
  return Response.json(
    {
      error:
        status === 402
          ? "Jev needs more AI Gateway credits. Please try again later."
          : status === 401 || status === 403
            ? "Jev could not connect to AI Gateway. Please try again later."
            : "Jev’s connection dropped. Your position is safe — retry the move.",
    },
    { status: 503 },
  );
}

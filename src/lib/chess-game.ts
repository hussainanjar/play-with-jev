import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";

export type ChessState = { moves: string[]; player: Color; resigned: boolean };
export type ChessSession = {
  state: ChessState;
  expires: number;
  signature: string;
};
export type ChessDecision = {
  san: string;
  from: Square;
  to: Square;
  latencyMs: number;
  options: { san: string; probability: number | null }[];
  legalCount: number;
  model: string;
};
export type ChessReply = ChessSession & { decision: ChessDecision | null };
export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};
export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};
export const colorName = (color: Color) => (color === "w" ? "White" : "Black");
export function replayChess(moves: string[]) {
  const chess = new Chess();
  for (const san of moves) {
    if (chess.isGameOver()) throw new Error("This game has already ended.");
    chess.move(san, { strict: true });
  }
  return chess;
}
export function chessOutcome(
  chess: Chess,
  state: Pick<ChessState, "player" | "resigned">,
) {
  if (state.resigned)
    return {
      over: true,
      title: "You resigned.",
      detail: `${colorName(state.player === "w" ? "b" : "w")} wins. A fresh board is one click away.`,
      result: state.player === "w" ? "0-1" : "1-0",
    };
  if (chess.isCheckmate()) {
    const won = chess.turn() !== state.player;
    return {
      over: true,
      title: won ? "Checkmate. You win!" : "Checkmate. Jev wins.",
      detail: won
        ? "Well played. You outmaneuvered Jev."
        : "A good game. Ready for a rematch?",
      result: chess.turn() === "w" ? "0-1" : "1-0",
    };
  }
  const draw = chess.isStalemate()
    ? "Stalemate"
    : chess.isThreefoldRepetition()
      ? "Threefold repetition"
      : chess.isInsufficientMaterial()
        ? "Insufficient material"
        : chess.isDrawByFiftyMoves()
          ? "50-move rule"
          : null;
  if (draw)
    return {
      over: true,
      title: "A drawn game.",
      detail: draw + ". Neither side wins.",
      result: "1/2-1/2",
    };
  return {
    over: false,
    title: chess.isCheck() ? "Check. Protect your king." : "Your move.",
    detail: "Select a piece, then a highlighted square.",
    result: "*",
  };
}

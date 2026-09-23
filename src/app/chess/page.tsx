import type { Metadata } from "next";
import ChessGame from "./chess-game";
import "./chess.css";
export const metadata: Metadata = {
  title: "Jev Chess — Your move, human.",
  description:
    "Play chess against TypeSafe Jev. Legal moves, live AI decisions, and a fresh challenge on every board.",
};
export default function ChessPage() {
  return <ChessGame />;
}

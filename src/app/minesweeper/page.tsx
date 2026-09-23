import type { Metadata } from "next";
import MinesweeperGame from "./minesweeper-game";
import "./minesweeper.css";

export const metadata: Metadata = {
  title: "Jev Minesweeper — Tread lightly.",
  description:
    "Clear the minefield with a little help from Jev. Classic Minesweeper with safe first clicks, two difficulties, and optional AI hints.",
};
export default function MinesweeperPage() {
  return <MinesweeperGame />;
}

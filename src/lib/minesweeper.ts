export const LEVELS = {
  easy: { label: "Easy", size: 9, mines: 10 },
  tricky: { label: "Tricky", size: 12, mines: 24 },
} as const;
export type Level = keyof typeof LEVELS;
export type MineCell = {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  flagged: boolean;
};
export type MineGame = {
  level: Level;
  cells: MineCell[];
  status: "ready" | "playing" | "won" | "lost";
  startedAt: number | null;
  endedAt: number | null;
  exploded: number | null;
};
export type MineHint = {
  index: number;
  square: string;
  latencyMs: number;
  options: { square: string; probability: number | null }[];
};
export function neighbors(index: number, size: number) {
  const row = Math.floor(index / size),
    col = index % size;
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const y = row + dy,
        x = col + dx;
      if ((dx || dy) && y >= 0 && y < size && x >= 0 && x < size)
        result.push(y * size + x);
    }
  return result;
}
export function squareName(index: number, size: number) {
  return `${String.fromCharCode(65 + (index % size))}${Math.floor(index / size) + 1}`;
}
export function newMineGame(level: Level = "easy"): MineGame {
  return {
    level,
    cells: Array.from({ length: LEVELS[level].size ** 2 }, () => ({
      mine: false,
      adjacent: 0,
      revealed: false,
      flagged: false,
    })),
    status: "ready",
    startedAt: null,
    endedAt: null,
    exploded: null,
  };
}
export function toggleFlag(game: MineGame, index: number): MineGame {
  if (
    !game.cells[index] ||
    game.cells[index].revealed ||
    game.status === "won" ||
    game.status === "lost"
  )
    return game;
  if (
    !game.cells[index].flagged &&
    game.cells.filter((c) => c.flagged).length >= LEVELS[game.level].mines
  )
    return game;
  return {
    ...game,
    cells: game.cells.map((c, i) =>
      i === index ? { ...c, flagged: !c.flagged } : c,
    ),
  };
}
export function revealCell(original: MineGame, index: number): MineGame {
  if (
    !original.cells[index] ||
    original.cells[index].flagged ||
    original.status === "won" ||
    original.status === "lost"
  )
    return original;
  const game = { ...original, cells: original.cells.map((c) => ({ ...c })) };
  const { size, mines } = LEVELS[game.level];
  if (game.status === "ready") {
    // Place mines only after the first reveal, outside its entire neighborhood.
    const safe = new Set([index, ...neighbors(index, size)]);
    const available = game.cells.map((_, i) => i).filter((i) => !safe.has(i));
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    for (const i of available.slice(0, mines)) game.cells[i].mine = true;
    game.cells.forEach((cell, i) => {
      cell.adjacent = neighbors(i, size).filter(
        (n) => game.cells[n].mine,
      ).length;
    });
    game.status = "playing";
    game.startedAt = Date.now();
  }
  let targets = [index];
  if (game.cells[index].revealed) {
    const around = neighbors(index, size);
    if (
      game.cells[index].adjacent === 0 ||
      around.filter((i) => game.cells[i].flagged).length !==
        game.cells[index].adjacent
    )
      return original;
    targets = around.filter(
      (i) => !game.cells[i].flagged && !game.cells[i].revealed,
    );
  }
  const queue = [...targets];
  while (queue.length) {
    const i = queue.pop()!;
    const cell = game.cells[i];
    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    if (cell.mine) {
      game.status = "lost";
      game.exploded = i;
      game.endedAt = Date.now();
      return game;
    }
    if (cell.adjacent === 0) queue.push(...neighbors(i, size));
  }
  if (game.cells.every((c) => c.mine || c.revealed)) {
    game.status = "won";
    game.endedAt = Date.now();
    game.cells.forEach((c) => {
      if (c.mine) c.flagged = true;
    });
  }
  return game;
}
// This is the only board representation sent to Jev. No hidden mine data.
export function visibleBoard(game: MineGame) {
  return game.cells.map((c) => (c.revealed ? c.adjacent : c.flagged ? -2 : -1));
}

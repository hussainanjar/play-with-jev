import { z } from "zod";

export const BOARD = [
  "###########",
  "#.........#",
  "#.##.#.##.#",
  "#....#....#",
  "#.##...##.#",
  "#....#....#",
  "#.##.#.##.#",
  "#.........#",
  "###########",
];
export const DIRECTIONS = ["up", "right", "down", "left"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export type Point = { x: number; y: number };
export const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
const point = z.object({
  x: z.number().int().min(0).max(10),
  y: z.number().int().min(0).max(8),
});
export const stateSchema = z.object({
  player: point,
  guard: point,
  gems: z.array(point).max(3),
  collected: z.number().int().min(0).max(3),
  turn: z.number().int().min(0).max(40),
  decoys: z.number().int().min(0).max(2),
  decoy: z
    .object({ position: point, remaining: z.number().int().min(1).max(3) })
    .nullable(),
  dashReady: z.number().int().min(0).max(40),
  status: z.enum(["playing", "won", "lost"]),
  history: z.array(point).max(6),
  seed: z.number().int().min(0).max(2),
});
export type GameState = z.infer<typeof stateSchema>;
export type Action = Direction | "decoy" | "wait";
export const EXIT = { x: 1, y: 7 };
export const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const walkable = (p: Point) => BOARD[p.y]?.[p.x] === ".";
export const step = (p: Point, d: Direction): Point => ({
  x: p.x + DELTA[d].x,
  y: p.y + DELTA[d].y,
});
export function newGame(seed = 0): GameState {
  const layouts = [
    [
      { x: 9, y: 1 },
      { x: 5, y: 4 },
      { x: 9, y: 7 },
    ],
    [
      { x: 4, y: 1 },
      { x: 7, y: 3 },
      { x: 8, y: 7 },
    ],
    [
      { x: 9, y: 3 },
      { x: 3, y: 3 },
      { x: 6, y: 7 },
    ],
  ];
  return {
    player: { x: 1, y: 1 },
    guard: { x: 9, y: 5 },
    gems: layouts[seed % 3],
    collected: 0,
    turn: 0,
    decoys: 2,
    decoy: null,
    dashReady: 0,
    status: "playing",
    history: [],
    seed: seed % 3,
  };
}
export function playerTurn(
  original: GameState,
  action: Action,
  dash = false,
): GameState {
  if (original.status !== "playing")
    throw new Error("This run has ended. Start a new heist.");
  const s = structuredClone(original);
  if (action === "decoy") {
    if (s.decoys === 0) throw new Error("No decoys left.");
    s.decoys--;
    s.decoy = { position: { ...s.player }, remaining: 3 };
  } else if (action !== "wait") {
    if (dash && s.turn < s.dashReady) throw new Error("Dash is recharging.");
    const next = step(s.player, action);
    if (!walkable(next)) throw new Error("A wall blocks that move.");
    for (let i = 0; i < (dash ? 2 : 1); i++) {
      const target = step(s.player, action);
      if (!walkable(target)) break;
      s.player = target;
      const gem = s.gems.findIndex((g) => same(g, s.player));
      if (gem >= 0) {
        s.gems.splice(gem, 1);
        s.collected++;
      }
      if (same(s.player, s.guard)) {
        s.status = "lost";
        break;
      }
      if (same(s.player, EXIT) && s.collected === 3) {
        s.status = "won";
        break;
      }
    }
    if (dash) s.dashReady = s.turn + 4;
  }
  s.turn++;
  s.history = [...s.history, original.player].slice(-6);
  return s;
}
export function guardTurn(state: GameState, direction: Direction): GameState {
  const s = structuredClone(state);
  const next = step(s.guard, direction);
  if (!walkable(next)) throw new Error("Invalid guard move.");
  s.guard = next;
  if (same(s.guard, s.player) || s.turn >= 40) s.status = "lost";
  if (s.decoy && (--s.decoy.remaining === 0 || same(s.guard, s.decoy.position)))
    s.decoy = null;
  return s;
}
export function distance(from: Point, to: Point): number {
  const queue = [{ ...from, d: 0 }],
    seen = new Set([`${from.x},${from.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (same(p, to)) return p.d;
    for (const d of DIRECTIONS) {
      const n = step(p, d),
        key = `${n.x},${n.y}`;
      if (walkable(n) && !seen.has(key)) {
        seen.add(key);
        queue.push({ ...n, d: p.d + 1 });
      }
    }
  }
  return 99;
}

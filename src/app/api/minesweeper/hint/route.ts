import { experimental_evaluate as evaluate } from "ai";
import { z } from "zod";
import { allowRequest, sameOrigin } from "@/lib/session";
import { LEVELS, neighbors, squareName } from "@/lib/minesweeper";

export const runtime = "nodejs";
export const maxDuration = 30;
const inputSchema = z
  .object({
    level: z.enum(["easy", "tricky"]),
    visible: z.array(z.number().int().min(-2).max(8)).min(81).max(144),
  })
  .strict();

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowRequest(request))
    return Response.json(
      { error: "Too many hints. Try again in a minute." },
      { status: 429 },
    );
  let input: z.infer<typeof inputSchema>;
  try {
    const body = await request.text();
    if (body.length > 2500) throw new Error();
    input = inputSchema.parse(JSON.parse(body));
    const { size, mines } = LEVELS[input.level];
    if (
      input.visible.length !== size ** 2 ||
      !input.visible.some((c) => c >= 0) ||
      !input.visible.includes(-1) ||
      input.visible.filter((c) => c === -2).length > mines
    )
      throw new Error();
    if (input.visible.some((c, i) => c > neighbors(i, size).length))
      throw new Error();
  } catch {
    return Response.json(
      { error: "Reveal a square first, then ask Jev for a hint." },
      { status: 400 },
    );
  }
  const { size, mines } = LEVELS[input.level];
  const { visible } = input;
  const hidden = visible.flatMap((c, i) => (c === -1 ? [i] : []));
  const criteria = Object.fromEntries(
    hidden.map((i) => [
      squareName(i, size),
      {
        action: "reveal",
        square: squareName(i, size),
        nearbyClues: neighbors(i, size)
          .filter((n) => visible[n] >= 0)
          .map((n) => ({
            square: squareName(n, size),
            clue: visible[n],
            flaggedNeighbors: neighbors(n, size)
              .filter((k) => visible[k] === -2)
              .map((k) => squareName(k, size)),
            hiddenNeighbors: neighbors(n, size)
              .filter((k) => visible[k] === -1)
              .map((k) => squareName(k, size)),
          })),
      },
    ]),
  );
  try {
    const started = performance.now();
    const result = await evaluate({
      model: "typesafe-ai/jev",
      state: {
        game: "Minesweeper",
        size,
        totalMines: mines,
        legend:
          "? = hidden, F = player flag (may be wrong), 0-8 = revealed adjacent mine count. Diagonals count. Columns A onward; rows 1 onward.",
        rows: Array.from({ length: size }, (_, r) =>
          visible
            .slice(r * size, (r + 1) * size)
            .map((c) => (c === -1 ? "?" : c === -2 ? "F" : String(c)))
            .join(" "),
        ),
      },
      questions: {
        move: {
          type: "choice",
          instructions:
            "Choose the safest unflagged hidden square to reveal using only the visible clues. Prefer logically safe squares. Use overlapping numbered constraints to avoid known mines; flags are player beliefs, not ground truth. If no safe move is deducible, choose the lowest-risk guess. You cannot see the hidden mines. All options are possible reveals, not necessarily safe reveals.",
          criteria,
        },
      },
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(22000),
    });
    const answer = result.answers.move;
    const index = hidden.find((i) => squareName(i, size) === answer.choice);
    if (index === undefined) throw new Error("Invalid hint choice");
    return Response.json(
      {
        index,
        square: answer.choice,
        latencyMs: Math.round(performance.now() - started),
        options: hidden
          .map((i) => ({
            square: squareName(i, size),
            probability: answer.probabilities?.[squareName(i, size)] ?? null,
          }))
          .sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0))
          .slice(0, 4),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Minesweeper hint failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json(
      {
        error:
          "Jev couldn’t connect. Try the hint again, or keep playing on your own.",
      },
      { status: 503 },
    );
  }
}

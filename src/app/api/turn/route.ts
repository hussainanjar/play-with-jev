import { experimental_evaluate as evaluate } from "ai";
import { z } from "zod";
import {
  BOARD,
  DIRECTIONS,
  EXIT,
  distance,
  guardTurn,
  playerTurn,
  step,
  walkable,
  type Direction,
} from "@/lib/game";
import {
  allowRequest,
  sameOrigin,
  signState,
  verifyState,
} from "@/lib/session";
export const runtime = "nodejs";
export const maxDuration = 30;
const bodySchema = z.object({
  state: z.unknown(),
  expires: z.number(),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
  action: z.enum([...DIRECTIONS, "decoy", "wait"]),
  dash: z.boolean().default(false),
});
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!allowRequest(request))
    return Response.json(
      { error: "Take a breather. Please try again in a minute." },
      { status: 429 },
    );
  let body: z.infer<typeof bodySchema>;
  let state;
  try {
    const text = await request.text();
    if (text.length > 8000)
      return Response.json({ error: "Request too large." }, { status: 413 });
    body = bodySchema.parse(JSON.parse(text));
    state = playerTurn(verifyState(body), body.action, body.dash);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Invalid move request."
            : e instanceof Error
              ? e.message
              : "Invalid move.",
      },
      { status: 400 },
    );
  }
  if (state.status !== "playing")
    return Response.json({ ...signState(state, body.expires), decision: null });
  const target = state.decoy?.position ?? state.player;
  const legal = DIRECTIONS.filter((d) => walkable(step(state.guard, d)));
  const criteria = Object.fromEntries(
    legal.map((d) => {
      const next = step(state.guard, d);
      return [
        d,
        {
          destination: next,
          distanceToTarget: distance(next, target),
          distanceToExit: distance(next, EXIT),
          description: `Move one tile ${d}`,
        },
      ];
    }),
  );
  try {
    const started = performance.now();
    const result = await evaluate({
      model: "typesafe-ai/jev",
      state: {
        game: "Jev Heist",
        role: "Guard trying to catch the thief",
        map: BOARD,
        legend:
          "# means impassable wall, . means floor; x increases right, y increases down",
        guard: state.guard,
        target,
        exit: EXIT,
        gemsRemaining: state.gems,
        turn: state.turn,
        recentThiefPositions: state.decoy ? [] : state.history,
        noiseLureActive: !!state.decoy,
      },
      questions: {
        move: {
          type: "choice",
          instructions:
            "Choose the best legal next move to catch the target. DistanceToTarget is shortest walking distance around walls. Prefer catching the target immediately, otherwise close the distance, anticipate its route, and avoid oscillating. If noiseLureActive, investigate the target noise position. You can only move one tile. Return one supplied direction.",
          criteria,
        },
      },
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(18000),
    });
    const answer = result.answers.move;
    if (!legal.includes(answer.choice as Direction))
      throw new Error("Invalid model move");
    const next = guardTurn(state, answer.choice as Direction);
    return Response.json(
      {
        ...signState(next, body.expires),
        decision: {
          move: answer.choice,
          probabilities: answer.probabilities ?? null,
          latencyMs: Math.round(performance.now() - started),
          model: "typesafe-ai/jev",
          lured: !!state.decoy,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const status =
      typeof e === "object" && e !== null && "statusCode" in e
        ? Number(e.statusCode)
        : 0;
    console.error("Jev evaluation failed", {
      name: e instanceof Error ? e.name : "UnknownError",
      status,
    });
    const message =
      status === 402
        ? "Jev is out of Gateway credits. The owner needs to top up AI Gateway."
        : status === 401 || status === 403
          ? "Jev could not connect to AI Gateway. The owner needs to check Gateway access."
          : "Jev missed a beat. Your move was not spent — try it again.";
    return Response.json({ error: message }, { status: 503 });
  }
}

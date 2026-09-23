"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Diamond,
  DoorOpen,
  Radio,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Pause,
  Play,
  MoveRight,
  X,
  Trophy,
  Shield,
  Route,
} from "lucide-react";
import {
  BOARD,
  DIRECTIONS,
  EXIT,
  newGame,
  playerTurn,
  same,
  step,
  walkable,
  type Action,
  type Direction,
  type GameState,
  type Point,
} from "@/lib/game";
type Envelope = { state: GameState; expires: number; signature: string };
type Decision = {
  move: Direction;
  probabilities: Partial<Record<Direction, number>> | null;
  latencyMs: number;
  model: string;
  lured: boolean;
};
const arrows = {
  up: ArrowUp,
  right: ArrowRight,
  down: ArrowDown,
  left: ArrowLeft,
};
const position = (p: Point): CSSProperties => ({
  left: `${(p.x / 11) * 100}%`,
  top: `${(p.y / 9) * 100}%`,
});

export default function Home() {
  const [session, setSession] = useState<Envelope | null>(null);
  const [pending, setPending] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const [sound, setSound] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [help, setHelp] = useState(false);
  const [lastAction, setLastAction] = useState<{
    action: Action;
    dash: boolean;
  } | null>(null);
  const lock = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const state = pending ?? session?.state ?? newGame();
  const playing = !!session && state.status === "playing";
  const dashReady = state.turn >= state.dashReady;
  const beep = useCallback(
    (kind: "move" | "gem" | "won" | "lost") => {
      if (!sound) return;
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
        const ctx = audio.current;
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = "sine";
        const f = { move: 240, gem: 740, won: 980, lost: 100 }[kind];
        o.frequency.setValueAtTime(f, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(
          f * 1.4,
          ctx.currentTime + 0.09,
        );
        g.gain.setValueAtTime(0.05, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.16);
      } catch {}
    },
    [sound],
  );
  useEffect(() => {
    try {
      const value = localStorage.getItem("jev-heist-best");
      if (value && Number.isFinite(Number(value))) setBest(Number(value));
    } catch {}
  }, []);
  const start = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setLastAction(null);
    try {
      const response = await fetch("/api/start", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not start the heist. Try again.");
      setSession(data);
      setPending(null);
      setDecision(null);
      setArmed(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect. Try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);
  const move = useCallback(
    async (action: Action, dash = false) => {
      if (lock.current || !session || session.state.status !== "playing")
        return;
      let preview: GameState;
      try {
        preview = playerTurn(session.state, action, dash);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Move blocked.");
        return;
      }
      lock.current = true;
      setBusy(true);
      setError("");
      setPending(preview);
      setLastAction({ action, dash });
      setArmed(false);
      beep(preview.collected > session.state.collected ? "gem" : "move");
      try {
        const response = await fetch("/api/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...session, action, dash }),
          signal: AbortSignal.timeout(25000),
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error ?? "Jev could not move. Please retry.");
        setSession({
          state: data.state,
          expires: data.expires,
          signature: data.signature,
        });
        setDecision(data.decision);
        setLastAction(null);
        if (data.state.status === "won") {
          beep("won");
          setBest((old) => {
            const value =
              old === null ? data.state.turn : Math.min(old, data.state.turn);
            try {
              localStorage.setItem("jev-heist-best", String(value));
            } catch {}
            return value;
          });
        }
        if (data.state.status === "lost") beep("lost");
      } catch (e) {
        setError(
          e instanceof Error && e.name === "TimeoutError"
            ? "Jev took too long. Your move was not spent — try again."
            : e instanceof Error
              ? e.message
              : "Connection lost. Try that move again.",
        );
      } finally {
        setPending(null);
        lock.current = false;
        setBusy(false);
      }
    },
    [session, beep],
  );
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setArmed(false);
        setHelp(false);
        return;
      }
      if (e.repeat || help || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const d: Record<string, Direction> = {
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowRight: "right",
        d: "right",
        D: "right",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
      };
      if (d[e.key]) {
        e.preventDefault();
        void move(d[e.key], armed || e.shiftKey);
      } else if (e.key.toLowerCase() === "x" && playing && dashReady && !busy) {
        e.preventDefault();
        setArmed((a) => !a);
      } else if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        void move("decoy");
      } else if (e.code === "Space" && target.tagName !== "BUTTON") {
        e.preventDefault();
        void move("wait");
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [move, armed, playing, dashReady, busy, help]);
  const end = !!session && state.status !== "playing" && !busy;
  const message = !session
    ? "Your getaway starts here."
    : busy
      ? "Jev is choosing its next move…"
      : state.status === "won"
        ? "Clean getaway. Nicely played."
        : state.status === "lost"
          ? state.turn >= 40
            ? "Time’s up. The vault is sealed."
            : "Busted. Jev got there first."
          : state.collected === 3
            ? "You have the goods. Head for the exit!"
            : armed
              ? "Dash armed. Choose a direction."
              : decision?.lured
                ? "Jev investigated your decoy. Keep moving."
                : "Your move. Make it a good one.";
  return (
    <div className="app-shell">
      <header className="topbar">
        <a href="/heist" className="brand" aria-label="Jev Heist home">
          <Route size={22} />
          <span>JEV HEIST</span>
        </a>
        <div className="topbar-right">
          <a
            href="/"
            className="help-button"
            style={{ textDecoration: "none" }}
          >
            All games
          </a>
          <button
            className="icon-button"
            onClick={() => setSound((s) => !s)}
            aria-label={sound ? "Turn sound off" : "Turn sound on"}
            aria-pressed={sound}
          >
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button
            className="help-button"
            onClick={() => setHelp((h) => !h)}
            aria-expanded={help}
          >
            How to play
          </button>
        </div>
      </header>
      <main>
        <section className="intro" aria-label="Introduction">
          <h1>
            SMALL HEIST.
            <br />
            <span>BIG BRAIN.</span>
          </h1>
          <div className="intro-copy">
            <p>
              Three gems. One clever guard.
              <br />
              Steal the goods. Outsmart Jev. Get out.
            </p>
            <button className="primary" onClick={start} disabled={busy}>
              {session ? (
                <RotateCcw size={19} />
              ) : (
                <Play size={19} fill="currentColor" />
              )}
              {busy && !session
                ? "Opening the vault…"
                : session
                  ? "New heist"
                  : "Start heist"}
              <ArrowUpRight size={20} />
            </button>
          </div>
        </section>
        {help && (
          <section className="rules" aria-label="How to play">
            <div>
              <h2>The perfect crime, in 40 turns.</h2>
              <p>
                Move with <strong>arrow keys / WASD</strong> or the direction
                buttons. Grab all 3 gems and reach the exit before Jev catches
                you. You move first, then Jev moves one tile.
              </p>
              <p>
                <strong>Dash (X or Shift + move)</strong> travels up to 2 tiles,
                stopping at walls, and recharges after 4 turns.{" "}
                <strong>Decoy (C)</strong> drops a lure at your feet for up to 3
                guard moves; you get 2. <strong>Wait (Space)</strong> lets Jev
                move while you stay put. Every action costs a turn.
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Close instructions"
              onClick={() => setHelp(false)}
            >
              <X />
            </button>
          </section>
        )}
        <div className="game-layout">
          <section className="arena" aria-label="Heist board">
            <div className="arena-header">
              <span className="map-label">
                <span className="route-number">
                  {String(state.seed + 1).padStart(2, "0")}
                </span>{" "}
                THE NIGHT SHIFT
              </span>
              <span className="turn-label">
                TURN <strong>{String(state.turn).padStart(2, "0")}</strong>
                <span>/ 40</span>
              </span>
            </div>
            <div className={`board-wrap ${end ? "finished" : ""}`}>
              <div
                className="board"
                role="img"
                aria-label={`Vault map. You are at column ${state.player.x}, row ${state.player.y}. Guard at column ${state.guard.x}, row ${state.guard.y}. ${state.collected} of 3 gems collected. Remaining gems: ${state.gems.map((g) => `column ${g.x}, row ${g.y}`).join("; ") || "none"}. Exit at column 1, row 7. Open Text map and positions below for walkable routes.`}
              >
                {BOARD.flatMap((row, y) =>
                  row.split("").map((tile, x) => (
                    <div
                      key={`${x}-${y}`}
                      className={`tile ${tile === "#" ? "wall" : "floor"} ${same({ x, y }, EXIT) ? "exit-floor" : ""}`}
                      aria-hidden="true"
                    >
                      {tile === "." && <span className="floor-dot" />}
                    </div>
                  )),
                )}
                <div
                  className={`piece exit ${state.collected === 3 ? "unlocked" : ""}`}
                  style={position(EXIT)}
                  aria-hidden="true"
                >
                  <DoorOpen />
                  <span>EXIT</span>
                </div>
                {state.gems.map((gem, i) => (
                  <div
                    className="piece gem"
                    key={`${gem.x}-${gem.y}`}
                    style={position(gem)}
                    aria-hidden="true"
                  >
                    <Diamond fill="currentColor" />
                    <span className="gem-shine" />
                  </div>
                ))}
                {state.decoy && (
                  <div
                    className="piece decoy"
                    style={position(state.decoy.position)}
                    aria-hidden="true"
                  >
                    <Radio />
                  </div>
                )}
                <div
                  className={`piece guard ${busy ? "thinking" : ""}`}
                  style={position(state.guard)}
                  aria-hidden="true"
                >
                  <div className="guard-token">
                    <span className="eyes">
                      <i />
                      <i />
                    </span>
                    <span className="guard-mouth" />
                  </div>
                </div>
                <div
                  className={`piece player ${armed ? "dash-armed" : ""}`}
                  style={position(state.player)}
                  aria-hidden="true"
                >
                  <div className="player-token">
                    <span className="mask">
                      <i />
                      <i />
                    </span>
                  </div>
                </div>
              </div>
              {!session && (
                <div className="board-invite">
                  <span className="mini-player" />
                  <span>You’re the little green troublemaker.</span>
                  <MoveRight size={18} />
                </div>
              )}
              {end && (
                <div className={`result-panel ${state.status}`} role="status">
                  {state.status === "won" ? (
                    <Trophy size={34} />
                  ) : (
                    <Shield size={34} />
                  )}
                  <h2>
                    {state.status === "won"
                      ? "YOU GOT AWAY."
                      : "CAUGHT RED-HANDED."}
                  </h2>
                  <p>
                    {state.status === "won"
                      ? `Three gems, ${state.turn} turns. One very annoyed guard.`
                      : state.turn >= 40
                        ? "The vault locked after 40 turns. Plan a quicker route."
                        : "Even the best thieves need a second attempt."}
                  </p>
                  <button className="primary" onClick={start}>
                    <RotateCcw size={18} />{" "}
                    {state.status === "won"
                      ? "Pull another heist"
                      : "Try again"}
                  </button>
                </div>
              )}
            </div>
            <div className="arena-footer">
              <div className="legend">
                <span>
                  <i className="legend-you" />
                  You
                </span>
                <span>
                  <i className="legend-guard" />
                  Jev
                </span>
                <span>
                  <Diamond size={15} />
                  Loot
                </span>
                <span>
                  <DoorOpen size={16} />
                  Exit
                </span>
              </div>
              <span className="keyboard-hint">WASD / ARROW KEYS</span>
            </div>
            <details className="text-map">
              <summary>Text map &amp; positions</summary>
              <p>
                Columns count left to right; rows count top to bottom. Move one
                column or row at a time. Only the positions listed below are
                walkable; all others are walls.
              </p>
              <p>
                You: column {state.player.x}, row {state.player.y}. Jev: column{" "}
                {state.guard.x}, row {state.guard.y}. Exit: column 1, row 7.
              </p>
              <p>
                Remaining gems:{" "}
                {state.gems
                  .map((g) => `column ${g.x}, row ${g.y}`)
                  .join("; ") || "none — head to the exit"}
                .
              </p>
              {state.decoy && (
                <p>
                  Decoy: column {state.decoy.position.x}, row{" "}
                  {state.decoy.position.y}; {state.decoy.remaining} guard moves
                  remaining.
                </p>
              )}
              <ul>
                {BOARD.map(
                  (row, y) =>
                    row.includes(".") && (
                      <li key={y}>
                        Row {y}: columns{" "}
                        {row
                          .split("")
                          .flatMap((tile, x) => (tile === "." ? [x] : []))
                          .join(", ")}
                        .
                      </li>
                    ),
                )}
              </ul>
            </details>
          </section>
          <aside className="side-rail" aria-label="Game controls and opponent">
            <section className="mission">
              <div className="rail-heading">
                <h2>The loot</h2>
                <span>{state.collected} / 3</span>
              </div>
              <div
                className="gem-slots"
                aria-label={`${state.collected} of 3 gems collected`}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    className={i < state.collected ? "collected" : ""}
                    key={i}
                  >
                    <Diamond
                      size={26}
                      fill={i < state.collected ? "currentColor" : "none"}
                    />
                  </span>
                ))}
                <ArrowRight size={19} />
                <span className={state.collected === 3 ? "exit-ready" : ""}>
                  <DoorOpen size={26} />
                </span>
              </div>
              <p>Collect all three. Then make for the exit.</p>
            </section>
            <section className="controls">
              <div className="rail-heading">
                <h2>Your move</h2>
                <span className={`status-dot ${busy ? "busy" : ""}`}>
                  {busy ? "THINKING" : playing ? "GO FOR IT" : "READY"}
                </span>
              </div>
              <div className="movement">
                <div className="dpad">
                  {DIRECTIONS.map((d) => {
                    const Icon = arrows[d];
                    return (
                      <button
                        key={d}
                        className={`direction ${d}`}
                        aria-label={`Move ${d}`}
                        disabled={
                          !playing || busy || !walkable(step(state.player, d))
                        }
                        onClick={() => move(d, armed)}
                      >
                        <Icon size={24} />
                      </button>
                    );
                  })}
                  <button
                    className="wait"
                    aria-label="Wait one turn"
                    disabled={!playing || busy}
                    onClick={() => move("wait")}
                  >
                    <Pause size={16} />
                  </button>
                </div>
                <div className="movement-note">
                  <strong>
                    {armed ? "Two steps. One turn." : "One step ahead."}
                  </strong>
                  <span>
                    {armed ? "Pick your direction." : "Use the arrows or WASD."}
                  </span>
                </div>
              </div>
              <div className="abilities">
                <button
                  className={`ability ${armed ? "active" : ""}`}
                  onClick={() => setArmed((a) => !a)}
                  aria-pressed={armed}
                  disabled={!playing || busy || !dashReady}
                >
                  <Zap size={19} />
                  <span>
                    <strong>{armed ? "Dash armed" : "Dash"}</strong>
                    <small>
                      {dashReady
                        ? "Move two tiles"
                        : `${state.dashReady - state.turn} turns to recharge`}
                    </small>
                  </span>
                  <kbd>X</kbd>
                </button>
                <button
                  className="ability"
                  onClick={() => move("decoy")}
                  disabled={!playing || busy || state.decoys === 0}
                >
                  <Radio size={19} />
                  <span>
                    <strong>Drop decoy</strong>
                    <small>
                      {state.decoys} {state.decoys === 1 ? "lure" : "lures"}{" "}
                      left
                    </small>
                  </span>
                  <kbd>C</kbd>
                </button>
              </div>
            </section>
            <section className="opponent">
              <div className="rail-heading">
                <h2>Inside Jev’s head</h2>
                <span className={`connection ${decision ? "live" : ""}`}>
                  <i />
                  {decision ? "LIVE AI" : "JEV AI"}
                </span>
              </div>
              <p>
                {decision
                  ? decision.lured
                    ? "A noise in the vault. Jev takes the bait."
                    : "The guard picked its next move. Here’s the split."
                  : "Every turn, Jev reads the board and chooses its next move."}
              </p>
              <div className="decision-rows">
                {DIRECTIONS.map((d) => {
                  const Icon = arrows[d];
                  const probability = decision?.probabilities?.[d];
                  return (
                    <div
                      className={`decision-row ${decision?.move === d ? "chosen" : ""}`}
                      key={d}
                    >
                      <Icon size={15} />
                      <span>{d}</span>
                      <div className="probability-track">
                        <i
                          style={{ transform: `scaleX(${probability ?? 0})` }}
                        />
                      </div>
                      <b>
                        {probability === undefined
                          ? "—"
                          : `${Math.round(probability * 100)}%`}
                      </b>
                    </div>
                  );
                })}
              </div>
              <div className="decision-meta">
                <span>
                  {decision
                    ? `${decision.latencyMs.toLocaleString()} ms`
                    : "Waiting for your first move"}
                </span>
                {decision && <span>DECISION TIME</span>}
              </div>
            </section>
          </aside>
        </div>
        <div
          className={`game-message ${end ? state.status : ""}`}
          aria-live="polite"
        >
          <span className={`message-light ${busy ? "busy" : ""}`} />
          <span>{message}</span>
          {session && (
            <span className="sr-only">
              Turn {state.turn}. You: column {state.player.x}, row{" "}
              {state.player.y}. Guard: column {state.guard.x}, row{" "}
              {state.guard.y}. {state.collected} gems collected.{" "}
              {state.gems.length} remaining.{" "}
              {decision && !busy ? `Jev moved ${decision.move}.` : ""}
            </span>
          )}
          {best !== null && (
            <span className="personal-best">
              <Trophy size={16} /> BEST: {best} TURNS
            </span>
          )}
        </div>
        {error && (
          <div className="error-message" role="alert">
            <span>{error}</span>
            {lastAction ? (
              <button
                onClick={() => move(lastAction.action, lastAction.dash)}
                disabled={busy}
              >
                Retry move <RotateCcw size={15} />
              </button>
            ) : !session ? (
              <button onClick={start} disabled={busy}>
                Try again
              </button>
            ) : null}
          </div>
        )}
        <footer className="footer">
          <span>A little crime. A lot of instinct.</span>
          <span>
            Decisions by{" "}
            <a
              href="https://vercel.com/ai-gateway/models/jev"
              target="_blank"
              rel="noreferrer"
            >
              TypeSafe Jev <ArrowUpRight size={13} />
            </a>
            <i />
            Powered by Vercel AI Gateway
          </span>
        </footer>
      </main>
    </div>
  );
}

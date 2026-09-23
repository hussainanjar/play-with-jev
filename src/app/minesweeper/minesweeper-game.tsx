"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  Flag,
  Bomb,
  Lightbulb,
  RotateCcw,
  MousePointer2,
  Timer,
  Trophy,
} from "lucide-react";
import {
  LEVELS,
  newMineGame,
  revealCell,
  toggleFlag,
  visibleBoard,
  squareName,
  type Level,
  type MineHint,
} from "@/lib/minesweeper";

export default function MinesweeperGame() {
  const [game, setGame] = useState(() => newMineGame());
  const [flagMode, setFlagMode] = useState(false);
  const [help, setHelp] = useState(false);
  const [focus, setFocus] = useState(0);
  const [now, setNow] = useState(0);
  const [hint, setHint] = useState<MineHint | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(
    "Choose any square. Your first reveal and its neighbors are always safe.",
  );
  const [hintsUsed, setHintsUsed] = useState(0);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const request = useRef<AbortController | null>(null);
  const { size, mines } = LEVELS[game.level];
  const flags = game.cells.filter((c) => c.flagged).length;
  const cleared = game.cells.filter((c) => c.revealed && !c.mine).length;
  const totalSafe = size * size - mines;
  const ended = game.status === "won" || game.status === "lost";
  const seconds = game.startedAt
    ? Math.max(0, Math.floor(((game.endedAt ?? now) - game.startedAt) / 1000))
    : 0;
  const time = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    if (game.status !== "playing") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [game.status]);
  useEffect(() => () => request.current?.abort(), []);

  function reset(level: Level = game.level) {
    request.current?.abort();
    request.current = null;
    setGame(newMineGame(level));
    setHint(null);
    setBusy(false);
    setError("");
    setFlagMode(false);
    setFocus(0);
    setHintsUsed(0);
    setNow(0);
    setNotice(
      "Fresh field. Your first reveal and its neighbors are always safe.",
    );
  }
  function act(index: number, flag = flagMode) {
    if (request.current || ended) return;
    const next = flag ? toggleFlag(game, index) : revealCell(game, index);
    if (next === game) {
      if (
        flag &&
        !game.cells[index].flagged &&
        !game.cells[index].revealed &&
        flags >= mines
      )
        setNotice(
          "All flags are placed. Remove a flag before placing another.",
        );
      else if (!flag && game.cells[index].flagged)
        setNotice("Remove the flag before revealing this square.");
      else if (!flag && game.cells[index].revealed)
        setNotice(
          "To open neighboring squares, first place as many adjacent flags as this number.",
        );
      return;
    }
    setGame(next);
    setHint(null);
    setError("");
    setNow(Date.now());
    const name = squareName(index, size);
    if (next.status === "won")
      setNotice("Field cleared! Every safe square is open. You win.");
    else if (next.status === "lost")
      setNotice(
        `A mine at ${squareName(next.exploded!, size)}. This run is over. Try a fresh field.`,
      );
    else if (flag)
      setNotice(
        `${name}: flag ${next.cells[index].flagged ? "placed" : "removed"}.`,
      );
    else
      setNotice(
        `${name} opened. ${next.cells.filter((c) => c.revealed && !c.mine).length} of ${totalSafe} safe squares cleared.`,
      );
  }
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const row = Math.floor(index / size),
      col = index % size;
    let target = index;
    if (event.key === "ArrowRight")
      target = row * size + Math.min(size - 1, col + 1);
    else if (event.key === "ArrowLeft")
      target = row * size + Math.max(0, col - 1);
    else if (event.key === "ArrowDown")
      target = Math.min(size - 1, row + 1) * size + col;
    else if (event.key === "ArrowUp")
      target = Math.max(0, row - 1) * size + col;
    else if (event.key === "Home") target = row * size;
    else if (event.key === "End") target = row * size + size - 1;
    else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      act(index, true);
      return;
    } else return;
    event.preventDefault();
    setFocus(target);
    cells.current[target]?.focus();
  }
  async function askJev() {
    if (
      request.current ||
      game.status !== "playing" ||
      !game.cells.some((c) => !c.revealed && !c.flagged)
    )
      return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setHint(null);
    const timeout = setTimeout(() => controller.abort(), 28000);
    try {
      const response = await fetch("/api/minesweeper/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Deliberately serialize visible clues only, never game.cells.
        body: JSON.stringify({
          level: game.level,
          visible: visibleBoard(game),
        }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Jev couldn’t connect. Try again.");
      if (
        !Number.isInteger(data.index) ||
        !game.cells[data.index] ||
        game.cells[data.index].revealed ||
        game.cells[data.index].flagged
      )
        throw new Error("Jev returned an unavailable square. Please retry.");
      if (request.current !== controller) return;
      setHint(data);
      setHintsUsed((n) => n + 1);
      setNotice(
        `Jev suggests ${data.square}. It is a suggestion, not a guarantee. Choose whether to reveal it.`,
      );
    } catch (e) {
      if (request.current === controller)
        setError(
          controller.signal.aborted
            ? "The hint took too long. Try again, or keep playing."
            : e instanceof Error
              ? e.message
              : "Jev couldn’t connect. Try again.",
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <div className="app-shell ms-shell">
      <header className="topbar">
        <a className="brand" href="/minesweeper">
          <Bomb size={23} />
          <span>JEV MINESWEEPER</span>
        </a>
        <nav className="topbar-right" aria-label="Game navigation">
          <a className="ms-back" href="/">
            <ArrowLeft size={15} />
            All games
          </a>
          <button
            className="help-button"
            aria-expanded={help}
            aria-controls="ms-help"
            onClick={() => setHelp(!help)}
          >
            How to play
          </button>
        </nav>
      </header>
      <main className="ms-main">
        <section className="ms-intro">
          <h1>
            TREAD
            <br />
            <span>LIGHTLY.</span>
          </h1>
          <div>
            <p>
              A field full of little surprises.
              <br />
              Follow the numbers. Trust your instincts.
              <br />
              Ask Jev when you need a second opinion.
            </p>
            <span className="ms-safe">
              <ShieldDot /> FIRST REVEAL ALWAYS SAFE
            </span>
          </div>
        </section>
        {help && (
          <section id="ms-help" className="ms-help">
            <h2>A little logic goes a long way.</h2>
            <ol>
              <li>
                Reveal every safe square to win. A number counts mines in the
                eight surrounding squares, including diagonals.
              </li>
              <li>
                Right-click or press F to flag a square. On touchscreens, switch
                to Flag mode, then tap. Flags are guesses; they do not reveal
                what is underneath.
              </li>
              <li>
                In Reveal mode, click an open number once you have placed that
                many neighboring flags to open its remaining neighbors.
                Incorrect flags can trigger a mine.
              </li>
              <li>
                Use arrow keys to move around the board; Enter or Space performs
                the selected mode. Jev sees the same clues you do and can make
                mistakes.
              </li>
            </ol>
            <button className="help-button" onClick={() => setHelp(false)}>
              Got it
            </button>
          </section>
        )}
        <div className="ms-layout">
          <section className="ms-arena" aria-label="Minesweeper game">
            <div className="ms-board-top">
              <span>
                <Flag size={16} />
                {mines - flags} <small>FLAGS LEFT</small>
              </span>
              <span>
                <Timer size={16} />
                <span aria-label={`${seconds} seconds elapsed`}>{time}</span>
              </span>
            </div>
            <div className="ms-board-scroll">
              <div
                className="ms-board"
                role="group"
                aria-label={`${size} by ${size} minefield. Arrow keys to navigate, Enter or Space to ${flagMode ? "flag" : "reveal"}, F to flag.`}
                aria-describedby="ms-status"
                aria-busy={busy}
                style={{
                  gridTemplateColumns: `22px repeat(${size}, minmax(0, 1fr))`,
                  minWidth: size === 12 ? 430 : 300,
                }}
              >
                <span aria-hidden="true" />
                {Array.from({ length: size }, (_, i) => (
                  <span
                    key={`col-${i}`}
                    className="ms-coordinate"
                    aria-hidden="true"
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                ))}
                {Array.from({ length: size }, (_, row) => (
                  <div className="ms-row" key={row}>
                    <span className="ms-coordinate" aria-hidden="true">
                      {row + 1}
                    </span>
                    {game.cells
                      .slice(row * size, (row + 1) * size)
                      .map((cell, col) => {
                        const index = row * size + col;
                        const showMine = ended && cell.mine;
                        const wrongFlag =
                          game.status === "lost" && cell.flagged && !cell.mine;
                        const name = squareName(index, size);
                        const label = showMine
                          ? "mine"
                          : wrongFlag
                            ? "incorrect flag"
                            : cell.flagged
                              ? "flagged"
                              : cell.revealed
                                ? `${cell.adjacent} adjacent mines`
                                : "hidden";
                        return (
                          <button
                            key={index}
                            ref={(el) => {
                              cells.current[index] = el;
                            }}
                            type="button"
                            className={`ms-cell ${cell.revealed ? "ms-open" : ""} ${cell.flagged ? "ms-flagged" : ""} ${showMine ? "ms-mine" : ""} ${game.exploded === index ? "ms-exploded" : ""} ${hint?.index === index ? "ms-suggested" : ""}`}
                            data-number={
                              cell.revealed ? cell.adjacent : undefined
                            }
                            tabIndex={focus === index ? 0 : -1}
                            aria-label={`${name}, ${label}${hint?.index === index ? ", Jev’s suggestion" : ""}`}
                            aria-disabled={busy || ended}
                            onFocus={() => setFocus(index)}
                            onKeyDown={(e) => keyboard(e, index)}
                            onClick={() => act(index)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              act(index, true);
                            }}
                          >
                            {wrongFlag ? (
                              <span aria-hidden="true">×</span>
                            ) : cell.flagged && !showMine ? (
                              <Flag aria-hidden="true" />
                            ) : showMine ? (
                              <Bomb aria-hidden="true" />
                            ) : cell.revealed ? (
                              cell.adjacent || ""
                            ) : hint?.index === index ? (
                              <Lightbulb aria-hidden="true" />
                            ) : null}
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
            <div className="ms-board-bottom">
              <span>
                {cleared} / {totalSafe} safe squares
              </span>
              <span>
                {size} × {size} · {mines} mines
              </span>
            </div>
            <div
              className={`ms-status ${ended ? `ms-${game.status}` : ""}`}
              id="ms-status"
              role="status"
              aria-live="polite"
            >
              {game.status === "won" && <Trophy size={19} />}
              <span>{busy ? "Jev is reading the clues…" : notice}</span>
            </div>
          </section>
          <aside className="ms-rail" aria-label="Controls and Jev hints">
            <section className="ms-controls">
              <h2>YOUR FIELD</h2>
              <label htmlFor="ms-level">
                Difficulty <span>Changing starts a new field</span>
              </label>
              <select
                id="ms-level"
                value={game.level}
                onChange={(e) => reset(e.target.value as Level)}
              >
                <option value="easy">Easy · 9 × 9 · 10 mines</option>
                <option value="tricky">Tricky · 12 × 12 · 24 mines</option>
              </select>
              <div className="ms-mode" role="group" aria-label="Square action">
                <button
                  aria-pressed={!flagMode}
                  onClick={() => setFlagMode(false)}
                >
                  <MousePointer2 size={16} />
                  Reveal
                </button>
                <button
                  aria-pressed={flagMode}
                  onClick={() => setFlagMode(true)}
                >
                  <Flag size={16} />
                  Flag
                </button>
              </div>
              <p className="ms-small">
                {flagMode
                  ? "Tap a hidden square to place or remove a flag."
                  : "Tap a square to open it. Right-click or press F to flag."}
              </p>
              <button className="ms-new" onClick={() => reset()}>
                <RotateCcw size={16} />
                New game
              </button>
            </section>
            <section className="ms-jev">
              <div className="ms-jev-title">
                <span className="ms-jev-face" aria-hidden="true">
                  J
                </span>
                <div>
                  <h2>A SECOND OPINION</h2>
                  <p>Jev, your clue companion</p>
                </div>
              </div>
              <p>
                Same clues. Fresh eyes. Jev suggests a square using only what
                you can see.
              </p>
              <button
                className="primary ms-ask"
                disabled={
                  busy ||
                  game.status !== "playing" ||
                  !game.cells.some((c) => !c.revealed && !c.flagged)
                }
                onClick={askJev}
              >
                <Lightbulb size={17} />
                {busy
                  ? "Reading the clues…"
                  : error
                    ? "Retry Jev hint"
                    : "Ask Jev for a hint"}
              </button>
              {game.status === "ready" && (
                <p className="ms-small">
                  Open your first square to give Jev some clues.
                </p>
              )}
              {error && (
                <p className="ms-error" role="alert">
                  {error}
                </p>
              )}
              {hint && (
                <div className="ms-hint">
                  <p>
                    Jev’s pick <strong>{hint.square}</strong>
                  </p>
                  <button
                    className="ms-reveal-hint"
                    onClick={() => act(hint.index, false)}
                  >
                    Reveal {hint.square} <MousePointer2 size={15} />
                  </button>
                  <h3>JEV’S CHOICES</h3>
                  {hint.options.map((option) => (
                    <div className="ms-choice" key={option.square}>
                      <span>{option.square}</span>
                      <div>
                        <i
                          style={{
                            width: `${Math.max(0, Math.min(100, (option.probability ?? 0) * 100))}%`,
                          }}
                        />
                      </div>
                      <span>
                        {option.probability === null
                          ? "—"
                          : `${Math.round(option.probability * 100)}%`}
                      </span>
                    </div>
                  ))}
                  <p className="ms-small">
                    Choice percentages, not the chance a square is safe.{" "}
                    {hint.latencyMs} ms.
                  </p>
                </div>
              )}
              <p className="ms-caution">
                A hint is a suggestion, not a guarantee. Sometimes the board
                requires a guess.
              </p>
              <div className="ms-hints-used">
                {hintsUsed} {hintsUsed === 1 ? "HINT" : "HINTS"} THIS RUN
              </div>
            </section>
          </aside>
        </div>
        <footer className="footer">
          <span>A little logic. A little nerve.</span>
          <span>
            Hints by{" "}
            <a
              href="https://vercel.com/ai-gateway/models/jev"
              target="_blank"
              rel="noreferrer"
            >
              TypeSafe Jev
            </a>{" "}
            through Vercel AI Gateway.
          </span>
        </footer>
      </main>
    </div>
  );
}
function ShieldDot() {
  return <span className="ms-safe-dot" aria-hidden="true" />;
}

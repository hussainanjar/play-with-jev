"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Chess, type Color, type PieceSymbol, type Square } from "chess.js";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Download,
  Flag,
  FlipVertical2,
  LoaderCircle,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  chessOutcome,
  colorName,
  PIECE_NAMES,
  PIECE_VALUES,
  replayChess,
  type ChessDecision,
  type ChessReply,
  type ChessSession,
} from "@/lib/chess-game";

type InputMove = {
  from: Square;
  to: Square;
  promotion?: "q" | "r" | "b" | "n";
};
const STORAGE = "jev-chess-v1";
function Piece({ color, piece }: { color: Color; piece: PieceSymbol }) {
  return (
    <img
      src={`/chess/${color}${piece}.svg`}
      alt=""
      draggable={false}
      width={80}
      height={80}
    />
  );
}

export default function ChessGame() {
  const [session, setSession] = useState<ChessSession | null>(null);
  const [decision, setDecision] = useState<ChessDecision | null>(null);
  const [pending, setPending] = useState<string[] | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [focusSquare, setFocusSquare] = useState<Square>("e2");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<InputMove | null>(null);
  const [setup, setSetup] = useState(true);
  const [player, setPlayer] = useState<Color>("w");
  const [flipped, setFlipped] = useState(false);
  const [promotion, setPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [help, setHelp] = useState(false);
  const lock = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const chess = useMemo(
    () => replayChess(pending ?? session?.state.moves ?? []),
    [pending, session],
  );
  const history = chess.history({ verbose: true });
  const human = session?.state.player ?? player;
  const outcome = chessOutcome(
    chess,
    session?.state ?? { player, resigned: false },
  );
  const active = !!session && !outcome.over && !busy && !setup;
  const orientation = flipped ? (human === "w" ? "b" : "w") : human;
  const squares = useMemo(() => {
    const files = orientation === "w" ? "abcdefgh" : "hgfedcba";
    const ranks = orientation === "w" ? "87654321" : "12345678";
    return [...ranks].flatMap((rank) =>
      [...files].map((file) => (file + rank) as Square),
    );
  }, [orientation]);
  const legal = useMemo(
    () =>
      selected && active
        ? chess.moves({ square: selected, verbose: true })
        : [],
    [chess, selected, active],
  );
  const last = history.at(-1);
  const king = chess.isCheck()
    ? chess
        .board()
        .flat()
        .find((p) => p?.color === chess.turn() && p.type === "k")?.square
    : null;
  const captures = (side: Color) =>
    history
      .filter((m) => m.color === side && m.captured)
      .map((m) => m.captured!)
      .sort((a, b) => PIECE_VALUES[b] - PIECE_VALUES[a]);
  const humanCaptures = captures(human),
    jevCaptures = captures(human === "w" ? "b" : "w");
  const pieces = chess.board().flat();
  const humanMaterial = pieces.reduce(
    (total, piece) =>
      total + (piece?.color === human ? PIECE_VALUES[piece.type] : 0),
    0,
  );
  const jevMaterial = pieces.reduce(
    (total, piece) =>
      total + (piece && piece.color !== human ? PIECE_VALUES[piece.type] : 0),
    0,
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const saved = JSON.parse(raw);
        const s = saved.session;
        if (
          s &&
          s.expires > Date.now() &&
          typeof s.signature === "string" &&
          ["w", "b"].includes(s.state?.player) &&
          typeof s.state?.resigned === "boolean" &&
          Array.isArray(s.state?.moves) &&
          s.state.moves.length <= 1200 &&
          s.state.moves.every(
            (m: unknown) => typeof m === "string" && m.length <= 12,
          )
        ) {
          replayChess(s.state.moves);
          setSession(s);
          setPlayer(s.state.player);
          setDecision(saved.decision ?? null);
          setSetup(false);
          setFocusSquare(s.state.player === "w" ? "e2" : "e7");
        }
      }
    } catch {
      try {
        localStorage.removeItem(STORAGE);
      } catch {}
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded || !session) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify({ session, decision }));
    } catch {}
  }, [session, decision, loaded]);
  useEffect(() => {
    historyRef.current?.scrollTo({
      top: historyRef.current.scrollHeight,
      behavior: "instant",
    });
  }, [history.length]);
  useEffect(() => {
    function escape(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        setPromotion(null);
        setSelected(null);
        setHelp(false);
        setConfirmResign(false);
        if (session) setSetup(false);
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [session]);
  const accept = useCallback((reply: ChessReply) => {
    setSession({
      state: reply.state,
      expires: reply.expires,
      signature: reply.signature,
    });
    setDecision(reply.decision);
    setSelected(null);
    setRetry(null);
  }, []);
  async function start() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setRetry(null);
    setConfirmResign(false);
    try {
      const response = await fetch("/api/chess/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ?? "Could not start a game. Please try again.",
        );
      accept(data);
      setSetup(false);
      setFlipped(false);
      setFocusSquare(player === "w" ? "e2" : "e7");
    } catch (e) {
      setError(
        e instanceof Error && e.name === "TimeoutError"
          ? "Jev took too long to open. Try starting again."
          : e instanceof Error
            ? e.message
            : "Could not connect. Try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function sendMove(move: InputMove) {
    if (!session || lock.current || outcome.over) return;
    const preview = replayChess(session.state.moves);
    try {
      preview.move(move);
    } catch {
      setError("That move is not legal. Choose a highlighted square.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    setRetry(move);
    setPending(preview.history());
    setSelected(null);
    setPromotion(null);
    setFocusSquare(move.to);
    try {
      const response = await fetch("/api/chess/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...session, action: "move", move }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Jev could not reply. Retry your move.");
      accept(data);
    } catch (e) {
      setError(
        e instanceof Error && e.name === "TimeoutError"
          ? "Jev took too long. Your move was rolled back — retry when ready."
          : e instanceof Error
            ? e.message
            : "Connection lost. Retry your move.",
      );
    } finally {
      setPending(null);
      lock.current = false;
      setBusy(false);
    }
  }
  async function resign() {
    if (!session || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chess/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...session, action: "resign" }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error ?? "Could not resign. Try again.");
      accept(data);
      setConfirmResign(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resign. Try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function selectSquare(square: Square) {
    if (!active || chess.turn() !== human || promotion) return;
    setFocusSquare(square);
    setError("");
    if (selected === square) {
      setSelected(null);
      return;
    }
    const moves = legal.filter((m) => m.to === square);
    if (selected && moves.length) {
      if (moves.some((m) => m.promotion)) {
        setPromotion({ from: selected, to: square });
        return;
      }
      void sendMove({ from: selected, to: square });
      return;
    }
    const piece = chess.get(square);
    setSelected(piece?.color === human ? square : null);
  }
  function boardKey(e: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = {
      ArrowUp: -8,
      ArrowDown: 8,
      ArrowLeft: -1,
      ArrowRight: 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const square = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-square]",
    )?.dataset.square as Square | undefined;
    const index = squares.indexOf(square ?? focusSquare),
      next = index + moves[e.key];
    if (
      next < 0 ||
      next >= 64 ||
      (e.key === "ArrowLeft" && index % 8 === 0) ||
      (e.key === "ArrowRight" && index % 8 === 7)
    )
      return;
    setFocusSquare(squares[next]);
    boardRef.current
      ?.querySelector<HTMLButtonElement>(`[data-square="${squares[next]}"]`)
      ?.focus();
  }
  function exportPgn() {
    if (!session) return;
    const game = replayChess(session.state.moves);
    game.setHeader("Event", "Jev Chess");
    game.setHeader("Site", `${window.location.origin}/chess`);
    game.setHeader("White", human === "w" ? "Human" : "TypeSafe Jev");
    game.setHeader("Black", human === "b" ? "Human" : "TypeSafe Jev");
    game.setHeader("Result", outcome.result);
    const url = URL.createObjectURL(
      new Blob([game.pgn()], { type: "application/x-chess-pgn" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "jev-chess.pgn";
    a.click();
    URL.revokeObjectURL(url);
  }
  const status = busy
    ? setup
      ? player === "b"
        ? "Jev is making the opening move…"
        : "Setting up the board…"
      : "Jev is weighing its moves…"
    : setup
      ? "Choose your side. Make your opening."
      : outcome.title;
  const selectedPiece = selected ? chess.get(selected) : null;
  const instructions = selectedPiece
    ? `${colorName(selectedPiece.color)} ${PIECE_NAMES[selectedPiece.type]} on ${selected}. ${[...new Set(legal.map((m) => m.to))].join(", ") || "No legal destinations"}.`
    : outcome.detail;
  return (
    <div className="app-shell chess-shell">
      <header className="topbar">
        <a href="/chess" className="brand">
          <img src="/chess/wn.svg" width={29} height={29} alt="" />
          <span>JEV CHESS</span>
        </a>
        <nav className="topbar-right" aria-label="Game navigation">
          <a className="ch-back" href="/">
            <ArrowLeft size={15} />
            All games
          </a>
          <button
            className="help-button"
            onClick={() => setHelp((h) => !h)}
            aria-expanded={help}
          >
            How to play
          </button>
        </nav>
      </header>
      <main className="ch-main">
        <section className="ch-intro">
          <h1>
            YOUR MOVE,
            <br />
            <span>HUMAN.</span>
          </h1>
          <div>
            <p>
              A classic board. An instinctive opponent.
              <br />
              Take your time. Jev is ready.
            </p>
            <span className="ch-format">
              <i />
              CASUAL CHESS <span>·</span> NO CLOCK
            </span>
          </div>
        </section>
        {help && (
          <section className="ch-help">
            <div>
              <h2>A little strategy goes a long way.</h2>
              <p>
                Select one of your pieces, then a highlighted square. Your goal
                is checkmate: threaten Jev’s king so it has no legal escape.
                Castling, en passant, and all four promotion choices are
                supported.
              </p>
              <p>
                Use arrow keys to explore the board, then Enter or Space to
                select. Threefold repetition and the 50-move rule are
                automatically drawn. Your current game is saved in this browser
                for up to 24 hours. Jev’s percentages describe its move choices,
                not your chance of winning.
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Close instructions"
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
          </section>
        )}
        <div className="ch-layout">
          <section className="ch-play-area" aria-label="Chess game">
            <div className="ch-player-strip">
              <span className="ch-avatar ai">
                <Sparkles size={22} />
              </span>
              <div className="ch-player-name">
                <strong>
                  Jev <span>AI</span>
                </strong>
                <small>{colorName(human === "w" ? "b" : "w")} pieces</small>
              </div>
              <div
                className="ch-captures"
                aria-label={`Jev captured: ${jevCaptures.map((p) => PIECE_NAMES[p]).join(", ") || "none"}`}
              >
                {jevCaptures.map((p, i) => (
                  <Piece key={i} color={human} piece={p} />
                ))}
                {jevMaterial > humanMaterial && (
                  <b>+{jevMaterial - humanMaterial}</b>
                )}
              </div>
              {busy && <LoaderCircle className="ch-spinner" size={19} />}
            </div>
            <div className="ch-board-frame">
              <div
                className={`ch-board ${busy ? "ch-waiting" : ""}`}
                ref={boardRef}
                role="group"
                aria-label="Chessboard. Use arrow keys to explore squares and Enter to select a piece or destination."
                onKeyDown={boardKey}
              >
                {squares.map((square, index) => {
                  const piece = chess.get(square);
                  const destination = legal.some((m) => m.to === square);
                  const isSelected = selected === square;
                  const isLast =
                    last && (last.from === square || last.to === square);
                  const dark =
                    (square.charCodeAt(0) - 97 + Number(square[1])) % 2 === 1;
                  return (
                    <button
                      key={square}
                      type="button"
                      data-square={square}
                      tabIndex={focusSquare === square ? 0 : -1}
                      aria-label={`${square}, ${piece ? `${colorName(piece.color)} ${PIECE_NAMES[piece.type]}` : "empty"}${isSelected ? ", selected" : ""}${destination ? ", legal destination" : ""}${king === square ? ", in check" : ""}`}
                      aria-pressed={isSelected}
                      aria-disabled={!active || !!promotion}
                      className={`ch-square ${dark ? "dark" : "light"} ${isLast ? "last-move" : ""} ${isSelected ? "selected" : ""} ${king === square ? "in-check" : ""} ${destination ? "destination" : ""}`}
                      onClick={() => selectSquare(square)}
                      onFocus={() => setFocusSquare(square)}
                    >
                      {index % 8 === 0 && (
                        <span className="ch-rank" aria-hidden="true">
                          {square[1]}
                        </span>
                      )}
                      {index >= 56 && (
                        <span className="ch-file" aria-hidden="true">
                          {square[0]}
                        </span>
                      )}
                      {piece && (
                        <Piece color={piece.color} piece={piece.type} />
                      )}
                      {destination && (
                        <span
                          className={
                            piece ? "ch-capture-target" : "ch-move-dot"
                          }
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {promotion && (
                <div
                  className="ch-promotion"
                  role="group"
                  aria-label="Choose a promotion piece"
                >
                  <h2>Promote your pawn</h2>
                  <div>
                    {(["q", "r", "b", "n"] as const).map((p) => (
                      <button
                        key={p}
                        aria-label={`Promote to ${PIECE_NAMES[p]}`}
                        onClick={() => sendMove({ ...promotion, promotion: p })}
                      >
                        <Piece color={human} piece={p} />
                        <span>{PIECE_NAMES[p]}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    className="ch-text-button"
                    onClick={() => setPromotion(null)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="ch-player-strip human">
              <span className="ch-avatar you">
                <img
                  src={`/chess/${human}k.svg`}
                  width={28}
                  height={28}
                  alt=""
                />
              </span>
              <div className="ch-player-name">
                <strong>You</strong>
                <small>{colorName(human)} pieces</small>
              </div>
              <div
                className="ch-captures"
                aria-label={`You captured: ${humanCaptures.map((p) => PIECE_NAMES[p]).join(", ") || "none"}`}
              >
                {humanCaptures.map((p, i) => (
                  <Piece key={i} color={human === "w" ? "b" : "w"} piece={p} />
                ))}
                {humanMaterial > jevMaterial && (
                  <b>+{humanMaterial - jevMaterial}</b>
                )}
              </div>
              <button
                className="icon-button"
                onClick={() => setFlipped((f) => !f)}
                aria-label="Flip board"
              >
                <FlipVertical2 size={18} />
              </button>
            </div>
            <div
              className={`ch-status ${outcome.over ? "ended" : ""}`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className={`ch-status-dot ${busy ? "working" : ""}`} />
              <div>
                <strong>{status}</strong>
                <p>
                  {!busy && !setup
                    ? instructions
                    : busy
                      ? "One decision. All legal moves considered."
                      : "Select White to open, or Black to let Jev move first."}
                </p>
                <span className="sr-only">
                  {last
                    ? `Last move: ${colorName(last.color)} ${last.san}, ${last.from} to ${last.to}.`
                    : ""}
                </span>
              </div>
            </div>
            {error && (
              <div className="error-message ch-error" role="alert">
                <span>{error}</span>
                {retry && (
                  <button onClick={() => sendMove(retry)} disabled={busy}>
                    <RotateCcw size={15} />
                    Retry move
                  </button>
                )}
              </div>
            )}
          </section>
          <aside className="ch-sidebar" aria-label="Game details">
            <section className="ch-game-controls">
              {setup ? (
                <>
                  <div className="ch-section-heading">
                    <h2>{session ? "A fresh challenge?" : "Pick your side"}</h2>
                    {session && (
                      <button
                        className="icon-button"
                        onClick={() => setSetup(false)}
                        disabled={busy}
                        aria-label="Keep current game"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                  <p>
                    {session
                      ? "Starting replaces your current game."
                      : "Same rules. A different kind of opponent."}
                  </p>
                  <div
                    className="ch-color-choice"
                    role="group"
                    aria-label="Your piece color"
                  >
                    {(["w", "b"] as const).map((c) => (
                      <button
                        key={c}
                        className={player === c ? "chosen" : ""}
                        aria-pressed={player === c}
                        disabled={busy}
                        onClick={() => setPlayer(c)}
                      >
                        <Piece color={c} piece="k" />
                        <span>{colorName(c)}</span>
                        {player === c && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <button
                    className="primary ch-start"
                    disabled={busy || !loaded}
                    onClick={start}
                  >
                    {busy ? (
                      <LoaderCircle size={17} className="ch-spinner" />
                    ) : (
                      <Play size={16} fill="currentColor" />
                    )}
                    {busy ? "Getting ready…" : `Play as ${colorName(player)}`}
                    <ArrowUpRight size={17} />
                  </button>
                </>
              ) : (
                <>
                  <div className="ch-section-heading">
                    <h2>{outcome.over ? "Game complete" : "The game"}</h2>
                    <span>
                      {Math.floor((history.length + 1) / 2) || 1}{" "}
                      {history.length <= 2 ? "MOVE" : "MOVES"}
                    </span>
                  </div>
                  <button
                    className="primary ch-start"
                    disabled={busy}
                    onClick={() => {
                      setSetup(true);
                      setError("");
                      setConfirmResign(false);
                      setSelected(null);
                      setPromotion(null);
                    }}
                  >
                    <RotateCcw size={16} />
                    {outcome.over ? "Play again" : "New game"}
                    <ArrowUpRight size={17} />
                  </button>
                  <div className="ch-secondary-controls">
                    <button
                      disabled={!history.length || busy}
                      onClick={exportPgn}
                    >
                      <Download size={15} />
                      Export PGN
                    </button>
                    <button
                      disabled={outcome.over || busy}
                      onClick={() => setConfirmResign((r) => !r)}
                    >
                      <Flag size={14} />
                      Resign
                    </button>
                  </div>
                  {confirmResign && (
                    <div className="ch-resign">
                      <p>Resign this game? Jev wins.</p>
                      <button disabled={busy} onClick={resign}>
                        Yes, resign
                      </button>
                      <button
                        onClick={() => setConfirmResign(false)}
                        disabled={busy}
                      >
                        Keep playing
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
            <section className="ch-history">
              <div className="ch-section-heading">
                <h2>Move by move</h2>
                <span>WHITE / BLACK</span>
              </div>
              <div className="ch-history-scroll" ref={historyRef}>
                {history.length ? (
                  <table aria-label="Move history">
                    <thead className="sr-only">
                      <tr>
                        <th>Move number</th>
                        <th>White</th>
                        <th>Black</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(
                        { length: Math.ceil(history.length / 2) },
                        (_, i) => (
                          <tr key={i}>
                            <th scope="row">{i + 1}.</th>
                            <td
                              className={
                                history.length - 1 === i * 2 ? "latest" : ""
                              }
                            >
                              {history[i * 2]?.san}
                            </td>
                            <td
                              className={
                                history.length - 1 === i * 2 + 1 ? "latest" : ""
                              }
                            >
                              {history[i * 2 + 1]?.san ?? "…"}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                ) : (
                  <div className="ch-empty-history">
                    <img src="/chess/wn.svg" width={40} height={40} alt="" />
                    <p>
                      Every great game starts
                      <br />
                      with a first move.
                    </p>
                  </div>
                )}
              </div>
            </section>
            <section className="ch-decisions">
              <div className="ch-section-heading">
                <h2>Jev’s last choice</h2>
                <span className="ch-live">
                  <i />
                  {decision ? "LIVE AI" : "JEV AI"}
                </span>
              </div>
              {decision ? (
                <>
                  <div className="ch-chosen">
                    <strong>{decision.san}</strong>
                    <span>
                      {decision.from}
                      <ChevronRight size={12} />
                      {decision.to}
                      <small>{decision.latencyMs.toLocaleString()} ms</small>
                    </span>
                  </div>
                  <div className="ch-options">
                    {decision.options.map((option) => (
                      <div
                        key={option.san}
                        className={option.san === decision.san ? "picked" : ""}
                      >
                        <b>{option.san}</b>
                        <span>
                          <i
                            style={{
                              transform: `scaleX(${option.probability ?? 0})`,
                            }}
                          />
                        </span>
                        <small>
                          {option.probability === null
                            ? "—"
                            : `${Math.round(option.probability * 100)}%`}
                        </small>
                      </div>
                    ))}
                  </div>
                  <p>
                    Top choices from {decision.legalCount} legal moves.
                    <br />
                    Choice share, not win probability.
                  </p>
                </>
              ) : (
                <>
                  <div className="ch-choice-placeholder">
                    <Sparkles size={26} />
                    <p>
                      A glimpse at the other
                      <br />
                      side of the board.
                    </p>
                  </div>
                  <p>
                    After Jev moves, see its choice and the alternatives it
                    considered.
                  </p>
                </>
              )}
            </section>
          </aside>
        </div>
        <footer className="footer ch-footer">
          <span>Chess. With a mind of its own.</span>
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
            Vercel AI Gateway
          </span>
        </footer>
        <div className="ch-art-credit">
          Piece artwork by{" "}
          <a
            href="https://commons.wikimedia.org/wiki/User:Cburnett"
            target="_blank"
            rel="noreferrer"
          >
            Cburnett &amp; contributors
          </a>{" "}
          ·{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/3.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 3.0
          </a>{" "}
          · <a href="/chess/ATTRIBUTION.md">Credits</a>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  ArrowRight,
  Gamepad2,
  Gem,
  Route,
  Shield,
  CodeXml,
  Bomb,
  Flag,
} from "lucide-react";
import { BOARD } from "@/lib/game";
import { REPO_URL } from "@/lib/site";
import "./home.css";

function HeistPreview() {
  return (
    <div className="hub-heist-board" aria-hidden="true">
      {BOARD.flatMap((row, y) =>
        [...row].map((cell, x) => {
          const gem =
            (x === 9 && y === 1) ||
            (x === 5 && y === 4) ||
            (x === 9 && y === 7);
          const player = x === 3 && y === 3;
          const guard = x === 7 && y === 5;
          return (
            <span
              key={`${x}-${y}`}
              className={`hub-tile ${cell === "#" ? "hub-wall" : ""} ${player ? "hub-player" : ""} ${guard ? "hub-guard" : ""}`}
            >
              {gem ? (
                <Gem />
              ) : player ? (
                <span className="hub-eyes">••</span>
              ) : guard ? (
                <Shield />
              ) : x === 1 && y === 7 ? (
                <ArrowDown />
              ) : null}
            </span>
          );
        }),
      )}
    </div>
  );
}

function ChessPreview() {
  const pieces: Record<number, string> = {
    0: "br",
    2: "bb",
    3: "bq",
    4: "bk",
    5: "bb",
    7: "br",
    8: "bp",
    9: "bp",
    10: "bp",
    13: "bp",
    14: "bp",
    15: "bp",
    18: "bn",
    21: "bn",
    28: "bp",
    35: "wp",
    36: "wp",
    42: "wn",
    45: "wn",
    48: "wp",
    49: "wp",
    50: "wp",
    53: "wp",
    54: "wp",
    55: "wp",
    56: "wr",
    58: "wb",
    59: "wq",
    60: "wk",
    61: "wb",
    63: "wr",
  };
  return (
    <div className="hub-chess-board" aria-hidden="true">
      {Array.from({ length: 64 }, (_, i) => (
        <span
          key={i}
          className={`${(Math.floor(i / 8) + (i % 8)) % 2 ? "hub-dark" : ""} ${i === 35 || i === 51 ? "hub-last-move" : ""}`}
        >
          {pieces[i] && (
            <img
              src={`/chess/${pieces[i]}.svg`}
              alt=""
              width={45}
              height={45}
            />
          )}
        </span>
      ))}
    </div>
  );
}

function MinesweeperPreview() {
  const open: Record<number, number> = {
    0: 0,
    1: 0,
    2: 1,
    7: 0,
    8: 1,
    9: 2,
    14: 0,
    15: 1,
    21: 0,
    22: 1,
    28: 1,
    29: 2,
    35: 1,
  };
  return (
    <div className="hub-mines-board" aria-hidden="true">
      {Array.from({ length: 49 }, (_, i) => (
        <span
          key={i}
          className={`${i in open ? "hub-mine-open" : ""} ${i === 16 ? "hub-mine-flag" : ""}`}
          data-clue={open[i]}
        >
          {i === 16 ? <Flag size={17} /> : open[i] || ""}
        </span>
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="app-shell hub-shell">
      <a className="hub-skip" href="#games">
        Skip to games
      </a>
      <header className="topbar hub-topbar">
        <Link href="/" className="brand">
          <Gamepad2 size={25} />
          <span>PLAY WITH JEV</span>
        </Link>
        <nav aria-label="Main navigation" className="hub-nav">
          <a href="#games">
            The games <ArrowDown size={14} />
          </a>
          <a href={REPO_URL} aria-label="View source on GitHub">
            <CodeXml size={19} />
            <span>Source</span>
          </a>
        </nav>
      </header>
      <main className="hub-main">
        <section className="hub-hero" aria-labelledby="hub-title">
          <div>
            <p className="hub-eyebrow">
              <span /> A LITTLE ARCADE. A CLEVER OPPONENT.
            </p>
            <h1 id="hub-title">
              YOUR NEXT
              <br />
              <span>FRIENDLY RIVAL.</span>
            </h1>
          </div>
          <div className="hub-intro">
            <div className="hub-mascot" aria-hidden="true">
              <span>J</span>
              <span>EV</span>
              <i>↗</i>
            </div>
            <p>
              Meet Jev. It plays the guard. <br />
              It makes the next move. <br />
              <strong>You bring the human ingenuity.</strong>
            </p>
          </div>
        </section>
        <section id="games" className="hub-games" aria-labelledby="games-title">
          <div className="hub-section-label">
            <h2 id="games-title">PICK YOUR CHALLENGE</h2>
            <span>03 GAMES · NO SIGNUP</span>
          </div>
          <div className="hub-game-grid">
            <Link
              href="/heist"
              className="hub-game hub-heist"
              aria-label="Play Jev Heist — sneak past the AI guard"
            >
              <div className="hub-preview">
                <div className="hub-game-tag">
                  <Route size={14} /> THE GREAT ESCAPE
                </div>
                <HeistPreview />
                <span className="hub-preview-note">
                  3 GEMS. 40 TURNS. ONE WAY OUT.
                </span>
              </div>
              <div className="hub-card-copy">
                <div className="hub-card-heading">
                  <h3>JEV HEIST</h3>
                  <span className="hub-play">
                    <ArrowUpRight size={27} />
                  </span>
                </div>
                <p>
                  Pocket the gems. Distract the guard. Make your getaway before
                  Jev catches on.
                </p>
                <div className="hub-card-bottom">
                  <span>STEALTH / STRATEGY</span>
                  <strong>
                    Plan your escape <ArrowRight size={16} />
                  </strong>
                </div>
              </div>
            </Link>
            <Link
              href="/chess"
              className="hub-game hub-chess"
              aria-label="Play Jev Chess — challenge Jev on the chessboard"
            >
              <div className="hub-preview">
                <div className="hub-game-tag">
                  <img src="/chess/wn.svg" width={17} height={17} alt="" /> THE
                  CLASSIC RIVALRY
                </div>
                <ChessPreview />
                <span className="hub-preview-note">YOUR MOVE, HUMAN.</span>
              </div>
              <div className="hub-card-copy">
                <div className="hub-card-heading">
                  <h3>JEV CHESS</h3>
                  <span className="hub-play">
                    <ArrowUpRight size={27} />
                  </span>
                </div>
                <p>
                  A familiar board. A different kind of opponent. Take a seat
                  and see how Jev thinks.
                </p>
                <div className="hub-card-bottom">
                  <span>CHESS / STRATEGY</span>
                  <strong>
                    Make your move <ArrowRight size={16} />
                  </strong>
                </div>
              </div>
            </Link>
            <Link
              href="/minesweeper"
              className="hub-game hub-mines"
              aria-label="Play Jev Minesweeper — clear the field with optional Jev hints"
            >
              <div className="hub-preview">
                <div className="hub-game-tag">
                  <Bomb size={14} /> THE SECOND OPINION
                </div>
                <MinesweeperPreview />
                <span className="hub-preview-note">
                  A LITTLE LOGIC. A LITTLE NERVE.
                </span>
              </div>
              <div className="hub-card-copy">
                <div className="hub-card-heading">
                  <h3>MINESWEEPER</h3>
                  <span className="hub-play">
                    <ArrowUpRight size={27} />
                  </span>
                </div>
                <p>
                  Follow the clues. Flag the mines. Ask Jev for a fresh pair of
                  eyes when things get tricky.
                </p>
                <div className="hub-card-bottom">
                  <span>LOGIC / PUZZLE</span>
                  <strong>
                    Clear the field <ArrowRight size={16} />
                  </strong>
                </div>
              </div>
            </Link>
          </div>
        </section>
        <section className="hub-about" aria-labelledby="about-title">
          <span className="hub-about-mark" aria-hidden="true">
            ↔
          </span>
          <div>
            <h2 id="about-title">A little human. A little Jev.</h2>
            <p>
              Challenge Jev in Heist and Chess, or ask it for a second opinion
              in Minesweeper. Each game lets you peek at its choices. Powered by{" "}
              <a href="https://vercel.com/ai-gateway/models/jev">
                TypeSafe Jev
              </a>{" "}
              through Vercel AI Gateway.
            </p>
          </div>
          <span className="hub-about-note">
            HUMAN INSTINCT
            <br />
            MEETS AI INSTINCT.
          </span>
        </section>
      </main>
      <footer className="hub-footer">
        <p>
          Built for a little friendly competition.
          <br />
          <span>
            Made by Hussain Fakhruddin ·{" "}
            <a href="https://x.com/hussainanjar" aria-label="@hussainanjar on X">
              @hussainanjar
            </a>
          </span>
          <br />
          <a className="hub-credits" href="/chess/ATTRIBUTION.md">
            Chess artwork: Cburnett · CC BY-SA 3.0
          </a>
        </p>
        <a href={REPO_URL}>
          Open source on GitHub <ArrowUpRight size={15} />
        </a>
      </footer>
    </div>
  );
}

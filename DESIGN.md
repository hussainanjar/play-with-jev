---
name: Jev Heist
description: A compact route-map heist against a visible AI opponent.
colors:
  ink: "#153b65"
  blue: "#2854c8"
  blue-dark: "#1744b4"
  paper: "#f2f6f5"
  floor: "#dce9ef"
  red: "#ee543c"
  lime: "#d4ef7c"
  gold: "#f8c94e"
  line: "#c5d3db"
  muted: "#50677b"
  white: "#ffffff"
  opponent-surface: "#e3eaf0"
  control-surface: "#e0e8eb"
  control-hover: "#c4d5ea"
  slot-empty: "#e2e9e8"
  ability-hover: "#e2eced"
  error-surface: "#f8dfd7"
  error-ink: "#7e2c1f"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial, sans-serif"
    fontSize: "clamp(62px, 6.5vw, 88px)"
    fontWeight: 700
    lineHeight: 0.88
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  introduction:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "17px"
    lineHeight: 1.5
  label:
    fontFamily: "Barlow, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.075em"
rounded:
  keycap: "3px"
  badge: "4px"
  button: "5px"
  ability: "6px"
  panel: "8px"
  arena-header: "9px 9px 0 0"
  result: "10px"
  player: "42%"
  circle: "50%"
spacing:
  control-gap: "4px"
  compact: "8px"
  inline: "12px"
  phone-gutter: "16px"
  tablet-gutter: "20px"
  rail-stack: "24px"
  desktop-gap: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.button}"
    padding: "13px 22px"
  button-primary-hover:
    backgroundColor: "{colors.blue}"
  button-ability:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.ability}"
    padding: "10px 12px"
  button-ability-active:
    backgroundColor: "{colors.lime}"
  button-help:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "4px 0"
  button-icon:
    backgroundColor: "transparent"
    rounded: "{rounded.circle}"
    width: "36px"
    height: "36px"
  direction:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
  navigation:
    textColor: "{colors.ink}"
    height: "74px"
    padding: "0 8px"
  loot-slot:
    backgroundColor: "{colors.slot-empty}"
    rounded: "{rounded.ability}"
    width: "49px"
    height: "49px"
  loot-slot-collected:
    backgroundColor: "{colors.gold}"
  opponent:
    backgroundColor: "{colors.opponent-surface}"
    rounded: "{rounded.panel}"
    padding: "17px 16px"
  text-map:
    textColor: "{colors.muted}"
    padding: "0 2px 10px"
  error:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.error-ink}"
    rounded: "{rounded.ability}"
    padding: "15px 17px"
---

# Design System: Jev Heist

## Overview

**Creative North Star: "The Night Shift Route Map"**

Jev Heist uses the language of a compact transit map for a playful chase: strong blue routes, pale tiled passages, a lime masked player, a coral square guard, and gold diamond loot. Condensed display lettering gives the game its voice while compact Barlow labels keep turns and controls legible.

The implementation is a direct code build with CSS pieces and inline vector icons. The committed visual direction comes from the surface brief; there is no approved image composition. Color fields, outlines, and distinct silhouettes carry state, with limited shadows reserved for pieces and overlays.

**Key Characteristics:**

- A dominant 11 by 9 route board with distinct piece silhouettes.
- Condensed display type paired with compact, readable controls.
- Visible AI choice, probability, and connection states.
- Keyboard and touch play with an expandable text map.

## Colors

The ten root CSS colors are the normative game palette. The additional frontmatter colors capture recurring implemented surfaces and error treatment; small icon strokes and decorative highlights remain local CSS details.

- **Ink** supplies text and the primary action; **blue** supplies routes, arena chrome, selected AI choices, and hover emphasis. **Blue dark** creates inset wall detail.
- **Paper**, **floor**, **line**, and **muted** establish the cool neutral field, walkable tiles, separators, and secondary text.
- **Red** marks the page edge, second title line, guard, thinking indicator, and focus ring. **Lime** identifies the player, armed dash, selection highlight, and ready exit slot. **Gold** identifies collected loot.
- The opponent uses its own blue-gray panel surface. Errors combine a pale coral surface with dark red text and retry action. The initial opponent bars are empty and values display em dashes.

## Typography

Locally hosted WOFF2 files load **Barlow Condensed 700** for display and **Barlow 400, 600, 700** for body and controls through `next/font/local` in `src/app/layout.tsx`. The CSS variables have Arial/sans-serif fallbacks; they are not the intended primary fonts. There is no separate monospace face; keycaps inherit Barlow.

The introductory title uses the frontmatter display role, with the second line coral. Rail titles are 18px/700; opponent headings are 16px. Body defaults to 15px; introductory copy is 17px with 1.5 line height. Arena labels use 12px/600 with 0.075em tracking. Secondary descriptions use 11–13px. Turn numbers are 21px and numeric statistics use tabular numerals. Result titles use Barlow Condensed 700 at `clamp(25px, 3.8vw, 48px)`, 0.95 line height and -0.02em tracking.

## Layout

The centered main container and top bar are capped at 1240px with 8px inner horizontal padding. The header is 74px tall. Introduction, title, and start action precede a two-column game layout: a flexible arena and 290px control rail, separated by 32px. The rail stacks mission, movement/abilities, and opponent with a 24px gap. The board is always 11 columns by 9 rows, aspect ratio 11/9; piece coordinates are percentages of that geometry.

Implemented media queries, in cascade order:

| Condition | Actual behavior |
|---|---|
| At least 1400px | Game column gap 36px; introduction padding 38px top / 34px bottom. |
| At most 1280px | Outer margins 32px; rail 270px; column gap 26px; title 78px. |
| At most 900px | Outer margins 20px; rail 234px; gap 20px; title 70px; header 66px. Movement helper copy and keyboard legend hide. |
| At most 680px | Outer margins 16px, inner container padding zero, header 59px, top rule 5px. Arena moves above a two-column rail; loot spans both rail columns. Title becomes `clamp(38px, 9.7vw, 58px)` at 0.9 line height, with introduction copy 43% wide. |

On phones the movement grid has **44px by 44px buttons** with 4px gaps, from the final overriding media rule. The main action becomes 13px with 11px 12px padding and a 43px minimum height. Mission explanatory copy and ability keycaps hide; the keyboard legend reappears at 8px. The opponent stays beside controls; footer and errors stack. The text map remains available below the board, with 11px text on phones.

## Elevation & Depth

Large areas use flat color and borders. Shadows distinguish small pieces and floating game messages from the map:

- Player and guard: `0 3px 5px #17365833`.
- Gem filter: `drop-shadow(0 3px 2px #85743d40)`.
- Introductory board invitation: `0 4px 14px #193c6130`.
- Result panel: `0 9px 40px #15275d50`.

Pieces layer with the player at z-index 4 and guard at 3; the result panel is at 6. The board isolates its stacking context. Finished boards use `saturate(0.6)` beneath the paper result panel. There is no glass or backdrop blur.

## Shapes

The route grid establishes square geometry, softened by 5px buttons and board corners, 6px abilities/guard/loot slots, 8px opponent and instructions panels, and a 10px result overlay. The arena header rounds its top corners by 9px. Circular icon buttons and tiny status dots contrast with the map. The player is a 42%-rounded shape rotated -5 degrees, with a counter-rotated mask; the guard is a squared face. Loot is a diamond, and the exit combines a door icon with an EXIT label. Color is therefore accompanied by shape and labels.

## Components

**Primary action.** Ink background, white text, 600 weight, 5px corners, 13px 22px padding and 48px minimum height. Hover changes to blue and lifts by 1px over 150ms. Start, new game, and result replay share this primitive. Disabled buttons use 0.4 opacity and a not-allowed cursor. Buttons, links, and the text-map summary have a 3px red focus outline with 4px offset.

**Utilities and navigation.** The brand links home. Sound is an initially off icon toggle with a pressed state and accessible label. How to play is a 13px/600 underlined text button with blue hover and expanded state. Instructions expand inline and have a close button; Escape closes them and disarms dash. The top-bar slogan hides on phones. Footer links underline on hover. No navigation tabs, text fields, or form inputs are implemented.

**Movement and abilities.** Direction buttons form a cross with Wait in the center. Blocked directions, busy turns, and non-playing states disable movement. Dash is an outlined 6px button with a lime active state and textual recharge count; its pressed state is exposed. Decoy shows the remaining lure count. Keyboard controls are arrows/WASD, X or Shift plus direction for dash, C for decoy, and Space to wait. Input locks while Jev responds.

**Loot and opponent.** Three gem slots progress from neutral outlines to gold filled diamonds; a fourth slot turns lime when the exit unlocks. The opponent panel contains direction icon, label, 5px probability track, numeric probability, and decision latency. The selected direction gains blue and 600 weight. The connection label switches from JEV AI to LIVE AI only after a response. Unavailable probability values remain em dashes.

**Board and accessible map.** The board has a textual image label with current coordinates. Decorative tiles and pieces are hidden from assistive technology. A native details disclosure exposes walkable rows, positions, gems, exit, and any active decoy. The polite status region announces turn and positions, remaining loot, and Jev's move. Initial board invitation explains the green player. Win/loss displays an in-board status panel with a replay action; errors use an alert and retry action.

**Motion.** Pieces transition left/top over 180ms using `cubic-bezier(0.16, 1, 0.3, 1)`. Probability bars scale from their left edge over 250ms. Thinking alternates opacity 0.6→1 and translateY 0→-3px: guard 550ms, status light 500ms, decoy 700ms, all ease-in-out. Direction hover uses 150ms. The reduced-motion media query removes all animations and transitions and restores automatic scrolling. Sound is opt-in synthesized feedback.

## Do's and Don'ts

### Do

- Do preserve the separate lime player, coral guard, gold loot, and blue route roles.
- Do pair state color with text, shape, numbers, or icons.
- Do keep the board before the controls and opponent panel on phones.
- Do retain visible focus, the text map, live position announcements, and reduced motion support.

### Don't

- Don't show fabricated probabilities or a live connection before a decision exists.
- Don't replace the 11 by 9 board geometry with a decorative or cropped image.
- Don't animate movement or thinking when reduced motion is requested.
- Don't introduce an input or form style as though one already exists in this game.

## Chess surface — `/chess`

The chess addition inherits Barlow/Barlow Condensed, the paper/ink/blue/vermilion palette, header, focus treatment, and footer. It uses an 8×8 board with locally served Cburnett SVG pieces (CC BY-SA 3.0), rather than the heist's CSS tokens.

Chess-specific colors: light squares `#e0e9ec`, dark squares `#89a6b9`; last move `#e4e5a6` / `#b9c883`; selected square `#bbd96e`; checked king `#ed937d`. Legal destinations use a centered dot or a capture ring. Coordinates and piece names are exposed as button labels. Arrow keys move a single roving focus; Enter/Space select. A live status announces the last move and destination options.

The desktop shell is capped at 960px. Board and 306px control rail sit side by side, with player/capture strips framing the board. At 850px the rail narrows; at 680px the board is full width, controls stack below, and history/decision panels share two columns. The promotion chooser appears over the board; closing it leaves the position unchanged. Motion is restricted to a loading spinner, thinking indicator, and probability bars, all disabled under reduced motion.

## Arcade homepage — `/`

The collection inherits the game palette and self-hosted fonts. A large condensed heading introduces Jev, followed by two linked game cards with decorative previews built from the real map geometry and licensed chess artwork. Desktop uses two columns; phones stack the cards. The homepage includes a skip link, visible keyboard focus, reduced-motion support, artwork credits, and the public source link. All new homepage selectors use the `hub-` prefix to avoid altering game layouts.

---
name: Rollhouse
description: A family's five-dice game night on a lavender evening table.
colors:
  # Daytime (light theme). theme/palette.ts is the only source; these mirror it.
  lavender-mist: "#F6F3FB"
  white-sheet: "#FFFFFF"
  lilac-rule: "#E1DAF0"
  plum-ink: "#2A2440"
  dusk-quiet: "#675F84"
  peony-pink: "#E88DB2"
  violet: "#6B55C8"
  lilac-wash: "#ECE6FA"
  moonlight: "#F4F1FA"
  iris-pip: "#5B47B0"
  plum-shadow: "#1A1530"
  # Evening (dark theme).
  evening-plum: "#1D1A2C"
  evening-sheet: "#29253D"
  evening-rule: "#3D3757"
  evening-quiet: "#B6AED0"
  evening-pink: "#F2A7C3"
  evening-lavender: "#BBA9F3"
  evening-wash: "#463F6C"
  evening-band: "#151321"
  evening-die: "#F7F5FB"
  evening-shadow: "#05040A"
  # The 3D tray (decoration only, never behind text).
  felt-day: "#5D4FA3"
  rim-day: "#E6E0F3"
  shelf-day: "#D9D0EE"
  seat-day: "#C5B9E4"
  felt-evening: "#3A3263"
  rim-evening: "#4E4774"
  shelf-evening: "#453E69"
  seat-evening: "#38325A"
  # Player tints: hue for rings, swatches, roll dots and the cup; ink for numbers on the pad.
  tint-rose: "#E0708F"
  tint-rose-ink: "#CD2C59"
  tint-rose-ink-evening: "#E0708F"
  tint-seaglass: "#4FBFAE"
  tint-seaglass-ink: "#2C796E"
  tint-seaglass-ink-evening: "#4FBFAE"
  tint-marigold: "#EE9A2E"
  tint-marigold-ink: "#9F5F0D"
  tint-marigold-ink-evening: "#EE9A2E"
  tint-fern: "#62AE5C"
  tint-fern-ink: "#427B3D"
  tint-fern-ink-evening: "#62AE5C"
  tint-heather: "#A07BD6"
  tint-heather-ink: "#8454CA"
  tint-heather-ink-evening: "#A37FD7"
  tint-primrose: "#E6CB45"
  tint-primrose-ink: "#7E6C11"
  tint-primrose-ink-evening: "#E6CB45"
  tint-poppy: "#E8613C"
  tint-poppy-ink: "#C83D18"
  tint-poppy-ink-evening: "#E96A47"
  tint-walnut: "#A0714E"
  tint-walnut-ink: "#8F6546"
  tint-walnut-ink-evening: "#B48765"
typography:
  display:
    fontFamily: "Fredoka, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(2.3rem, 8.5vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fredoka, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 2.8vw, 2.6rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fredoka, Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.2
  action:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.2
  score:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.2
    fontFeature: "tnum"
rounded:
  bonus-box: "0.4rem"
  chip: "0.55rem"
  field: "0.75rem"
  md: "0.9rem"
  die: "1.1rem"
  lg: "1.2rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "1.75rem"
components:
  button-primary:
    backgroundColor: "{colors.peony-pink}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.1rem"
    height: "48px"
  button-primary-big:
    backgroundColor: "{colors.peony-pink}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.action}"
    rounded: "{rounded.pill}"
    height: "3.6rem"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.white-sheet}"
    textColor: "{colors.plum-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.1rem"
    height: "48px"
  button-segment-selected:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.white-sheet}"
    rounded: "{rounded.pill}"
    height: "48px"
  input-text:
    backgroundColor: "{colors.white-sheet}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.field}"
    padding: "0 0.85rem"
    height: "48px"
  sheet:
    backgroundColor: "{colors.white-sheet}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.lg}"
    padding: "1.5rem 1.75rem"
  band-plate:
    backgroundColor: "{colors.plum-ink}"
    textColor: "{colors.moonlight}"
    typography: "{typography.display}"
    rounded: "{rounded.lg}"
    padding: "1.1rem 2rem 1.2rem"
  score-option:
    backgroundColor: "{colors.lilac-wash}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.chip}"
    padding: "0 0.6rem"
  score-chosen:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.white-sheet}"
    rounded: "{rounded.chip}"
    padding: "0 0.6rem"
  bonus-tag:
    backgroundColor: "{colors.peony-pink}"
    textColor: "{colors.plum-ink}"
    rounded: "{rounded.pill}"
    padding: "0 0.45rem"
  tab-tag-up:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.white-sheet}"
    rounded: "{rounded.pill}"
    padding: "0 0.5rem"
---

# Design System: Rollhouse

## Overview

**Creative North Star: "The Lavender Evening Table"**

A family game night after dark, set on a clean, modern table: dark plum around the edges, lavender for whatever is yours or chosen, and one soft pink for the thing to do next. The evening theme is the main scene, because the game is mostly played on evening voice calls. The daytime theme keeps the same structure with pale lavender ground and plum ink, so both themes share one set of roles and differ only in values.

The screens are calm and roomy: soft raised white or plum sheets, pill-shaped controls, a plum band or plate holding the wordmark, and a 3D tray of porcelain dice with violet pips on violet felt. Femininity comes from the palette and the rounded display face, kept light: no ornament, no texture on the interface, no illustration. The playful moments are short and earned, like the sparkle burst on a Yatzy and on the winner's name, the pulse of your tint when your turn arrives, and a new score coming into focus on the pad.

Rejected looks the owner confirmed on rendered screens: the earlier candy-shop identity (candy names, colors, motifs) and the "Sunprint" cyanotype that followed it (script typefaces, paper or print textures, anything old-fashioned).

**Key Characteristics:**
- Plum, lavender and one pink, in a daytime and an evening theme generated from one palette file.
- Fredoka 700 for names and big moments; Atkinson Hyperlegible Next for everything you read and tap.
- Soft raised sheets with plum-tinted shadows; pills for every button.
- Each player owns a flower or leaf tint that rings their face, colors their cup and writes their numbers.
- Short, earned celebrations; reduced motion turns all of them into fades.

## Colors

A plum-and-lavender palette with a single pink accent, and eight player tints that stay out of the chrome.

### Primary
- **Peony Pink** (day `peony-pink`, evening `evening-pink`): the one next action. Roll, Write it in, Sit down, Start game, and the earned upper-section bonus tag. Text on it is plum.

### Secondary
- **Violet / Evening Lavender** (day `violet`, evening `evening-lavender`): state that belongs to you or was chosen. The box you picked, earned Yatzy bonus boxes, the selected segment, the "Up" tag on whose turn it is, the upper-bonus meter, focus rings, caret, checkboxes and the host crown.
- **Lilac Wash** (day `lilac-wash`, evening `evening-wash`): soft fill for a score you could take, the "looking only" note on someone else's pad, the floating banner, and text selection.

### Tertiary
- **Player tints** (`tint-*`): Rose, Sea glass, Marigold, Fern, Heather, Primrose, Poppy, Walnut. The hue rings avatars, fills swatches and roll dots, tints the active pad tab, pulses on a new score and glazes the dice cup. The ink, per theme, is the only form a tint takes as text: the numbers a player writes on the pad and their totals on the results.

### Neutral
- **Lavender Mist / Evening Plum** (`lavender-mist`, `evening-plum`): page ground.
- **White Sheet / Evening Sheet** (`white-sheet`, `evening-sheet`): the score pad, lobby sheet, standings, panels, secondary buttons and inputs.
- **Lilac Rule / Evening Rule** (`lilac-rule`, `evening-rule`): pad rules, borders, dashed empty seats, the meter track. Decoration only, never text.
- **Plum Ink / Moonlight** (`plum-ink`, `moonlight`): body text. Plum Ink is also the daytime band.
- **Dusk Quiet / Evening Quiet** (`dusk-quiet`, `evening-quiet`): secondary text, zero previews, badges, column heads.
- **Band** (`plum-ink` by day, `evening-band` at night) with **Moonlight** text: the top bar at the table, the brand plate, the winner plate.
- **Die and Pip** (`white-sheet` / `evening-die`, `iris-pip`): porcelain dice with violet pips, in 3D and flat.
- **Shadow** (`plum-shadow`, `evening-shadow`): mixed into every shadow; never used as a fill.
- **Tray** (`felt-*`, `rim-*`, `shelf-*`, `seat-*`): the 3D tray's violet felt, lacquered lavender frame and held-dice shelf. Decoration only.

### Named Rules
**The One Pink Rule.** Pink marks the single thing to do next, plus the earned +35 bonus. If two pink buttons are on screen, one of them is wrong.

**The Lavender Is Yours Rule.** Violet and lavender mean chosen, selected, focused or earned. They never decorate.

**The One Palette File Rule.** Every color comes from `theme/palette.ts` as a generated CSS variable, and every text pairing there passes 4.5:1 in a test. A new color is added there with its pairing, never typed into a component.

**The Ink, Not Hue Rule.** A player's hue never sets text on the pad; only its per-theme ink does.

## Typography

**Display Font:** Fredoka 700 (falls back to Atkinson Hyperlegible Next, system-ui)
**Body Font:** Atkinson Hyperlegible Next 400 / 600 / 800 (falls back to system-ui)

**Character:** A rounded, friendly geometric face for names and big moments over a legibility-first sans that carries every label, number and control.

### Hierarchy
- **Display** (Fredoka 700, clamp(2.3rem, 8.5vw, 3.4rem), 1.05): the wordmark on the brand plate and the winner's name (clamp(2.4rem, 6vw, 3.4rem)). The Yatzy word over the tray is the largest use (4.2rem).
- **Headline** (Fredoka 700, clamp(1.9rem, 2.8vw, 2.6rem), 1.15, -0.02em): whose turn it is; on your own turn it grows to clamp(2.2rem, 3.4vw, 3.2rem).
- **Title** (Fredoka 700, 1.45rem, 1.2): lobby section heads and the top standing's name (1.6rem). The small wordmark on the table band is 1.6rem.
- **Body** (Atkinson 400, 1.0625rem, 1.4): all running text. 17px at Regular is the floor everywhere.
- **Label** (Atkinson 600, 1.0625rem): buttons, pad row names, seat names. Selected states step to 700, primary buttons to 800.
- **Score** (Atkinson 800, 1.35rem, tabular figures): numbers written on the pad in the player's ink; totals on results run 2.2rem, the winner's 3rem.

### Named Rules
**The Rounded Moments Rule.** Fredoka is for names and moments: wordmark, section heads, the turn headline, the winner, the Yatzy word. Controls, tables and numbers stay in Atkinson.

**The 17px Floor Rule.** No text is smaller than 1.0625rem, and every size is in rem so the Text size setting scales the whole UI.

## Layout

Single centered column with generous padding: screens cap at 44rem (results 42rem, lobby 64rem) with 1rem gutters, and non-table screens leave 4.4rem at the top for the corner controls (theme, sound, settings) pinned top right.

The lobby is one sheet split into two columns with a rule between them, stacking with a top rule below 48rem. The table is a plum band bleeding edge to edge with the wordmark, then two columns: the dice tray (minmax(24rem, 1.18fr)) with the turn headline above and actions below, and the score pad (1fr) with player tabs across its top. Above 52rem the table fills exactly one window: the tray takes the leftover height and pad rows share the rest (clamped 1.75rem to 2.65rem) so the pad never scrolls. Below 52rem everything stacks.

Spacing steps run 0.25, 0.5, 0.75, 1, 1.5 and 1.75rem; sheet padding is 1.5rem 1.75rem on the lobby, 0.85rem 1rem on the pad. The action row reserves 8.8rem so the tray never jumps.

## Elevation & Depth

Soft, layered and tinted. Surfaces are raised sheets on the ground, each with a two-part shadow mixed from the theme's plum shadow color through `color-mix`, so depth reads warm in daylight and stays visible on plum at night. Bands and plates sit flat with a medium shadow. The 3D tray carries its own depth through studio light and real cast shadows.

### Shadow Vocabulary
- **Sheet** (`0 1px 2px shadow 6%, 0 14px 34px -14px shadow 28%`): the pad, lobby sheet, standings and sign-in form.
- **Small** (`--shadow-sm`): corner icons, flat dice, a hovered score option.
- **Medium** (`--shadow-md`): brand and winner plates, the banner, the confirm-zero card.
- **Large** (`--shadow-lg`): the settings popover.
- **Primary lift** (`0 0.1rem 0.25rem shadow 16%, 0 0.55rem 1.2rem -0.45rem shadow 45%`): the pink action, which lifts on hover and presses down on press and while busy.

### Named Rules
**The Tinted Shadow Rule.** Every shadow mixes `--shadow` at low opacity with negative spread. No pure black, no hard offset shadows.

**The Press-Down Rule.** The primary action sits on a darker lip (accent mixed 22% toward black) and presses down 0.12rem when pressed or while the dice roll; it jiggles while you hold to shake.

## Shapes

Round and soft throughout. Every button, tag, badge and banner is a full pill (999px); sheets and plates use 1.2rem; seats and tabs 0.9rem; inputs 0.75rem; score chips 0.55rem; bonus boxes 0.4rem. Avatars, swatches, roll dots and rank badges are circles. Dice are rounded cubes (1.1rem when flat). Borders are 1.5px on controls, 1px on sheets; dashed borders mean empty or unavailable (an open seat, a zero preview, a disabled button). The pad divides upper and lower sections with a 3px double rule. Sparkles are small four-point stars.

## Components

### Buttons
Rounded, friendly and press-able.
- **Shape:** full pill, 48px minimum height and width.
- **Primary:** peony pink with plum text at 800 weight, on a darker lip with the primary lift. The big variant fills the action row at 3.6rem and 1.25rem type.
- **Secondary:** sheet fill, 1.5px rule border, 600 weight; hover turns the border violet; press nudges down 1px.
- **Segmented:** a row of pills; the selected one slides a violet pill behind its label (text on-strong, 700).
- **Disabled:** quiet text with a dashed border; a disabled primary loses its pink and shadow.
- **Corner icons:** 2.9rem circles with line icons; on the table band they go transparent with a moonlight border.

### Chips
- **Score option:** lilac wash fill, full row width, a faint inset ring; lifts 1px on hover.
- **Zero preview:** small dashed chip in quiet text; goes solid on hover.
- **Chosen:** violet fill with a check icon and a slowly breathing ring.
- **Tags:** pill outlines in quiet text ("you", "away"); "Up" is a violet fill; the +35 bonus is a pink fill.

### Cards / Containers
- **Corner Style:** 1.2rem.
- **Background:** sheet (`white-sheet` / `evening-sheet`) with a 70% rule border.
- **Shadow Strategy:** the Sheet shadow (see Elevation).
- **Internal Padding:** 1.1rem 1.25rem for panels, 1.5rem 1.75rem for the lobby sheet.

### Inputs / Fields
- **Style:** sheet fill, 1.5px rule border, 0.75rem corners, 48px tall.
- **Focus:** border turns violet, plus the global 3px violet focus ring offset 3px. Checkboxes and sliders take the violet accent color.

### Navigation
- **Pad tabs:** one tab per player across the top of the pad, avatar plus name. The selected tab wears the player's hue as a 1.5px border and a 12% hue wash over the sheet, open at the bottom into the pad. A tint dot pulses on a tab when that player writes a score.

### Band and Plates
The plum band runs edge to edge at the table with the small wordmark. The brand plate (lobby and sign-in) and winner plate are band-colored 1.2rem slabs with moonlight Fredoka; the brand plate has a slowly turning 3D die beside the name (a flat die where WebGL is unavailable).

### Player Avatar
A circle ringed 3px in the player's hue, with a small pill initial at the lower right in their ink. On your turn, a hue ring ripples out from it twice. Roll dots beside the headline fill in the same hue.

### Dice Tray
Glazed porcelain dice with violet pips on violet felt in a lacquered lavender frame, the held-dice shelf behind with five seats, and a glossy cup in the roller's tint. Each die has an invisible button over it for holding. A Yatzy fades in the word in moonlight Fredoka over the tray with a sparkle burst in the roller's hue, pink and violet.

### Score Pad
A ruled sheet: 1px rules, a double rule before the lower section, die glyphs (violet pips) beside the upper rows, point values in quiet after a middle dot. A new score comes into focus: it starts blurred in the option color while a violet wash spreads behind it, then settles into the player's ink. An upper-bonus meter tracks progress until it turns into the pink +35 tag.

## Do's and Don'ts

### Do:
- **Do** take every color from `theme/palette.ts` and add any new text pairing to its contrast test (4.5:1).
- **Do** keep pink to the single next action and the earned bonus; use violet/lavender for chosen, selected, focused and earned.
- **Do** write player numbers in their tint's ink for the current theme, and use the hue only for rings, swatches, dots, tab washes and the cup.
- **Do** set names, headlines and big moments in Fredoka 700, and everything you read or tap in Atkinson Hyperlegible Next.
- **Do** make every button a pill at least 48px tall, and every surface a soft sheet with the plum-tinted shadow.
- **Do** keep sizes in rem with nothing under 1.0625rem.
- **Do** design both themes at once, evening first, and judge a new look on rendered screens.
- **Do** keep celebrations short and decorative, and make reduced motion turn them into fades.

### Don't:
- **Don't** use script typefaces, paper or print textures, or anything old-fashioned.
- **Don't** bring back candy names, candy colors or candy motifs; femininity stays a light touch.
- **Don't** type a hex value into a component or stylesheet.
- **Don't** use a player's hue as text on the pad.
- **Don't** use pure-black or hard offset shadows.
- **Don't** make it look like a casino or a slot machine; it is a calm evening game among family.

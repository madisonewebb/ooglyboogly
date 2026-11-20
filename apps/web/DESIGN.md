---
name: Shoal
description: A family's five-dice game night, printed as a cyanotype of seaweed.
colors:
  # Day (light theme). theme/palette.ts is the source; these mirror it.
  paper-ground: "#F7F9FA"
  paper-sheet: "#FFFFFF"
  cyan-rule: "#C9D7E6"
  prussian-ink: "#102B4C"
  quiet-blue: "#4A6A8F"
  dusty-rose: "#E294AB"
  prussian: "#1D4A7A"
  sensitizer: "#D6DC7E"
  porcelain: "#F7F9FB"
  shadow-navy: "#0B1F38"
  # Evening (dark theme): the print itself, white on Prussian.
  evening-ground: "#10294A"
  evening-sheet: "#163760"
  evening-rule: "#2C5583"
  evening-white: "#F1F5FA"
  evening-quiet: "#A6BCD6"
  evening-rose: "#E9A6BA"
  evening-sensitizer: "#CFD67E"
  evening-band: "#1B4677"
  evening-porcelain: "#F4F6F9"
  evening-shadow: "#030B16"
  # The 3D tray (decoration only, never behind text).
  felt-day: "#1F4E80"
  felt-evening: "#1A4373"
  limed-oak: "#CDBB9F"
  limed-oak-evening: "#8E7A60"
  # Player tints: hue for rings, swatches and the cup; ink for numbers on the pad.
  tint-rose: "#E0708F"
  tint-rose-ink: "#CB2C58"
  tint-rose-ink-evening: "#E5859F"
  tint-seaglass: "#4FBFAE"
  tint-seaglass-ink: "#2C796E"
  tint-seaglass-ink-evening: "#4FBFAE"
  tint-marigold: "#EE9A2E"
  tint-marigold-ink: "#9D5E0D"
  tint-marigold-ink-evening: "#EE9A2E"
  tint-fern: "#62AE5C"
  tint-fern-ink: "#41793C"
  tint-fern-ink-evening: "#69B163"
  tint-heather: "#A07BD6"
  tint-heather-ink: "#8352C9"
  tint-heather-ink-evening: "#B294DE"
  tint-primrose: "#E6CB45"
  tint-primrose-ink: "#7E6C11"
  tint-primrose-ink-evening: "#E6CB45"
  tint-poppy: "#E8613C"
  tint-poppy-ink: "#C53D17"
  tint-poppy-ink-evening: "#ED8467"
  tint-walnut: "#A0714E"
  tint-walnut-ink: "#8D6445"
  tint-walnut-ink-evening: "#C09A7D"
typography:
  display:
    fontFamily: "'Petit Formal Script', 'Atkinson Hyperlegible Next', cursive"
    fontSize: "clamp(2.6rem, 5vw, 5.4rem)"
    fontWeight: 400
    lineHeight: 1.15
  headline:
    fontFamily: "'Petit Formal Script', 'Atkinson Hyperlegible Next', cursive"
    fontSize: "1.95rem"
    fontWeight: 400
    lineHeight: 1.2
  title:
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: "1.2rem"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.2
  score:
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 800
    lineHeight: 1.2
    fontFeature: "'tnum'"
  total:
    fontFamily: "'Atkinson Hyperlegible Next', system-ui, sans-serif"
    fontSize: "2.2rem"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "'tnum'"
rounded:
  sheet: "0.3rem"
  chip: "0.55rem"
  md: "0.7rem"
  field: "0.75rem"
  primary: "0.85rem"
  lg: "1rem"
  die: "1.1rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  2xl: "1.5rem"
  3xl: "1.75rem"
components:
  button-primary:
    backgroundColor: "{colors.dusty-rose}"
    textColor: "{colors.prussian-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.primary}"
    padding: "0 1.1rem"
    height: "48px"
  button-primary-big:
    backgroundColor: "{colors.dusty-rose}"
    textColor: "{colors.prussian-ink}"
    rounded: "{rounded.primary}"
    height: "3.6rem"
    width: "100%"
  button-primary-disabled:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.quiet-blue}"
    rounded: "{rounded.primary}"
  button-secondary:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.prussian-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 1.1rem"
    height: "48px"
  button-segmented-selected:
    backgroundColor: "{colors.prussian}"
    textColor: "{colors.paper-sheet}"
    rounded: "{rounded.md}"
    height: "48px"
  input-text:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.prussian-ink}"
    rounded: "{rounded.field}"
    padding: "0 0.85rem"
    height: "48px"
  preview-scores:
    backgroundColor: "{colors.sensitizer}"
    textColor: "{colors.prussian-ink}"
    rounded: "{rounded.chip}"
    padding: "0 0.6rem"
  preview-chosen:
    backgroundColor: "{colors.prussian}"
    textColor: "{colors.paper-sheet}"
    rounded: "{rounded.chip}"
    padding: "0 0.6rem"
  tag-up:
    backgroundColor: "{colors.prussian}"
    textColor: "{colors.paper-sheet}"
    rounded: "{rounded.pill}"
    padding: "0 0.5rem"
  bonus-tag:
    backgroundColor: "{colors.dusty-rose}"
    textColor: "{colors.prussian-ink}"
    rounded: "{rounded.pill}"
    padding: "0 0.45rem"
  notice-banner:
    backgroundColor: "{colors.sensitizer}"
    textColor: "{colors.prussian-ink}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.5rem 0.35rem 1.1rem"
  paper-sheet:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.prussian-ink}"
    rounded: "{rounded.sheet}"
    padding: "0.85rem 1rem 1rem"
  panel:
    backgroundColor: "{colors.paper-sheet}"
    textColor: "{colors.prussian-ink}"
    rounded: "{rounded.lg}"
    padding: "1.1rem 1.25rem"
  print-band:
    backgroundColor: "{colors.prussian}"
    textColor: "{colors.paper-sheet}"
    height: "3.6rem"
---

# Design System: Shoal

## Overview

**Creative North Star: "The Developing Sunprint"**

Shoal is printed, not painted. The world is Anna Atkins' 1843 cyanotypes of seaweed: Prussian blue and white, a pressed frond, a copperplate hand. By day the table is white rag paper written on in Prussian ink; in the evening it is the print itself, white on deep blue. Every state the game has is a state of a print: what you could take is unexposed sensitizer paper, what you picked is exposed Prussian, and a score you write develops out of a blur into your own ink while a blue wash clears behind it. A Yatzy exposes white seaweed on the felt.

The surfaces are sheets of paper on a table, not cards in an app. They have barely rounded corners, a faint rag grain, a hairline rule and a low, soft shadow. The Prussian surfaces (the band across the table, the wordmark plate, the winner plate) are coated by hand: a mottled tone and a ragged, brushed edge drawn by one SVG filter. Fronds are grown procedurally from seeds, so the same plant appears on every screen. The dice are glazed porcelain with cobalt pips, landing on cyanotype-blue felt inside a limed-oak contact-printing frame.

Density is calm and legible: one rose action at a time, a strict ruled pad in tabular figures, and the active player's name in script at poster size while everyone else stays quiet. The world rejects casino felt, the cartoon-bright game kit, and the earlier candy-shop identity entirely; femininity comes through lightly, in the rose, the script and the flower-and-leaf inks.

The planned aquarium above the dice tray is not built yet and nothing here specifies it; it must be drawn inside this world when it arrives.

**Key Characteristics:**
- Prussian blue and white carry everything; one dusty-rose accent; sensitizer yellow-green for "not yet exposed".
- Players write in eight flower and leaf inks, the only other colors.
- Paper sheets with 0.3rem corners and grain; hand-coated Prussian plates with a brushed edge.
- A copperplate script for names and big moments only; a hyperlegible sans for everything else.
- Seeded Dictyota fronds as the one ornament.
- Scores develop like a print: blur and sensitizer, then ink.

## Colors

A two-ink cyanotype palette (Prussian and paper white) with one rose accent, one sensitizer state color, and a ring of player inks. Every value lives in `theme/palette.ts`, which generates the CSS variables for both themes and tests every text pairing at WCAG AA (4.5:1).

### Primary
- **Prussian** (day: band, exposed state, pips): the developed print. The band across the game table, the wordmark and winner plates, the box you picked, the "Up" tag, earned bonus boxes, the selected segment, the upper-bonus meter, focus rings, and the cobalt pips. In the evening the band deepens to **Evening Band** and the exposed state inverts to **Evening White**, so a developed state always reads as the strongest contrast on the ground.
- **Prussian Ink** (day text): all body text on paper, and the text on rose and sensitizer fills.

### Secondary
- **Dusty Rose** (day) / **Evening Rose** (evening): the one accent. The next thing to do (Roll, Write it in, Start) and earned bonus tags (+35, +100). It sits on a thin lip mixed 22% toward black.

### Tertiary
- **Sensitizer** (day) / **Evening Sensitizer** (evening): unexposed print paper. A score this roll could take, the selection highlight, held flat dice, and the notice banners that ask you to wait or look (reconnecting, looking at someone else's pad).

### Neutral
- **Paper Ground** / **Evening Ground**: the page. In day mode the page carries a faint Prussian rag grain.
- **Paper Sheet** / **Evening Sheet**: the pad, the lobby sheet, the standings, panels, and default buttons.
- **Cyan Rule** / **Evening Rule**: pad rules, borders, dividers, the empty meter. Decoration only, never text.
- **Quiet Blue** / **Evening Quiet**: secondary text, column heads, disabled labels, preview chips that score zero.
- **Porcelain** / **Evening Porcelain**: the dice.
- **Shadow Navy** / **Evening Shadow**: the only shadow color, always mixed down to 6–50% with `color-mix`.

### Player tints
Eight tints (Rose, Sea glass, Marigold, Fern, Heather, Primrose, Poppy, Walnut), one per seat. Each has a **hue** for avatar rings, swatches, roll dots, the active tab's edge and wash, the turn pulse and the dice cup, and a per-theme **ink** for numbers written on the pad and totals in the standings.

### Tray materials
- **Felt** (day / evening): cyanotype-blue felt with a fine nap, darker where the rim shades it.
- **Limed Oak** (day / evening): the frame and the held-dice shelf, with a darker seat for each held die.

### Named Rules
**The Two-Ink Rule.** Prussian and paper white carry the world. Beyond them, only the rose accent, the sensitizer state and the player inks may appear. No other hue enters the UI.

**The One Rose Rule.** Dusty rose marks the one thing to do next, and an earned bonus. Never decoration, never a second button competing with the first.

**The Print States Rule.** Sensitizer means "could be taken, not yet exposed"; Prussian means "chosen, developed". These two colors never swap roles.

**The Hue Is Not Ink Rule.** A tint's hue is never text on the pad. Numbers use the tint's ink for the current theme, which passes AA on the sheet.

**The One Palette File Rule.** Every color is defined in `theme/palette.ts` and reaches CSS as a generated variable. A text pairing not in its contrast test is not allowed to ship.

## Typography

**Display Font:** Petit Formal Script (with Atkinson Hyperlegible Next, cursive)
**Body Font:** Atkinson Hyperlegible Next (with system-ui, sans-serif), weights 400 / 600 / 800

**Character:** A copperplate hand, as on a herbarium label, for who and what matters; a hyperlegible sans that reads instantly on a laptop across a call for every number and instruction.

### Hierarchy
- **Display** (Script 400, clamp(2.6rem, 5vw, 5.4rem), 1.15): the active player's name on their own turn ("Your turn"). Other players' turns use clamp(2.2rem, 3.6vw, 3.8rem); 2.2rem on phones.
- **Wordmark** (Script 400, 2.6rem; 1.6rem in the band; clamp(2.3rem, 8.5vw, 3.4rem) on the sign-in plate; clamp(2.4rem, 7vw, 3.8rem) for the winner).
- **Headline** (Script 400, 1.95rem, 1.2): the lobby sheet's section captions. The top standing's name uses 2rem.
- **Title** (Sans 700, 1.2rem, 1.15): plain headings such as the pad's title.
- **Body** (Sans 400, 1.0625rem / 17px, 1.4): everything else. 17px is the floor at Regular text size; nothing is smaller.
- **Label** (Sans 600, 1.0625rem): buttons, row labels, badges, tabs. Primary buttons go to 800; big ones to 1.25rem.
- **Score** (Sans 800, 1.35rem, tabular): a written score, in the player's ink.
- **Total** (Sans 800, 2.2rem, 1, tabular): standings totals; 3rem for the winner.

### Named Rules
**The Copperplate Is for Names Rule.** Script appears only at 1.6rem and above, only for names and big moments: the wordmark, the turn name, lobby captions, the winner and the Yatzy word. Never on buttons, labels, numbers or body text.

**The Tabular Column Rule.** Every number on the pad, in previews and in the standings uses tabular figures on a strict column.

**The 17px Floor Rule.** All sizes are rem and scale with the Text size setting (Regular / Large / Extra large); no text is set below 1.0625rem except the avatar initial and key caps.

## Layout

- **Game table:** a full-bleed Prussian band (3.6rem) across the window, then two columns: the tray column (minmax(24rem, 1.18fr)) and the pad sheet (minmax(0, 1fr)) with a 1.5rem gutter, inside a max-width of 86rem. Above 52rem wide the screen is exactly 100dvh: the dice stage takes whatever height is left, and the pad's rows share the remaining height (clamp(1.75rem, (100dvh − 14rem) / 16, 2.65rem)) so the whole pad fits a laptop window without scrolling. Below 52rem the columns stack.
- **Tray column:** turn banner (avatar, name in script, roll dots in the player's hue), the dice stage, then an action area with a fixed minimum height (8.8rem) so the tray never jumps between states.
- **Lobby:** one herbarium sheet, max 64rem, two columns of sections separated by a vertical rule (1.75rem either side); stacks with a horizontal rule below 48rem.
- **Results:** a single 42rem column: the winner plate, then the standings sheet.
- **Other screens:** a 44rem centered column with 1rem gaps; sign-in centers vertically.
- **Corner controls:** theme, sound and settings sit fixed at the top right; non-game screens leave 4.4rem of top padding for them. On the game screen they sit on the band as white line icons without fills.
- **Rhythm:** gaps cluster at 0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 1.75rem. Touch targets are at least 48px.

## Elevation & Depth

Hybrid and quiet: depth comes from paper resting on a table, not from floating cards. Sheets and panels carry soft, low shadows in Shadow Navy mixed down with `color-mix`; the Prussian plates carry none and read as flat coated paper. Texture carries the rest: a fractal rag grain on the day page and on every sheet, and a mottled tone under every Prussian plate. The 3D tray provides the only real depth, under a soft studio light.

### Shadow Vocabulary
- **Sheet** (`0 1px 2px shadow/6%, 0 14px 34px -14px shadow/28%`): the pad, the lobby sheet and the standings.
- **Small** (`0 1px 2px shadow/10%, 0 3px 10px -2px shadow/8%`): panels, corner icon buttons, flat dice, hovered score previews.
- **Medium** (`0 2px 4px shadow/7%, 0 12px 30px -8px shadow/18%`): the zero-score confirmation, notice banners.
- **Large** (`0 4px 10px shadow/10%, 0 24px 50px -12px shadow/30%`): the settings popover.
- **Primary lip** (`0 0.1rem 0.25rem shadow/16%, 0 0.55rem 1.2rem -0.45rem shadow/45%`): the rose button, which rises 1px on hover and presses 0.12rem into its lip when pushed or busy.

### Named Rules
**The Sheet, Not Card Rule.** A surface that holds content is a sheet of paper: 0.3rem corners, grain, a hairline rule at 70%, the Sheet shadow. Rounder, elevated cards are reserved for small interactive panels and popovers.

**The Halo, Not Shadow Rule.** Fronds on Prussian plates get a soft white over-exposure halo, never a dark drop shadow.

## Shapes

Mostly square paper with soft controls. Sheets and Prussian plates use 0.3rem; Prussian plates also take the `#coat` brushed edge, a turbulent displacement that makes their edge look hand-coated (the band shows it only along its lower edge). Controls are gently rounded (0.7rem default, 0.75rem fields, 0.85rem for the rose button, 1rem for panels). Tags, badges and banners are full pills. Avatars, swatches, roll dots and rank markers are circles. Flat dice use 1.1rem; the 3D dice are rounded cubes (0.16 bevel).

Dashed borders mean "not available yet": disabled buttons, zero-score previews, empty seats.

## Components

### Buttons
Tactile and quiet, with exactly one rose button in view.
- **Shape:** gently curved (0.7rem), 1.5px border, at least 48px square.
- **Default:** paper sheet with a Cyan Rule border, label weight 600. Hover turns the border Prussian; active presses down 1px.
- **Primary:** dusty rose on a lip 22% darker, Prussian Ink text at weight 800, 0.85rem corners, Primary lip shadow. Hover rises 1px; pressed and busy (shaking the cup, dice rolling) sit 0.12rem down, and busy jiggles every 110ms. The big variant (Roll, Write it in) is full width and 3.6rem tall with a Space key cap.
- **Disabled:** quiet text, dashed border; the primary drops to a dashed paper button.
- **Focus:** 3px Prussian outline, 3px offset, on everything.
- **Corner icons:** 2.9rem squares holding inline SVG line icons (2.2 stroke, round caps). On the band they become transparent with a 35% white border.

### Segmented control
Paper buttons in a wrapped row; the selected one is filled Prussian with white text by a pill that slides between options.

### Chips and tags
- **Badge** ("you", "away"): pill with a Cyan Rule border and quiet text.
- **Up tag:** filled Prussian pill on the active player's tab.
- **Bonus tag** (+35, +100): rose pill, weight 800.
- **Bonus boxes:** 1.6rem squares (0.4rem corners), filled Prussian when earned.

### Cards / Containers
- **Paper sheet:** pad, lobby, standings. Corner 0.3rem, paper with grain, 1px rule at 70%, Sheet shadow, padding 0.85rem 1rem 1rem (pad) or 1.5rem 1.75rem (lobby).
- **Panel:** paper, 1rem corners, 1px rule, Small shadow, padding 1.1rem 1.25rem. Inside the lobby sheet panels lose all chrome and become plain sections.
- **Notice banner:** sensitizer pill, fixed top center, Medium shadow.

### Inputs / Fields
- **Text field:** paper, 1.5px Cyan Rule border, 0.75rem corners, 48px tall. Focus turns the border Prussian.
- **Toggles and sliders:** native controls tinted Prussian (`accent-color`).

### Navigation
- **Pad tabs:** one per player across the top of the sheet, scrolling sideways at a big table. Each holds the avatar and name; the selected tab gets a 1.5px border in the player's hue and a 12% hue wash, open at the bottom so it joins the sheet. When someone else writes, a dot in their hue pulses on their tab and fades over 2.4s.

### Avatars and player tints
A circle with a 3px ring in the player's hue and a small pill initial in their ink. On your turn a hue ring ripples out twice (900ms). Tint pickers are paper buttons with a 2.25rem hue swatch; the chosen one wears a hue border and a 3px hue glow.

### The score pad (signature)
A ruled table in tabular figures: 1px Cyan Rule between rows, a 3px double rule before the lower section, row labels with a small die glyph (paper face, quiet stroke, Prussian pips) and the box's fixed points in quiet text.
- **Preview, scores:** a full-width sensitizer chip (0.55rem) in the cell; hover lifts 1px.
- **Preview, zero:** a small dashed quiet chip.
- **Preview, chosen:** filled Prussian with a 0.2rem Prussian halo that breathes on a 1.8s loop.
- **Developing score:** the new number starts sensitizer-colored and blurred (2.5px) at 35% opacity and sets into the player's ink over 1300ms, while a Prussian wash spreads behind it and clears.
- **Upper progress:** a 3rem pill meter filling in Prussian, replaced by the +35 tag when earned.

### The print plates and fronds (signature)
Prussian plates hold the wordmark (sign-in, lobby), the band (game) and the winner (results): mottled coating, brushed `#coat` edge, white text. Seeded Dictyota fronds (two broad flat ribbons diverging from one holdfast with no trunk, each forking in pairs three times and staying wide to blunt tips, overlaps printing denser) stand beside the name at 85% opacity with a white halo; below 30rem the plates drop them, since there is no margin beside the name. On the results plate they expose out of a 6px blur over 2.2s, staggered 180ms.

### The dice tray (signature)
A WebGL scene: porcelain dice (clear-coated, roughness 0.34) with cobalt glaze pips, on cyanotype-blue felt in a limed-oak frame with a five-seat held-dice shelf; a glazed cup in the player's hue. A Yatzy exposes three white fronds on the felt with the word in white script over it. Without WebGL, flat porcelain dice (1.1rem corners, inset lower edge) stand in, and a held die gets a 4px sensitizer outline.

### Motion
Durations 140 / 220 / 380ms on a soft ease-out (`cubic-bezier(0.22, 1, 0.36, 1)`); a gentle spring overshoot for things that pop into place. The authored moments are the score developing, the chosen preview breathing, the turn pulse and the fronds exposing; developing and exposing use their own slow-in, slow-out curve (`--ease-develop`, `cubic-bezier(0.45, 0, 0.25, 1)`) so the print visibly resolves. In Take turns the pad holds on the last player for the 1.3s develop before following the next. With reduced motion every animation collapses to 1ms, the tab dot becomes a plain fade, and the chosen preview stops breathing.

## Do's and Don'ts

### Do:
- **Do** take every color from `theme/palette.ts` and add any new text pairing to `TEXT_PAIRS`, so the AA test covers it.
- **Do** express state as a print: sensitizer for "could take", Prussian for "chosen / developed", the player's ink for "written".
- **Do** keep exactly one rose action on screen at a time.
- **Do** lay content on paper sheets (0.3rem, grain, hairline rule, Sheet shadow) and put names and headlines on hand-coated Prussian plates with the `#coat` edge.
- **Do** draw ornament as seeded fronds in the current text color on Prussian, with the white halo.
- **Do** set every number in tabular figures and keep text at 17px or larger, in rem.
- **Do** draw icons as inline SVG line icons (2.2 stroke, round caps, currentColor).
- **Do** give every motion a reduced-motion form that keeps the cue without the movement.

### Don't:
- **Don't** use casino green felt, gold, or slot-machine glitter; the felt is cyanotype blue.
- **Don't** bring back anything from the candy-shop identity: candy names, colors, motifs or vocabulary.
- **Don't** use cartoon-bright saturated game-kit color; the player inks are the only colors beyond blue, white, rose and sensitizer.
- **Don't** set Petit Formal Script below 1.6rem or on buttons, labels, numbers or body copy.
- **Don't** use a tint's hue as text on the pad; use its ink.
- **Don't** use rose for decoration, a secondary action, or a state.
- **Don't** swap the roles of sensitizer and Prussian.
- **Don't** give content surfaces big rounded-card corners; sheets are 0.3rem.

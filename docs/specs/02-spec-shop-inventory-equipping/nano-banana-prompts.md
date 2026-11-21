# Nano Banana prompts for the sticker packs

One prompt per sticker. The shop ships simple vector placeholders (`apps/web/src/art/stickers/packs/*.svg`); when the real art is generated, save each result as `<id>.webp` next to the existing stickers and point the import in `apps/web/src/Reactions.tsx` at it. Nothing else changes.

## Shared style (paste at the start of every prompt)

> A die-cut sticker in the same style as a set of cute ghost stickers: a chunky, rounded kawaii character with a thick dark indigo outline, soft flat shading with a gentle lavender-to-white gradient, a clean white sticker border with a faint drop shadow, tiny pink cheeks. Palette: lavender, plum, violet, warm cream, with small touches of pastel pink and golden yellow. Witchy and cozy, light and friendly, not glittery and not candy-colored. Transparent background, centered, square 1024x1024, nothing cut off, no text unless the prompt asks for it.

## Pack 1: Cauldron Crew (`cauldronCrew`)

**`cackle`, "Cackle"**

> [Shared style] A little black cauldron with a face, grinning wide with a toothy cackle and squinting happy eyes, bubbling over with bright green potion and three round bubbles popping above it. Small stubby feet. The feeling is gleeful mischief after a good roll.

**`mischief`, "Mischief"**

> [Shared style] A plump black cat sitting upright, narrow golden eyes with slit pupils, a sly little smile with whiskers, pink inner ears, the tail curled round the front. The feeling is a scheme about to work out.

**`ribbit`, "Ribbit"**

> [Shared style] A round green toad with big cream eyes on top of its head, a wide flat smile, a few darker green warts, and a tiny purple witch hat tipped to one side. Its mouth is open as if saying "ribbit". The feeling is a dry, unbothered comment.

## Pack 2: Moonlit Charms (`moonlitCharms`)

**`foresaw`, "I foresaw this"**

> [Shared style] A crystal ball on a small plum stand, glowing violet inside with swirling mist and one big calm eye looking out of it, a couple of tiny stars around it. The feeling is knowing smugness: I saw that coming.

**`moonMood`, "Moon mood"**

> [Shared style] A golden crescent moon with a sleepy face, closed content eyes, rosy cheeks, two small "z" letters drifting up and one little star beside it. The feeling is cozy and drowsy.

**`broom`, "Off I go"**

> [Shared style] A witch's broomstick flying at a slight upward angle, straw bristles trailing a ribbon of lavender sparkles and a few pink stars, motion lines behind it, a small plum bow tied on the handle. The feeling is a quick exit in a hurry.

## Notes for whoever generates them

- Keep the character size and outline weight matching the existing stickers (`cheering_ghost.webp`, `sunglasses_ghost.webp`).
- Export as 256 px wide `webp` with a transparent background, like the existing ones.
- Check each sticker on both the light and the dark theme, since the tray background changes with the theme.

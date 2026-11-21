# nano-banana-prompts.md

One ready-to-paste Nano Banana Pro prompt per pet per pose (13) and one for the Ghost Parade. Nothing in the app has to change when you add the results: the sprite system looks for the files below with `import.meta.glob` and uses a real image in place of the vector placeholder, one pose at a time, so you can add them as you make them. A pose with no file keeps its placeholder.

## How to use

1. Attach `apps/web/src/art/stickers/cheering_ghost.webp` (and `sunglasses_ghost.webp`) as style references in Nano Banana Pro for every prompt.
2. Paste the **Common style block** first, then the prompt for the asset. Make the idle pose of a pet first, then attach that result as an extra reference for its other poses so the character stays the same.
3. Ask for a transparent background. If you get a flat background, remove it, then export WebP at 1024 x 1024 (or 512 x 512; any square size works) with alpha, quality about 85.
4. Save each file at exactly the path in its heading. The folder name is the catalog id, the file name is the pose.
5. Run `task dev` or reload the page: the placeholder for that pose is gone. Preview any pet and pose without a game at `/?pets&cosmetics=pet:toad` (dev server or a `VITE_LAB=1` build).

## Common style block

```text
Style (same for every asset): a die-cut sticker illustration in the exact style of the attached reference sticker (the cheering ghost): thick deep-navy-plum outline (#2A2440) with rounded joins, soft cel shading in two or three tones with one gentle glossy highlight, big simple glossy eyes, small rose-pink blush cheeks (#D98BA6, subtle), a thin clean white die-cut border around the whole shape, a tiny gold four-point sparkle or two only where the pose calls for it. Cozy, witchy and slightly spooky, with a light feminine touch (a bow, soft rose cheeks) and absolutely no candy look: no glitter, no rainbow, no neon, no saturated bubblegum pink, no gradients across the whole body. Flat front-facing "billboard" view, the character standing or hanging dead centre with its feet on the bottom edge. Transparent background, no ground, no cast shadow, no text. Square 1:1 canvas, 1024 x 1024, character filling about 85 percent of the height.
```

The character should sit on the bottom edge and be centred, because the app draws a soft shadow under it and bobs it from its feet. Keep the same size and the same feet position across a pet's poses so that swapping poses does not make it jump.

## Pets

### Toad (`toad`, common)

#### Toad, idle

Save as: `apps/web/src/art/pets/toad/idle.webp`

```text
Common style block above, then: A toad pet sticker, idle pose. It is a plump moss-green toad (#6E9159, lighter belly #A8C28A, a few darker spots) sitting upright on its haunches, round bulging eyes on top of its head looking straight ahead with a calm, slightly sleepy expression, a small closed wide mouth, little webbed feet planted on the ground.
```

#### Toad, happy

Save as: `apps/web/src/art/pets/toad/happy.webp`

```text
Common style block above, then: A toad pet sticker, happy pose. It is the same toad, eyes squeezed into happy upturned arcs, a big open smile showing a rosy tongue, blush cheeks, body puffed up and a tiny bit lifted as if it has just croaked with delight.
```

#### Toad, sad

Save as: `apps/web/src/art/pets/toad/sad.webp`

```text
Common style block above, then: A toad pet sticker, sad pose. It is the same toad, heavy half-closed droopy eyelids, a downturned mouth, shoulders slumped and body slightly squashed and low, one small blue tear on its cheek.
```

### Black Cat (`blackCat`, spooky)

#### Black Cat, idle

Save as: `apps/web/src/art/pets/blackCat/idle.webp`

```text
Common style block above, then: A black cat pet sticker, idle pose. It is a sleek black cat (ink #37334A with slightly lighter highlights) sitting upright and facing us, tail curled round its front paws on one side, big round amber eyes (#F0B53C) with narrow pupils, small dusty-rose nose and inner ears, thin pale whiskers, a calm watchful look.
```

#### Black Cat, happy

Save as: `apps/web/src/art/pets/blackCat/happy.webp`

```text
Common style block above, then: A black cat pet sticker, happy pose. It is the same cat, eyes closed in happy upturned arcs, a tiny "w" smile, blush cheeks, tail held high with a curl at the tip, chest puffed, content.
```

#### Black Cat, sad

Save as: `apps/web/src/art/pets/blackCat/sad.webp`

```text
Common style block above, then: A black cat pet sticker, sad pose. It is the same cat, ears flattened out sideways, wide round amber eyes with tiny pupils and worried brows, a small frown, one front paw raised in a grumpy swat to the left, tail drooping low, one small blue tear.
```

### Bat (`bat`, spooky)

#### Bat, idle

Save as: `apps/web/src/art/pets/bat/idle.webp`

```text
Common style block above, then: A bat pet sticker, idle pose. It is a small plum-grey bat (#6A5A86, darker wings #4D3F69, lighter belly) hanging upside down from two tiny clinging feet at the top edge of the image, wings folded around its body like a cloak, big round eyes, two tiny fangs, ears pointing up beside its face.
```

#### Bat, happy

Save as: `apps/web/src/art/pets/bat/happy.webp`

```text
Common style block above, then: A bat pet sticker, happy pose. It is the same bat, still hanging by its feet, wings spread wide to both sides mid-flap, eyes closed in happy arcs, an open smile with two little fangs, blush cheeks.
```

#### Bat, sad

Save as: `apps/web/src/art/pets/bat/sad.webp`

```text
Common style block above, then: A bat pet sticker, sad pose. It is the same bat, hanging by its feet, one wing pulled across its lower face like a cloak, only the droopy worried eyes showing over it, one small blue tear.
```

### Ghost Cheerleader (`ghostCheerleader`, legendary)

#### Ghost Cheerleader, idle

Save as: `apps/web/src/art/pets/ghostCheerleader/idle.webp`

```text
Common style block above, then: A ghost cheerleader pet sticker, idle pose. It is a friendly white-lavender sheet ghost (#F6F3FB, shading #D9D2EC) in the same shape and face style as the reference cheering ghost, wearing a dusty-rose bow (#D98BA6) on top, holding a small lavender pompom (#9B86E0) in one hand and a dusty-rose pompom in the other, both resting low at its sides, small smile, calm.
```

#### Ghost Cheerleader, happy

Save as: `apps/web/src/art/pets/ghostCheerleader/happy.webp`

```text
Common style block above, then: A ghost cheerleader pet sticker, happy pose. It is the same ghost, one arm raised high waving the lavender pompom, the other low, eyes closed in happy arcs, open smile, blush cheeks.
```

#### Ghost Cheerleader, sad

Save as: `apps/web/src/art/pets/ghostCheerleader/sad.webp`

```text
Common style block above, then: A ghost cheerleader pet sticker, sad pose. It is the same ghost, sagging lower and a little squashed, both pompoms drooping near the ground, worried slanted brows, a small frown and one blue tear.
```

#### Ghost Cheerleader, cheer

Save as: `apps/web/src/art/pets/ghostCheerleader/cheer.webp`

```text
Common style block above, then: A ghost cheerleader pet sticker, cheer pose. It is the same ghost going wild: both arms thrown straight up with a pompom in each hand shaking with little motion strokes, eyes closed in huge happy arcs, mouth wide open in a cheer, cheeks glowing, a few small gold four-point sparkles around it (the most excited of all the poses).
```

## Ghost Parade

Optional, because the parade already draws a line of little ghosts as placeholders. If this file exists it replaces them: the whole strip slides across the screen, with a gentle bob.

Save as: `apps/web/src/art/celebrations/ghostParade/parade.webp`

```text
Common style block above (but a wide canvas, 3072 x 512, 6:1), then: A ghost parade sticker strip: a single row of six little ghosts marching in a line from left to right, all facing right, evenly spaced and slightly overlapping, each a round white-lavender sheet ghost in the same shape and face style as the reference cheering ghost, every one a bit different: the first carries a small drum, the second wears a tiny black witch hat, the third waves a tiny lavender flag, the fourth wears a dusty-rose bow, the fifth wears a little striped party hat and blows a tiny horn, the sixth carries a tiny paper lantern. Each ghost's feet on the same baseline at the bottom edge, each with a different happy open-mouth or smiling face, a few small gold four-point sparkles between them. Transparent background, no ground line, no text.
```

## Quick checklist

| File                                                    | Pet               | Pose               |
| ------------------------------------------------------- | ----------------- | ------------------ |
| `apps/web/src/art/pets/toad/idle.webp`                  | Toad              | idle               |
| `apps/web/src/art/pets/toad/happy.webp`                 | Toad              | happy              |
| `apps/web/src/art/pets/toad/sad.webp`                   | Toad              | sad                |
| `apps/web/src/art/pets/blackCat/idle.webp`              | Black Cat         | idle               |
| `apps/web/src/art/pets/blackCat/happy.webp`             | Black Cat         | happy              |
| `apps/web/src/art/pets/blackCat/sad.webp`               | Black Cat         | sad                |
| `apps/web/src/art/pets/bat/idle.webp`                   | Bat               | idle               |
| `apps/web/src/art/pets/bat/happy.webp`                  | Bat               | happy              |
| `apps/web/src/art/pets/bat/sad.webp`                    | Bat               | sad                |
| `apps/web/src/art/pets/ghostCheerleader/idle.webp`      | Ghost Cheerleader | idle               |
| `apps/web/src/art/pets/ghostCheerleader/happy.webp`     | Ghost Cheerleader | happy              |
| `apps/web/src/art/pets/ghostCheerleader/sad.webp`       | Ghost Cheerleader | sad                |
| `apps/web/src/art/pets/ghostCheerleader/cheer.webp`     | Ghost Cheerleader | cheer              |
| `apps/web/src/art/celebrations/ghostParade/parade.webp` | Ghost Parade      | the marching strip |

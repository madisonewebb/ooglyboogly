/**
 * The avatar as a flat SVG: what shows with no GPU, and while the 3D stage is still loading.
 * Same soft blob, same items, drawn simply. Pure markup, so it needs no WebGL and no script.
 */
import type { ReactNode } from 'react';
import { bodyColorOf, mixHex } from './colors';
import { type AvatarLook, HAIR_COLOR } from './items';

const INK = '#2A2440';
const GOLD = '#E8C766';
const PLUM = '#4D3F69';
const BLUSH = '#D98BA6';
const LILAC = '#9B86E0';

/** The part of each hairstyle behind the body, and the part over the head. */
const hairCap = (c: string) => (
  <path d="M25 56 Q22 36 50 33 Q78 36 75 56 Q66 45 50 44 Q34 45 25 56 Z" fill={c} />
);

const HAIR_BACK: Record<NonNullable<AvatarLook['hair']>, (c: string) => ReactNode> = {
  bob: (c) => <path d="M20 62 Q18 36 50 32 Q82 36 80 62 L78 76 Q50 80 22 76 Z" fill={c} />,
  pigtails: () => null,
  spaceBuns: () => null,
  longWaves: (c) => (
    <path d="M18 66 Q14 34 50 30 Q86 34 82 66 Q86 84 70 86 L30 86 Q14 84 18 66 Z" fill={c} />
  ),
};

const HAIR_FRONT: Record<NonNullable<AvatarLook['hair']>, (c: string) => ReactNode> = {
  bob: hairCap,
  longWaves: hairCap,
  pigtails: (c) => (
    <>
      {hairCap(c)}
      <g stroke={c} strokeWidth="9" strokeLinecap="round">
        <path d="M25 47 L15 66" />
        <path d="M75 47 L85 66" />
      </g>
      <circle cx="24.5" cy="48" r="2.6" fill={BLUSH} />
      <circle cx="75.5" cy="48" r="2.6" fill={BLUSH} />
    </>
  ),
  spaceBuns: (c) => (
    <>
      {hairCap(c)}
      <circle cx="35" cy="33" r="7.5" fill={c} />
      <circle cx="65" cy="33" r="7.5" fill={c} />
      <path d="M31 40 L39 40 M61 40 L69 40" stroke={LILAC} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

/** A stubby limb: a rounded line with an outline, like the body. No hands, no feet. */
function Limb({
  from,
  to,
  color,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
}) {
  const d = `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`;
  return (
    <>
      <path d={d} stroke={INK} strokeWidth="9.4" strokeLinecap="round" fill="none" />
      <path d={d} stroke={color} strokeWidth="6" strokeLinecap="round" fill="none" />
    </>
  );
}

const HATS: Record<NonNullable<AvatarLook['hat']>, ReactNode> = {
  partyHat: (
    <>
      <path d="M41 44 L50 17 L59 44 Z" fill={BLUSH} />
      <path d="M44 34 L56 34" stroke={GOLD} strokeWidth="2.5" />
      <circle cx="50" cy="17" r="3" fill={GOLD} />
    </>
  ),
  bow: (
    <>
      <path d="M68 46 L58 38 L58 54 Z M68 46 L78 38 L78 54 Z" fill={LILAC} />
      <circle cx="68" cy="46" r="3.2" fill="#7E68C8" />
    </>
  ),
  witchHat: (
    <>
      <ellipse cx="50" cy="43" rx="22" ry="4" fill={PLUM} />
      <path d="M37 43 L57 12 L63 43 Z" fill={PLUM} />
      <path d="M38 40 L62 40" stroke={GOLD} strokeWidth="3" />
    </>
  ),
  crown: (
    <>
      <path d="M38 46 L38 32 L44 38 L50 28 L56 38 L62 32 L62 46 Z" fill={GOLD} />
      <circle cx="50" cy="41" r="2.4" fill="#9B6AE0" />
    </>
  ),
};

const FACES: Record<NonNullable<AvatarLook['face']>, ReactNode> = {
  glasses: (
    <g fill="none" stroke={GOLD} strokeWidth="1.8">
      <circle cx="41.5" cy="59" r="6.5" />
      <circle cx="58.5" cy="59" r="6.5" />
      <path d="M48 58 L52 58" />
    </g>
  ),
  mustache: (
    <path
      d="M50 64 Q44 61 38 65 Q43 70 50 66 Q57 70 62 65 Q56 61 50 64 Z"
      fill="#4A2F28"
      transform="translate(0 -1)"
    />
  ),
  monocle: (
    <g fill="none" stroke={GOLD} strokeWidth="1.8">
      <circle cx="58.5" cy="59" r="7" />
      <path d="M62 66 Q68 76 70 84" strokeWidth="1" />
    </g>
  ),
  eyepatch: (
    <>
      <ellipse cx="41.5" cy="59" rx="7" ry="6.5" fill="#1C1830" />
      <path d="M26 50 L48 56" stroke="#1C1830" strokeWidth="1.6" />
    </>
  ),
};

const HELD: Record<NonNullable<AvatarLook['held']>, ReactNode> = {
  wand: (
    <>
      <path d="M76 88 L86 60" stroke="#6B4A3A" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="86.5" cy="57" r="4" fill="#FFE9A8" />
    </>
  ),
  lantern: (
    <>
      <rect x="74" y="76" width="11" height="14" rx="3" fill="#FFC96B" stroke="#3A3350" />
      <path d="M76 76 Q79.5 68 83 76" fill="none" stroke="#3A3350" strokeWidth="1.5" />
    </>
  ),
  cauldron: (
    <>
      <ellipse cx="80" cy="86" rx="9" ry="7" fill="#2B2640" />
      <ellipse cx="80" cy="80.5" rx="7.5" ry="2.4" fill="#5BD27E" stroke="#3A3350" />
    </>
  ),
  crystalBall: (
    <>
      <rect x="74" y="90" width="12" height="4" rx="1.5" fill={GOLD} />
      <circle cx="80" cy="84" r="8" fill="#B9A6F0" fillOpacity="0.8" stroke="#7E68C8" />
    </>
  ),
};

const AURAS: Record<NonNullable<AvatarLook['aura']>, ReactNode> = {
  sparkles: (
    <g fill="#E8C766">
      <path d="M18 40 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z" />
      <path d="M84 30 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" />
      <path d="M12 70 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" />
    </g>
  ),
  candleFlame: (
    <>
      <rect x="11" y="52" width="6" height="10" rx="1.5" fill="#F3E7CF" />
      <path d="M14 42 Q19 49 14 53 Q9 49 14 42 Z" fill="#FF9A3C" />
    </>
  ),
  orbitingStars: (
    <g fill="#E8C766">
      <circle cx="26" cy="22" r="3" />
      <circle cx="50" cy="12" r="3.4" fill="#FFFFFF" />
      <circle cx="74" cy="22" r="3" />
    </g>
  ),
};

/**
 * The flat avatar. The viewBox matches the 3D camera: x -1 to 1 and y -0.12 to 1.88 over 0 to 100.
 * The body is an uneven bean, a little wider at the base, with two dot eyes and a small smile.
 */
export function FlatAvatar({ look, tintHex }: { look: AvatarLook; tintHex: string }) {
  // A shade deeper than the body, like the 3D limbs.
  const limbColor = mixHex(bodyColorOf(tintHex), INK, 0.14);
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false">
      {look.aura && AURAS[look.aura]}
      <g>
        <Limb from={[28, 62]} to={[19, 75]} color={limbColor} />
        <Limb from={[72, 62]} to={[81, 75]} color={limbColor} />
        <Limb from={[41, 82]} to={[40, 94]} color={limbColor} />
        <Limb from={[59, 82]} to={[60, 94]} color={limbColor} />
      </g>
      {look.hair && HAIR_BACK[look.hair](HAIR_COLOR[look.hair])}
      <path
        d="M24 77 Q22 58 36 46 Q50 36 65 46 Q79 57 77 75 Q76 87 50 87 Q26 87 24 77 Z"
        fill={bodyColorOf(tintHex)}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <ellipse cx="42" cy="60" rx="2.8" ry="3.6" fill={INK} />
      <ellipse cx="58" cy="60" rx="2.8" ry="3.6" fill={INK} />
      <path
        d="M46 68 Q50 72 54 68"
        fill="none"
        stroke="#4A2A3C"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="34" cy="66" rx="4" ry="2.4" fill={BLUSH} fillOpacity="0.7" />
      <ellipse cx="66" cy="66" rx="4" ry="2.4" fill={BLUSH} fillOpacity="0.7" />
      <ellipse cx="38" cy="50" rx="4" ry="2.2" fill="#fff" fillOpacity="0.45" />
      {look.hair && HAIR_FRONT[look.hair](HAIR_COLOR[look.hair])}
      {look.face && FACES[look.face]}
      {look.hat && HATS[look.hat]}
      {look.held && HELD[look.held]}
    </svg>
  );
}

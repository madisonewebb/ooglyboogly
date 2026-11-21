/**
 * Vector stand-ins for the pet art, one per pet per pose, until the real
 * Nano Banana images are saved in apps/web/src/art/pets/. Flat, outlined in
 * deep plum like the ghost stickers, in muted witchy colors. 120 by 120, with
 * the feet on the bottom edge so the shadow sits right under them.
 */
import type { ReactNode } from 'react';
import type { PetId, PetPose } from './mood';

const INK = '#2A2440';
const BLUSH = '#D98BA6';
const TEAR = '#8DB8E4';
const GOLD = '#E8C766';
const STROKE = {
  stroke: INK,
  strokeWidth: 3,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;

/** Round eyes: open (white with a pupil), a happy arc, or a heavy-lidded sad one. */
function Eye({
  x,
  y,
  r,
  look,
  fill,
}: {
  x: number;
  y: number;
  r: number;
  look: PetPose;
  fill: string;
}) {
  if (look === 'happy' || look === 'cheer') {
    return (
      <path
        d={`M${x - r} ${y + 2} Q${x} ${y - r * 1.3} ${x + r} ${y + 2}`}
        fill="none"
        {...STROKE}
      />
    );
  }
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="#FFFFFF" {...STROKE} strokeWidth={2.5} />
      <circle cx={x} cy={y + (look === 'sad' ? r * 0.35 : 0)} r={r * 0.5} fill={INK} />
      {look === 'sad' && (
        <path
          d={`M${x - r} ${y - 1} L${x + r} ${y - 1} L${x + r} ${y - r} L${x - r} ${y - r} Z`}
          fill={fill}
        />
      )}
      {look === 'sad' && (
        <path d={`M${x - r} ${y - 1} L${x + r} ${y - 1}`} {...STROKE} strokeWidth={2.5} />
      )}
    </g>
  );
}

const Tear = ({ x, y }: { x: number; y: number }) => (
  <path
    d={`M${x} ${y} Q${x - 4} ${y + 7} ${x} ${y + 10} Q${x + 4} ${y + 7} ${x} ${y}`}
    fill={TEAR}
    stroke={INK}
    strokeWidth={1.5}
  />
);

const Cheeks = ({ y, dx, r = 5 }: { y: number; dx: number; r?: number }) => (
  <g fill={BLUSH} opacity={0.75}>
    <circle cx={60 - dx} cy={y} r={r} />
    <circle cx={60 + dx} cy={y} r={r} />
  </g>
);

const Star = ({ x, y, s = 6 }: { x: number; y: number; s?: number }) => (
  <path
    d={`M${x} ${y - s} L${x + s * 0.3} ${y - s * 0.3} L${x + s} ${y} L${x + s * 0.3} ${y + s * 0.3} L${x} ${y + s} L${x - s * 0.3} ${y + s * 0.3} L${x - s} ${y} L${x - s * 0.3} ${y - s * 0.3} Z`}
    fill={GOLD}
    stroke={INK}
    strokeWidth={1.5}
    strokeLinejoin="round"
  />
);

/* ---------- Toad ---------- */

const MOSS = '#6E9159';
const MOSS_LIGHT = '#A8C28A';

function Toad({ pose }: { pose: PetPose }) {
  const mouth =
    pose === 'happy'
      ? 'M38 74 Q60 98 82 74'
      : pose === 'sad'
        ? 'M42 84 Q60 72 78 84'
        : 'M40 78 Q60 84 80 78';
  return (
    <g>
      <ellipse cx="36" cy="106" rx="14" ry="8" fill={MOSS} {...STROKE} />
      <ellipse cx="84" cy="106" rx="14" ry="8" fill={MOSS} {...STROKE} />
      <ellipse cx="60" cy="80" rx="38" ry="30" fill={MOSS} {...STROKE} />
      <ellipse cx="60" cy="90" rx="22" ry="16" fill={MOSS_LIGHT} />
      <g fill="#527044">
        <circle cx="30" cy="74" r="3.5" />
        <circle cx="92" cy="80" r="3" />
        <circle cx="84" cy="64" r="2.5" />
      </g>
      <circle cx="38" cy="50" r="15" fill={MOSS} {...STROKE} />
      <circle cx="82" cy="50" r="15" fill={MOSS} {...STROKE} />
      <Eye x={38} y={50} r={9} look={pose} fill={MOSS} />
      <Eye x={82} y={50} r={9} look={pose} fill={MOSS} />
      {pose === 'happy' ? (
        <path d={`${mouth} Z`} fill="#4A2A3C" {...STROKE} strokeWidth={2.5} />
      ) : (
        <path d={mouth} fill="none" {...STROKE} />
      )}
      {pose === 'happy' && <Cheeks y={76} dx={30} />}
      {pose === 'sad' && <Tear x={46} y={64} />}
    </g>
  );
}

/* ---------- Black cat ---------- */

const CAT = '#37334A';
const EAR_IN = '#9A5878';
const AMBER = '#F0B53C';

function BlackCat({ pose }: { pose: PetPose }) {
  const sad = pose === 'sad';
  const happy = pose === 'happy';
  const tail = happy
    ? 'M88 104 Q116 98 108 66 Q106 56 98 52'
    : sad
      ? 'M88 108 Q112 112 108 96'
      : 'M88 106 Q114 100 108 76 Q106 68 100 70';
  return (
    <g>
      <path d={tail} fill="none" stroke={INK} strokeWidth={13} strokeLinecap="round" />
      <path d={tail} fill="none" stroke={CAT} strokeWidth={7} strokeLinecap="round" />
      <ellipse cx="60" cy="88" rx="30" ry="26" fill={CAT} {...STROKE} />
      <ellipse cx="46" cy="108" rx="11" ry="7" fill={CAT} {...STROKE} />
      {sad ? (
        <ellipse cx="82" cy="104" rx="11" ry="7" fill={CAT} {...STROKE} />
      ) : (
        <ellipse cx="74" cy="108" rx="11" ry="7" fill={CAT} {...STROKE} />
      )}
      {sad && (
        <ellipse
          cx="26"
          cy="72"
          rx="8"
          ry="11"
          transform="rotate(-25 26 72)"
          fill={CAT}
          {...STROKE}
        />
      )}
      {/* ears: flat to the sides when sad */}
      {sad ? (
        <g>
          <path d="M34 42 L14 40 L36 24 Z" fill={CAT} {...STROKE} />
          <path d="M86 42 L106 40 L84 24 Z" fill={CAT} {...STROKE} />
        </g>
      ) : (
        <g>
          <path d="M34 40 L38 10 L58 28 Z" fill={CAT} {...STROKE} />
          <path d="M86 40 L82 10 L62 28 Z" fill={CAT} {...STROKE} />
          <path d="M40 32 L41 19 L51 28 Z" fill={EAR_IN} />
          <path d="M80 32 L79 19 L69 28 Z" fill={EAR_IN} />
        </g>
      )}
      <circle cx="60" cy="50" r="27" fill={CAT} {...STROKE} />
      {happy ? (
        <g fill="none" stroke={AMBER} strokeWidth={4} strokeLinecap="round">
          <path d="M40 52 Q47 42 54 52" />
          <path d="M66 52 Q73 42 80 52" />
        </g>
      ) : (
        <g>
          <ellipse
            cx="47"
            cy="50"
            rx={sad ? 9 : 8}
            ry={sad ? 10 : 9}
            fill={AMBER}
            stroke={INK}
            strokeWidth={2}
          />
          <ellipse
            cx="73"
            cy="50"
            rx={sad ? 9 : 8}
            ry={sad ? 10 : 9}
            fill={AMBER}
            stroke={INK}
            strokeWidth={2}
          />
          <ellipse cx="47" cy="50" rx={sad ? 4 : 2.6} ry="8" fill={INK} />
          <ellipse cx="73" cy="50" rx={sad ? 4 : 2.6} ry="8" fill={INK} />
          {sad && (
            <path
              d="M36 38 L54 44 M84 38 L66 44"
              stroke={INK}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}
        </g>
      )}
      <path d="M56 61 L64 61 L60 66 Z" fill={EAR_IN} />
      <path
        d={
          happy
            ? 'M50 68 Q55 74 60 68 Q65 74 70 68'
            : sad
              ? 'M52 73 Q60 66 68 73'
              : 'M53 69 Q56.5 72 60 69 Q63.5 72 67 69'
        }
        fill="none"
        stroke="#D9D2EC"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <g stroke="#D9D2EC" strokeWidth={1.5} strokeLinecap="round" opacity={0.8}>
        <path d="M30 62 L16 59 M30 67 L17 70 M90 62 L104 59 M90 67 L103 70" />
      </g>
      {happy && <Cheeks y={64} dx={26} r={4} />}
      {sad && <Tear x={42} y={64} />}
    </g>
  );
}

/* ---------- Bat ---------- */

const BAT = '#6A5A86';
const BAT_WING = '#4D3F69';

function Bat({ pose }: { pose: PetPose }) {
  const happy = pose === 'happy';
  const sad = pose === 'sad';
  return (
    <g>
      <path d="M52 4 L52 22 M68 4 L68 22" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      {happy ? (
        <g fill={BAT_WING} {...STROKE}>
          <path d="M48 36 Q22 14 4 40 Q12 40 16 48 Q22 42 28 50 Q34 44 40 54 Z" />
          <path d="M72 36 Q98 14 116 40 Q108 40 104 48 Q98 42 92 50 Q86 44 80 54 Z" />
        </g>
      ) : (
        <g fill={BAT_WING} {...STROKE}>
          <path d="M46 26 Q14 50 24 100 Q34 94 40 100 Q46 88 52 70 Z" />
          <path d="M74 26 Q106 50 96 100 Q86 94 80 100 Q74 88 68 70 Z" />
        </g>
      )}
      <ellipse cx="60" cy="52" rx="18" ry="28" fill={BAT} {...STROKE} />
      <ellipse cx="60" cy="58" rx="10" ry="16" fill="#8E7EA8" />
      <path d="M42 80 L40 58 L52 70 Z M78 80 L80 58 L68 70 Z" fill={BAT} {...STROKE} />
      <circle cx="60" cy="86" r="17" fill={BAT} {...STROKE} />
      <path d="M45 78 L44 62 L55 72 Z M75 78 L76 62 L65 72 Z" fill={BAT} {...STROKE} />
      <path d="M47 74 L47 68 L52 72 Z M73 74 L73 68 L68 72 Z" fill={EAR_IN} />
      <Eye x={53} y={84} r={5.5} look={pose} fill={BAT} />
      <Eye x={67} y={84} r={5.5} look={pose} fill={BAT} />
      {happy ? (
        <g>
          <path d="M52 93 Q60 102 68 93 Z" fill="#4A2A3C" {...STROKE} strokeWidth={2} />
          <path
            d="M55 94 L56 98 L58 94 M62 94 L64 98 L65 94"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            fill="none"
          />
        </g>
      ) : sad ? (
        <path d="M54 97 Q60 92 66 97" fill="none" {...STROKE} strokeWidth={2.5} />
      ) : (
        <g>
          <path d="M55 94 Q60 97 65 94" fill="none" {...STROKE} strokeWidth={2.5} />
          <path
            d="M56 95 L57 99 L58.5 95.5 M61.5 95.5 L63 99 L64 95"
            fill="#FFFFFF"
            stroke="#FFFFFF"
            strokeWidth={1}
          />
        </g>
      )}
      {happy && <Cheeks y={91} dx={15} r={3.5} />}
      {sad && (
        <g>
          <path d="M40 64 Q34 90 52 100 Q58 90 54 78 Z" fill={BAT_WING} {...STROKE} />
          <Tear x={74} y={92} />
        </g>
      )}
    </g>
  );
}

/* ---------- Ghost cheerleader ---------- */

const SHEET = '#F6F3FB';
const POM = '#9B86E0';
const POM_ROSE = '#D98BA6';

/** A pompom: a ball of strands on a tiny stick. */
function Pom({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="11" fill={color} {...STROKE} strokeWidth={2.5} />
      <g stroke={INK} strokeWidth={1.5} strokeLinecap="round" opacity={0.55}>
        <path
          d={`M${x - 6} ${y - 3} L${x + 3} ${y + 7} M${x - 1} ${y - 7} L${x + 7} ${y + 1} M${x - 7} ${y + 3} L${x - 1} ${y + 8}`}
        />
      </g>
    </g>
  );
}

function GhostCheerleader({ pose }: { pose: PetPose }) {
  const sad = pose === 'sad';
  const cheer = pose === 'cheer';
  const happy = pose === 'happy';
  const lift = sad ? 6 : 0;
  const body = `M26 ${108 + lift} L26 ${54 + lift} Q26 ${16 + lift} 60 ${16 + lift} Q94 ${16 + lift} 94 ${54 + lift} L94 ${108 + lift} Q86 ${98 + lift} 78 ${108 + lift} Q69 ${118 + lift} 60 ${108 + lift} Q51 ${98 + lift} 42 ${108 + lift} Q34 ${118 + lift} 26 ${108 + lift} Z`;
  // Where each pompom is: low at the sides, one raised for happy, both up for a cheer.
  const left = cheer ? { x: 16, y: 26 } : sad ? { x: 20, y: 104 } : { x: 18, y: 84 };
  const right = cheer || happy ? { x: 104, y: 26 } : sad ? { x: 100, y: 104 } : { x: 102, y: 84 };
  const arm = (p: { x: number; y: number }, sx: number) =>
    `M${sx} ${66 + lift} Q${(sx + p.x) / 2} ${(66 + lift + p.y) / 2 - 6} ${p.x} ${p.y + 6}`;
  return (
    <g>
      <path d={arm(left, 30)} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d={arm(left, 30)} fill="none" stroke={SHEET} strokeWidth={4.5} strokeLinecap="round" />
      <path d={arm(right, 90)} fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
      <path d={arm(right, 90)} fill="none" stroke={SHEET} strokeWidth={4.5} strokeLinecap="round" />
      <path d={body} fill={SHEET} {...STROKE} />
      {/* a bow, the light feminine touch */}
      <g transform={`translate(0 ${lift})`}>
        <path
          d="M60 24 L46 14 L46 32 Z M60 24 L74 14 L74 32 Z"
          fill={POM_ROSE}
          {...STROKE}
          strokeWidth={2.5}
        />
        <circle cx="60" cy="24" r="4" fill={POM_ROSE} {...STROKE} strokeWidth={2.5} />
      </g>
      <g transform={`translate(0 ${lift})`}>
        {cheer ? (
          <g>
            <path d="M41 52 Q48 40 55 52 M65 52 Q72 40 79 52" fill="none" {...STROKE} />
            <ellipse cx="60" cy="72" rx="9" ry="11" fill="#4A2A3C" {...STROKE} strokeWidth={2.5} />
          </g>
        ) : happy ? (
          <g>
            <path d="M41 54 Q48 44 55 54 M65 54 Q72 44 79 54" fill="none" {...STROKE} />
            <path d="M50 66 Q60 82 70 66 Z" fill="#4A2A3C" {...STROKE} strokeWidth={2.5} />
          </g>
        ) : sad ? (
          <g>
            <ellipse cx="48" cy="54" rx="5" ry="7" fill={INK} />
            <ellipse cx="72" cy="54" rx="5" ry="7" fill={INK} />
            <path
              d="M40 44 L54 49 M80 44 L66 49"
              stroke={INK}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <path d="M52 76 Q60 68 68 76" fill="none" {...STROKE} strokeWidth={2.5} />
            <Tear x={42} y={64} />
          </g>
        ) : (
          <g>
            <ellipse cx="48" cy="52" rx="5" ry="7" fill={INK} />
            <ellipse cx="72" cy="52" rx="5" ry="7" fill={INK} />
            <path d="M53 68 Q60 74 67 68" fill="none" {...STROKE} strokeWidth={2.5} />
          </g>
        )}
        {(happy || cheer) && <Cheeks y={64} dx={26} r={5} />}
      </g>
      <Pom x={left.x} y={left.y} color={POM} />
      <Pom x={right.x} y={right.y} color={POM_ROSE} />
      {cheer && (
        <g>
          <Star x={14} y={52} s={6} />
          <Star x={106} y={52} s={7} />
          <Star x={60} y={6} s={5} />
        </g>
      )}
    </g>
  );
}

const SPRITES: Record<PetId, (p: { pose: PetPose }) => ReactNode> = {
  toad: Toad,
  blackCat: BlackCat,
  bat: Bat,
  ghostCheerleader: GhostCheerleader,
};

/** The drawn stand-in for a pet in a pose. */
export function PlaceholderSprite({ pet, pose }: { pet: PetId; pose: PetPose }) {
  const Sprite = SPRITES[pet];
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" focusable="false">
      <Sprite pose={pose} />
    </svg>
  );
}

export { Star, GhostBody };

/** A small ghost for the parade, with an optional hat. */
function GhostBody({
  hat,
  color = SHEET,
}: {
  hat?: 'witch' | 'bow' | 'party' | undefined;
  color?: string;
}) {
  return (
    <g>
      <path
        d="M22 108 L22 54 Q22 14 60 14 Q98 14 98 54 L98 108 Q89 97 80 108 Q70 119 60 108 Q50 97 40 108 Q31 119 22 108 Z"
        fill={color}
        {...STROKE}
      />
      <ellipse cx="46" cy="54" rx="6" ry="9" fill={INK} />
      <ellipse cx="74" cy="54" rx="6" ry="9" fill={INK} />
      <path d="M51 68 Q60 84 69 68 Z" fill="#4A2A3C" {...STROKE} strokeWidth={2.5} />
      <Cheeks y={68} dx={28} r={5} />
      {hat === 'witch' && (
        <g>
          <path d="M34 22 L62 -6 L86 22 Z" fill="#4D3F69" {...STROKE} transform="translate(0 6)" />
          <path
            d="M24 26 Q60 38 96 26"
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
            transform="translate(0 6)"
          />
        </g>
      )}
      {hat === 'party' && (
        <g>
          <path
            d="M44 20 L60 -8 L76 20 Z"
            fill={POM_ROSE}
            {...STROKE}
            strokeWidth={2.5}
            transform="translate(0 6)"
          />
          <circle
            cx="60"
            cy="-6"
            r="4"
            fill={GOLD}
            stroke={INK}
            strokeWidth={2}
            transform="translate(0 6)"
          />
        </g>
      )}
      {hat === 'bow' && (
        <g>
          <path
            d="M60 18 L44 8 L44 28 Z M60 18 L76 8 L76 28 Z"
            fill={POM}
            {...STROKE}
            strokeWidth={2.5}
          />
          <circle cx="60" cy="18" r="4" fill={POM} {...STROKE} strokeWidth={2.5} />
        </g>
      )}
    </g>
  );
}

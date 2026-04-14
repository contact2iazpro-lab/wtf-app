/**
 * StarburstBackground — décor "rayons de soleil" centré, rotation lente.
 * 26 rayons hardcodés (style figé). Anim CSS `starburst-rotate` définie dans HomeScreen.
 */

const RAYS = [
  { angle: 0, len: 140, w: 3, op: 0.5 },
  { angle: 15, len: 180, w: 2, op: 0.35 },
  { angle: 28, len: 120, w: 4, op: 0.45 },
  { angle: 45, len: 170, w: 2.5, op: 0.4 },
  { angle: 58, len: 110, w: 3, op: 0.3 },
  { angle: 72, len: 190, w: 2, op: 0.5 },
  { angle: 88, len: 130, w: 3.5, op: 0.35 },
  { angle: 100, len: 160, w: 2, op: 0.45 },
  { angle: 115, len: 200, w: 3, op: 0.4 },
  { angle: 130, len: 100, w: 2.5, op: 0.3 },
  { angle: 142, len: 175, w: 2, op: 0.5 },
  { angle: 158, len: 125, w: 4, op: 0.35 },
  { angle: 170, len: 185, w: 2, op: 0.45 },
  { angle: 185, len: 145, w: 3, op: 0.4 },
  { angle: 198, len: 165, w: 2.5, op: 0.5 },
  { angle: 212, len: 115, w: 3, op: 0.35 },
  { angle: 225, len: 195, w: 2, op: 0.45 },
  { angle: 240, len: 135, w: 3.5, op: 0.3 },
  { angle: 252, len: 180, w: 2, op: 0.5 },
  { angle: 268, len: 105, w: 3, op: 0.4 },
  { angle: 280, len: 170, w: 2.5, op: 0.35 },
  { angle: 295, len: 150, w: 2, op: 0.45 },
  { angle: 308, len: 190, w: 3, op: 0.5 },
  { angle: 322, len: 120, w: 4, op: 0.3 },
  { angle: 338, len: 160, w: 2, op: 0.4 },
  { angle: 350, len: 185, w: 2.5, op: 0.45 },
]

export default function StarburstBackground() {
  return (
    <div style={{
      position: 'absolute',
      width: 400, height: 400,
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 0,
      animation: 'starburst-rotate 40s linear infinite',
    }}>
      {RAYS.map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: r.len,
          height: r.w * 4,
          transformOrigin: '0 50%',
          transform: `rotate(${r.angle}deg)`,
          background: `linear-gradient(90deg, rgba(255,255,255,${r.op}) 0%, rgba(255,255,255,${r.op * 0.6}) 40%, transparent 100%)`,
          borderRadius: r.w * 4,
          filter: `blur(${r.w * 1.5}px)`,
        }} />
      ))}
    </div>
  )
}

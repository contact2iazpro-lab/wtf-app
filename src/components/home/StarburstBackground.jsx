/**
 * StarburstBackground — rayons orange statiques derrière le logo WTF!.
 * Option A dark premium : pas d'animation, pas de blur (perf mobile).
 */

const RAYS = [
  { angle: 0,   len: 150, w: 3 },
  { angle: 15,  len: 190, w: 2 },
  { angle: 28,  len: 130, w: 4 },
  { angle: 45,  len: 180, w: 2.5 },
  { angle: 58,  len: 120, w: 3 },
  { angle: 72,  len: 200, w: 2 },
  { angle: 88,  len: 140, w: 3.5 },
  { angle: 100, len: 170, w: 2 },
  { angle: 115, len: 210, w: 3 },
  { angle: 130, len: 110, w: 2.5 },
  { angle: 142, len: 185, w: 2 },
  { angle: 158, len: 135, w: 4 },
  { angle: 170, len: 195, w: 2 },
  { angle: 185, len: 155, w: 3 },
  { angle: 198, len: 175, w: 2.5 },
  { angle: 212, len: 125, w: 3 },
  { angle: 225, len: 205, w: 2 },
  { angle: 240, len: 145, w: 3.5 },
  { angle: 252, len: 190, w: 2 },
  { angle: 268, len: 115, w: 3 },
  { angle: 280, len: 180, w: 2.5 },
  { angle: 295, len: 160, w: 2 },
  { angle: 308, len: 200, w: 3 },
  { angle: 322, len: 130, w: 4 },
  { angle: 338, len: 170, w: 2 },
  { angle: 350, len: 195, w: 2.5 },
]

export default function StarburstBackground() {
  return (
    <div style={{
      position: 'absolute',
      width: 440, height: 440,
      top: '32%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      {RAYS.map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: r.len,
          height: r.w * 2,
          transformOrigin: '0 50%',
          transform: `rotate(${r.angle}deg)`,
          background: `linear-gradient(90deg, rgba(255,107,26,0.55) 0%, rgba(255,107,26,0.25) 45%, transparent 100%)`,
          borderRadius: r.w * 2,
        }} />
      ))}
    </div>
  )
}

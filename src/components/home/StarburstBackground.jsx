/**
 * StarburstBackground — rayons dorés statiques, repro image Recraft.
 * Dark premium : pas d'animation, pas de blur (perf mobile).
 */

const RAYS = [
  { angle: 0,   len: 170, w: 4 },
  { angle: 14,  len: 210, w: 3 },
  { angle: 27,  len: 150, w: 5 },
  { angle: 42,  len: 195, w: 3.5 },
  { angle: 55,  len: 140, w: 4 },
  { angle: 70,  len: 220, w: 3 },
  { angle: 85,  len: 160, w: 5 },
  { angle: 100, len: 185, w: 3 },
  { angle: 115, len: 225, w: 4 },
  { angle: 130, len: 130, w: 3.5 },
  { angle: 145, len: 200, w: 3 },
  { angle: 160, len: 155, w: 5 },
  { angle: 175, len: 215, w: 3 },
  { angle: 190, len: 175, w: 4 },
  { angle: 205, len: 190, w: 3.5 },
  { angle: 220, len: 145, w: 4 },
  { angle: 235, len: 220, w: 3 },
  { angle: 250, len: 165, w: 5 },
  { angle: 265, len: 205, w: 3 },
  { angle: 280, len: 135, w: 4 },
  { angle: 295, len: 195, w: 3.5 },
  { angle: 310, len: 180, w: 3 },
  { angle: 325, len: 215, w: 4 },
  { angle: 340, len: 150, w: 5 },
  { angle: 355, len: 185, w: 3 },
]

export default function StarburstBackground() {
  return (
    <div style={{
      position: 'absolute',
      width: 480, height: 480,
      top: '38%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      {/* Noyau lumineux au centre */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 80, height: 80,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,230,120,0.9) 0%, rgba(255,200,60,0.5) 45%, transparent 75%)',
      }} />

      {/* Rayons dorés */}
      {RAYS.map((r, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: r.len,
          height: r.w * 2,
          transformOrigin: '0 50%',
          transform: `rotate(${r.angle}deg) translateY(-50%)`,
          background: `linear-gradient(90deg, rgba(255,215,80,0.75) 0%, rgba(255,200,50,0.4) 35%, rgba(255,180,30,0.15) 70%, transparent 100%)`,
          borderRadius: r.w * 2,
        }} />
      ))}
    </div>
  )
}

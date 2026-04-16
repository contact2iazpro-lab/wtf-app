/**
 * StarburstBackground — repro CSS de question-default.webp, version navy/gold.
 * Noyau lumineux + rayons dorés + particules + arcs courbés. Zéro anim, zéro blur.
 */

const RAYS = [
  { angle: 0,   len: 190, w: 4 },
  { angle: 14,  len: 230, w: 3 },
  { angle: 27,  len: 160, w: 5 },
  { angle: 42,  len: 210, w: 3.5 },
  { angle: 55,  len: 150, w: 4 },
  { angle: 70,  len: 240, w: 3 },
  { angle: 85,  len: 170, w: 5 },
  { angle: 100, len: 200, w: 3 },
  { angle: 115, len: 245, w: 4 },
  { angle: 130, len: 140, w: 3.5 },
  { angle: 145, len: 215, w: 3 },
  { angle: 160, len: 165, w: 5 },
  { angle: 175, len: 235, w: 3 },
  { angle: 190, len: 185, w: 4 },
  { angle: 205, len: 205, w: 3.5 },
  { angle: 220, len: 155, w: 4 },
  { angle: 235, len: 240, w: 3 },
  { angle: 250, len: 175, w: 5 },
  { angle: 265, len: 220, w: 3 },
  { angle: 280, len: 145, w: 4 },
  { angle: 295, len: 210, w: 3.5 },
  { angle: 310, len: 195, w: 3 },
  { angle: 325, len: 235, w: 4 },
  { angle: 340, len: 160, w: 5 },
  { angle: 355, len: 200, w: 3 },
]

// Particules scintillantes autour du halo (dots or)
const PARTICLES = [
  { x: -180, y: -220, s: 3, o: 0.20 },
  { x: -240, y: -140, s: 2, o: 0.15 },
  { x: -160, y: -60,  s: 2.5, o: 0.18 },
  { x: -220, y: 40,   s: 3, o: 0.19 },
  { x: -150, y: 160,  s: 2, o: 0.14 },
  { x: -230, y: 230,  s: 2.5, o: 0.16 },
  { x: -90,  y: -250, s: 2, o: 0.15 },
  { x: -40,  y: -180, s: 2.5, o: 0.18 },
  { x: 60,   y: -240, s: 3, o: 0.20 },
  { x: 130,  y: -170, s: 2, o: 0.14 },
  { x: 200,  y: -200, s: 2.5, o: 0.18 },
  { x: 240,  y: -80,  s: 3, o: 0.19 },
  { x: 180,  y: 30,   s: 2, o: 0.15 },
  { x: 250,  y: 120,  s: 2.5, o: 0.18 },
  { x: 160,  y: 200,  s: 3, o: 0.20 },
  { x: 230,  y: 250,  s: 2, o: 0.14 },
  { x: 40,   y: 230,  s: 2.5, o: 0.16 },
  { x: -60,  y: 250,  s: 3, o: 0.19 },
  { x: 100,  y: 270,  s: 2, o: 0.14 },
  { x: -120, y: 290,  s: 2.5, o: 0.15 },
]

// Arcs courbés (light streaks sur les côtés)
const ARCS = [
  { size: 520, top: -260, left: -380, rot: -25, op: 0.05 },
  { size: 620, top: -200, left: 160,  rot: 15,  op: 0.04 },
  { size: 580, top: 120,  left: -420, rot: 20,  op: 0.05 },
  { size: 640, top: 140,  left: 180,  rot: -18, op: 0.04 },
]

export default function StarburstBackground() {
  return (
    <div style={{
      position: 'absolute',
      width: 560, height: 560,
      top: '45%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 0,
    }}>
      {/* Arcs courbés latéraux — simulent des light streaks */}
      {ARCS.map((a, i) => (
        <div key={`arc-${i}`} style={{
          position: 'absolute',
          width: a.size, height: a.size,
          top: a.top, left: a.left,
          borderRadius: '50%',
          border: `1.5px solid rgba(255,215,100,${a.op})`,
          borderColor: `rgba(255,215,100,${a.op}) transparent transparent transparent`,
          transform: `rotate(${a.rot}deg)`,
        }} />
      ))}

      {/* Rayons dorés */}
      {RAYS.map((r, i) => (
        <div key={`ray-${i}`} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: r.len,
          height: r.w * 2,
          transformOrigin: '0 50%',
          transform: `rotate(${r.angle}deg) translateY(-50%)`,
          background: `linear-gradient(90deg, rgba(255,220,90,0.20) 0%, rgba(255,200,50,0.12) 35%, rgba(255,180,30,0.05) 70%, transparent 100%)`,
          borderRadius: r.w * 2,
        }} />
      ))}

      {/* Particules scintillantes */}
      {PARTICLES.map((p, i) => (
        <div key={`p-${i}`} style={{
          position: 'absolute',
          top: `calc(50% + ${p.y}px)`,
          left: `calc(50% + ${p.x}px)`,
          width: p.s * 2,
          height: p.s * 2,
          borderRadius: '50%',
          background: `rgba(255,225,120,${p.o})`,
          boxShadow: `0 0 ${p.s * 3}px rgba(255,220,100,${p.o * 0.7})`,
          transform: 'translate(-50%, -50%)',
        }} />
      ))}
    </div>
  )
}

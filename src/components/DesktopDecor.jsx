// Décor fullscreen desktop (≥768px) : dégradé animé + particules flottantes.
// Rendu en position:fixed derrière l'app ; l'app reste inchangée au-dessus.

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  size: 3 + Math.random() * 6,
  duration: 18 + Math.random() * 20,
  delay: Math.random() * 20,
  opacity: 0.15 + Math.random() * 0.35,
}))

export default function DesktopDecor() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* Dégradé animé de fond */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          background: 'linear-gradient(135deg, #1a0f2e 0%, #2E1A47 25%, #4a1f5f 50%, #2E1A47 75%, #1a0f2e 100%)',
          backgroundSize: '400% 400%',
          animation: 'wtf-desktop-gradient 22s ease-in-out infinite',
        }}
      />

      {/* Halo central orange derrière la colonne mobile */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 700,
          height: 700,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(255,107,26,0.18) 0%, rgba(255,107,26,0.05) 40%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'wtf-desktop-pulse 8s ease-in-out infinite',
        }}
      />

      {/* Particules flottantes */}
      {PARTICLES.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '-20px',
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: `rgba(255,215,0,${p.opacity})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(255,215,0,${p.opacity * 0.6})`,
            animation: `wtf-desktop-particle ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Keyframes injectées localement */}
      <style>{`
        @keyframes wtf-desktop-gradient {
          0%   { background-position: 0% 0%; }
          50%  { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        @keyframes wtf-desktop-pulse {
          0%, 100% { opacity: 0.8; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1;   transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes wtf-desktop-particle {
          0%   { transform: translateY(0)      translateX(0);   opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(30px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

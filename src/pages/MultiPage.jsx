import { useNavigate } from 'react-router-dom'
import { useScale } from '../hooks/useScale'

/**
 * MultiPage — Mode Multi (défier un ami en Rush ou Speedrun)
 *
 * STUB temporaire : le flow complet (lobby → choix variant → choix ami →
 * création défi) sera branché dans un commit suivant. Cette page confirme
 * seulement la navigation depuis la tile Multi de HomeScreen.
 */
export default function MultiPage() {
  const navigate = useNavigate()
  const scale = useScale()
  const S = (px) => `calc(${px}px * var(--scale))`

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ '--scale': scale, background: 'linear-gradient(160deg, #1a0a2e 0%, #0a0a3e 100%)', fontFamily: 'Nunito, sans-serif' }}
    >
      <div className="px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff' }}
        >←</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ gap: S(16) }}>
        <span style={{ fontSize: S(64) }}>⚔️</span>
        <h1 style={{ fontSize: S(28), fontWeight: 900, color: '#FFD700', margin: 0, textAlign: 'center' }}>
          Multi
        </h1>
        <p style={{ fontSize: S(14), color: 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
          Défie tes amis en <strong style={{ color: '#FF1744' }}>Rush</strong> (60s, plus de bonnes gagne) ou
          <strong style={{ color: '#00E5FF' }}> Speedrun</strong> (temps final, catégorie 100%).
        </p>
        <div style={{ padding: '12px 20px', borderRadius: 12, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: '#FFD700', fontSize: S(13), fontWeight: 700 }}>
          🚧 Lobby en cours d'implémentation
        </div>
        <button
          onClick={() => navigate('/social')}
          style={{ marginTop: S(12), padding: '12px 28px', borderRadius: 12, background: '#FF6B1A', color: '#fff', border: 'none', fontWeight: 900, fontSize: S(14), cursor: 'pointer' }}
        >
          👥 Mes amis
        </button>
      </div>
    </div>
  )
}

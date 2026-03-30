import { useState, useEffect } from 'react'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'

// Simulate a realistic daily player count based on the date
function getDailyPlayerCount() {
  const seed = new Date().toISOString().slice(0, 10).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return 847 + (seed % 312)
}

export default function WTFDuJourTeaserScreen({ fact, titrePartiel, streak, onStart, onBack }) {
  const [visible, setVisible] = useState(false)
  const cat = getCategoryById(fact.category)
  const playerCount = getDailyPlayerCount()

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden"
      style={{
        background: `linear-gradient(170deg, ${cat?.color || '#7C3AED'}22 0%, ${cat?.color || '#7C3AED'} 100%)`,
        transition: 'opacity 0.3s',
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Back button */}
      <div className="flex items-center px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: 16 }}>
          ←
        </button>
        <div className="flex-1 text-center">
          <div className="font-black text-base tracking-wide" style={{ color: cat?.color || '#7C3AED' }}>WTF! du Jour</div>
          <div className="text-white/40 text-xs">Tous les jours, un nouveau f*ct</div>
        </div>
        <div className="w-9" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-start px-6 gap-2 pt-2 overflow-hidden">

        {/* Pulsing star/mascotte */}
        <div className="flex items-center justify-center" style={{ animation: 'bounceIn 0.6s cubic-bezier(0.68,-0.55,0.265,1.55)' }}>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-5xl"
            style={{
              background: `radial-gradient(circle, ${cat?.color || '#7C3AED'}33 0%, transparent 70%)`,
              boxShadow: `0 0 60px ${cat?.color || '#7C3AED'}55`,
              border: `2px solid ${cat?.color || '#7C3AED'}44`,
            }}>
            {cat?.emoji || '🤯'}
          </div>
        </div>

        {/* Category label */}
        <div
          className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest"
          style={{
            background: `${cat?.color || '#7C3AED'}22`,
            border: `1px solid ${cat?.color || '#7C3AED'}55`,
            color: cat?.color || '#7C3AED',
          }}>
          {cat?.label || fact.category}
        </div>

        {/* Teaser card */}
        <div
          className="w-full rounded-3xl p-5"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
          }}>
          <div className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3 text-center">
            Le f*ct du jour
          </div>
          <div className="text-white font-black text-lg leading-snug text-center mb-1">
            {titrePartiel}
          </div>
          <div className="text-white/30 text-xs text-center mt-2">
            Joue la session pour révéler le f*ct complet
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
          <div className="flex -space-x-1.5">
            {['😎', '🧠', '🤯', '🦊'].map((e, i) => (
              <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-sm border" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', zIndex: 4 - i }}>
                {e}
              </div>
            ))}
          </div>
          <span className="font-bold">
            <span style={{ color: 'white' }}>{playerCount.toLocaleString('fr-FR')}</span> joueurs l'ont découvert aujourd'hui
          </span>
        </div>

        {/* Streak info if relevant */}
        {streak >= 1 && (
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-2xl"
            style={{ background: 'rgba(255,107,26,0.12)', border: '1px solid rgba(255,107,26,0.25)' }}>
            <span className="text-xl">{streak >= 7 ? '💙🔥' : '🔥'}</span>
            <div>
              <div className="text-white font-black text-xs">Série en cours : {streak} jours</div>
              <div className="text-white/50 text-xs">Maintiens ta flamme en jouant aujourd'hui !</div>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-6 pb-5 pt-2 shrink-0">
        <button
          onClick={() => { audio.play('click'); onStart() }}
          className="btn-press w-full py-4 rounded-2xl text-white font-black text-base uppercase tracking-wide active:scale-95 transition-all"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
            boxShadow: '0 8px 40px rgba(124,58,237,0.6), 0 2px 8px rgba(0,0,0,0.4)',
          }}>
          <span className="flex items-center justify-center gap-3">
            <span className="text-2xl">🎯</span>
            Jouer pour débloquer
          </span>
        </button>
        <div className="text-white/30 text-xs text-center mt-3">
          5 questions · Catégorie {cat?.label || fact.category} · ~2 minutes
        </div>
      </div>
    </div>
  )
}

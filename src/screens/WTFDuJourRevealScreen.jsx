import { useState, useEffect } from 'react'
import { getCategoryById } from '../data/facts'
import { audio } from '../utils/audio'
import CoinsIcon from '../components/CoinsIcon'

export default function WTFDuJourRevealScreen({
  fact,
  sessionScore,
  correctCount,
  totalFacts,
  coinsEarned,
  streak,
  onHome,
  onShare,
}) {
  const [phase, setPhase] = useState(0) // 0=mascotte, 1=reveal, 2=full
  const [displayedCoins, setDisplayedCoins] = useState(0)
  const cat = getCategoryById(fact.category)

  useEffect(() => {
    // Phase 0 → mascotte appears
    // Phase 1 → fact card slides in
    // Phase 2 → coins counter
    const t1 = setTimeout(() => setPhase(1), 600)
    const t2 = setTimeout(() => {
      setPhase(2)
      audio.playFile?.('Coins points.mp3')
    }, 1400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Animate coins counter
  useEffect(() => {
    if (phase < 2 || coinsEarned === 0) return
    let current = 0
    const step = Math.ceil(coinsEarned / 20)
    const interval = setInterval(() => {
      current = Math.min(current + step, coinsEarned)
      setDisplayedCoins(current)
      if (current >= coinsEarned) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [phase, coinsEarned])

  const pct = totalFacts > 0 ? Math.round((correctCount / totalFacts) * 100) : 0

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: 'linear-gradient(170deg, #0A0F1E 0%, #1A0A35 30%, #0E2840 70%, #0A1E2E 100%)', overflow: 'hidden' }}>

      {/* Mascotte WTF */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0"
        style={{
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(-20px)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        <div className="text-5xl animate-bounce-in">🤯</div>
        <div>
          <div className="text-white font-black text-lg tracking-wide">What The F*ct !</div>
          <div className="text-white/50 text-xs">Tu as débloqué le f*ct du jour</div>
        </div>
      </div>

      {/* Scrollable middle: fact card + score */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-0">

      {/* Fact card — slides in from bottom */}
      <div
        className="mx-4 rounded-3xl overflow-hidden shrink-0"
        style={{
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(100px)',
          opacity: phase >= 1 ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.34,1.2,0.64,1) 0.2s',
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${cat?.color || '#7C3AED'}44`,
        }}>
        {/* Category header */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: `${cat?.color || '#7C3AED'}18`, borderBottom: `1px solid ${cat?.color || '#7C3AED'}33` }}>
          <span className="text-2xl">{cat?.emoji || '🤯'}</span>
          <span className="font-black text-sm uppercase tracking-widest" style={{ color: cat?.color || '#7C3AED' }}>
            {cat?.label || fact.category}
          </span>
          <span className="ml-auto text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${cat?.color || '#7C3AED'}33`, color: cat?.color || '#7C3AED' }}>
            F*ct du Jour
          </span>
        </div>

        {/* Fact image if available */}
        {fact.imageUrl && (
          <div className="relative overflow-hidden" style={{ height: 110, maxHeight: 110 }}>
            <img
              src={fact.imageUrl}
              alt=""
              className="w-full object-cover"
              style={{ filter: 'brightness(0.85)', height: 110, objectFit: 'cover' }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />
          </div>
        )}

        {/* Fact content */}
        <div className="px-4 py-4">
          <div className="text-white font-black text-base leading-snug mb-2">
            {fact.shortAnswer}
          </div>
          <div className="text-white/65 text-sm leading-relaxed line-clamp-4">
            {fact.explanation}
          </div>
        </div>
      </div>

      {/* Session score + coins */}
      <div
        className="mx-4 mt-3 rounded-2xl p-4 shrink-0"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.4s ease 0.3s',
        }}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-black" style={{ color: '#FF5C1A' }}>{sessionScore}</div>
            <div className="text-white/40 text-xs font-semibold">Score</div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{correctCount}/{totalFacts}</div>
            <div className="text-white/40 text-xs font-semibold">Correct</div>
          </div>
          <div>
            <div className="text-2xl font-black" style={{ color: '#FFD700' }}>+{displayedCoins}</div>
            <div className="text-white/40 text-xs font-semibold flex items-center justify-center gap-1"><CoinsIcon size={12} /> Coins</div>
          </div>
        </div>

        {/* Streak update */}
        {streak > 0 && (
          <div className="mt-3 pt-3 flex items-center justify-center gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-lg">{streak >= 7 ? '💙🔥' : '🔥'}</span>
            <span className="text-white font-black text-sm">Série {streak} jours !</span>
            {streak === 7 && <span className="text-xs px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(96,165,250,0.2)', color: '#60A5FA' }}>Semaine parfaite !</span>}
            {streak === 30 && <span className="text-xs px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(255,215,0,0.2)', color: '#FFD700' }}>1 mois !</span>}
          </div>
        )}
      </div>

      </div>{/* end scrollable */}

      {/* Actions — sticky at bottom */}
      <div
        className="px-4 pb-6 pt-3 flex flex-col gap-2 shrink-0"
        style={{
          opacity: phase >= 2 ? 1 : 0,
          transition: 'opacity 0.4s ease 0.5s',
        }}>
        <div className="flex gap-2">
          <button
            onClick={onHome}
            className="flex-1 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wide active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(135deg, #FF5C1A 0%, #D94A10 100%)',
              boxShadow: '0 8px 32px rgba(255,92,26,0.4)',
              color: 'white',
            }}>
            ✓ Ajouter à ma collection
          </button>
          <button
            onClick={() => { audio.play('click'); onShare() }}
            className="w-14 flex items-center justify-center rounded-2xl active:scale-95 transition-all text-xl"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
            📤
          </button>
        </div>
        <button
          onClick={onHome}
          className="w-full py-2.5 rounded-2xl border font-bold text-xs active:scale-95 transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  )
}

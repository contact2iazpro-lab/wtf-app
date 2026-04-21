import { useScale } from '../../hooks/useScale'

export default function RevelationTemplate({
  catColor = '#FF6B1A', catName = '', catIcon = '',
  isCorrect = true, imageUrl = '', question = '', correctAnswer = '',
  explanation = '', message = '', coinsEarned = 0, totalCoins = 0,
  hintsCount = 0, socialProofPercent = 0,
  onNext = () => {}, onShare = () => {}, onQuit = () => {},
  showFinger = true, showShareButton = true, showExplanation = true,
  isLast = false, isVip = false, showCollectionBadge = false,
}) {
  const S = useScale()

  return (
    <div style={{
      height: '100%', width: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: isVip
        ? `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`
        : `linear-gradient(160deg, ${catColor}cc 0%, ${catColor} 100%)`,
      fontFamily: 'Nunito, sans-serif',
      position: 'relative',
    }}>

      {/* VIP PARTICLES */}
      {isVip && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${(i * 31 + 7) % 90}%`, left: `${(i * 43 + 13) % 95}%`,
              width: i % 3 === 0 ? 6 : 4, height: i % 3 === 0 ? 6 : 4,
              borderRadius: '50%',
              background: `rgba(255,255,255,${0.1 + (i % 4) * 0.07})`,
              animation: `vipPulse ${2 + (i % 3) * 0.5}s ${(i * 0.3).toFixed(1)}s ease-in-out infinite`,
            }} />
          ))}
        </div>
      )}

      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${S(8)}px ${S(12)}px`, flexShrink: 0, position: 'relative', zIndex: 1,
      }}>
        <button onClick={onQuit} style={{
          width: S(36), height: S(36), borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.4)',
          color: 'white', fontSize: S(16), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: S(6) }}>
          {catIcon && <img src={catIcon} style={{ width: S(24), height: S(24), borderRadius: S(4), objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />}
          <span style={{ color: 'white', fontSize: S(13), fontWeight: 700 }}>{catName}</span>
        </div>

        <div style={{ display: 'flex', gap: S(6) }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: S(20), padding: `${S(4)}px ${S(10)}px`, color: 'white', fontSize: S(11), fontWeight: 700 }}><img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> {totalCoins}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: S(20), padding: `${S(4)}px ${S(10)}px`, color: 'white', fontSize: S(11), fontWeight: 700 }}><img src="/assets/ui/icon-hint.png?v=2" alt="indice" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> {hintsCount}</span>
        </div>
      </div>

      {/* CONTENU CENTRAL */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${S(16)}px`, gap: S(12),
        position: 'relative', zIndex: 1, overflow: 'hidden',
      }}>

        {/* IMAGE */}
        {imageUrl ? (
          <div style={{
            width: '100%', maxHeight: '35vh', borderRadius: S(16),
            overflow: 'hidden', position: 'relative',
            padding: S(4),
            border: isVip && isCorrect ? `2px solid ${catColor}AA` : `3px solid ${catColor || '#1a3a5c'}`,
            ...(isVip && isCorrect ? { animation: 'vipGlow 2s ease-in-out infinite' } : {}),
          }}>
            <img src={imageUrl} style={{
              width: '100%', maxHeight: 'calc(35vh - 14px)', display: 'block',
              borderRadius: S(12), objectFit: 'cover',
              filter: isCorrect ? 'none' : 'blur(12px) brightness(0.5)',
            }} />
            {/* BADGE COLLECTION */}
            {isCorrect && showCollectionBadge && (
              <div style={{
                position: 'absolute', bottom: S(8), right: S(8), zIndex: 5,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                border: `2px solid ${isVip ? '#FFD700' : '#4CAF50'}`,
                borderRadius: S(8),
                padding: `${S(4)}px ${S(10)}px`,
                display: 'flex', alignItems: 'center', gap: S(4),
                animation: 'badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <span style={{ fontSize: S(12) }}>📚</span>
                <span style={{
                  fontSize: S(10), fontWeight: 900,
                  color: isVip ? '#FFD700' : '#4CAF50',
                  letterSpacing: '0.04em',
                }}>Ajouté à ta collection !</span>
              </div>
            )}
            {/* STAMP ERREUR */}
            {!isCorrect && (
              <div style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%, -50%) rotate(-12deg)',
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                border: '3px solid #EF4444',
                borderRadius: S(14), padding: `${S(14)}px ${S(20)}px`,
                maxWidth: '90%', textAlign: 'center',
              }}>
                <span style={{ fontSize: S(16), fontWeight: 900, color: '#EF4444', lineHeight: 1.4 }}>{message}</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            width: S(150), height: S(150), borderRadius: S(16),
            background: catColor + '40', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: S(60),
          }}>{isCorrect ? '🎉' : '😅'}</div>
        )}

        {/* MESSAGE CORRECT */}
        {isCorrect && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: S(18), fontWeight: 900, color: 'white' }}>{message}</div>
            {coinsEarned > 0 && <div style={{ fontSize: S(16), fontWeight: 900, color: '#FFD700', marginTop: S(4) }}>+{coinsEarned} <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /></div>}
          </div>
        )}

        {/* SOCIAL PROOF */}
        {isCorrect && socialProofPercent > 0 && (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: S(13), fontWeight: 800, color: 'white', opacity: 0.8 }}>
              👥 Seulement {socialProofPercent}% des joueurs ont trouvé ce f*ct
            </span>
          </div>
        )}

        {/* EXPLICATION */}
        {isCorrect && showExplanation && explanation && (
          <div style={{
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: S(14), padding: `${S(8)}px ${S(10)}px`,
            width: '100%', overflow: 'hidden',
          }}>
            <div style={{
              background: 'rgba(76,175,80,0.12)', border: '1px solid rgba(76,175,80,0.3)',
              borderRadius: S(10), padding: `${S(6)}px ${S(10)}px`, marginBottom: S(6),
            }}>
              <div style={{ fontSize: S(9), fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: S(2) }}>✓ Bonne réponse :</div>
              <div style={{ fontSize: S(12), fontWeight: 700, color: 'white' }}>{correctAnswer}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: S(4), marginBottom: S(3) }}>
              <span style={{ color: 'white', fontWeight: 900, fontSize: S(9), textTransform: 'uppercase', letterSpacing: '0.05em' }}>Le saviez-vous ?</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: S(12), lineHeight: 1.4, fontWeight: 500, margin: 0 }}>{explanation}</p>
          </div>
        )}

        {/* QUESTION + BONNE REPONSE (mauvaise réponse) */}
        {!isCorrect && (
          <div style={{
            background: 'rgba(0,0,0,0.2)', borderRadius: S(12),
            padding: S(16), width: '100%',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: S(11), fontWeight: 700, marginBottom: S(4) }}>LA QUESTION :</div>
            <div style={{ color: 'white', fontSize: S(14), fontWeight: 600 }}>{question}</div>
            <div style={{ color: '#22C55E', fontSize: S(14), fontWeight: 900, marginTop: S(8) }}>✅ {correctAnswer}</div>
          </div>
        )}
      </div>

      {/* BOUTONS */}
      <div style={{
        padding: `0 ${S(16)}px ${S(24)}px`, flexShrink: 0,
        display: 'flex', gap: S(8), position: 'relative', zIndex: 1,
      }}>
        {/* Bouton Partager */}
        {isCorrect && showShareButton && onShare && (
          <button onClick={onShare} style={{
            flex: 1, height: S(44), borderRadius: S(14),
            background: `linear-gradient(135deg, ${catColor} 0%, ${catColor}cc 100%)`,
            color: 'white', border: '2px solid rgba(255,255,255,0.4)',
            fontWeight: 900, fontSize: S(12), cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(4),
          }}>🎩 Partager ce WTF!</button>
        )}

        {/* Bouton SUIVANT */}
        <button onClick={onNext} style={{
          flex: 1, height: S(44), borderRadius: S(14),
          background: `linear-gradient(135deg, ${catColor}dd 0%, ${catColor}99 100%)`,
          color: 'white', border: '2px solid rgba(255,255,255,0.4)',
          fontWeight: 900, fontSize: S(12), cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>{isLast ? '🏁 RÉSULTATS' : 'SUIVANT →'}</button>
      </div>

      {/* DOIGT */}
      {showFinger && (
        <div style={{ textAlign: 'center', fontSize: S(32), animation: 'tutoFinger 0.8s ease-in-out infinite', paddingBottom: S(16), position: 'relative', zIndex: 1 }}>👆</div>
      )}

      {/* ANIMATIONS */}
      <style>{`
        @keyframes badgePop { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes vipPulse { 0%, 100% { opacity: 0.1; transform: scale(0.8); } 50% { opacity: 0.35; transform: scale(1.2); } }
        @keyframes vipGlow { 0%, 100% { box-shadow: inset 0 0 15px ${catColor}4D, 0 0 15px ${catColor}80; } 50% { box-shadow: inset 0 0 20px ${catColor}66, 0 0 20px ${catColor}B3; } }
        @keyframes tutoFinger { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>
    </div>
  )
}

import { useScale } from '../../hooks/useScale'

export default function QuestionTemplate({
  catColor = '#FF6B1A', catName = '', catIcon = '', modeLabel = '',
  question = '', options = [], selectedAnswerIndex = null,
  onSelectAnswer = () => {}, hints = [], onRevealHint = () => {},
  timer = 0, progressIndex = 0, totalQuestions = 5,
  coins = 0, hintsCount = 0,
  onQuit = () => {}, showFinger = false, disabled = false,
}) {
  const S = useScale()
  const is6 = options.length > 4
  const btnH = is6 ? 50 : 64
  const btnFont = is6 ? 11 : 13
  const timerColor = timer > 15 ? '#22C55E' : timer > 5 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{
      height: '100%', width: '100%', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      background: `linear-gradient(160deg, ${catColor}22 0%, ${catColor} 100%)`,
      fontFamily: 'Nunito, sans-serif',
    }}>

      {/* === HEADER === */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${S(8)}px ${S(12)}px`,
        flexShrink: 0,
      }}>
        <button onClick={onQuit} style={{
          width: S(36), height: S(36), borderRadius: S(18),
          background: 'rgba(0,0,0,0.3)', border: 'none',
          color: 'white', fontSize: S(16), cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: S(6) }}>
          {catIcon && <img src={catIcon} style={{ width: S(24), height: S(24), borderRadius: S(12) }} onError={e => e.target.style.display = 'none'} />}
          <span style={{ color: 'white', fontSize: S(13), fontWeight: 700 }}>{catName}</span>
        </div>

        <div style={{ display: 'flex', gap: S(6) }}>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: S(20), padding: `${S(4)}px ${S(10)}px`, color: 'white', fontSize: S(11), fontWeight: 700 }}><img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> {coins}</span>
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: S(20), padding: `${S(4)}px ${S(10)}px`, color: 'white', fontSize: S(11), fontWeight: 700 }}><img src="/assets/ui/icon-hint.png?v=2" alt="indice" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /> {hintsCount}</span>
        </div>
      </div>

      {/* === MODE LABEL === */}
      {modeLabel && (
        <div style={{
          textAlign: 'center', color: 'white', fontSize: S(11),
          fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          opacity: 0.8, flexShrink: 0,
        }}>{modeLabel}</div>
      )}

      {/* === PROGRESS BAR === */}
      <div style={{ display: 'flex', gap: S(3), padding: `${S(6)}px ${S(16)}px`, flexShrink: 0 }}>
        {Array.from({ length: totalQuestions }).map((_, i) => {
          const isActive = i === progressIndex
          return (
            <div key={i} style={{
              flex: 1, height: isActive ? S(20) : S(10),
              borderRadius: S(5), position: 'relative',
              background: i < progressIndex ? catColor : isActive ? 'white' : 'rgba(255,255,255,0.25)',
              transition: 'all 0.3s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isActive && <span style={{ fontSize: S(10), fontWeight: 900, color: catColor }}>{progressIndex + 1}/{totalQuestions}</span>}
            </div>
          )
        })}
      </div>

      {/* === ZONE CENTRALE === */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: `0 ${S(16)}px`,
        gap: S(is6 ? 8 : 12), overflow: 'hidden',
      }}>

        {/* QUESTION */}
        <div style={{
          background: 'rgba(0,0,0,0.15)', borderRadius: S(16),
          padding: S(16), borderColor: catColor + '70',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 4px 32px ${catColor}30`,
          flexShrink: 0,
        }}>
          <p style={{
            color: 'white', fontSize: S(18), fontWeight: 700,
            textAlign: 'center', margin: 0, lineHeight: 1.3,
          }}>{question}</p>
        </div>

        {/* INDICES */}
        {hints.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: hints.length === 1 ? '1fr' : '1fr 1fr',
            gap: S(8), flexShrink: 0,
          }}>
            {hints.map((hint, i) => (
              <button key={i} onClick={() => !hint.revealed && onRevealHint(i)} style={{
                padding: `${S(10)}px ${S(12)}px`, borderRadius: S(12),
                background: hint.revealed ? 'rgba(255,255,255,0.9)' : catColor + '40',
                border: hint.revealed ? `2px solid ${catColor}` : '2px solid transparent',
                cursor: hint.revealed ? 'default' : 'pointer',
                minHeight: S(44), display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: S(13), fontWeight: 700,
                  color: hint.revealed ? catColor : 'white',
                }}>{hint.revealed ? hint.text : hint.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* QCM GRILLE */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: S(is6 ? 5 : 8), flexShrink: 0,
        }}>
          {options.map((opt, i) => {
            const isSelected = selectedAnswerIndex === i
            const answered = selectedAnswerIndex !== null
            let bg = 'rgba(255,255,255,0.15)'
            let textColor = 'white'
            if (answered) {
              if (opt.isCorrect) { bg = '#22C55E'; textColor = 'white' }
              else if (isSelected) { bg = '#EF4444'; textColor = 'white' }
              else { bg = 'rgba(255,255,255,0.08)'; textColor = 'rgba(255,255,255,0.4)' }
            }
            return (
              <button key={i} disabled={answered || disabled}
                onClick={() => onSelectAnswer(i)}
                style={{
                  background: bg, border: 'none', borderRadius: S(12),
                  color: textColor, fontWeight: 700, fontSize: S(btnFont),
                  lineHeight: 1.2, padding: `${S(4)}px ${S(6)}px`,
                  height: S(btnH), width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', cursor: answered ? 'default' : 'pointer',
                  transition: 'transform 0.1s, background 0.15s',
                  overflow: 'hidden', wordBreak: 'break-word',
                }}>
                <span style={{
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  display: '-webkit-box', WebkitLineClamp: is6 ? 2 : 3,
                  WebkitBoxOrient: 'vertical',
                }}>{opt.text}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* === TIMER === */}
      <div style={{
        textAlign: 'center', padding: `${S(12)}px 0 ${S(20)}px`,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: S(36), fontWeight: 900, color: timerColor,
        }}>{timer}s</span>
      </div>

      {/* === DOIGT === */}
      {showFinger && (
        <div style={{ textAlign: 'center', fontSize: S(32), animation: 'tutoFinger 0.8s ease-in-out infinite', paddingBottom: S(16) }}>👆</div>
      )}

      <style>{`@keyframes tutoFinger { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }`}</style>
    </div>
  )
}

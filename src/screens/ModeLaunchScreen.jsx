import { useState } from 'react'
import { useScale } from '../hooks/useScale'
import { audio } from '../utils/audio'

const S = (px) => `calc(${px}px * var(--scale))`

export default function ModeLaunchScreen({ modeId, modeName, subtitle, emoji, rules, color, onStart, onBack }) {
  const scale = useScale()
  const [skipNext, setSkipNext] = useState(false)

  const handleStart = () => {
    audio.play('click')
    if (skipNext && modeId) {
      localStorage.setItem(`skip_launch_${modeId}`, 'true')
    }
    onStart()
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', width: '100%',
      overflow: 'hidden', boxSizing: 'border-box',
      fontFamily: 'Nunito, sans-serif',
      '--scale': scale,
      background: `linear-gradient(160deg, ${color}22, ${color})`,
      color: '#ffffff',
    }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${S(8)} ${S(16)}`, flexShrink: 0,
      }}>
        <button
          onClick={() => { audio.play('click'); onBack() }}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none',
            borderRadius: '50%', width: S(32), height: S(32),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: S(16), color: '#fff',
            backdropFilter: 'blur(8px)',
          }}
        >
          ←
        </button>
        <div style={{ width: S(32) }} />
      </div>

      {/* ── Titre ───────────────────────────────────────────────────── */}
      <div style={{
        textAlign: 'center', flexShrink: 0,
        padding: `${S(4)} ${S(20)} ${S(8)}`,
      }}>
        <div style={{ fontSize: S(36), marginBottom: S(2) }}>{emoji}</div>
        <h1 style={{
          fontSize: S(22), fontWeight: 900, margin: 0,
          letterSpacing: '0.02em',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {modeName}
        </h1>
        <p style={{
          fontSize: S(11), fontWeight: 700, margin: `${S(2)} 0 0`,
          opacity: 0.85,
        }}>
          {subtitle}
        </p>
      </div>

      {/* ── Règles ──────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        padding: `0 ${S(16)}`,
        display: 'flex', flexDirection: 'column', gap: S(5),
        justifyContent: 'center',
      }}>
        {rules.map((rule, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: S(8),
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            borderRadius: S(10), padding: `${S(7)} ${S(10)}`,
          }}>
            <span style={{ fontSize: S(14), flexShrink: 0, lineHeight: 1 }}>{rule.icon}</span>
            <span style={{
              fontSize: S(11), fontWeight: 600, lineHeight: 1.3,
            }}>
              {rule.text}
            </span>
          </div>
        ))}
      </div>

      {/* ── Checkbox + Bouton ───────────────────────────────────────── */}
      <div style={{
        flexShrink: 0, padding: `${S(8)} ${S(20)} ${S(16)}`,
      }}>
        {/* Checkbox "Ne plus afficher" */}
        <label style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: S(6), marginBottom: S(10), cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={skipNext}
            onChange={e => setSkipNext(e.target.checked)}
            style={{ width: S(14), height: S(14), accentColor: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
          />
          <span style={{
            fontSize: S(10), fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
          }}>
            Ne plus afficher ce message
          </span>
        </label>

        {/* Bouton C'EST PARTI ! */}
        <button
          onClick={handleStart}
          style={{
            width: '100%', padding: `${S(12)} 0`,
            background: '#ffffff',
            border: 'none', borderRadius: S(14),
            fontFamily: "'Fredoka One', cursive",
            fontSize: S(15), fontWeight: 400,
            color: color,
            cursor: 'pointer',
            boxShadow: '0 4px 0 rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.2)',
            transition: 'transform 0.1s, box-shadow 0.1s',
            letterSpacing: '0.04em',
          }}
          onTouchStart={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.2)' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.15)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.15), 0 6px 20px rgba(0,0,0,0.2)' }}
        >
          C'EST PARTI !
        </button>
      </div>
    </div>
  )
}

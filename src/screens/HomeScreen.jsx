/**
 * HomeScreen — Refonte complète
 * Architecture : 5 zones full-screen (100dvh), pas de scroll
 * Zone 1 : Header (profil · coins · tickets · settings)
 * Zone 2 : Bandeau badge + countdown
 * Zone 3 : Corps 3 colonnes (actifs | logo+chat | bientôt)
 * Zone 4 : Bouton Flash
 * Zone 5 : Nav 5 onglets
 */

import { useState, useEffect } from 'react'
import SettingsModal from '../components/SettingsModal'
import CoinsIcon from '../components/CoinsIcon'
import { audio } from '../utils/audio'

// ── Countdown to midnight ─────────────────────────────────────────────────────
function useCountdownToMidnight() {
  const calc = () => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const diff = midnight - now
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${String(m).padStart(2, '0')}min`
  }
  const [remaining, setRemaining] = useState(calc)
  useEffect(() => {
    const t = setInterval(() => setRemaining(calc()), 30000)
    return () => clearInterval(t)
  }, [])
  return remaining
}

// ── Badge progress 0-100 ──────────────────────────────────────────────────────
function getBadgeProgress(info) {
  if (!info) return 0
  const total = info.count || 10
  const done  = total - (info.remaining || total)
  return Math.max(4, Math.min(96, Math.round((done / total) * 100)))
}

// ── Icône active (colonne gauche) ─────────────────────────────────────────────
function ActiveIcon({ emoji, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 48, height: 48, borderRadius: 13,
        background: 'rgba(255,255,255,0.9)',
        boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
        border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.1s',
        flexShrink: 0,
      }}
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.93)')}
      onTouchEnd={e   => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span style={{ fontSize: 20, lineHeight: 1 }}>{emoji}</span>
      <span style={{
        fontSize: 7, fontWeight: 800, color: '#FF6B1A',
        textAlign: 'center', lineHeight: 1.2,
        maxWidth: 44, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>
    </button>
  )
}

// ── Icône bientôt (colonne droite) ────────────────────────────────────────────
function ComingSoonIcon({ emoji }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 13,
      background: 'rgba(255,255,255,0.25)',
      border: '1.5px dashed rgba(255,255,255,0.5)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 2,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 20, opacity: 0.5, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 6.5, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>Bientôt</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen({
  playerCoins          = 0,
  dailyQuestsRemaining = 3,
  currentStreak        = 0,
  nextBadgeInfo        = null,
  onNavigate,
  onOpenSettings,
}) {
  const [showSettings, setShowSettings] = useState(false)
  const countdown     = useCountdownToMidnight()
  const badgeProgress = getBadgeProgress(nextBadgeInfo)

  const nav = (target) => {
    audio.play?.('click')
    if (onNavigate) onNavigate(target)
  }

  const handleSettings = () => {
    audio.play?.('click')
    if (onOpenSettings) onOpenSettings()
    else setShowSettings(true)
  }

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100dvh', width: '100%', overflow: 'hidden',
        fontFamily: 'Nunito, sans-serif',
      }}
      className="rainbow-bg"
    >
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ══ ZONE 1 — Header ══════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}>
        {/* Profil */}
        <button
          onClick={() => nav('profil')}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            border: '2px solid rgba(255,255,255,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
          }}>
          👤
        </button>

        <div style={{ flex: 1 }} />

        {/* Coins */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 10px',
        }}>
          <CoinsIcon size={16} />
          <span style={{ fontWeight: 800, color: 'white', fontSize: 13 }}>{playerCoins}</span>
        </div>

        {/* Tickets */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 10px',
        }}>
          <span style={{ fontSize: 14 }}>🎟️</span>
          <span style={{ fontWeight: 800, color: 'white', fontSize: 13 }}>{dailyQuestsRemaining}</span>
        </div>

        {/* Settings */}
        <button
          onClick={handleSettings}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
            color: 'white', filter: 'brightness(0) invert(1)',
          }}>
          ⚙️
        </button>
      </div>

      {/* ══ ZONE 2 — Badge progress + countdown ══════════════════════════════ */}
      <div style={{
        margin: '6px 12px 0',
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 10, padding: '6px 10px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Prochain badge
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
            ⏱ {countdown}
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${badgeProgress}%`, background: '#FF6B1A', borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>
          {nextBadgeInfo
            ? `${nextBadgeInfo.category} × ${nextBadgeInfo.count} ${nextBadgeInfo.difficulty} — encore ${nextBadgeInfo.remaining} f*cts`
            : 'Lance une quête pour débloquer ton premier badge !'}
        </div>
      </div>

      {/* ══ ZONE 3 — Corps 3 colonnes ════════════════════════════════════════ */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'row',
        padding: '4px 8px 4px', gap: 6, minHeight: 0,
      }}>

        {/* ── Colonne gauche — modes actifs ── */}
        <div style={{
          width: 60, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <ActiveIcon emoji="🎯" label="Quête WTF!" onClick={() => nav('difficulty')} />
          <ActiveIcon emoji="🔥" label="Série"       onClick={() => nav('streak')} />
          <ActiveIcon emoji="📅" label="Du Jour"     onClick={() => nav('wtfDuJour')} />
        </div>

        {/* ── Colonne centre — logo + tagline + mascotte ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          minWidth: 0, minHeight: 0,
        }}>
          <img
            src="/logo-wtf.png"
            alt="WTF!"
            style={{
              maxHeight: 80, objectFit: 'contain', flexShrink: 0,
              filter: 'drop-shadow(0 4px 18px rgba(255,120,0,0.55))',
            }}
          />
          <div style={{ fontSize: 15, fontWeight: 900, color: '#FF6B1A', letterSpacing: 1, marginTop: 4, textAlign: 'center' }}>
            VRAI OU FOU ?
          </div>
          <div style={{
            fontSize: 10, color: 'white', textAlign: 'center',
            marginTop: 2, lineHeight: 1.35,
            textShadow: '0 1px 5px rgba(0,0,0,0.45)',
            padding: '0 6px',
          }}>
            Des f*cts 100% vrais,<br />des réactions 100% fun
          </div>
          <img
            src="/cat-president.png"
            alt="Chat WTF!"
            style={{
              maxWidth: '55%', maxHeight: 120,
              objectFit: 'contain', objectPosition: 'bottom',
              marginTop: 8, flexShrink: 1,
              maskImage: 'linear-gradient(to top, transparent 0%, black 45%)',
              WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 45%)',
            }}
          />
        </div>

        {/* ── Colonne droite — bientôt ── */}
        <div style={{
          width: 60, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <ComingSoonIcon emoji="🏃" />
          <ComingSoonIcon emoji="🎮" />
          <ComingSoonIcon emoji="⚡" />
        </div>

      </div>

      {/* ══ ZONE 4 — Bouton Flash ════════════════════════════════════════════ */}
      <div style={{ padding: '4px 16px 6px', flexShrink: 0 }}>
        <button
          onClick={() => nav('categoryFlash')}
          style={{
            width: '100%', padding: '12px',
            background: 'white', color: '#FF6B1A',
            fontWeight: 900, fontSize: 14,
            border: 'none', borderRadius: 16,
            cursor: 'pointer', letterSpacing: '0.06em',
            boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.1s',
          }}
          onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onTouchEnd={e   => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ⚡ JOUER EN MODE FLASH
        </button>
      </div>

      {/* ══ ZONE 5 — Navigation 5 onglets ════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-around',
        padding: '6px 4px 12px',
        background: 'rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}>
        {[
          { icon: '🛒', label: 'Boutique',   action: () => console.log('Boutique — à brancher'), active: false, center: false },
          { icon: '🏆', label: 'Trophées',   action: () => nav('trophees'),   active: false, center: false },
          { icon: '🏠', label: 'Accueil',    action: null,                    active: true,  center: true  },
          { icon: '👥', label: 'Amis',       action: () => console.log('Amis — à brancher'), active: false, center: false },
          { icon: '📚', label: 'Collection', action: () => nav('collection'), active: false, center: false },
        ].map((item) => (
          <button
            key={item.label}
            onClick={item.action || undefined}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none',
              cursor: item.action ? 'pointer' : 'default',
              padding: '0 8px',
              position: 'relative',
              marginBottom: item.center ? 8 : 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {item.center && (
              <div style={{
                position: 'absolute',
                top: -10, left: '50%', transform: 'translateX(-50%)',
                width: 44, height: 44, borderRadius: '50%',
                background: 'white',
                boxShadow: '0 3px 12px rgba(0,0,0,0.25)',
                zIndex: 0,
              }} />
            )}
            <span style={{ fontSize: 22, position: 'relative', zIndex: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: item.active ? '#FF6B1A' : 'rgba(255,255,255,0.7)',
              position: 'relative', zIndex: 1,
            }}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

    </div>
  )
}

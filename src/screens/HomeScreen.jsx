/**
 * HomeScreen v7 — Refonte complète
 * 5 zones : Header · Badge · Coffres · Corps (3 cols) · Nav
 * Full screen, no scroll, useScale responsive
 */

import { useState, useEffect, useMemo } from 'react'
import SettingsModal from '../components/SettingsModal'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'

// ── Background aléatoire par session ──────────────────────────────────────────
const HOME_BACKGROUNDS = [
  { url: '/assets/backgrounds/home-orange.png', textColor: '#FF6B1A', shadow: 'none' },
  { url: '/assets/backgrounds/home-violet.png', textColor: '#FF6B1A', shadow: 'none' },
  { url: '/assets/backgrounds/home-bleu.png',   textColor: '#FF6B1A', shadow: 'none' },
  { url: '/assets/backgrounds/home-rouge.png',  textColor: '#FF6B1A', shadow: 'none' },
  { url: '/assets/backgrounds/home-teal.png',   textColor: '#FF6B1A', shadow: 'none' },
]

function getSessionBackground() {
  const stored = sessionStorage.getItem('wtf_bg_idx')
  if (stored !== null) return HOME_BACKGROUNDS[parseInt(stored)] || HOME_BACKGROUNDS[0]
  const idx = Math.floor(Math.random() * HOME_BACKGROUNDS.length)
  sessionStorage.setItem('wtf_bg_idx', String(idx))
  return HOME_BACKGROUNDS[idx]
}

// ── Coffre quotidien ──────────────────────────────────────────────────────────
const COFFRE_DAYS = [1, 2, 3, 4, 7]

function useDailyCoffre() {
  const today = new Date().toISOString().slice(0, 10)

  const read = () => {
    const lastDate = localStorage.getItem('wtf_coffre_last_date') || null
    const lastIndex = parseInt(localStorage.getItem('wtf_coffre_index') ?? '-1')
    const claimedToday = lastDate === today
    const availableIndex = claimedToday ? -1 : (lastIndex + 1) % COFFRE_DAYS.length
    return { lastIndex, claimedToday, availableIndex }
  }

  const [coffreData, setCoffreData] = useState(read)

  const claim = () => {
    const { availableIndex } = coffreData
    if (availableIndex < 0) return null
    const REWARDS = [
      { type: 'coins', amount: 5 },
      { type: 'coins', amount: 10 },
      { type: 'hints', amount: 1 },
      { type: 'hints', amount: 2 },
    ]
    const reward = REWARDS[Math.floor(Math.random() * REWARDS.length)]
    localStorage.setItem('wtf_coffre_last_date', today)
    localStorage.setItem('wtf_coffre_index', String(availableIndex))
    setCoffreData({ lastIndex: availableIndex, claimedToday: true, availableIndex: -1 })
    return reward
  }

  const getStatus = (i) => {
    const { lastIndex, claimedToday, availableIndex } = coffreData
    const isTrophy = COFFRE_DAYS[i] === 7
    if (!claimedToday && i === availableIndex) return 'available'
    if (i <= lastIndex) return 'collected'
    return isTrophy ? 'locked-trophy' : 'locked'
  }

  return { ...coffreData, claim, getStatus }
}

function applyCofreReward(reward) {
  try {
    const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    if (reward.type === 'coins') data.wtfCoins = (data.wtfCoins || 0) + reward.amount
    else if (reward.type === 'hints') data.wtfHints = (data.wtfHints || 0) + reward.amount
    localStorage.setItem('wtf_data', JSON.stringify(data))
  } catch { /* ignore */ }
}

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

function get24hProgress() {
  const now = new Date()
  const hours = now.getHours() + now.getMinutes() / 60
  return Math.max(2, Math.min(98, Math.round((hours / 24) * 100)))
}

// ── Scaled helper ─────────────────────────────────────────────────────────────
const S = (px) => `calc(${px}px * var(--scale))`

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen({
  playerCoins = 0,
  playerHints = 0,
  dailyQuestsRemaining = 3,
  currentStreak = 0,
  nextBadgeInfo = null,
  onNavigate,
  onOpenSettings,
}) {
  const [showSettings, setShowSettings] = useState(false)
  const [showCoffreModal, setShowCoffreModal] = useState(false)
  const [coffreReward, setCoffreReward] = useState(null)
  const { claim, getStatus } = useDailyCoffre()
  const countdown = useCountdownToMidnight()
  const progress24h = get24hProgress()
  const scale = useScale()
  const homeBgData = useMemo(() => getSessionBackground(), [])
  const homeBg = homeBgData.url
  const textColor = homeBgData.textColor
  const textShadow = homeBgData.shadow

  const nav = (target) => {
    audio.play?.('click')
    if (onNavigate) onNavigate(target)
  }

  const handleSettings = () => {
    audio.play?.('click')
    setShowSettings(true)
    if (onOpenSettings) onOpenSettings()
  }

  // ── Mode icon component ────────────────────────────────────────────────────
  const ModeIcon = ({ src, label, onClick, disabled }) => (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(3),
        background: 'none', border: 'none', padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        WebkitTapHighlightColor: 'transparent',
        opacity: disabled ? 0.4 : 1,
        filter: disabled ? 'grayscale(0.5)' : 'none',
        transition: 'transform 0.1s',
      }}
      onTouchStart={e => !disabled && (e.currentTarget.style.transform = 'scale(0.92)')}
      onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <img
        src={src}
        alt={label}
        style={{
          width: S(54), height: S(54),
          borderRadius: S(14),
          overflow: 'hidden',
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: disabled ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
        }}
      />
      <span style={{
        fontSize: S(9), fontWeight: 800, color: '#1a1a2e',
        textAlign: 'center', lineHeight: 1.2,
        maxWidth: S(70), wordWrap: 'break-word',
        whiteSpace: 'normal',
        opacity: disabled ? 0.5 : 1,
        textShadow: 'none',
      }}>{label}</span>
      {disabled && (
        <span style={{
          fontSize: S(6), fontWeight: 700, color: 'white', opacity: 0.6,
          marginTop: S(-2),
        }}>Bientôt</span>
      )}
    </button>
  )

  return (
    <div
      style={{
        position: 'relative',
        height: '100%', width: '100%', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        paddingTop: S(8),
        fontFamily: 'Nunito, sans-serif',
        '--scale': scale,
        backgroundImage: `url(${homeBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1a1a2e',
      }}
    >
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* ═══ ZONE 1 — HEADER ═══════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${S(6)} ${S(10)}`,
        flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        {/* Avatar */}
        <button
          onClick={() => nav('profil')}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)',
            border: '2px solid rgba(255,255,255,0.5)',
            padding: 0, overflow: 'hidden',
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <img src="/assets/ui/avatar-default.png" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </button>

        {/* Coins + Tickets + Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: S(12) }}>
          <button
            onClick={() => nav('boutique')}
            style={{
              display: 'flex', alignItems: 'center', gap: S(4),
              background: 'rgba(255,255,255,0.25)', borderRadius: S(20),
              padding: `${S(3)} ${S(10)}`, border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: S(14), height: S(14), flexShrink: 0 }} />
            <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{playerCoins}</span>
          </button>
          <button
            onClick={() => nav('boutique')}
            style={{
              display: 'flex', alignItems: 'center', gap: S(4),
              background: 'rgba(255,255,255,0.25)', borderRadius: S(20),
              padding: `${S(3)} ${S(10)}`, border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img src="/assets/ui/icon-tickets.png" alt="tickets" style={{ width: S(14), height: S(14), flexShrink: 0 }} />
            <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{dailyQuestsRemaining}</span>
          </button>
          <button
            onClick={() => nav('boutique')}
            style={{
              display: 'flex', alignItems: 'center', gap: S(4),
              background: 'rgba(255,255,255,0.25)', borderRadius: S(20),
              padding: `${S(3)} ${S(10)}`, border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: S(12) }}>💡</span>
            <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{playerHints}</span>
          </button>
          <button
            onClick={handleSettings}
            style={{
              width: S(28), height: S(28), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img src="/assets/ui/icon-settings.png" alt="settings" style={{ width: S(16), height: S(16) }} />
          </button>
        </div>
      </div>

      {/* ═══ ZONE 2 — BADGE PROGRESSION ════════════════════════════════════ */}
      <div style={{
        margin: `0 ${S(10)}`,
        background: 'rgba(255,255,255,0.2)',
        borderRadius: S(8),
        padding: `${S(8)} ${S(12)}`,
        flexShrink: 0, position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: S(5) }}>
          <span style={{ fontSize: S(10), fontWeight: 800, color: textColor, textShadow }}>Prochain badge</span>
          <span style={{ fontSize: S(10), fontWeight: 700, color: textColor, opacity: 0.7, textShadow }}>{countdown}</span>
        </div>
        <div style={{ height: S(6), background: 'rgba(255,255,255,0.2)', borderRadius: S(2), overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress24h}%`,
            background: 'white', borderRadius: S(2),
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* ═══ ZONE 3 — COFFRES QUOTIDIENS ═══════════════════════════════════ */}
      <div style={{
        display: 'flex', gap: S(6), padding: `${S(6)} ${S(10)}`,
        flexShrink: 0, position: 'relative', zIndex: 2,
        justifyContent: 'center',
      }}>
        {COFFRE_DAYS.map((day, i) => {
          const status = getStatus(i)
          const isAvail = status === 'available'
          const isColl = status === 'collected'
          const isTrophy = status === 'locked-trophy'

          const chestSrc = isAvail
            ? '/assets/ui/chest-open.png'
            : isTrophy
              ? '/assets/ui/chest-trophy.png?v=2'
              : '/assets/ui/chest-locked.png'

          return (
            <button
              key={day}
              onClick={() => {
                if (!isAvail) return
                audio.play?.('click')
                const reward = claim()
                if (reward) {
                  applyCofreReward(reward)
                  setCoffreReward(reward)
                  setShowCoffreModal(true)
                }
              }}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: S(1), padding: `${S(4)} ${S(2)}`,
                borderRadius: S(8),
                background: isAvail ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                border: `1px solid ${isAvail ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                cursor: isAvail ? 'pointer' : 'default',
                opacity: isColl ? 0.35 : status === 'locked' ? 0.5 : 1,
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 0.2s, background 0.2s',
              }}
            >
              <img
                src={chestSrc}
                alt={isAvail ? 'coffre disponible' : isTrophy ? 'coffre trophée' : 'coffre verrouillé'}
                style={{ width: S(36), height: S(36), objectFit: 'contain', flexShrink: 0, background: 'transparent', display: 'block' }}
              />
              <span style={{
                fontSize: S(8), fontWeight: 800, lineHeight: 1,
                color: textColor, textShadow,
              }}>
                {isAvail ? 'NOUVEAU' : `J-${day}`}{isColl ? ' ✓' : ''}
              </span>
            </button>
          )
        })}
      </div>

      {/* ═══ ZONE 4 — CORPS PRINCIPAL ═══════════════════════════════════════ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        position: 'relative', zIndex: 1,
      }}>

        {/* 4a. "VRAI OU FOU ?" — pleine largeur */}
        <div style={{
          width: '100%',
          fontSize: S(26), fontWeight: 900, color: textColor,
          textAlign: 'center',
          textShadow,
          letterSpacing: 0.5,
          marginBottom: S(12),
          flexShrink: 0,
        }}>
          VRAI OU FOU ?
        </div>

        {/* 4b. Zone 3 colonnes — gauche: modes | centre: étoile+tagline | droite: modes */}
        <div style={{
          display: 'flex', flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: `0 ${S(6)}`,
          flexShrink: 0,
        }}>
          {/* Colonne gauche — 27% */}
          <div style={{
            width: '27%', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: S(8),
          }}>
            <ModeIcon src="/assets/modes/quete.png" label="Quête WTF!" onClick={() => nav('difficulty')} />
            <ModeIcon src="/assets/modes/serie.png" label="Série" onClick={() => nav('trophees')} />
            <ModeIcon src="/assets/modes/wtf-semaine.png" label="WTF Semaine" onClick={() => nav('wtfDuJour')} />
          </div>

          {/* Colonne centre — étoile + tagline */}
          <div style={{
            flex: 1.5,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
          }}>
            <img
              src="/logo-wtf.png"
              alt="WTF!"
              style={{
                display: 'block',
                width: S(160), height: S(160), objectFit: 'contain',
                margin: '0 auto',
                filter: 'drop-shadow(0 3px 12px rgba(255,120,0,0.5))',
              }}
            />
          </div>

          {/* Colonne droite — 27% */}
          <div style={{
            width: '27%', flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: S(8),
          }}>
            <ModeIcon src="/assets/modes/marathon.png" label="Marathon" onClick={() => nav('marathon')} />
            <ModeIcon src="/assets/modes/multi.png" label="Multi" onClick={() => nav('duel_setup')} />
            <ModeIcon src="/assets/modes/blitz.png" label="Blitz" onClick={() => nav('blitz')} />
          </div>
        </div>

      </div>

      {/* Tagline */}
      <div style={{
        textAlign: 'center', padding: `${S(8)} ${S(16)}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: S(13), fontWeight: 700, color: textColor, textShadow, lineHeight: 1.5 }}>
          Des f*cts 100% vrais,
        </div>
        <div style={{ fontSize: S(13), fontWeight: 700, color: textColor, textShadow, lineHeight: 1.5 }}>
          des réactions 100% fun !
        </div>
      </div>

      {/* ═══ BOUTON FLASH ══════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        padding: `0 ${S(16)} ${S(8)}`,
        flexShrink: 0, position: 'relative', zIndex: 10,
      }}>
        <button
          onClick={() => nav('categoryFlash')}
          style={{
            width: '60%',
            padding: `${S(12)} ${S(16)}`,
            background: 'white',
            color: '#FF6B1A',
            fontWeight: 900, fontSize: S(11),
            border: 'none', borderRadius: S(12),
            cursor: 'pointer',
            letterSpacing: '0.04em',
            boxShadow: '0 3px 14px rgba(0,0,0,0.15)',
            fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.1s',
          }}
          onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.96)')}
          onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ⚡ JOUER EN MODE FLASH
        </button>
      </div>

      {/* ═══ ZONE 5 — NAV BAR ══════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-around',
        padding: `${S(4)} ${S(4)} ${S(10)}`,
        background: 'rgba(255,255,255,0.95)',
        flexShrink: 0,
        position: 'relative', zIndex: 10,
      }}>
        {[
          { slug: 'boutique',   label: 'Boutique',   target: 'boutique',   center: false },
          { slug: 'trophees',   label: 'Trophées',   target: 'trophees',   center: false },
          { slug: 'accueil',    label: 'Accueil',    target: null,         center: true  },
          { slug: 'amis',       label: 'Amis',       target: 'amis',       center: false },
          { slug: 'collection', label: 'Collection', target: 'collection', center: false },
        ].map((item) => {
          const isActive = item.center
          return (
            <button
              key={item.slug}
              onClick={() => item.target && nav(item.target)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(2),
                background: 'none', border: 'none',
                cursor: 'pointer', padding: `0 ${S(6)}`,
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {item.center ? (
                /* Accueil — surélevé, cercle orange */
                <div style={{
                  width: S(38), height: S(38), borderRadius: '50%',
                  background: '#FF6B1A',
                  border: '3px solid white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: S(-14),
                  boxShadow: '0 2px 10px rgba(255,107,26,0.4)',
                }}>
                  <img
                    src={`/assets/nav/${item.slug}.png`}
                    alt={item.label}
                    style={{ width: S(18), height: S(18), filter: 'brightness(0) invert(1)' }}
                  />
                </div>
              ) : (
                <img
                  src={`/assets/nav/${item.slug}.png`}
                  alt={item.label}
                  style={{
                    width: S(22), height: S(22),
                    opacity: 0.6,
                    transition: 'all 0.2s ease',
                  }}
                />
              )}
              <span style={{
                fontSize: S(10), fontWeight: 700,
                color: isActive ? '#FF6B1A' : '#666',
              }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ═══ MODAL COFFRE ══════════════════════════════════════════════════ */}
      {showCoffreModal && coffreReward && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowCoffreModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1a0e 100%)',
              border: '2px solid #FF6B1A',
              borderRadius: 24, padding: '32px 28px',
              textAlign: 'center', maxWidth: 300, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,107,26,0.25)',
              fontFamily: 'Nunito, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            <img src="/assets/ui/chest-open.png" alt="coffre" style={{ width: 64, height: 64, marginBottom: 12 }} />
            <div style={{
              fontSize: 20, fontWeight: 900, color: '#FFD700',
              marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Coffre du jour !
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'white', marginBottom: 24, lineHeight: 1.4 }}>
              {coffreReward.type === 'coins'
                ? `Tu as gagné ${coffreReward.amount} coins !`
                : `Tu as gagné ${coffreReward.amount} indice${coffreReward.amount > 1 ? 's' : ''} !`}
            </div>
            <button
              onClick={() => setShowCoffreModal(false)}
              style={{
                background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
                color: 'white', border: 'none',
                borderRadius: 16, padding: '13px 36px',
                fontWeight: 900, fontSize: 15, cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                boxShadow: '0 4px 16px rgba(255,107,26,0.45)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Super !
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

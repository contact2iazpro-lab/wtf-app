/**
 * HomeScreen v8 — Cleanup (tâche 5.1 Option 1).
 *
 * Zones : Header · Streak · Coffres · Mini-modes (Roulette/Flash/Quest) · Corps · Bouton Jouer · BottomNav
 *
 * Nettoyage par rapport à v7 :
 *  - `useDailyCoffre` → hook externe (`hooks/useDailyCoffre`)
 *  - `useCountdownToMidnight` → hook externe
 *  - Starburst rays → composant (`components/home/StarburstBackground`)
 *  - Modals Coffre/Accelerate/Badge → composants (`components/home/*Modal`)
 *  - Code mort supprimé : spotlight entier, lockToast, nextBadgeInfo, get24hProgress,
 *    canQuest/canBlitz/... (hardcodés à true), props dupliquées (playerCoins, etc.).
 *  - Props devises lues via `usePlayerProfile()` directement (source de vérité unique).
 */

import { useState, useEffect, forwardRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import BottomNav from '../components/BottomNav'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { readWtfData } from '../utils/storageHelper'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { ZONE_HEIGHTS, ICON_SIZES, ASSETS, GRID_CONFIG } from '../constants/layoutConfig'
import RouletteModal from '../components/RouletteModal'

// Composants/hooks extraits (5.1)
import { useDailyCoffre } from '../hooks/useDailyCoffre'
import { useCountdownToMidnight } from '../hooks/useCountdownToMidnight'
import StarburstBackground from '../components/home/StarburstBackground'
import CoffreRewardModal from '../components/home/CoffreRewardModal'
import CoffreAccelerateModal from '../components/home/CoffreAccelerateModal'
import NewBadgeModal from '../components/home/NewBadgeModal'

// ── Fond pastel aléatoire par session ─────────────────────────────────────────
const PASTEL_GRADIENTS = [
  'linear-gradient(160deg, #4a6fa5 0%, #6b8fc7 40%, #89a8d9 70%, #4a6fa5 100%)',
  'linear-gradient(160deg, #7b6b8a 0%, #9d8bab 40%, #b5a5c2 70%, #7b6b8a 100%)',
  'linear-gradient(160deg, #4a8a7b 0%, #6bab9d 40%, #89c2b5 70%, #4a8a7b 100%)',
  'linear-gradient(160deg, #8a6b6b 0%, #ab8d8d 40%, #c2a5a5 70%, #8a6b6b 100%)',
  'linear-gradient(160deg, #6b7b8a 0%, #8d9dab 40%, #a5b5c2 70%, #6b7b8a 100%)',
  'linear-gradient(160deg, #8a7b6b 0%, #ab9d8d 40%, #c2b5a5 70%, #8a7b6b 100%)',
  'linear-gradient(160deg, #6b8a7b 0%, #8dab9d 40%, #a5c2b5 70%, #6b8a7b 100%)',
  'linear-gradient(160deg, #7b6b7b 0%, #9d8d9d 40%, #b5a5b5 70%, #7b6b7b 100%)',
]

function getSessionBackground() {
  const key = 'wtf_session_bg_index'
  let idx = sessionStorage.getItem(key)
  if (idx === null) {
    idx = Math.floor(Math.random() * PASTEL_GRADIENTS.length)
    sessionStorage.setItem(key, String(idx))
  }
  return PASTEL_GRADIENTS[Number(idx)]
}

const HOME_BG_COLOR = getSessionBackground()
const S = (px) => `calc(${px}px * var(--scale))`

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomeScreen({
  currentStreak = 0,
  newlyEarnedBadges = [],
  onBadgeSeen = null,
  onNavigate,
  onOpenSettings,
  playerAvatar = null,
  socialNotifCount = 0,
  onResetSocialNotif,
  pendingChallengesCount = 0,
  snackEnergyRemaining = 3,
  dailyFactUnlocked = false,
}) {
  // Devises : source de vérité = usePlayerProfile (pas les props).
  const { coins, hints, applyCurrencyDelta, mergeFlags } = usePlayerProfile()

  // UI local
  const [showSettings, setShowSettings] = useState(false)
  const [coffreReward, setCoffreReward] = useState(null)       // modal "gains coffre"
  const [earlyCoffreTarget, setEarlyCoffreTarget] = useState(null) // modal "accélérer J+1"
  const [showRoulette, setShowRoulette] = useState(false)
  const [badgeToShow, setBadgeToShow] = useState(null)

  // Daily coffres
  const { coffres, todayIndex, getStatus, openCoffre, openEarly } = useDailyCoffre(applyCurrencyDelta, mergeFlags)

  const countdown = useCountdownToMidnight()
  const scale = useScale()

  // Affichage badge dès le retour Home avec newlyEarnedBadges
  useEffect(() => {
    if (newlyEarnedBadges.length > 0) {
      setBadgeToShow(newlyEarnedBadges[0])
    }
  }, [newlyEarnedBadges])

  // Musique de fond — démarre au premier clic (contourne l'autoplay block)
  useEffect(() => {
    if (!audio.musicEnabled) return
    audio.startMusic()
    const start = () => { if (audio.musicEnabled && !audio._playing) audio.startMusic() }
    document.addEventListener('click', start, { once: true })
    document.addEventListener('touchstart', start, { once: true })
    return () => {
      document.removeEventListener('click', start)
      document.removeEventListener('touchstart', start)
    }
  }, [])

  const nav = (target) => {
    audio.play?.('click')
    if (onNavigate) onNavigate(target)
  }

  const handleSettings = () => {
    audio.play?.('click')
    if (onOpenSettings) onOpenSettings()
    else setShowSettings(true)
  }

  const handleClaimCoffre = () => {
    audio.play?.('click')
    const reward = openCoffre()
    if (reward) setCoffreReward(reward)
  }

  const handleAccelerateConfirm = (cost) => {
    applyCurrencyDelta?.({ coins: -cost }, 'coffre_accelerate')?.catch?.(e =>
      console.warn('[HomeScreen] accelerate RPC failed:', e?.message || e)
    )
    const reward = openEarly(earlyCoffreTarget)
    setEarlyCoffreTarget(null)
    if (reward) setCoffreReward(reward)
  }

  const handleBadgeClose = () => {
    setBadgeToShow(null)
    onBadgeSeen?.()
  }

  // ── Mode icon (réutilisé 4× dans la grille 2×3) ───────────────────────────
  const ModeIcon = forwardRef(({ src, label, onClick }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      aria-label={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 0.1s',
        position: 'relative',
      }}
      onTouchStart={e => (e.currentTarget.style.transform = 'scale(0.92)')}
      onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <img
        src={src}
        alt={label}
        style={{
          width: S(ICON_SIZES.modeIcon), height: S(ICON_SIZES.modeIcon),
          objectFit: 'contain',
          flexShrink: 0,
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))',
        }}
      />
    </button>
  ))

  // ── Mini-bouton (Roulette / Flash / Quest) ──────────────────────────────
  const MiniBtn = ({ icon, label, badge, onClick }) => (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
        borderRadius: 12, padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 5,
        cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <img src={icon} alt={label} style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline', fontSize: S(13) }} />
      <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>{label}</span>
      {badge && (
        <span style={{
          fontSize: S(7), fontWeight: 900, color: '#FF6B1A',
          background: 'rgba(255,107,26,0.15)', borderRadius: 6, padding: '2px 5px',
        }}>{badge}</span>
      )}
    </button>
  )

  // Badges conditionnels pour les mini-boutons
  const rouletteBadge = (() => {
    const d = readWtfData()
    const today = new Date().toISOString().slice(0, 10)
    return d.rouletteFreeDate === today ? null : 'GRATUIT'
  })()
  const puzzleBadge = (() => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      return localStorage.getItem('wtf_puzzle_' + today) ? null : 'DAILY'
    } catch { return null }
  })()
  const questBadge = (() => {
    try {
      const d = readWtfData()
      const q = d.quest || d.route
      return `N${q?.level || 1}`
    } catch { return 'N1' }
  })()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100dvh', width: '100%',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        fontFamily: 'Nunito, sans-serif',
        '--scale': scale,
        background: HOME_BG_COLOR,
      }}
    >
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <style>{`
        @keyframes coffreSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes starburst-rotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>

      {/* Overlay bas — profondeur */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '40%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.25) 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ═══ ZONE 1 — HEADER ════════════════════════════════════ */}
      <div style={{
        height: ZONE_HEIGHTS.header, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 14px',
        position: 'relative', zIndex: 2,
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
          <img src={playerAvatar || '/assets/ui/avatar-default.png'} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </button>

        {/* Coins + Hints + Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: S(12) }}>
          {[
            { icon: '/assets/ui/icon-coins.png', value: coins },
            { icon: '/assets/ui/icon-hint.png', value: hints },
          ].map((pill, i) => (
            <button
              key={i}
              onClick={() => nav('boutique')}
              style={{
                display: 'flex', alignItems: 'center', gap: S(4),
                background: 'rgba(255,255,255,0.25)', borderRadius: S(20),
                padding: `${S(3)} ${S(10)}`, border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <img src={pill.icon} alt="" style={{ width: S(14), height: S(14), flexShrink: 0, objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{pill.value}</span>
            </button>
          ))}
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

      {/* ═══ ZONE 2 — STREAK + COUNTDOWN ═════════════════════ */}
      <div style={{
        height: ZONE_HEIGHTS.streak, flexShrink: 0,
        margin: '8px 14px 0',
        display: 'flex', alignItems: 'center', gap: 6,
        position: 'relative', zIndex: 2,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: currentStreak > 0 ? 'rgba(255,107,26,0.25)' : 'rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '4px 10px',
          ...(currentStreak >= 7 ? { boxShadow: '0 0 8px rgba(255,107,26,0.4)' } : {}),
        }}>
          <img src="/assets/ui/emoji-streak.png" alt="streak" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline', fontSize: 12 }} />
          <span style={{
            fontSize: S(11), fontWeight: 900,
            color: currentStreak > 0 ? '#FF6B1A' : 'rgba(255,255,255,0.4)',
          }}>
            {currentStreak} jour{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4,
        }}>
          <span style={{ fontSize: S(9), fontWeight: 700, color: 'white', opacity: 0.5, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Prochain coffre</span>
          <span style={{ fontSize: S(10), fontWeight: 800, color: 'white', opacity: 0.7, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{countdown}</span>
        </div>
      </div>

      {/* ═══ ZONE 3 — COFFRES QUOTIDIENS ═══════════════════════ */}
      <div style={{
        height: ZONE_HEIGHTS.coffres, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        gap: 2, padding: '6px 10px 0',
        justifyContent: 'center',
        position: 'relative', zIndex: 2,
        animation: 'coffreSlideIn 0.5s ease-out',
      }}>
        {coffres.map((c, i) => {
          const rawStatus = getStatus(i)
          const isSunday = i === 6
          const isTodaySunday = new Date().getDay() === 0
          // Dimanche considéré comme collecté si le f*ct VIP du jour est débloqué
          const status = (isSunday && dailyFactUnlocked) ? 'collected' : rawStatus
          const isAvail = status === 'available'
          const isColl = status === 'collected'
          const isMissed = status === 'missed'

          const isWtfDimanche = isSunday && isAvail && isTodaySunday && !dailyFactUnlocked

          if (isWtfDimanche) {
            return (
              <button
                key={i}
                onClick={() => { audio.play?.('click'); nav('wtfWeekly') }}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: S(2), padding: `${S(3)} ${S(1)}`,
                  borderRadius: S(6),
                  background: 'linear-gradient(135deg, rgba(255,107,26,0.4) 0%, rgba(255,107,26,0.2) 100%)',
                  border: '1px solid rgba(255,107,26,0.6)',
                  cursor: 'pointer',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span style={{ fontSize: S(24), lineHeight: 1 }}>🎁</span>
                <span style={{
                  fontSize: S(7), fontWeight: 800, lineHeight: 1,
                  color: '#FF6B1A', textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  textAlign: 'center', maxWidth: S(35),
                }}>VIP</span>
              </button>
            )
          }

          const chestSrc = isAvail
            ? '/assets/ui/chest-open.png'
            : isSunday && !isColl
              ? '/assets/ui/chest-trophy.png?v=2'
              : '/assets/ui/chest-locked.png'
          const canAccelerate = status === 'locked' && i === todayIndex + 1

          return (
            <button
              key={i}
              onClick={() => {
                if (isAvail) return handleClaimCoffre()
                if (canAccelerate) {
                  audio.play?.('click')
                  setEarlyCoffreTarget(i)
                }
              }}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: S(1), padding: `${S(3)} ${S(1)}`,
                borderRadius: S(6),
                background: isAvail ? 'rgba(255,255,255,0.4)' : canAccelerate ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.15)',
                border: `1px solid ${isAvail ? 'rgba(255,255,255,0.6)' : canAccelerate ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.08)'}`,
                cursor: isAvail || canAccelerate ? 'pointer' : 'default',
                opacity: isColl ? 0.35 : isMissed ? 0.25 : canAccelerate ? 0.85 : status === 'locked' ? 0.5 : 1,
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 0.2s, background 0.2s',
                position: 'relative',
              }}
            >
              <img
                src={chestSrc}
                alt={c.day}
                style={{ width: S(ICON_SIZES.coffreIcon), height: S(ICON_SIZES.coffreIcon), objectFit: 'contain', flexShrink: 0, display: 'block' }}
              />
              <span style={{ fontSize: S(7), fontWeight: 800, lineHeight: 1, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                {isColl ? '✓' : c.day}
              </span>
            </button>
          )
        })}
      </div>

      {/* ═══ ZONE 3B — ROULETTE (solo, Flash/Quest désormais dans la grille) ═══ */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: '4px 10px 0' }}>
        <MiniBtn icon="/assets/ui/emoji-roulette.png" label="Roulette" badge={rouletteBadge} onClick={() => { audio.play('click'); setShowRoulette(true) }} />
      </div>

      {/* ═══ ZONE 4 — CORPS PRINCIPAL (flex: 1) ════════════════════════════ */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: GRID_CONFIG.padding,
        position: 'relative',
      }}>
        <StarburstBackground />

        {/* LAYOUT PRINCIPAL — 3 zones (VoF / Grille modes / Énergie) */}
        <div style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
        }}>
          {/* VoF logo top */}
          <div style={{
            flex: 1, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={ASSETS.ui.vofLogo}
              alt="Vrai ou fou ?"
              style={{
                width: 'clamp(100px, 50%, 170px)', maxHeight: 45, height: 'auto',
                objectFit: 'contain', display: 'block', flexShrink: 0,
              }}
            />
          </div>

          {/* Grille modes 3 cols : 3 icônes à gauche / logo WTF central / 3 icônes à droite.
              Quest (ex-Route), Flash, Flash en plus de Snack/Snack/Blitz. */}
          <div style={{
            flex: 3, width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gridTemplateRows: '1fr 1fr 1fr',
            alignItems: 'center',
            justifyItems: 'center',
            padding: `0 ${S(4)}`,
            columnGap: S(8),
          }}>
            {/* Colonne gauche row 1 : Quest (ex-Route WTF!) — progression linéaire, boss VIP /10 */}
            <ModeIcon src="/assets/modes/quest.svg" label="Quest" onClick={() => nav('quest')} />

            {/* Logo WTF central (span 3 rows) */}
            <div style={{
              gridColumn: '2 / 3', gridRow: '1 / -1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img
                src={ASSETS.ui.wtfLogo}
                alt="WTF!"
                style={{
                  width: 'clamp(80px, 100%, 130px)', height: 'auto',
                  objectFit: 'contain', display: 'block',
                  filter: 'drop-shadow(0 3px 12px rgba(255,120,0,0.5))',
                  WebkitUserSelect: 'none', userSelect: 'none',
                  flexShrink: 0,
                }}
              />
            </div>
            {/* Colonne droite row 1 : Snack */}
            <ModeIcon src="/assets/modes/snack.svg" label="Snack" onClick={() => nav('snack')} />

            {/* Colonne gauche row 2 : Blitz */}
            <ModeIcon src="/assets/modes/blitz.svg" label="Blitz" onClick={() => nav('blitz')} />
            {/* Colonne droite row 2 : Flash (rendez-vous quotidien) */}
            <ModeIcon src="/assets/modes/flash.svg" label="Flash" onClick={() => nav('flash')} />

            {/* Row 3 : Marathon (survie) + Vrai ou Fou (swipe) */}
            <ModeIcon src="/assets/modes/marathon.svg" label="Marathon" onClick={() => nav('marathon')} />
            <ModeIcon src="/assets/modes/vrai-ou-fou.svg" label="Vrai ou Fou" onClick={() => nav('vrai_ou_fou')} />
          </div>

          {/* Énergie Snack (barre 5 segments) */}
          <div style={{
            flex: 1, width: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src="/assets/ui/emoji-energy.png" alt="energy" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline', fontSize: 14 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{
                    width: 16, height: 8, borderRadius: 4,
                    background: i < snackEnergyRemaining ? '#FF6B1A' : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s',
                    boxShadow: i < snackEnergyRemaining ? '0 0 6px rgba(255,107,26,0.4)' : 'none',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: snackEnergyRemaining > 0 ? 'rgba(255,255,255,0.7)' : '#EF4444' }}>
                {snackEnergyRemaining}/5
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ZONE 4B — BOUTON FLASH ═══════════════════════════ */}
      <div style={{
        height: ZONE_HEIGHTS.flashButton, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 50px',
        marginBottom: ZONE_HEIGHTS.flashButtonGap,
        position: 'relative', zIndex: 10,
      }}>
        <button
          onClick={() => nav('categoryFlash')}
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 100%)',
            borderRadius: 14, border: 'none',
            padding: '12px 24px', width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 6px 0 #c0c0c0, 0 8px 20px rgba(0,0,0,0.25)',
            transition: 'transform 0.1s, box-shadow 0.1s',
            position: 'relative',
          }}
          onTouchStart={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 2px 0 #c0c0c0, 0 3px 8px rgba(0,0,0,0.2)' }}
          onTouchEnd={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 #c0c0c0, 0 8px 20px rgba(0,0,0,0.25)' }}
          onMouseDown={e => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 2px 0 #c0c0c0, 0 3px 8px rgba(0,0,0,0.2)' }}
          onMouseUp={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 #c0c0c0, 0 8px 20px rgba(0,0,0,0.25)' }}
        >
          <img src="/assets/ui/level-wtf.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Fredoka One', cursive",
            fontWeight: 400, fontSize: 14, color: '#FF6B1A',
            letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.2,
          }}>
            Jouer
          </span>
          <img src="/assets/ui/level-wtf.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
        </button>
      </div>

      {/* ═══ ZONE 5 — NAVBAR ════════════════════════════ */}
      <BottomNav
        onResetSocialNotif={onResetSocialNotif}
        socialNotifCount={socialNotifCount}
        pendingChallengesCount={pendingChallengesCount}
        isHome={true}
      />

      {/* ═══ Modals ════════════════════════════════════════════════ */}
      {coffreReward && <CoffreRewardModal reward={coffreReward} onClose={() => setCoffreReward(null)} />}
      {earlyCoffreTarget !== null && (
        <CoffreAccelerateModal
          currentCoins={coins}
          onCancel={() => setEarlyCoffreTarget(null)}
          onConfirm={handleAccelerateConfirm}
        />
      )}
      {showRoulette && <RouletteModal onClose={() => setShowRoulette(false)} scale={scale} />}
      {badgeToShow && <NewBadgeModal badge={badgeToShow} onClose={handleBadgeClose} />}
    </div>
  )
}

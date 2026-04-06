/**
 * HomeScreen v7 — Refonte complète
 * 5 zones : Header · Badge · Coffres · Corps (3 cols) · Nav
 * Full screen, no scroll, useScale responsive
 */

import { useState, useEffect, useRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import ConnectBanner from '../components/ConnectBanner'
import { useAuth } from '../context/AuthContext'
import { readWtfData } from '../utils/storageHelper'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { getTutorialState, TUTORIAL_STATES } from '../utils/tutorialManager'
import { getNextBadge } from '../utils/badgeManager'
import { updateCoins, updateTickets, updateHints } from '../services/currencyService'

// ── Fond sombre fixe ─────────────────────────────────────────────────────────
const HOME_BG_COLOR = 'linear-gradient(160deg, #1a3a5c 0%, #1e4d7a 40%, #2a5f8f 70%, #1a3a5c 100%)'

// ── Coffre quotidien ──────────────────────────────────────────────────────────
const COFFRE_REWARDS = [
  { day: 'L', reward: { type: 'coins', amount: 5 } },
  { day: 'M', reward: { type: 'coins', amount: 5 } },
  { day: 'M', reward: { type: 'coins', amount: 5 } },
  { day: 'J', reward: { type: 'hints', amount: 1 } },
  { day: 'V', reward: { type: 'coins', amount: 10 } },
  { day: 'S', reward: { type: 'hints', amount: 1 } },
  { day: 'D', reward: { type: 'coins', amount: 15, bonus: { type: 'tickets', amount: 1 } } },
]

function getWeekStart() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
  return monday.toISOString().slice(0, 10)
}

function useDailyCoffre() {
  const now = new Date()
  const todayIndex = now.getDay() === 0 ? 6 : now.getDay() - 1 // lundi=0 ... dimanche=6
  const weekStart = getWeekStart()

  const read = () => {
    const wtfData = readWtfData()
    let claimedDays = wtfData.coffreClaimedDays || []
    const storedWeekStart = wtfData.coffreWeekStart || ''
    if (storedWeekStart !== weekStart) claimedDays = [] // nouvelle semaine
    return { claimedDays, weekStart }
  }

  const [coffreData, setCoffreData] = useState(read)

  const getStatus = (i) => {
    const { claimedDays } = coffreData
    if (claimedDays.includes(i)) return 'collected'
    if (i === todayIndex) return 'available'
    if (i < todayIndex) return 'missed'
    return 'locked'
  }

  const openCoffre = () => {
    if (coffreData.claimedDays.includes(todayIndex)) return null
    const newClaimed = [...coffreData.claimedDays, todayIndex]
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wtfData.coffreClaimedDays = newClaimed
    wtfData.coffreWeekStart = weekStart
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
    setCoffreData({ claimedDays: newClaimed, weekStart })
    const coffreConfig = COFFRE_REWARDS[todayIndex]
    applyCofreReward(coffreConfig.reward)
    if (coffreConfig.reward.bonus) applyCofreReward(coffreConfig.reward.bonus)
    return coffreConfig.reward
  }

  return { coffres: COFFRE_REWARDS, todayIndex, getStatus, openCoffre }
}

function applyCofreReward(reward) {
  try {
    if (reward.type === 'coins') updateCoins(reward.amount)
    else if (reward.type === 'hints') updateHints(reward.amount)
    else if (reward.type === 'tickets') updateTickets(reward.amount)
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
  playerTickets = 0,
  dailyQuestsRemaining = 3,
  currentStreak = 0,
  newlyEarnedBadges = [],
  onBadgeSeen = null,
  onNavigate,
  onOpenSettings,
  playerAvatar = null,
  gamesPlayed = 0,
  onModeSeen,
}) {
  const { isConnected } = useAuth()
  const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
  const isTestMode = localStorage.getItem('wtf_test_mode') === 'true'

  // ⚠️ PHASE TEST — désactiver l'onboarding progressif (tous modes visibles)
  // Remettre à false avant le lancement en production
  const SKIP_PROGRESSIVE_UNLOCK = true

  // Onboarding progressif — paliers de déverrouillage
  const effectiveGames = (isDevMode || isTestMode) ? 999 : gamesPlayed
  const unlockLevel = SKIP_PROGRESSIVE_UNLOCK ? 'veteran' : (
    effectiveGames >= 50 ? 'veteran'
    : effectiveGames >= 20 ? 'expert'
    : effectiveGames >= 10 ? 'advanced'
    : effectiveGames >= 5 ? 'intermediate'
    : effectiveGames >= 2 ? 'beginner'
    : 'newbie'
  )

  const seenModes = (() => {
    try { return readWtfData().seenModes || [] } catch { return [] }
  })()

  const modeVisible = {
    flash: true,
    quest: unlockLevel !== 'newbie',
    explorer: ['intermediate','advanced','expert','veteran'].includes(unlockLevel),
    blitz: ['advanced','expert','veteran'].includes(unlockLevel),
    hunt: ['expert','veteran'].includes(unlockLevel),
    serie: ['intermediate','advanced','expert','veteran'].includes(unlockLevel),
    multi: ['expert','veteran'].includes(unlockLevel),
  }

  const modeIsNew = (modeId) => modeVisible[modeId] && !seenModes.includes(modeId)
  const [showSettings, setShowSettings] = useState(false)
  const [showCoffreModal, setShowCoffreModal] = useState(false)
  const [coffreReward, setCoffreReward] = useState(null)
  const [showConnectBanner, setShowConnectBanner] = useState(false)
  const { coffres, todayIndex, getStatus, openCoffre } = useDailyCoffre()
  const [nextBadgeInfo, setNextBadgeInfo] = useState(() => getNextBadge())
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [badgeToShow, setBadgeToShow] = useState(null)

  // Show badge modal when returning to HomeScreen with new badges
  useEffect(() => {
    if (newlyEarnedBadges.length > 0) {
      setBadgeToShow(newlyEarnedBadges[0])
      setShowBadgeModal(true)
    }
  }, [newlyEarnedBadges])

  // Refresh next badge info on mount
  useEffect(() => { setNextBadgeInfo(getNextBadge()) }, [])
  const countdown = useCountdownToMidnight()
  const progress24h = get24hProgress()
  const scale = useScale()
  const textColor = '#ffffff'
  const textShadow = '0 1px 4px rgba(0,0,0,0.3)'

  // ── Musique de fond — démarre au premier clic (contourne l'autoplay block) ─
  useEffect(() => {
    if (!audio.musicEnabled) return
    // Tenter de démarrer immédiatement (fonctionne si le joueur a déjà interagi)
    audio.startMusic()
    // Fallback : au premier clic/tap, démarrer la musique
    const start = () => { if (audio.musicEnabled && !audio._playing) audio.startMusic() }
    document.addEventListener('click', start, { once: true })
    document.addEventListener('touchstart', start, { once: true })
    return () => {
      document.removeEventListener('click', start)
      document.removeEventListener('touchstart', start)
    }
  }, [])

  // ── Spotlight Flash — quand tutorial_state === HOME_DISCOVERED ─────────────
  const flashBtnRef = useRef(null)
  const [showFlashSpotlight, setShowFlashSpotlight] = useState(false)
  const [spotRect, setSpotRect] = useState(null)

  // ── Spotlight Quest — quand tutorial_state === FLASH_DONE ─────────────────
  const questBtnRef = useRef(null)
  const [showQuestSpotlight, setShowQuestSpotlight] = useState(false)
  const [questSpotRect, setQuestSpotRect] = useState(null)

  useEffect(() => {
    getTutorialState().then(state => {
      if (state === TUTORIAL_STATES.HOME_DISCOVERED) {
        setShowFlashSpotlight(true)
      } else if (state === TUTORIAL_STATES.FLASH_DONE) {
        setShowQuestSpotlight(true)
      }
    })
  }, [])

  useEffect(() => {
    if (!showFlashSpotlight || !flashBtnRef.current) return
    const pad = 10
    const timer = setTimeout(() => {
      const r = flashBtnRef.current.getBoundingClientRect()
      setSpotRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
    }, 300)
    return () => clearTimeout(timer)
  }, [showFlashSpotlight])

  useEffect(() => {
    if (!showQuestSpotlight || !questBtnRef.current) return
    const pad = 10
    const timer = setTimeout(() => {
      const r = questBtnRef.current.getBoundingClientRect()
      setQuestSpotRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
    }, 300)
    return () => clearTimeout(timer)
  }, [showQuestSpotlight])

  const nav = (target) => {
    audio.play?.('click')
    if (onNavigate) onNavigate(target)
  }

  const handleModeTap = (modeId, navTarget) => {
    if (modeIsNew(modeId) && onModeSeen) onModeSeen(modeId)
    nav(navTarget)
  }

  const handleSettings = () => {
    audio.play?.('click')
    if (onOpenSettings) onOpenSettings()
    else setShowSettings(true)
  }

  // ── Mode icon component ────────────────────────────────────────────────────
  const ModeIcon = ({ src, label, onClick, disabled, locked }) => {
    const dimmed = disabled || locked
    return (
      <button
        onClick={dimmed && !locked ? undefined : onClick}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S(3),
          background: 'none', border: 'none', padding: 0,
          cursor: dimmed && !locked ? 'default' : 'pointer',
          WebkitTapHighlightColor: 'transparent',
          opacity: disabled ? 0.4 : locked ? 0.5 : 1,
          filter: disabled ? 'grayscale(0.5)' : 'none',
          transition: 'transform 0.1s',
          position: 'relative',
        }}
        onTouchStart={e => !dimmed && (e.currentTarget.style.transform = 'scale(0.92)')}
        onTouchEnd={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        <div style={{ position: 'relative' }}>
          <img
            src={src}
            alt={label}
            style={{
              width: S(48), height: S(48),
              borderRadius: '50%',
              overflow: 'hidden',
              objectFit: 'cover',
              flexShrink: 0,
              boxShadow: dimmed ? 'none' : '0 2px 8px rgba(0,0,0,0.2)',
            }}
          />
          {locked && (
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 18, height: 18, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: '1.5px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9,
            }}>🔒</div>
          )}
        </div>
        <span style={{
          fontFamily: "'Fredoka One', cursive",
          fontSize: 9, fontWeight: 400, color: 'white',
          textAlign: 'center', lineHeight: 1.2,
          letterSpacing: '0.5px',
          maxWidth: 70, wordWrap: 'break-word',
          whiteSpace: 'normal',
          marginTop: 3,
          opacity: dimmed ? 0.5 : 1,
          textShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}>{label}</span>
        {disabled && (
          <span style={{
            fontSize: S(6), fontWeight: 700, color: 'white', opacity: 0.6,
            marginTop: S(-2),
          }}>Bientôt</span>
        )}
      </button>
    )
  }

  const NewBadge = () => (
    <div style={{
      position: 'absolute', top: -4, right: -4,
      background: '#EF4444', color: 'white',
      fontSize: 7, fontWeight: 900, lineHeight: 1,
      padding: '2px 5px', borderRadius: 6,
      border: '1.5px solid white',
      animation: 'newBadgePulse 1.2s ease-in-out infinite',
      zIndex: 5, letterSpacing: '0.5px',
      fontFamily: 'Nunito, sans-serif',
      whiteSpace: 'nowrap',
    }}>NEW</div>
  )

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

      {/* Spotlight Flash — quand tutorial_state === HOME_DISCOVERED */}
      {showFlashSpotlight && spotRect && (
        <>
          {/* Trou découpé */}
          <div style={{
            position: 'fixed',
            top: spotRect.top, left: spotRect.left,
            width: spotRect.width, height: spotRect.height,
            borderRadius: 16, background: 'transparent',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
            zIndex: 100, pointerEvents: 'none',
            transition: 'all 0.6s ease',
          }} />
          {/* Doigt animé */}
          <div style={{
            position: 'fixed',
            top: spotRect.top + spotRect.height + 8,
            left: spotRect.left + spotRect.width / 2,
            transform: 'translateX(-50%)',
            fontSize: 32, zIndex: 102, pointerEvents: 'none',
            animation: 'homeFingerBounce 0.8s ease-in-out infinite',
          }}>👆</div>
          {/* Texte guide */}
          <div style={{
            position: 'fixed',
            bottom: 'clamp(24px, 5vh, 48px)',
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 102, textAlign: 'center',
          }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 14, fontWeight: 800, padding: '8px 20px', borderRadius: 12, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
              Lance ta première partie ! 🎮
            </div>
          </div>
        </>
      )}

      {/* Spotlight Quest — quand tutorial_state === FLASH_DONE */}
      {showQuestSpotlight && questSpotRect && (
        <>
          <div style={{
            position: 'fixed',
            top: questSpotRect.top, left: questSpotRect.left,
            width: questSpotRect.width, height: questSpotRect.height,
            borderRadius: 16, background: 'transparent',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
            zIndex: 100, pointerEvents: 'none',
            transition: 'all 0.6s ease',
          }} />
          <div style={{
            position: 'fixed',
            top: questSpotRect.top + questSpotRect.height + 8,
            left: questSpotRect.left + questSpotRect.width / 2,
            transform: 'translateX(-50%)',
            fontSize: 32, zIndex: 102, pointerEvents: 'none',
            animation: 'homeFingerBounce 0.8s ease-in-out infinite',
          }}>👆</div>
          <div style={{
            position: 'fixed',
            bottom: 'clamp(24px, 5vh, 48px)',
            left: '50%', transform: 'translateX(-50%)',
            zIndex: 102, textAlign: 'center',
          }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 14, fontWeight: 800, padding: '8px 20px', borderRadius: 12, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
              Tu as un ticket ! Découvre les WTF! les plus dingues 🏆
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes homeFingerBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px); }
        }
        @keyframes newBadgePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.85; }
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

      {/* ═══ ZONE 1 — HEADER (44px fixe) ════════════════════════════════════ */}
      <div style={{
        height: 44, flexShrink: 0,
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
            <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{playerTickets}</span>
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
            <img src="/assets/ui/icon-hint.png" alt="hints" style={{ width: S(14), height: S(14), objectFit: 'contain', flexShrink: 0 }} />
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

      {/* ═══ ZONE 2 — STREAK + COUNTDOWN (32px fixe) ═════════════════════ */}
      <div style={{
        height: 32, flexShrink: 0,
        margin: '8px 14px 0',
        display: 'flex', alignItems: 'center', gap: 6,
        position: 'relative', zIndex: 2,
      }}>
        {/* Streak badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: currentStreak > 0 ? 'rgba(255,107,26,0.25)' : 'rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '4px 10px',
          ...(currentStreak >= 7 ? { boxShadow: '0 0 8px rgba(255,107,26,0.4)' } : {}),
        }}>
          <span style={{ fontSize: 12 }}>🔥</span>
          <span style={{
            fontSize: S(11), fontWeight: 900,
            color: currentStreak > 0 ? '#FF6B1A' : 'rgba(255,255,255,0.4)',
          }}>
            {currentStreak} jour{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>
        {/* Countdown prochain coffre */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: 4,
        }}>
          <span style={{ fontSize: S(9), fontWeight: 700, color: textColor, opacity: 0.5, textShadow }}>Prochain coffre</span>
          <span style={{ fontSize: S(10), fontWeight: 800, color: textColor, opacity: 0.7, textShadow }}>{countdown}</span>
        </div>
      </div>

      {/* ═══ ZONE 2B — PROCHAIN BADGE (28px fixe) ═════════════════════════ */}
      <div style={{
        height: 28, flexShrink: 0,
        margin: '4px 14px 0',
        background: 'rgba(255,255,255,0.15)',
        borderRadius: 8, padding: '0 10px',
        display: 'flex', alignItems: 'center',
        position: 'relative', zIndex: 2,
      }}>
        {nextBadgeInfo ? (
          <>
            <span style={{ fontSize: S(10), fontWeight: 700, color: textColor, textShadow, flexShrink: 0, whiteSpace: 'nowrap' }}>
              {nextBadgeInfo.badge.emoji} {nextBadgeInfo.badge.label}
            </span>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 2, height: 4, margin: '0 8px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${nextBadgeInfo.progress}%`, background: 'white', borderRadius: 2, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: S(10), fontWeight: 700, color: textColor, opacity: 0.7, textShadow, flexShrink: 0 }}>
              {nextBadgeInfo.current}/{nextBadgeInfo.target}
            </span>
          </>
        ) : (
          <span style={{ fontSize: S(10), fontWeight: 800, color: '#FFD700', textShadow, flex: 1, textAlign: 'center' }}>
            🏆 Tous les badges débloqués !
          </span>
        )}
      </div>

      {/* ═══ ZONE 3 — COFFRES QUOTIDIENS (60px fixe) ═══════════════════════ */}
      <div style={{
        height: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        gap: 2, padding: '6px 10px 0',
        justifyContent: 'center',
        position: 'relative', zIndex: 2,
      }}>
        {coffres.map((c, i) => {
          const status = getStatus(i)
          const isAvail = status === 'available'
          const isColl = status === 'collected'
          const isMissed = status === 'missed'
          const isSunday = i === 6

          const chestSrc = isAvail
            ? '/assets/ui/chest-open.png'
            : isSunday && !isColl
              ? '/assets/ui/chest-trophy.png?v=2'
              : '/assets/ui/chest-locked.png'

          return (
            <button
              key={i}
              onClick={() => {
                if (!isAvail) return
                audio.play?.('click')
                const reward = openCoffre()
                if (reward) {
                  setCoffreReward(reward)
                  setShowCoffreModal(true)
                }
              }}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: S(1), padding: `${S(3)} ${S(1)}`,
                borderRadius: S(6),
                background: isAvail ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
                border: `1px solid ${isAvail ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.08)'}`,
                cursor: isAvail ? 'pointer' : 'default',
                opacity: isColl ? 0.35 : isMissed ? 0.25 : status === 'locked' ? 0.5 : 1,
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 0.2s, background 0.2s',
              }}
            >
              <img
                src={chestSrc}
                alt={c.day}
                style={{ width: S(28), height: S(28), objectFit: 'contain', flexShrink: 0, background: 'transparent', display: 'block' }}
              />
              <span style={{
                fontSize: S(7), fontWeight: 800, lineHeight: 1,
                color: textColor, textShadow,
              }}>
                {isColl ? '✓' : c.day}
              </span>
            </button>
          )
        })}
      </div>

      {/* ═══ ZONE 3B — LOGO VOF (fixe, juste sous les coffres) ════════════ */}
      <div style={{
        flexShrink: 0, display: 'flex', justifyContent: 'center',
        padding: '8px 0 0',
      }}>
        <img
          src="/assets/ui/vof-logo.png?v=4"
          alt="Vrai ou fou ?"
          style={{
            width: 170, maxHeight: 45, height: 'auto',
            objectFit: 'contain', display: 'block',
          }}
        />
      </div>

      {/* ═══ ZONE 4 — CORPS PRINCIPAL (flex: 1) ════════════════════════════ */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'row',
        padding: '0 10px',
        position: 'relative',
      }}>
        {/* Starburst light rays — tailles aléatoires avec halo */}
        {(() => {
          const rays = [
            { angle: 0, len: 140, w: 3, op: 0.5 },
            { angle: 15, len: 180, w: 2, op: 0.35 },
            { angle: 28, len: 120, w: 4, op: 0.45 },
            { angle: 45, len: 170, w: 2.5, op: 0.4 },
            { angle: 58, len: 110, w: 3, op: 0.3 },
            { angle: 72, len: 190, w: 2, op: 0.5 },
            { angle: 88, len: 130, w: 3.5, op: 0.35 },
            { angle: 100, len: 160, w: 2, op: 0.45 },
            { angle: 115, len: 200, w: 3, op: 0.4 },
            { angle: 130, len: 100, w: 2.5, op: 0.3 },
            { angle: 142, len: 175, w: 2, op: 0.5 },
            { angle: 158, len: 125, w: 4, op: 0.35 },
            { angle: 170, len: 185, w: 2, op: 0.45 },
            { angle: 185, len: 145, w: 3, op: 0.4 },
            { angle: 198, len: 165, w: 2.5, op: 0.5 },
            { angle: 212, len: 115, w: 3, op: 0.35 },
            { angle: 225, len: 195, w: 2, op: 0.45 },
            { angle: 240, len: 135, w: 3.5, op: 0.3 },
            { angle: 252, len: 180, w: 2, op: 0.5 },
            { angle: 268, len: 105, w: 3, op: 0.4 },
            { angle: 280, len: 170, w: 2.5, op: 0.35 },
            { angle: 295, len: 150, w: 2, op: 0.45 },
            { angle: 308, len: 190, w: 3, op: 0.5 },
            { angle: 322, len: 120, w: 4, op: 0.3 },
            { angle: 338, len: 160, w: 2, op: 0.4 },
            { angle: 350, len: 185, w: 2.5, op: 0.45 },
          ]
          return (
            <div style={{
              position: 'absolute',
              width: 400, height: 400,
              top: '38%', left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 0,
              animation: 'starburst-rotate 40s linear infinite',
            }}>
              {rays.map((r, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  top: '50%', left: '50%',
                  width: r.len,
                  height: r.w * 4,
                  transformOrigin: '0 50%',
                  transform: `rotate(${r.angle}deg)`,
                  background: `linear-gradient(90deg, rgba(255,255,255,${r.op}) 0%, rgba(79,195,247,${r.op * 0.6}) 40%, transparent 100%)`,
                  borderRadius: r.w * 4,
                  filter: `blur(${r.w * 1.5}px)`,
                }} />
              ))}
            </div>
          )
        })()}

        {/* Colonne gauche — 70px */}
        <div style={{
          width: 70, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-evenly', alignItems: 'center',
          height: '100%', zIndex: 1,
        }}>
          <div ref={questBtnRef} style={{ position: 'relative', zIndex: showQuestSpotlight ? 101 : 'auto', ...(!modeVisible.quest ? { opacity: 0, pointerEvents: 'none' } : {}) }}>
            {modeIsNew('quest') && <NewBadge />}
            <ModeIcon src="/assets/modes/quete.png" label="Quest" onClick={() => { setShowQuestSpotlight(false); handleModeTap('quest', 'difficulty') }} />
          </div>
          <div style={{ position: 'relative', ...(!modeVisible.serie ? { opacity: 0, pointerEvents: 'none' } : {}) }}>
            {modeIsNew('serie') && <NewBadge />}
            <ModeIcon src="/assets/modes/serie.png" label="Série" onClick={() => handleModeTap('serie', 'trophees')} />
          </div>
          <div style={{ position: 'relative', ...(!modeVisible.hunt ? { opacity: 0, pointerEvents: 'none' } : {}) }}>
            {modeIsNew('hunt') && <NewBadge />}
            <ModeIcon src="/assets/modes/wtf-semaine.png" label="Hunt" onClick={() => handleModeTap('hunt', 'wtfDuJour')} />
          </div>
        </div>

        {/* Colonne centre — flex: 1 */}
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-evenly', alignItems: 'center',
          height: '100%', position: 'relative', zIndex: 1,
        }}>
          {/* 1. Logo WTF */}
          <img
            src="/assets/ui/wtf-logo.png?v=4"
            alt="WTF!"
            style={{
              width: '55%', maxWidth: 130, height: 'auto',
              objectFit: 'contain', display: 'block',
              filter: 'drop-shadow(0 3px 12px rgba(255,120,0,0.5))',
              position: 'relative', zIndex: 1,
              WebkitUserSelect: 'none', userSelect: 'none',
              transform: 'scale(1)',
              transition: 'transform 0.3s ease',
            }}
          />

          {/* 2. Tagline */}
          <img
            src="/assets/ui/100logo.png?v=5"
            alt="Des f*cts 100% vrais, des réactions 100% fun !"
            style={{
              width: '70%', maxWidth: 180, height: 'auto',
              objectFit: 'contain', display: 'block',
              position: 'relative', zIndex: 1,
            }}
          />
        </div>

        {/* Colonne droite — 70px */}
        <div style={{
          width: 70, flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-evenly', alignItems: 'center',
          height: '100%', zIndex: 1,
        }}>
          <div style={{ position: 'relative', ...(!modeVisible.explorer ? { opacity: 0, pointerEvents: 'none' } : {}) }}>
            {modeIsNew('explorer') && <NewBadge />}
            <ModeIcon src="/assets/modes/marathon.png" label="Explorer" onClick={() => handleModeTap('explorer', 'marathon')} />
          </div>
          <div style={{ position: 'relative', ...(!modeVisible.multi ? { opacity: 0, pointerEvents: 'none' } : {}) }}>
            {modeIsNew('multi') && <NewBadge />}
            <ModeIcon src="/assets/modes/multi.png" label="Multi" onClick={() => handleModeTap('multi', 'amis')} />
          </div>
          <div style={{ position: 'relative', ...(!modeVisible.blitz ? { opacity: 0, pointerEvents: 'none' } : {}) }}>
            {modeIsNew('blitz') && <NewBadge />}
            <ModeIcon src="/assets/modes/blitz.png" label="Blitz" onClick={() => handleModeTap('blitz', 'blitz')} />
          </div>
        </div>
      </div>

      {/* ═══ ZONE 4B — BOUTON FLASH (48px fixe) ═══════════════════════════ */}
      <div style={{
        height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 50px',
        marginBottom: 34,
        position: 'relative', zIndex: showFlashSpotlight ? 101 : 10,
      }}>
        <button
          ref={flashBtnRef}
          onClick={() => { setShowFlashSpotlight(false); nav('categoryFlash') }}
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
            Jouer une partie rapide
          </span>
          <img src="/assets/ui/level-wtf.png" alt="" style={{ width: 26, height: 26, objectFit: 'contain', flexShrink: 0 }} />
        </button>
      </div>

      {/* ═══ ZONE 5 — NAV BAR ══════════════════════════════════════════════ */}
      <div style={{
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-around',
        padding: `${S(4)} ${S(4)} ${S(6)}`,
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
              {coffreReward.type === 'coins' && coffreReward.bonus
                ? `Tu as gagné ${coffreReward.amount} coins et ${coffreReward.bonus.amount} ticket ! 🎉`
                : coffreReward.type === 'coins'
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

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}


      {/* ═══ MODAL NOUVEAU BADGE ════════════════════════════════════════════ */}
      {showBadgeModal && badgeToShow && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => { setShowBadgeModal(false); setNextBadgeInfo(getNextBadge()); onBadgeSeen?.() }}
        >
          <div
            style={{
              background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1a0e 100%)',
              border: '2px solid #FFD700',
              borderRadius: 24, padding: '32px 28px',
              textAlign: 'center', maxWidth: 300, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,215,0,0.25)',
              fontFamily: 'Nunito, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>{badgeToShow.emoji}</div>
            <div style={{
              fontSize: 20, fontWeight: 900, color: '#FFD700',
              marginBottom: 10, letterSpacing: '0.05em',
            }}>
              Badge débloqué ! 🎉
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 24 }}>
              {badgeToShow.label}
            </div>
            <button
              onClick={() => { setShowBadgeModal(false); setNextBadgeInfo(getNextBadge()); onBadgeSeen?.() }}
              style={{
                background: 'linear-gradient(135deg, #FF6B1A 0%, #FF8C42 100%)',
                color: 'white', border: 'none',
                borderRadius: 16, padding: '13px 36px',
                fontWeight: 900, fontSize: 15, cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                boxShadow: '0 4px 16px rgba(255,107,26,0.45)',
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

/**
 * HomeScreen v7 — Refonte complète
 * 5 zones : Header · Badge · Coffres · Corps (3 cols) · Nav
 * Full screen, no scroll, useScale responsive
 */

import { useState, useEffect, useRef, forwardRef } from 'react'
import SettingsModal from '../components/SettingsModal'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../context/AuthContext'
import { useUnlock } from '../context/UnlockContext'
import { useCurrency } from '../context/CurrencyContext'
import { readWtfData } from '../utils/storageHelper'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { getNextBadge } from '../utils/badgeManager'
import { updateCoins, updateTickets, updateHints } from '../services/currencyService'
import { ZONE_HEIGHTS, GRID_CONFIG, ICON_SIZES, ASSETS, UNLOCK_MESSAGES, SPOTLIGHT_MESSAGES, THEME } from '../constants/layoutConfig'
import RouletteModal from '../components/RouletteModal'

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

  // Re-lire localStorage à chaque sync externe (retour depuis une autre page,
  // achat boutique qui touche wtf_data, dev mode, etc.). Fix le bug où un coffre
  // déjà ouvert réapparaît "jouable" après navigation.
  useEffect(() => {
    const refresh = () => setCoffreData(read())
    window.addEventListener('wtf_storage_sync', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener('wtf_storage_sync', refresh)
      window.removeEventListener('focus', refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Ouvre un coffre futur (J+1) moyennant un paiement en coins
  const openEarly = (index) => {
    if (coffreData.claimedDays.includes(index)) return null
    const newClaimed = [...coffreData.claimedDays, index]
    const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wtfData.coffreClaimedDays = newClaimed
    wtfData.coffreWeekStart = weekStart
    wtfData.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wtfData))
    setCoffreData({ claimedDays: newClaimed, weekStart })
    const coffreConfig = COFFRE_REWARDS[index]
    applyCofreReward(coffreConfig.reward)
    if (coffreConfig.reward.bonus) applyCofreReward(coffreConfig.reward.bonus)
    return coffreConfig.reward
  }

  return { coffres: COFFRE_REWARDS, todayIndex, getStatus, openCoffre, openEarly }
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
  unlockedFactsCount = 0,
  blitzPlayed = 0,
  questsPlayed = 0,
  onModeSeen,
  socialNotifCount = 0,
  onResetSocialNotif,
  pendingChallengesCount = 0,
  flashEnergyRemaining = 3,
  dailyFactUnlocked = false,
}) {
  const { isConnected } = useAuth()
  const { coins: _cCoins, tickets: _cTickets, hints: _cHints } = useCurrency()
  const isDevMode = localStorage.getItem('wtf_dev_mode') === 'true'
  const isTestMode = localStorage.getItem('wtf_test_mode') === 'true'

  const markSeen = (key) => {
    try {
      const d = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      d[key] = true
      d.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(d))
    } catch {}
  }

  // UnlockContext désactivé — tout est déverrouillé (onboarding sera réimplémenté plus tard)
  const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
  const isDevOrTest = isDevMode || isTestMode

  // Tous les modes et pages sont déverrouillés (onboarding gérera le verrouillage plus tard)
  const canQuest = true
  const canBlitz = true
  const canHunt = true
  const canExplorer = true
  const canMulti = true
  const canSerie = true
  const canBoutique = true
  const canTrophees = true
  const canCollection = true
  const canAmis = true

  // UI feature display (from context)
  const showStreakDisplay = true
  const showBadgeDisplay = true
  const showCoffresDisplay = true

  // Use messages from layoutConfig (imported at top)
  // Spotlight désactivé — tout est déverrouillé
  const activeSpotlight = null
  const setActiveSpotlight = () => {}

  const seenModes = (() => {
    try { return readWtfData().seenModes || [] } catch { return [] }
  })()

  const modeIsNew = (modeId) => !seenModes.includes(modeId)

  // Logique de pulse basée sur statsByMode (nb de fois joué en mode spécifique = 0)
  const questsPlayedInMode = wtfData.statsByMode?.parcours?.gamesPlayed || 0
  const blitzPlayedInMode = wtfData.statsByMode?.blitz?.gamesPlayed || 0
  const explorerPlayedInMode = wtfData.statsByMode?.flash_solo?.gamesPlayed || 0
  const [showSettings, setShowSettings] = useState(false)
  const [showCoffreModal, setShowCoffreModal] = useState(false)
  const [coffreReward, setCoffreReward] = useState(null)
  const [lockToast, setLockToast] = useState(null)

  const showLockToast = (message) => {
    setLockToast(message)
    setTimeout(() => setLockToast(null), 2500)
  }
  const { coffres, todayIndex, getStatus, openCoffre, openEarly } = useDailyCoffre()
  const [earlyCoffreTarget, setEarlyCoffreTarget] = useState(null)
  const [nextBadgeInfo, setNextBadgeInfo] = useState(() => getNextBadge())
  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [showRoulette, setShowRoulette] = useState(false)
  const [badgeToShow, setBadgeToShow] = useState(null)

  // Show badge modal when returning to HomeScreen with new badges
  useEffect(() => {
    if (newlyEarnedBadges.length > 0) {
      setBadgeToShow(newlyEarnedBadges[0])
      setShowBadgeModal(true)
    }
  }, [newlyEarnedBadges, gamesPlayed])

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

  // ── Spotlight unique basé sur hasSeenX ────────────────────────────────────
  const flashBtnRef = useRef(null)
  const questBtnRef = useRef(null)
  const collectionNavRef = useRef(null)
  const coffreZoneRef = useRef(null)
  const boutiqueNavRef = useRef(null)
  const blitzBtnRef = useRef(null)
  // activeSpotlight désormais toujours null (défini plus haut)
  const [spotlightRect, setSpotlightRect] = useState(null)

  useEffect(() => {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    const devOrTest = localStorage.getItem('wtf_dev_mode') === 'true' || localStorage.getItem('wtf_test_mode') === 'true'
    const gp = wd.gamesPlayed || 0
    const qp = wd.statsByMode?.parcours?.gamesPlayed || 0
    const ufc = (wd.unlockedFacts || []).length
    // tutoPhase supprimé — sera dans TutoTunnel
    if (false) {
    } else {
      setActiveSpotlight(null)
    }
  }, [])

  const dismissSpotlight = (name) => {
    const wd = JSON.parse(localStorage.getItem('wtf_data') || '{}')
    wd[`hasSeen${name.charAt(0).toUpperCase() + name.slice(1)}`] = true
    wd.lastModified = Date.now()
    localStorage.setItem('wtf_data', JSON.stringify(wd))
    setActiveSpotlight(null)
  }

  const spotlightRefs = {
    flash: flashBtnRef,
    quest: questBtnRef,
    collection: collectionNavRef,
    boutique: boutiqueNavRef,
    blitz: blitzBtnRef,
  }

  useEffect(() => {
    if (!activeSpotlight) { setSpotlightRect(null); return }
    const ref = spotlightRefs[activeSpotlight]
    if (!ref?.current) { setSpotlightRect(null); return }
    const pad = 10
    const timer = setTimeout(() => {
      const r = ref.current.getBoundingClientRect()
      setSpotlightRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
    }, 300)
    return () => clearTimeout(timer)
  }, [activeSpotlight])

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
  // Le label n'est PAS rendu visuellement (le nom est intégré à l'icône)
  // mais il reste utilisé comme `alt` pour l'accessibilité.
  const ModeIcon = forwardRef(({ src, label, onClick, disabled, locked }, ref) => {
    const dimmed = disabled || locked
    return (
      <button
        ref={ref}
        onClick={dimmed && !locked ? undefined : onClick}
        aria-label={label}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
              width: S(ICON_SIZES.modeIcon), height: S(ICON_SIZES.modeIcon),
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
        {disabled && (
          <span style={{
            fontSize: S(6), fontWeight: 700, color: 'white', opacity: 0.6,
            marginTop: S(-2),
          }}>Bientôt</span>
        )}
      </button>
    )
  })

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

      {/* Spotlight unique — basé sur hasSeenX */}
      {activeSpotlight && spotlightRect && (
        <>
          <div style={{
            position: 'fixed',
            top: spotlightRect.top, left: spotlightRect.left,
            width: spotlightRect.width, height: spotlightRect.height,
            borderRadius: 16, background: 'transparent',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
            zIndex: 100, pointerEvents: 'none',
            transition: 'all 0.6s ease',
          }} />
          <div style={{
            position: 'fixed',
            top: spotlightRect.top + spotlightRect.height + 8,
            left: spotlightRect.left + spotlightRect.width / 2,
            transform: 'translateX(-50%)',
            fontSize: 32, zIndex: 102, pointerEvents: 'none',
            animation: 'homeFingerBounce 0.8s ease-in-out infinite',
          }}>👆</div>
          <div style={{
            position: 'fixed',
            top: '55%', left: '50%', transform: 'translateX(-50%)',
            zIndex: 102, textAlign: 'center',
          }}>
            <div style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 14, fontWeight: 800, padding: '8px 20px', borderRadius: 12, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
              {spotlightMessages[activeSpotlight]}
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
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,26,0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px 8px rgba(255,107,26,0.3); }
        }
        @keyframes coffreSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lockToastFade {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          10% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; }
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
            <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{_cCoins}</span>
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
            <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{_cTickets}</span>
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
            <span style={{ fontWeight: 800, color: 'white', fontSize: S(11), whiteSpace: 'nowrap' }}>{_cHints}</span>
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

      {/* ═══ ZONE 2 — STREAK + COUNTDOWN ═════════════════════ */}
      {showStreakDisplay && (
      <div style={{
        height: ZONE_HEIGHTS.streak, flexShrink: 0,
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
      )}


      {/* ═══ ZONE 3 — COFFRES QUOTIDIENS ═══════════════════════ */}
      {showCoffresDisplay && (
      <div ref={coffreZoneRef} style={{
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
          const isToday = new Date().getDay() === 0 // 0 = dimanche
          // Dimanche : considéré comme collecté si le f*ct VIP du jour est débloqué
          const status = (isSunday && dailyFactUnlocked) ? 'collected' : rawStatus
          const isAvail = status === 'available'
          const isColl = status === 'collected'
          const isMissed = status === 'missed'

          // Special case: dimanche et disponible → affiche WTF du Dimanche
          const isWtfDimanche = isSunday && isAvail && isToday && !dailyFactUnlocked

          const chestSrc = isAvail
            ? '/assets/ui/chest-open.png'
            : isSunday && !isColl
              ? '/assets/ui/chest-trophy.png?v=2'
              : '/assets/ui/chest-locked.png'

          // Si c'est WTF du Dimanche: bouton spécial
          if (isWtfDimanche) {
            return (
              <button
                key={i}
                onClick={() => {
                  audio.play?.('click')
                  markSeen('hasSeenHunt')
                  nav('wtfDuJour')
                }}
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
                  transition: 'all 0.2s',
                }}
              >
                <span style={{
                  fontSize: S(24), lineHeight: 1,
                }}>🎁</span>
                <span style={{
                  fontSize: S(7), fontWeight: 800, lineHeight: 1,
                  color: '#FF6B1A', textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  textAlign: 'center', maxWidth: S(35),
                }}>
                  VIP
                </span>
              </button>
            )
          }

          // Sinon: coffre normal
          const canAccelerate = status === 'locked' && i === todayIndex + 1
          return (
            <button
              key={i}
              onClick={() => {
                if (isAvail) {
                  audio.play?.('click')
                  const reward = openCoffre()
                  if (reward) {
                    setCoffreReward(reward)
                    setShowCoffreModal(true)
                  }
                  return
                }
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
                style={{ width: S(ICON_SIZES.coffreIcon), height: S(ICON_SIZES.coffreIcon), objectFit: 'contain', flexShrink: 0, background: 'transparent', display: 'block' }}
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
      )}

      {/* ═══ ZONE 3B — ROULETTE + PUZZLE + ROUTE ═══════════════════════ */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', gap: 6, padding: '4px 10px 0', flexWrap: 'wrap' }}>
        <button
          onClick={() => { audio.play('click'); setShowRoulette(true) }}
          style={{
            background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: 12, padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: S(13) }}>🎰</span>
          <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>Roulette</span>
          {!readWtfData().rouletteFreeDate || readWtfData().rouletteFreeDate !== new Date().toISOString().slice(0, 10) ? (
            <span style={{
              fontSize: S(7), fontWeight: 900, color: '#FF6B1A',
              background: 'rgba(255,107,26,0.15)', borderRadius: 6, padding: '2px 5px',
            }}>GRATUIT</span>
          ) : null}
        </button>
        <button
          onClick={() => { audio.play('click'); nav('puzzle') }}
          style={{
            background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: 12, padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: S(13) }}>🧩</span>
          <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>Puzzle</span>
          {(() => {
            try {
              const today = new Date().toISOString().slice(0, 10)
              const done = !!localStorage.getItem('wtf_puzzle_' + today)
              return done ? null : (
                <span style={{
                  fontSize: S(7), fontWeight: 900, color: '#FF6B1A',
                  background: 'rgba(255,107,26,0.15)', borderRadius: 6, padding: '2px 5px',
                }}>DAILY</span>
              )
            } catch { return null }
          })()}
        </button>
        <button
          onClick={() => { audio.play('click'); nav('route') }}
          style={{
            background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: 12, padding: '6px 12px',
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: S(13) }}>🗺️</span>
          <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>Route</span>
          {(() => {
            try {
              const r = readWtfData().route
              const lvl = r?.level || 1
              return (
                <span style={{
                  fontSize: S(7), fontWeight: 900, color: '#FF6B1A',
                  background: 'rgba(255,107,26,0.15)', borderRadius: 6, padding: '2px 5px',
                }}>N{lvl}</span>
              )
            } catch { return null }
          })()}
        </button>
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
        {/* Starburst light rays — CENTRÉ ABSOLUMENT */}
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
              top: '50%', left: '50%',
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
                  background: `linear-gradient(90deg, rgba(255,255,255,${r.op}) 0%, rgba(255,255,255,${r.op * 0.6}) 40%, transparent 100%)`,
                  borderRadius: r.w * 4,
                  filter: `blur(${r.w * 1.5}px)`,
                }} />
              ))}
            </div>
          )
        })()}

        {/* LAYOUT PRINCIPAL — 5 zones équidistantes */}
        <div style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
        }}>

          {/* ZONE 1 — VoF */}
          <div style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src={ASSETS.ui.vofLogo}
              alt="Vrai ou fou ?"
              style={{
                width: 'clamp(100px, 50%, 170px)', maxHeight: 45, height: 'auto',
                objectFit: 'contain', display: 'block',
                flexShrink: 0,
              }}
            />
          </div>

          {/* ZONE 2-4 — Grille modes + logo central */}
          <div style={{
            flex: 3,
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr auto 1fr',
            alignItems: 'center',
            justifyItems: 'center',
            padding: `0 ${S(4)}`,
          }}>
            {/* Row 1: Explorer (left) — Blitz (right) */}
            <div style={{
              zIndex: 1,
              ...(canExplorer && explorerPlayedInMode === 0 ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
              position: 'relative',
            }}>
              {canExplorer && explorerPlayedInMode === 0 && <NewBadge />}
              <ModeIcon src="/assets/modes/marathon.png" label="Explorer" locked={false} onClick={() => { nav('explorer') }} />
            </div>
            <div style={{
              zIndex: activeSpotlight === 'blitz' ? 101 : 1,
              ...(canBlitz && blitzPlayedInMode === 0 ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
              position: 'relative',
            }}>
              {canBlitz && blitzPlayedInMode === 0 && <NewBadge />}
              <ModeIcon ref={blitzBtnRef} src="/assets/modes/blitz.png" label="Blitz" locked={false} onClick={() => { markSeen('hasSeenBlitz'); nav('blitz') }} />
            </div>

            {/* Row 2: Logo WTF central (spans 2 columns) */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: `${S(8)} 0` }}>
              <img
                src={ASSETS.ui.wtfLogo}
                alt="WTF!"
                style={{
                  width: 'clamp(80px, 55%, 130px)', height: 'auto',
                  objectFit: 'contain', display: 'block',
                  filter: 'drop-shadow(0 3px 12px rgba(255,120,0,0.5))',
                  WebkitUserSelect: 'none', userSelect: 'none',
                  flexShrink: 0,
                }}
              />
            </div>

            {/* Row 3: Quest (left) — Multi (right) */}
            <div style={{
              zIndex: activeSpotlight === 'quest' ? 101 : 1,
              ...(canQuest && questsPlayedInMode === 0 ? { animation: 'pulse 1.5s ease-in-out infinite' } : {}),
              position: 'relative',
            }}>
              {canQuest && questsPlayedInMode === 0 && <NewBadge />}
              <ModeIcon ref={questBtnRef} src="/assets/modes/quete.png" label="Quest" locked={false} onClick={() => { markSeen('hasSeenQuest'); nav('difficulty') }} />
            </div>
            <div style={{
              zIndex: 1,
              position: 'relative',
            }}>
              {canMulti && modeIsNew('multi') && <NewBadge />}
              <ModeIcon src="/assets/modes/multi.png" label="Multi" locked={false} onClick={() => { nav('amis') }} />
            </div>
          </div>

          {/* ZONE 5 — Énergie Jouer */}
          <div style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔋</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 28, height: 8, borderRadius: 4,
                    background: i < flashEnergyRemaining ? '#FF6B1A' : 'rgba(255,255,255,0.15)',
                    transition: 'background 0.3s',
                    boxShadow: i < flashEnergyRemaining ? '0 0 6px rgba(255,107,26,0.4)' : 'none',
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: flashEnergyRemaining > 0 ? 'rgba(255,255,255,0.7)' : '#EF4444' }}>
                {flashEnergyRemaining}/3
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
        position: 'relative', zIndex: activeSpotlight === 'flash' ? 101 : 10,
        opacity: activeSpotlight && activeSpotlight !== 'flash' ? 0.3 : 1,
        pointerEvents: activeSpotlight && activeSpotlight !== 'flash' ? 'none' : 'auto',
        transition: 'opacity 0.3s ease',
      }}>
        <button
          ref={flashBtnRef}
          onClick={() => { nav('categoryFlash') }}
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

      {/* ═══ ZONE 5 — NAVBAR (via BottomNav unifiée) ════════════════════════════ */}
      <BottomNav
        activeSpotlight={activeSpotlight}
        dismissSpotlight={dismissSpotlight}
        onResetSocialNotif={onResetSocialNotif}
        socialNotifCount={socialNotifCount}
        pendingChallengesCount={pendingChallengesCount}
        collectionNavRef={collectionNavRef}
        boutiqueNavRef={boutiqueNavRef}
        isHome={true}
        onShowLockToast={showLockToast}
      />

      {/* ═══ MODAL COFFRE ══════════════════════════════════════════════════ */}
      {showCoffreModal && coffreReward && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowCoffreModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 24, padding: 32,
              textAlign: 'center', maxWidth: 340, width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              fontFamily: 'Nunito, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            <img src="/assets/ui/chest-open.png" alt="coffre" style={{ width: 48, height: 48, marginBottom: 16 }} />
            <div style={{
              fontSize: 18, fontWeight: 700, color: '#1a1a2e',
              marginBottom: 12, lineHeight: 1.4,
            }}>
              Coffre du jour !
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 24, lineHeight: 1.4 }}>
              {coffreReward.type === 'coins' && coffreReward.bonus
                ? `Tu as gagné ${coffreReward.amount} coins et ${coffreReward.bonus.amount} ticket ! 🎉`
                : coffreReward.type === 'coins'
                  ? `Tu as gagné ${coffreReward.amount} coins !`
                  : `Tu as gagné ${coffreReward.amount} indice${coffreReward.amount > 1 ? 's' : ''} !`}
            </div>
            <button
              onClick={() => setShowCoffreModal(false)}
              style={{
                background: '#FF6B1A',
                color: 'white', border: 'none',
                borderRadius: 16, padding: '14px 0',
                width: '100%', fontWeight: 900, fontSize: 16, cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              Super !
            </button>
          </div>
        </div>
      )}

      {/* ═══ MODAL ACCÉLÉRER COFFRE J+1 ═══════════════════════════════════ */}
      {earlyCoffreTarget !== null && (() => {
        const ACCELERATE_COST = 15
        const canAfford = _cCoins >= ACCELERATE_COST
        return (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setEarlyCoffreTarget(null)}
          >
            <div
              style={{
                background: 'white',
                borderRadius: 24, padding: 28,
                textAlign: 'center', maxWidth: 340, width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                fontFamily: 'Nunito, sans-serif',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: 44, marginBottom: 8 }}>⏩</div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', marginBottom: 6 }}>
                Ouvrir le coffre de demain ?
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16, lineHeight: 1.4 }}>
                Tu auras ta récompense tout de suite, mais plus de coffre à ouvrir demain.
              </div>
              <div style={{
                background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: 12,
                padding: '10px 16px', marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>Coût</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#FF6B1A', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {ACCELERATE_COST}<img src="/assets/ui/icon-coins.png" alt="" style={{ width: 16, height: 16 }} />
                </span>
              </div>
              {!canAfford && (
                <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginBottom: 10 }}>
                  Pas assez de coins ({_cCoins} 🪙)
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setEarlyCoffreTarget(null)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: '#F3F4F6', border: '1px solid #E5E7EB',
                    color: '#6B7280', fontWeight: 800, fontSize: 14,
                    cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  Annuler
                </button>
                <button
                  disabled={!canAfford}
                  onClick={() => {
                    if (!canAfford) return
                    updateCoins(-ACCELERATE_COST)
                    const reward = openEarly(earlyCoffreTarget)
                    setEarlyCoffreTarget(null)
                    if (reward) {
                      setCoffreReward(reward)
                      setShowCoffreModal(true)
                    }
                  }}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12,
                    background: canAfford ? 'linear-gradient(135deg, #FFD700, #FFA500)' : '#E5E7EB',
                    color: canAfford ? '#1a1a2e' : '#9CA3AF',
                    border: 'none', fontWeight: 900, fontSize: 14,
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontFamily: 'Nunito, sans-serif',
                  }}
                >
                  Ouvrir
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ═══ MODAL ROULETTE ════════════════════════════════════════════════ */}
      {showRoulette && (
        <RouletteModal
          onClose={() => setShowRoulette(false)}
          scale={scale}
        />
      )}

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
              background: '#fff',
              borderRadius: 24, padding: '32px 28px',
              textAlign: 'center', maxWidth: 300, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              fontFamily: 'Nunito, sans-serif',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 48, marginBottom: 12, lineHeight: 1 }}>{badgeToShow.emoji}</div>
            <div style={{
              fontSize: 20, fontWeight: 900, color: '#FF6B1A',
              marginBottom: 10, letterSpacing: '0.05em',
            }}>
              Badge débloqué ! 🎉
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', marginBottom: 24 }}>
              {badgeToShow.label}
            </div>
            <button
              onClick={() => { setShowBadgeModal(false); setNextBadgeInfo(getNextBadge()); onBadgeSeen?.() }}
              style={{
                background: '#FF6B1A',
                color: 'white', border: 'none',
                borderRadius: 16, padding: '13px 36px',
                fontWeight: 900, fontSize: 15, cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
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

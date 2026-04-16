/**
 * HomeScreen v10 — Refonte layout (prompt HOMESCREEN_REFONTE).
 * Zones : Header (avatar+coins+hints+batterie+settings) · Streak palier+jauge
 *         · Cerveaux (4 paliers) · Bandeau Roulette+Flash · Logo+Grille 6 · Partie rapide · BottomNav
 */

import { useState, useEffect, useMemo } from 'react'
import SettingsModal from '../components/SettingsModal'
import BottomNav from '../components/BottomNav'
import ModeIcon from '../components/ModeIcon'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { readWtfData } from '../utils/storageHelper'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { ASSETS } from '../constants/layoutConfig'
import { STREAK_PALIERS } from '../constants/gameConfig'
import RouletteModal from '../components/RouletteModal'

import { useStreakRewards } from '../hooks/useStreakRewards'
import { useCountdownToMidnight } from '../hooks/useCountdownToMidnight'
import StarburstBackground from '../components/home/StarburstBackground'
import CoffreRewardModal from '../components/home/CoffreRewardModal'
import NewBadgeModal from '../components/home/NewBadgeModal'

const HOME_BG_COLOR = [
  'radial-gradient(circle 200px at 50% 45%, rgba(255,225,100,0.55) 0%, rgba(255,200,60,0.28) 35%, rgba(255,170,40,0.10) 65%, transparent 85%)',
  'radial-gradient(ellipse 75% 55% at 50% 45%, rgba(255,190,50,0.14) 0%, transparent 70%)',
  'radial-gradient(ellipse 90% 55% at 50% 105%, rgba(90,25,90,0.50) 0%, transparent 65%)',
  'radial-gradient(ellipse 135% 115% at 50% 50%, transparent 38%, rgba(0,0,0,0.65) 100%)',
  '#1A3A8A',
].join(', ')

const S = (px) => `calc(${px}px * var(--scale))`

const BRAIN_STYLES = {
  3:  { emoji: '🧠', filter: 'grayscale(0.6) brightness(0.8)', label: 'Débutant' },
  7:  { emoji: '🧠', filter: 'saturate(1.4) brightness(1.1) hue-rotate(-10deg)', label: 'Habitué' },
  14: { emoji: '🧠', filter: 'saturate(1.8) brightness(1.2) hue-rotate(20deg)', label: 'Fidèle' },
  30: { emoji: '👑', filter: 'saturate(1.5) brightness(1.3) drop-shadow(0 0 4px gold)', label: 'Légende' },
}

function getBatteryColor(remaining) {
  if (remaining >= 5) return '#22C55E'
  if (remaining >= 4) return '#86EFAC'
  if (remaining >= 3) return '#FACC15'
  if (remaining >= 2) return '#F97316'
  if (remaining >= 1) return '#EF4444'
  return '#EF4444'
}

function getCurrentPalier(streak) {
  let current = null
  for (const p of STREAK_PALIERS) {
    if (streak >= p.day) current = p
  }
  return current
}

function getNextPalier(streak) {
  for (const p of STREAK_PALIERS) {
    if (streak < p.day) return p
  }
  return null
}

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
  quickieEnergyRemaining = 3,
}) {
  const { coins, hints, applyCurrencyDelta, mergeFlags } = usePlayerProfile()

  const [showSettings, setShowSettings] = useState(false)
  const [coffreReward, setCoffreReward] = useState(null)
  const [showRoulette, setShowRoulette] = useState(false)
  const [badgeToShow, setBadgeToShow] = useState(null)

  const { paliers, currentStreak: streakVal, getStatus, claim } = useStreakRewards(applyCurrencyDelta, mergeFlags)
  const countdown = useCountdownToMidnight()
  const scale = useScale()

  useEffect(() => {
    if (newlyEarnedBadges.length > 0) setBadgeToShow(newlyEarnedBadges[0])
  }, [newlyEarnedBadges])

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

  const nav = (target) => { audio.play?.('click'); onNavigate?.(target) }
  const handleSettings = () => { audio.play?.('click'); onOpenSettings ? onOpenSettings() : setShowSettings(true) }
  const handleClaimPalier = (day) => { audio.play?.('click'); const r = claim(day); if (r) setCoffreReward(r) }
  const handleBadgeClose = () => { setBadgeToShow(null); onBadgeSeen?.() }

  const rouletteBadge = useMemo(() => {
    const d = readWtfData()
    const today = new Date().toISOString().slice(0, 10)
    return d.rouletteFreeDate === today ? null : 'GRATUIT'
  }, [])

  const isSunday = new Date().getDay() === 0
  const currentPalier = getCurrentPalier(currentStreak)
  const nextPalier = getNextPalier(currentStreak)
  const progressToNext = nextPalier
    ? Math.min(1, currentStreak / nextPalier.day)
    : 1
  const palierColor = currentPalier
    ? { 3: '#9CA3AF', 7: '#F472B6', 14: '#F97316', 30: '#FFD700' }[currentPalier.day] || '#9CA3AF'
    : '#9CA3AF'

  const batteryColor = getBatteryColor(quickieEnergyRemaining)

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100%', width: '100%',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'Nunito, sans-serif',
        '--scale': scale,
        background: HOME_BG_COLOR,
      }}
    >
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <StarburstBackground />

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ═══ HEADER — avatar + coins + hints + batterie + settings ═══ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `${S(10)} ${S(14)} 0`,
        position: 'relative', zIndex: 2,
      }}>
        <button
          onClick={() => nav('profil')}
          style={{
            width: S(36), height: S(36), borderRadius: '50%',
            background: 'rgba(255,255,255,0.3)', border: '2px solid rgba(255,255,255,0.5)',
            padding: 0, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <img src={playerAvatar || '/assets/ui/avatar-default.png'} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: S(8) }}>
          {[
            { icon: '/assets/ui/icon-coins.png', value: coins },
            { icon: '/assets/ui/icon-hint.png', value: hints },
          ].map((pill, i) => (
            <button
              key={i} onClick={() => nav('boutique')}
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

          {/* Batterie énergie */}
          <button
            onClick={() => nav('boutique')}
            style={{
              display: 'flex', alignItems: 'center', gap: S(3),
              background: 'rgba(255,255,255,0.25)', borderRadius: S(20),
              padding: `${S(3)} ${S(8)}`, border: 'none', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{
              width: S(18), height: S(10), borderRadius: 2,
              border: `1.5px solid ${batteryColor}`,
              position: 'relative', display: 'flex', alignItems: 'center', padding: 1,
            }}>
              <div style={{
                width: `${(quickieEnergyRemaining / 5) * 100}%`, height: '100%',
                background: batteryColor, borderRadius: 1,
                transition: 'width 0.3s, background 0.3s',
              }} />
              <div style={{
                position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)',
                width: 2, height: S(5), background: batteryColor, borderRadius: '0 1px 1px 0',
              }} />
            </div>
            <span style={{ fontWeight: 800, color: batteryColor, fontSize: S(10) }}>
              {quickieEnergyRemaining}
            </span>
          </button>

          <button
            onClick={handleSettings}
            style={{
              width: S(28), height: S(28), borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', border: 'none', padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img src="/assets/ui/icon-settings.png" alt="settings" style={{ width: S(16), height: S(16) }} />
          </button>
        </div>
      </div>

      {/* ═══ STREAK PALIER + JAUGE ═══ */}
      <div style={{
        flexShrink: 0,
        margin: `${S(6)} ${S(14)} 0`,
        display: 'flex', flexDirection: 'column', gap: S(4),
        position: 'relative', zIndex: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src="/assets/ui/emoji-streak.png" alt="streak" style={{ width: '1em', height: '1em', fontSize: 13 }} />
            <span style={{ fontSize: S(11), fontWeight: 900, color: palierColor }}>
              {currentPalier ? currentPalier.name : `${currentStreak}j`}
            </span>
            <span style={{ fontSize: S(9), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
              {currentStreak}j
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: S(9), fontWeight: 700, color: 'white', opacity: 0.5 }}>
              {nextPalier ? `→ ${nextPalier.name}` : '🏆 Max'}
            </span>
            <span style={{ fontSize: S(9), fontWeight: 800, color: 'white', opacity: 0.7 }}>{countdown}</span>
          </div>
        </div>
        {/* Jauge de progression vers prochain palier */}
        <div style={{
          width: '100%', height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressToNext * 100}%`, height: '100%',
            background: palierColor,
            borderRadius: 2,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* ═══ CERVEAUX (4 paliers) ═══ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center',
        gap: S(6), padding: `${S(6)} ${S(10)} 0`,
        justifyContent: 'center',
        position: 'relative', zIndex: 2,
      }}>
        {paliers.map((p) => {
          const status = getStatus(p.day)
          const isAvail = status === 'available'
          const isClaimed = status === 'claimed'
          const brain = BRAIN_STYLES[p.day] || BRAIN_STYLES[3]
          return (
            <button
              key={p.day}
              onClick={() => { if (isAvail) handleClaimPalier(p.day) }}
              disabled={!isAvail}
              style={{
                flex: 1, minWidth: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: S(2), padding: `${S(4)} ${S(2)}`,
                borderRadius: S(8),
                background: isAvail
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.35) 0%, rgba(255,107,26,0.2) 100%)'
                  : 'rgba(255,255,255,0.08)',
                border: `1px solid ${isAvail ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.08)'}`,
                cursor: isAvail ? 'pointer' : 'default',
                opacity: isClaimed ? 0.35 : 1,
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 0.2s, background 0.2s',
              }}
            >
              <span style={{
                fontSize: S(22),
                filter: isClaimed ? 'grayscale(1) brightness(0.5)' : brain.filter,
                lineHeight: 1,
              }}>
                {brain.emoji}
              </span>
              <span style={{ fontSize: S(8), fontWeight: 900, lineHeight: 1, color: isAvail ? '#FFD700' : 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)', textAlign: 'center' }}>
                {isClaimed ? '✓' : brain.label}
              </span>
              <span style={{ fontSize: S(7), fontWeight: 700, lineHeight: 1, color: 'white', opacity: 0.5 }}>J{p.day}</span>
            </button>
          )
        })}
      </div>

      {/* ═══ BANDEAU QUOTIDIEN — Roulette + Flash côte à côte ═══ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', gap: S(8),
        padding: `${S(6)} ${S(14)} 0`,
        position: 'relative', zIndex: 2,
      }}>
        <button
          onClick={() => { audio.play('click'); setShowRoulette(true) }}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)',
            borderRadius: S(10), padding: `${S(8)} ${S(6)}`,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: S(14) }}>🎰</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>Roulette</span>
            {rouletteBadge && (
              <span style={{ fontSize: S(7), fontWeight: 900, color: '#22C55E', letterSpacing: '0.04em' }}>{rouletteBadge}</span>
            )}
          </div>
        </button>

        <button
          onClick={() => nav('flash')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.2)',
            borderRadius: S(10), padding: `${S(8)} ${S(6)}`,
            cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: S(14) }}>{isSunday ? '🏆' : '⚡'}</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>
              {isSunday ? 'Hunt VIP' : 'Flash du jour'}
            </span>
            <span style={{ fontSize: S(7), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>1×/jour</span>
          </div>
        </button>
      </div>

      {/* ═══ ZONE CENTRALE — logo réduit + grille 6 modes ═══ */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${S(10)}`,
        position: 'relative', zIndex: 1,
        gap: S(8),
      }}>
        {/* Logo WTF réduit ~30% */}
        <img
          src={ASSETS.ui.wtfLogo}
          alt="WTF!"
          style={{
            width: 'clamp(60px, 24vw, 100px)', height: 'auto',
            objectFit: 'contain', flexShrink: 0,
            filter: 'drop-shadow(0 3px 12px rgba(255,120,0,0.5))',
            WebkitUserSelect: 'none', userSelect: 'none',
          }}
        />

        {/* Grille 3×2 des 6 modes */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'auto auto',
          gap: S(12),
          justifyItems: 'center',
          alignItems: 'center',
          width: '100%',
          maxWidth: S(280),
        }}>
          <ModeIcon icon="/assets/modes/quickie.png" name="Quickie" color="#7F77DD" onClick={() => nav('quickie')} />
          <ModeIcon icon="/assets/modes/quest.svg" name="Quest" color="#FF6B1A" onClick={() => nav('quest')} />
          <ModeIcon icon="/assets/modes/flash.svg" name="Flash" color="#E91E63" onClick={() => nav('flash')} />
          <ModeIcon icon="/assets/modes/vrai-ou-fou.svg" name="Vrai ou Fou" color="#9B59B6" onClick={() => nav('vrai_ou_fou')} />
          <ModeIcon icon="/assets/modes/no-limit.svg" name="No Limit" color="#E84535" onClick={() => nav('no_limit')} />
          <ModeIcon icon="/assets/modes/blitz.svg" name="Blitz" color="#FF4444" onClick={() => nav('blitz')} />
        </div>
      </div>

      {/* ═══ BOUTON PARTIE RAPIDE ═══ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: `0 ${S(40)} ${S(10)}`,
        position: 'relative', zIndex: 10,
      }}>
        <button
          onClick={() => nav('quickie')}
          className="btn-press"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #e8e8e8 100%)',
            borderRadius: S(14), border: 'none',
            padding: `${S(12)} ${S(24)}`, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(8),
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 6px 0 #c0c0c0, 0 8px 20px rgba(0,0,0,0.25)',
          }}
        >
          <img src="/assets/modes/quickie.png" alt="" style={{ width: S(22), height: S(22), objectFit: 'contain', flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Fredoka One', cursive",
            fontWeight: 400, fontSize: S(14), color: '#7F77DD',
            letterSpacing: '0.04em', textAlign: 'center', lineHeight: 1.2,
          }}>
            Partie rapide
          </span>
        </button>
      </div>

      {/* ═══ NAVBAR ═══ */}
      <BottomNav
        onResetSocialNotif={onResetSocialNotif}
        socialNotifCount={socialNotifCount}
        pendingChallengesCount={pendingChallengesCount}
        isHome={true}
      />

      {/* ═══ Modals ═══ */}
      {coffreReward && <CoffreRewardModal reward={coffreReward} onClose={() => setCoffreReward(null)} />}
      {showRoulette && <RouletteModal onClose={() => setShowRoulette(false)} scale={scale} />}
      {badgeToShow && <NewBadgeModal badge={badgeToShow} onClose={handleBadgeClose} />}
    </div>
  )
}

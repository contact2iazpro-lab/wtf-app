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
// ASSETS retiré — logo WTF remplacé par logo VOF
import { STREAK_PALIERS } from '../constants/gameConfig'
import RouletteModal from '../components/RouletteModal'

import { useStreakRewards } from '../hooks/useStreakRewards'
import { useCountdownToMidnight } from '../hooks/useCountdownToMidnight'
// StarburstBackground retiré — fond uni sans rayons
import CoffreRewardModal from '../components/home/CoffreRewardModal'
import NewBadgeModal from '../components/home/NewBadgeModal'
import BatteryIcon from '../components/home/BatteryIcon'

const HOME_BG_COLOR = [
  'radial-gradient(ellipse 90% 55% at 50% 105%, rgba(107,45,142,0.40) 0%, transparent 65%)',
  'radial-gradient(ellipse 135% 115% at 50% 50%, transparent 38%, rgba(0,0,0,0.50) 100%)',
  '#3B5BA5',
].join(', ')

const S = (px) => `calc(${px}px * var(--scale))`

const BRAIN_STYLES = {
  3:  { img: '/assets/brain-beginner.png?v=2', label: 'Débutant' },
  7:  { img: '/assets/brain-regular.png?v=2', label: 'Habitué' },
  14: { img: '/assets/brain-loyal.png?v=2', label: 'Fidèle' },
  30: { img: '/assets/brain-legend.png?v=2', label: 'Légende' },
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
  }, [showRoulette])

  const isSunday = new Date().getDay() === 0
  const currentPalier = getCurrentPalier(currentStreak)
  const nextPalier = getNextPalier(currentStreak)
  const progressToNext = nextPalier
    ? Math.min(1, currentStreak / nextPalier.day)
    : 1
  const palierColor = currentPalier
    ? { 3: '#9CA3AF', 7: '#F472B6', 14: '#F97316', 30: '#FFD700' }[currentPalier.day] || '#9CA3AF'
    : '#9CA3AF'


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

      {/* Overlay dégradé bas */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ═══════════════════════════════════════════════════════
          ZONE HAUTE — fixe, ne scrolle pas, ne grandit pas
          ═══════════════════════════════════════════════════════ */}
      <div style={{ flexShrink: 0, position: 'relative', zIndex: 2 }}>

        {/* HEADER — avatar + devises + settings */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${S(10)} ${S(14)} 0`,
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
              { icon: '/assets/ui/icon-hint.png?v=2', value: hints },
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
            <button
              onClick={() => nav('boutique')}
              style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.25)', borderRadius: S(20),
                padding: `${S(3)} ${S(8)}`, border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <BatteryIcon level={quickieEnergyRemaining} />
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

        {/* STREAK — palier + jauge */}
        <div style={{ margin: `${S(6)} ${S(14)} 0`, display: 'flex', flexDirection: 'column', gap: S(4) }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src="/assets/ui/emoji-streak.png" alt="streak" style={{ width: '1em', height: '1em', fontSize: 13 }} />
              <span style={{ fontSize: S(11), fontWeight: 900, color: palierColor }}>
                {currentPalier ? currentPalier.name : `${currentStreak}j`}
              </span>
              {currentPalier && (
                <span style={{ fontSize: S(9), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{currentStreak}j</span>
              )}
            </div>
            <span style={{ fontSize: S(9), fontWeight: 700, color: 'white', opacity: 0.5 }}>
              {nextPalier ? `→ ${nextPalier.name} dans ${nextPalier.day - currentStreak}j` : '🏆 Max'}
            </span>
          </div>
          <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
            <div style={{ width: `${progressToNext * 100}%`, height: '100%', background: palierColor, borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* CERVEAUX — 4 paliers en ligne, sans cadres */}
        <div style={{ display: 'flex', alignItems: 'center', gap: S(6), padding: `${S(6)} ${S(10)} 0`, justifyContent: 'center' }}>
          {paliers.map((p) => {
            const status = getStatus(p.day)
            const isAvail = status === 'available'
            const isClaimed = status === 'claimed'
            const isReached = currentStreak >= p.day
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
                  background: 'none', border: 'none',
                  cursor: isAvail ? 'pointer' : 'default',
                  opacity: isReached ? 1 : 0.4,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ position: 'relative', width: S(28), height: S(28) }}>
                  <img src={brain.img} alt={brain.label} style={{
                    width: '100%', height: '100%', objectFit: 'contain',
                    filter: (isClaimed && p.day === 3) ? 'sepia(1) hue-rotate(300deg) saturate(1.5) brightness(1.3)'
                      : isClaimed ? 'none'
                      : isAvail ? `drop-shadow(0 0 8px #FFD700)`
                      : (isReached && p.day === 3) ? `sepia(1) hue-rotate(300deg) saturate(1.5) brightness(1.3) drop-shadow(0 0 6px ${palierColor})`
                      : isReached ? `drop-shadow(0 0 6px ${palierColor})` : 'none',
                  }} />
                  {isClaimed && (
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: S(12), height: S(12), borderRadius: '50%',
                      background: '#22C55E', border: '1.5px solid #ffffff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: S(7), color: '#ffffff', fontWeight: 900, lineHeight: 1 }}>✓</span>
                    </div>
                  )}
                  {isAvail && (
                    <div style={{
                      position: 'absolute', top: -3, right: -3,
                      width: S(10), height: S(10), borderRadius: '50%',
                      background: '#FFD700',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} />
                  )}
                </div>
                <span style={{ fontSize: S(8), fontWeight: 900, lineHeight: 1, color: isAvail ? '#FFD700' : isClaimed ? '#22C55E' : 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)', textAlign: 'center' }}>
                  {brain.label}
                </span>
                <span style={{ fontSize: S(7), fontWeight: 700, lineHeight: 1, color: 'white', opacity: 0.5 }}>J{p.day}</span>
              </button>
            )
          })}
        </div>

        {/* ROULETTE + DROP — glass morphism subtil */}
        <div style={{ display: 'flex', gap: S(8), padding: `${S(6)} ${S(14)} 0` }}>
          <button
            onClick={() => { audio.play('click'); setShowRoulette(true) }}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: S(16), padding: `${S(8)} ${S(10)}`,
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img src="/assets/roulette.png?v=2" alt="Roulette" style={{ width: S(24), height: S(24), objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>Roulette</span>
              {rouletteBadge && <span style={{ fontSize: S(7), fontWeight: 900, color: '#22C55E', letterSpacing: '0.04em' }}>{rouletteBadge}</span>}
            </div>
          </button>
          <button
            onClick={() => nav('flash')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: S(16), padding: `${S(8)} ${S(10)}`,
              cursor: 'pointer', fontFamily: 'Nunito, sans-serif', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <img src="/assets/daily.png?v=2" alt="Drop" style={{ width: S(24), height: S(24), objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: S(10), fontWeight: 800, color: 'white' }}>{isSunday ? 'Hunt VIP' : 'Drop'}</span>
              <span style={{ fontSize: S(7), fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>1×/jour</span>
            </div>
          </button>
        </div>

      </div>{/* fin zone haute */}

      {/* ═══════════════════════════════════════════════════════
          ZONE CENTRALE — flex:1, distribue logo + grille + bouton
          avec space-evenly pour un espacement uniforme
          ═══════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-evenly',
        padding: `0 ${S(10)}`,
        position: 'relative', zIndex: 1,
      }}>
        {/* Logo Vrai ou Fou — même largeur que le bouton Partie rapide */}
        <img
          src="/assets/ui/vof-logo.png" alt="Vrai ET Fou"
          style={{ width: '60%', maxWidth: S(220), height: 'auto', objectFit: 'contain', WebkitUserSelect: 'none', userSelect: 'none' }}
        />

        {/* Grille 3 + 2 (spec 19/04/2026) */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: S(12),
          width: '100%', maxWidth: S(320),
        }}>
          {/* Ligne 1 : Quest · VoF · Race */}
          <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: S(8) }}>
            <ModeIcon icon="/assets/modes/quest.png" name="Quest WTF!" color="#FFD700" onClick={() => nav('quest')} sizeOverride={72} />
            <ModeIcon icon="/assets/modes/vrai-et-fou.png" name="Vrai ET Fou" color="#6BCB77" onClick={() => nav('vrai_ou_fou')} sizeOverride={72} />
            <ModeIcon icon="/assets/modes/race.png" name="Race" color="#00E5FF" onClick={() => nav('race')} sizeOverride={72} />
          </div>
          {/* Ligne 2 : Blitz · Multi */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: S(48) }}>
            <ModeIcon icon="/assets/modes/blitz.png" name="Blitz" color="#FF1744" onClick={() => nav('blitz')} sizeOverride={72} />
            <ModeIcon icon="/assets/modes/multi.png" name="Multi" color="#6B2D8E" onClick={() => nav('multi')} sizeOverride={72} />
          </div>
        </div>

        {/* Bouton Partie rapide — ratio natif du PNG (790 × 388 ≈ 2.036:1)
            icon-quickie + texte orange overlay à l'intérieur */}
        <button
          onClick={() => nav('quickie_random')}
          className="btn-press"
          style={{
            backgroundColor: 'transparent',
            backgroundImage: "url('/assets/modes/home-button.png?v=4')",
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            border: 'none', padding: 0,
            width: '70%', maxWidth: S(260), aspectRatio: '790 / 388',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: S(10),
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          }}
        >
          <img
            src="/assets/modes/icon-quickie.png?v=2"
            alt=""
            style={{ width: S(36), height: S(36), objectFit: 'contain', flexShrink: 0 }}
          />
          <span style={{
            fontFamily: "'Fredoka One', cursive", fontWeight: 400, fontSize: S(16),
            color: '#FFA500', letterSpacing: '0.08em', textTransform: 'uppercase',
            textShadow: '0 2px 4px rgba(0,0,0,0.35)',
          }}>
            Partie rapide
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════
          ZONE BASSE — navbar fixe
          ═══════════════════════════════════════════════════════ */}
      <BottomNav
        onResetSocialNotif={onResetSocialNotif}
        socialNotifCount={socialNotifCount}
        pendingChallengesCount={pendingChallengesCount}
        isHome={true}
      />

      {/* Modals */}
      {coffreReward && <CoffreRewardModal reward={coffreReward} onClose={() => setCoffreReward(null)} />}
      {showRoulette && <RouletteModal onClose={() => setShowRoulette(false)} scale={scale} />}
      {badgeToShow && <NewBadgeModal badge={badgeToShow} onClose={handleBadgeClose} />}
    </div>
  )
}

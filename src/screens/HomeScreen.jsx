/**
 * HomeScreen v9 — Fullscreen + flex stable.
 * Zones : Header · Streak · Paliers · Roulette · Modes (grille 6) · Énergie · Partie rapide · BottomNav
 */

import { useState, useEffect } from 'react'
import SettingsModal from '../components/SettingsModal'
import BottomNav from '../components/BottomNav'
import ModeIcon from '../components/ModeIcon'
import { usePlayerProfile } from '../hooks/usePlayerProfile'
import { readWtfData } from '../utils/storageHelper'
import { audio } from '../utils/audio'
import { useScale } from '../hooks/useScale'
import { ICON_SIZES, ASSETS } from '../constants/layoutConfig'
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

  // ModeIcon imported from components/ModeIcon.jsx

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
        <span style={{ fontSize: S(7), fontWeight: 900, color: '#FF6B1A', background: 'rgba(255,107,26,0.15)', borderRadius: 6, padding: '2px 5px' }}>{badge}</span>
      )}
    </button>
  )

  const rouletteBadge = (() => {
    const d = readWtfData()
    const today = new Date().toISOString().slice(0, 10)
    return d.rouletteFreeDate === today ? null : 'GRATUIT'
  })()

  const questBadge = (() => {
    try { const d = readWtfData(); const q = d.quest || d.route; return `N${q?.level || 1}` }
    catch { return 'N1' }
  })()

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

      <style>{`
        @keyframes coffreSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <StarburstBackground />

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ═══ HEADER ═══ */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: S(12) }}>
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

      {/* ═══ STREAK + COUNTDOWN ═══ */}
      <div style={{
        flexShrink: 0,
        margin: `${S(8)} ${S(14)} 0`,
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
          <span style={{ fontSize: S(11), fontWeight: 900, color: currentStreak > 0 ? '#FF6B1A' : 'rgba(255,255,255,0.4)' }}>
            {currentStreak} jour{currentStreak !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: S(9), fontWeight: 700, color: 'white', opacity: 0.5 }}>Prochain coffre</span>
          <span style={{ fontSize: S(10), fontWeight: 800, color: 'white', opacity: 0.7 }}>{countdown}</span>
        </div>
      </div>

      {/* ═══ PALIERS STREAK ═══ */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center',
        gap: S(6), padding: `${S(6)} ${S(10)} 0`,
        justifyContent: 'center',
        position: 'relative', zIndex: 2,
        animation: 'coffreSlideIn 0.5s ease-out',
      }}>
        {paliers.map((p) => {
          const status = getStatus(p.day)
          const isAvail = status === 'available'
          const isClaimed = status === 'claimed'
          const chestSrc = isClaimed
            ? '/assets/ui/chest-locked.png'
            : isAvail ? '/assets/ui/chest-open.png' : '/assets/ui/chest-locked.png'
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
                  : 'rgba(255,255,255,0.12)',
                border: `1px solid ${isAvail ? 'rgba(255,215,0,0.6)' : 'rgba(255,255,255,0.1)'}`,
                cursor: isAvail ? 'pointer' : 'default',
                opacity: isClaimed ? 0.35 : 1,
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 0.2s, background 0.2s',
                animation: isAvail ? 'pulse 1.8s ease-in-out infinite' : 'none',
              }}
            >
              <img src={chestSrc} alt={p.name} style={{ width: S(ICON_SIZES.coffreIcon), height: S(ICON_SIZES.coffreIcon), objectFit: 'contain', flexShrink: 0 }} />
              <span style={{ fontSize: S(8), fontWeight: 900, lineHeight: 1, color: isAvail ? '#FFD700' : 'white', textShadow: '0 1px 4px rgba(0,0,0,0.4)', textAlign: 'center' }}>
                {isClaimed ? '✓' : p.name}
              </span>
              <span style={{ fontSize: S(7), fontWeight: 700, lineHeight: 1, color: 'white', opacity: 0.6 }}>J{p.day}</span>
            </button>
          )
        })}
      </div>

      {/* ═══ ROULETTE ═══ */}
      <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', padding: `${S(4)} ${S(10)} 0` }}>
        <MiniBtn icon="/assets/ui/emoji-roulette.png" label="Roulette" badge={rouletteBadge} onClick={() => { audio.play('click'); setShowRoulette(true) }} />
      </div>

      {/* ═══ ZONE CENTRALE — flex:1, contient logo + grille modes + énergie ═══ */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: `0 ${S(10)}`,
        position: 'relative', zIndex: 1,
        gap: S(8),
      }}>
        {/* Logo WTF central */}
        <img
          src={ASSETS.ui.wtfLogo}
          alt="WTF!"
          style={{
            width: 'clamp(90px, 35vw, 140px)', height: 'auto',
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
          <ModeIcon icon="/assets/modes/quickie.svg" name="Quickie" color="#7F77DD" onClick={() => nav('quickie')} />
          <ModeIcon icon="/assets/modes/quest.svg" name="Quest" color="#FF6B1A" onClick={() => nav('quest')} />
          <ModeIcon icon="/assets/modes/flash.svg" name="Flash" color="#E91E63" onClick={() => nav('flash')} />
          <ModeIcon icon="/assets/modes/vrai-ou-fou.svg" name="Vrai ou Fou" color="#9B59B6" onClick={() => nav('vrai_ou_fou')} />
          <ModeIcon icon="/assets/modes/no-limit.svg" name="No Limit" color="#E84535" onClick={() => nav('no_limit')} />
          <ModeIcon icon="/assets/modes/blitz.svg" name="Blitz" color="#FF4444" onClick={() => nav('blitz')} />
        </div>

        {/* Énergie Quickie (5 segments) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img src="/assets/ui/emoji-energy.png" alt="energy" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline', fontSize: 14 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 16, height: 8, borderRadius: 4,
                background: i < quickieEnergyRemaining ? '#FF6B1A' : 'rgba(255,255,255,0.15)',
                transition: 'background 0.3s',
                boxShadow: i < quickieEnergyRemaining ? '0 0 6px rgba(255,107,26,0.4)' : 'none',
              }} />
            ))}
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: quickieEnergyRemaining > 0 ? 'rgba(255,255,255,0.7)' : '#EF4444' }}>
            {quickieEnergyRemaining}/5
          </span>
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
          <img src="/assets/ui/emoji-energy.png" alt="" style={{ width: S(20), height: S(20), objectFit: 'contain', flexShrink: 0 }} />
          <span style={{
            fontFamily: "'Fredoka One', cursive",
            fontWeight: 400, fontSize: S(14), color: '#FF6B1A',
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

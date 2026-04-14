/**
 * AppModals — Toutes les modals globales de App.jsx.
 *
 * Streak toast, Streak J30 choice, No ticket, No energy, Mini parcours,
 * Trophy queue, New categories, Settings, GameAlert, ConnectBanner, DevPanel.
 */

import SettingsModal from './SettingsModal'
import HowToPlayModal from './HowToPlayModal'
import ConnectBanner from './ConnectBanner'
import NewCategoriesModal from './NewCategoriesModal'
import GameModal from './GameModal'
import DevPanel from '../components/DevPanel'
import { DEV_PANEL_ENABLED } from '../config/devConfig'
import { SCREENS, FLASH_ENERGY } from '../constants/gameConfig'
import { getValidFacts } from '../data/factsService'
import { buyExtraSession } from '../services/energyService'
import { audio } from '../utils/audio'
import { saveStorage } from '../utils/storageHelper'
import { usePlayerProfile } from '../hooks/usePlayerProfile'

export default function AppModals({
  // States
  streakRewardToast, showStreakSpecialModal, showHowToPlay, screen,
  showSettings, showNoTicketModal, showNoEnergyModal, noEnergyOrigin,
  gameAlert, showConnectBanner, trophyQueue, miniParcours,
  showNewCategoriesModal, newlyUnlockedCategories, showDevPanel,
  wtfCoins, storage, effectiveDailyFact, gameMode,
  // Setters
  setStreakRewardToast, setShowStreakSpecialModal, setShowHowToPlay,
  setShowSettings, setShowNoTicketModal, setShowNoEnergyModal,
  setGameAlert, setShowConnectBanner, setTrophyQueue, setMiniParcours,
  setShowNewCategoriesModal, setShowDevPanel,
  setSessionType, setGameMode, setIsQuickPlay, setSelectedDifficulty,
  setSelectedCategory, setExplorerPool, setScreen, setStorage,
  // Handlers
  resetOnboarding, handleShowRules, handleFlashSolo, handleHomeNavigate,
  showOrSkipLaunch, initSessionState, devActions,
  // Auth
  signInWithGoogle,
}) {
  const S = (px) => `calc(${px}px * var(--scale))`
  const { unlockFact, coins: profileCoins, applyCurrencyDelta } = usePlayerProfile()
  const coinsForGate = profileCoins ?? wtfCoins ?? 0

  return (
    <>
      {/* Toast récompense Streak */}
      <style>{`
        @keyframes streakToastSlide {
          from { transform: translateX(-50%) translateY(-60px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
      `}</style>
      {streakRewardToast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: '#FF6B1A', color: 'white',
          borderRadius: 12, padding: '10px 20px', fontWeight: 700, fontSize: 15,
          textAlign: 'center', boxShadow: '0 4px 24px rgba(255,107,26,0.55)',
          whiteSpace: 'nowrap', animation: 'streakToastSlide 0.35s ease', pointerEvents: 'none',
        }}>
          <img src="/assets/ui/emoji-streak.png" alt="streak" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />{` Série de ${streakRewardToast.days} jours !  `}
          {streakRewardToast.reward._label
            ? streakRewardToast.reward._label
            : <>
                {streakRewardToast.reward.coins > 0 && <>{`+${streakRewardToast.reward.coins} `}<img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />{'  '}</>}
                {streakRewardToast.reward.tickets > 0 && <>{`+${streakRewardToast.reward.tickets} `}<img src="/assets/ui/icon-tickets.png" alt="tickets" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />{'  '}</>}
                {streakRewardToast.reward.hints > 0 && <>{`+${streakRewardToast.reward.hints} `}<img src="/assets/ui/icon-hint.png" alt="indice" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />{'  '}</>}
                {streakRewardToast.reward.badge && '🏅 Badge !'}
              </>
          }
        </div>
      )}

      {/* Modal choix Jour 30 */}
      {showStreakSpecialModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1001, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: 'linear-gradient(160deg, #1a0a35, #0A0F1E)', border: '2px solid #FF6B1A', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}><img src="/assets/ui/emoji-streak.png" alt="streak" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /></div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, marginBottom: 6 }}>30 jours de série !</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>Incroyable ! Choisis ta récompense ultime :</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => {
                localStorage.setItem('wtf_badge_streak_30', 'true')
                localStorage.setItem('wtf_premium_earned', 'true')
                setShowStreakSpecialModal(false)
                setStreakRewardToast({ days: 30, reward: { coins: 0, tickets: 0, hints: 0, badge: false, _label: 'WTF Premium 👑' } })
              }} style={{ background: 'linear-gradient(135deg, #FF6B1A, #EA580C)', color: 'white', border: 'none', borderRadius: 14, padding: '14px 20px', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
                👑 WTF Premium
              </button>
              <button onClick={() => {
                const raw = JSON.parse(localStorage.getItem('wtf_data') || '{}')
                const unlocked = new Set(raw.unlockedFacts || [])
                const locked = getValidFacts().filter(f => !unlocked.has(f.id))
                const picks = [...locked].sort(() => Math.random() - 0.5).slice(0, 10)
                picks.forEach(f => unlocked.add(f.id))
                raw.unlockedFacts = [...unlocked]
                localStorage.setItem('wtf_data', JSON.stringify(raw))
                // Phase A — miroir Supabase pour chacun des 10 facts débloqués
                picks.forEach(f => {
                  unlockFact?.(f.id, f.category, 'streak_j30_premium_unlock').catch(e =>
                    console.warn('[AppModals] streak J30 unlockFact RPC failed:', e?.message || e)
                  )
                })
                localStorage.setItem('wtf_badge_streak_30', 'true')
                setShowStreakSpecialModal(false)
                setStreakRewardToast({ days: 30, reward: { coins: 0, tickets: 0, hints: 0, badge: false, _label: '10 f*cts débloqués 🎴' } })
              }} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '14px 20px', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                🎴 10 f*cts débloqués
              </button>
            </div>
          </div>
        </div>
      )}

      {showHowToPlay && screen === SCREENS.HOME && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} onRestartTutorial={resetOnboarding} />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onShowRules={handleShowRules} onRestartTutorial={resetOnboarding} />}

      {gameAlert && <GameModal emoji={gameAlert.emoji} title={gameAlert.title} message={gameAlert.message} onConfirm={() => setGameAlert(null)} />}

      {showConnectBanner && <ConnectBanner onClose={() => setShowConnectBanner(false)} />}

      {/* Trophy queue */}
      {trophyQueue.length > 0 && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setTrophyQueue(q => q.slice(1))}>
          <div style={{ background: '#fff', borderRadius: 24, padding: '32px 28px', maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{trophyQueue[0].emoji}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#FF6B1A', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Trophée débloqué !</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1a1a2e', marginBottom: 8 }}>{trophyQueue[0].label}</div>
            {trophyQueue[0].description && <div style={{ fontSize: 13, fontWeight: 600, color: '#6B7280', marginBottom: 16, lineHeight: 1.4 }}>{trophyQueue[0].description}</div>}
            <button onClick={() => setTrophyQueue(q => q.slice(1))} style={{ width: '100%', padding: '14px 0', borderRadius: 16, border: 'none', background: '#FF6B1A', color: 'white', fontSize: 15, fontWeight: 900, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}>
              {trophyQueue.length > 1 ? `Suivant (${trophyQueue.length - 1} de plus)` : 'Continuer'}
            </button>
          </div>
        </div>
      )}

      {/* No energy modal */}
      {showNoEnergyModal && (
        <GameModal emoji={<img src="/assets/ui/emoji-energy.png" alt="energy" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} />} title="Plus de sessions !"
          message={`Tes ${FLASH_ENERGY.FREE_SESSIONS_PER_DAY} sessions gratuites du jour sont utilisées. Achète une session pour ${FLASH_ENERGY.EXTRA_SESSION_COST} coins ou reviens demain !`}
          confirmLabel={`Acheter (${FLASH_ENERGY.EXTRA_SESSION_COST} coins)`} cancelLabel="Attendre"
          onConfirm={() => {
            if (buyExtraSession({ coins: coinsForGate, applyCurrencyDelta })) {
              setShowNoEnergyModal(false)
              if (noEnergyOrigin === 'explorer') { setGameMode('explorer'); setSessionType('explorer'); showOrSkipLaunch('explorer') }
              else { setGameMode('solo'); setSessionType('flash_solo'); setSelectedCategory(null); showOrSkipLaunch('flash') }
            } else { setShowNoEnergyModal(false); setGameAlert({ emoji: '🪙', title: 'Pas assez de coins', message: `Il te faut ${FLASH_ENERGY.EXTRA_SESSION_COST} coins pour acheter une session.` }) }
          }}
          onCancel={() => setShowNoEnergyModal(false)}
        />
      )}

      {/* No ticket modal */}
      {showNoTicketModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Nunito, sans-serif' }}>
          <div style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #2d1a0e 100%)', border: '2px solid #FF6B1A', borderRadius: 24, padding: '32px 24px', maxWidth: 320, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}><img src="/assets/ui/icon-tickets.png" alt="tickets" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /></div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#FFD700', marginBottom: 10 }}>Il te faut un ticket !</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 24, lineHeight: 1.5 }}>Gagne des coins en jouant et achete un ticket en Boutique.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => { setShowNoTicketModal(false); audio.play?.('click'); handleFlashSolo() }}
                style={{ width: '100%', padding: '14px 24px', borderRadius: 14, background: '#FF6B1A', color: 'white', border: 'none', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
                🎯 Jouer pour gagner des coins
              </button>
              <button onClick={() => { setShowNoTicketModal(false); audio.play?.('click'); handleHomeNavigate('blitz') }}
                style={{ width: '100%', padding: '14px 24px', borderRadius: 14, background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.3)', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>
                ⚡ Blitz
              </button>
              <button onClick={() => setShowNoTicketModal(false)}
                style={{ width: '100%', padding: '10px', borderRadius: 14, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Retour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini parcours modal */}
      {miniParcours && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setMiniParcours(null)}>
          <div style={{ background: 'white', borderRadius: 20, padding: 24, maxWidth: 320, width: '100%', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <h3 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: '0 0 8px' }}>Plus que {miniParcours.pool.length} f*ct{miniParcours.pool.length > 1 ? 's' : ''} !</h3>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#FF6B1A', margin: '0 0 16px' }}>{miniParcours.price} <img src="/assets/ui/icon-coins.png" alt="coins" style={{ width: '1em', height: '1em', verticalAlign: 'middle', display: 'inline' }} /></p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setMiniParcours(null)} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#6B7280', cursor: 'pointer' }}>Plus tard</button>
              <button disabled={coinsForGate < miniParcours.price} onClick={() => {
                if (coinsForGate < miniParcours.price) return
                setStorage(prev => { const next = { ...prev, wtfCoins: prev.wtfCoins - miniParcours.price }; saveStorage(next); return next })
                applyCurrencyDelta?.({ coins: -miniParcours.price }, 'mini_parcours_buy').catch(e =>
                  console.warn('[AppModals] miniParcours applyCurrencyDelta failed:', e?.message || e)
                )
                const { pool, mode, categoryId, difficulty } = miniParcours
                if (mode === 'flash') { setSessionType('flash_solo'); setGameMode('solo'); setIsQuickPlay(false); setSelectedDifficulty(difficulty); setSelectedCategory(null) }
                else if (mode === 'explorer') { setSessionType('explorer'); setGameMode('explorer'); setIsQuickPlay(false); setSelectedDifficulty(difficulty); setSelectedCategory(categoryId); setExplorerPool([]) }
                else if (mode === 'quest') { setSessionType('parcours'); setGameMode('solo'); setIsQuickPlay(false); setSelectedDifficulty(difficulty); setSelectedCategory(categoryId) }
                initSessionState(pool); setMiniParcours(null); setScreen(SCREENS.QUESTION)
              }} style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, background: coinsForGate >= miniParcours.price ? '#FF6B1A' : '#E5E7EB', border: 'none', color: coinsForGate >= miniParcours.price ? 'white' : '#9CA3AF', cursor: coinsForGate >= miniParcours.price ? 'pointer' : 'not-allowed' }}>
                Lancer ! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewCategoriesModal && newlyUnlockedCategories.length > 0 && (
        <NewCategoriesModal categories={newlyUnlockedCategories} onClose={() => setShowNewCategoriesModal(false)} />
      )}

      {showDevPanel && DEV_PANEL_ENABLED && (
        <DevPanel storage={storage} devActions={devActions} dailyFact={effectiveDailyFact} onClose={() => setShowDevPanel(false)} />
      )}
    </>
  )
}

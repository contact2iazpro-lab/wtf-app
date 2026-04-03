import { useState, useEffect, useCallback } from 'react'
import { getDeviceId } from '../config/devConfig'
import { getDevLogs, clearDevLogs } from '../utils/devLogger'
import { getCategoryById } from '../data/facts'

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0-dev'
const BUILD_DATE = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeLevel(factsCount) {
  if (factsCount >= 350) return { level: 50, title: 'Légende WTF!' }
  if (factsCount >= 200) return { level: 35, title: 'Maître WTF!' }
  if (factsCount >= 100) return { level: 20, title: 'Expert WTF!' }
  if (factsCount >= 30)  return { level: 10, title: 'Chasseur de F*cts' }
  if (factsCount >= 10)  return { level: 5,  title: 'Questionneur' }
  return { level: 1, title: 'Curieux' }
}

function sendBrowserNotif(title, body) {
  const show = () => new Notification(title, { body, icon: '/logo-wtf.png' })
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    show()
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') show() })
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-2 px-3 rounded-xl text-left font-black text-xs"
        style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <span>{title}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="mt-2 flex flex-col gap-1.5 px-0.5">{children}</div>}
    </div>
  )
}

function StateRow({ label, value, children }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex-1 min-w-0">
        <div className="text-white/45 text-xs font-semibold">{label}</div>
        <div className="text-white font-black text-sm truncate">{value}</div>
      </div>
      <div className="flex gap-1.5 shrink-0">{children}</div>
    </div>
  )
}

function Btn({ onClick, children, color = '#FF6B1A', danger = false }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-lg font-black text-xs text-white active:scale-95 transition-all whitespace-nowrap"
      style={{ background: danger ? '#EF4444' : color }}>
      {children}
    </button>
  )
}

function ScenarioBtn({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2.5 rounded-xl text-xs font-black text-white text-left active:scale-95 transition-all"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
      {children}
    </button>
  )
}

// ─── Main DevPanel ────────────────────────────────────────────────────────────

export default function DevPanel({ storage, devActions, dailyFact, onClose }) {
  const [toast, setToast] = useState(null)
  const [logs, setLogs] = useState(() => getDevLogs())
  const [factIdInput, setFactIdInput] = useState('')

  const deviceId = getDeviceId()
  const { streak, wtfCoins, unlockedFacts, wtfDuJourFait, sessionsToday, totalScore } = storage
  const factsCount = unlockedFacts?.size ?? 0
  const { level, title: levelTitle } = computeLevel(factsCount)
  const cat = dailyFact ? getCategoryById(dailyFact.category) : null

  // Refresh logs every 2s
  useEffect(() => {
    const interval = setInterval(() => setLogs([...getDevLogs()]), 2000)
    return () => clearInterval(interval)
  }, [])

  const act = useCallback((label, fn) => {
    try {
      fn()
      setToast(`✓ ${label}`)
    } catch (e) {
      setToast(`❌ Erreur: ${e.message}`)
    }
    setTimeout(() => setToast(null), 2200)
  }, [])

  // ─── Notifications ──────────────────────────────────────────────────────────
  const NOTIFS = [
    {
      label: '📬 WTF! du Jour',
      title: '🤯 Le f*ct du jour t\'attend',
      body: `[${cat?.label || 'Sciences'}] Il pleut des diamants sur... → Joue pour découvrir et l'ajouter à ta collection`,
    },
    {
      label: '🔥 Série danger (J7)',
      title: '🔥 Série 7 jours — Plus que 4h',
      body: 'Joue une session rapide pour garder ta série.',
    },
    {
      label: '🔥 Série danger (J30)',
      title: '🔥 Série 30 jours — Plus que 4h',
      body: 'Joue une session rapide pour garder ta série.',
    },
    {
      label: '⚔️ Défi reçu',
      title: '🦁 TestAmi vient de te défier !',
      body: 'Catégorie Sciences · Score à battre : 47 pts → Relève le défi',
    },
    {
      label: '📦 Nouveau pack dispo',
      title: '📦 50 nouveaux f*cts arrivent dans 3 jours 🔥',
      body: 'Catégorie : Gastronomie — Prépare-toi !',
    },
  ]

  return (
    <div className="fixed inset-0 z-[9000] flex flex-col" style={{ background: '#080C14' }}>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 left-1/2 z-[9999] px-4 py-2 rounded-xl font-bold text-sm text-white pointer-events-none"
          style={{
            transform: 'translateX(-50%)',
            background: toast.startsWith('❌') ? 'rgba(239,68,68,0.95)' : 'rgba(34,197,94,0.95)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-5 pb-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,107,26,0.06)' }}>
        <div className="flex-1">
          <div className="text-white font-black text-base tracking-wide">🛠 WTF! Dev Panel</div>
          <div className="flex gap-2 mt-0.5">
            <span className="text-white/35 text-xs font-mono">v{APP_VERSION}</span>
            <span className="text-white/20 text-xs">·</span>
            <span className="text-white/35 text-xs">Build {BUILD_DATE}</span>
          </div>
        </div>
        {/* Device ID (truncated) */}
        <div className="text-right">
          <div className="text-white/25 text-xs">Device</div>
          <div
            className="text-white/50 text-xs font-mono cursor-pointer active:text-white"
            onClick={() => navigator.clipboard?.writeText(deviceId).then(() => setToast('✓ Device ID copié'))}>
            {deviceId.slice(0, 18)}…
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white active:scale-90 transition-transform text-sm"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0 }}>
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">

        {/* ─── Section 1 — Notifications ──────────────────────────────────── */}
        <Section title="📬 Section 1 — Notifications">
          <div className="grid grid-cols-2 gap-1.5">
            {NOTIFS.map(notif => (
              <button
                key={notif.label}
                onClick={() => act(notif.label, () => sendBrowserNotif(notif.title, notif.body))}
                className="px-2.5 py-2.5 rounded-xl text-xs font-bold text-white text-left active:scale-95 transition-all leading-snug"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {notif.label}
              </button>
            ))}
          </div>
          <div
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg mt-1"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="text-yellow-400 text-xs">⚠️</span>
            <span className="text-yellow-400/70 text-xs">Requiert la permission "Notifications" du navigateur</span>
          </div>
        </Section>

        {/* ─── Section 2 — Player State ────────────────────────────────────── */}
        <Section title="👤 Section 2 — État du joueur">
          <StateRow label="🔥 Série" value={`${streak} jour${streak !== 1 ? 's' : ''}`}>
            <Btn danger onClick={() => act('Série → 0', () => devActions.setStreak(0))}>Reset</Btn>
            <Btn color="#3B82F6" onClick={() => act('Série → 30j', () => devActions.setStreak(30))}>→ 30j</Btn>
          </StateRow>

          <StateRow label="🪙 WTF! Coins" value={wtfCoins.toString()}>
            <Btn danger onClick={() => act('Coins → 0', () => devActions.setCoins(0))}>Reset</Btn>
            <Btn color="#22C55E" onClick={() => act('+100 coins', () => devActions.addCoins(100))}>+100</Btn>
          </StateRow>

          <StateRow label="⭐ Niveau WTF!" value={`Niv.${level} — ${levelTitle}`}>
            <Btn color="#8B5CF6" onClick={() => act('Level up forcé', () => devActions.unlockRandomFacts(35))}>Level up</Btn>
          </StateRow>

          <StateRow label="📚 Collection" value={`${factsCount} f*ct${factsCount !== 1 ? 's' : ''} acquis`}>
            <Btn danger onClick={() => act('Collection reset', () => devActions.resetCollection())}>Reset</Btn>
          </StateRow>

          <StateRow label="🤯 WTF! du Jour" value={wtfDuJourFait ? '✅ Joué aujourd\'hui' : '⏳ Pas encore joué'}>
            <Btn color="#F59E0B" onClick={() => act('WTF! du Jour reset', () => devActions.resetWTFDuJour())}>Rejouer</Btn>
          </StateRow>

          <StateRow label="⚡ Sessions aujourd'hui" value={`${sessionsToday} session${sessionsToday !== 1 ? 's' : ''}`}>
            <Btn danger onClick={() => act('Sessions → 0', () => devActions.resetSessionsToday())}>Reset</Btn>
          </StateRow>

          <StateRow label="🏅 Score total" value={totalScore.toString()}>
            <Btn danger onClick={() => act('Score → 0', () => devActions.resetScore())}>Reset</Btn>
          </StateRow>
        </Section>

        {/* ─── Cheat button ────────────────────────────────────────────────── */}
        <div className="my-2">
          <Btn color="#FF6B1A" onClick={() => act('CHEAT 999', () => devActions.cheat999())}>999 coins + tickets + indices</Btn>
        </div>

        {/* ─── Section 3 — Scénarios ───────────────────────────────────────── */}
        <Section title="🎬 Section 3 — Scénarios de test">
          <ScenarioBtn onClick={() => act('Simuler J1', () => devActions.simulateNewPlayer())}>
            🆕 Simuler J1 (nouveau joueur) — remet tout à zéro
          </ScenarioBtn>
          <ScenarioBtn onClick={() => act('Simuler J7', () => devActions.simulateJ7())}>
            📅 Simuler J7 (série établie) — série 7 + 15 f*cts
          </ScenarioBtn>
          <ScenarioBtn onClick={() => act('Collection Animaux complète', () => devActions.simulateCollectionAnimaux())}>
            🦁 Simuler collection complète [Animaux]
          </ScenarioBtn>
          <ScenarioBtn onClick={() => act('Simuler premier achat', () => devActions.simulatePurchase())}>
            💳 Simuler premier achat (IAP)
          </ScenarioBtn>
          <ScenarioBtn onClick={() => act('Série Shield modal', () => devActions.forceStreakShield())}>
            🛡️ Forcer affichage Série Shield
          </ScenarioBtn>
        </Section>

        {/* ─── Section 4 — Facts & Contenu ─────────────────────────────────── */}
        <Section title="📖 Section 4 — F*cts & Contenu">
          {/* Current daily fact */}
          {dailyFact ? (
            <div
              className="px-3 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${cat?.color || '#7C3AED'}33` }}>
              <div className="flex items-center gap-2 mb-1">
                <span>{cat?.emoji || '🤯'}</span>
                <span className="font-black text-xs uppercase tracking-wider" style={{ color: cat?.color || '#7C3AED' }}>{cat?.label}</span>
                <span className="text-white/30 text-xs ml-auto">#{dailyFact.id}</span>
              </div>
              <div className="text-white font-black text-sm leading-snug">{dailyFact.shortAnswer}</div>
              <div className="text-white/40 text-xs mt-0.5 line-clamp-2">{dailyFact.explanation}</div>
            </div>
          ) : (
            <div className="text-white/30 text-xs px-2">Aucun f*ct du jour chargé</div>
          )}

          {/* Override fact ID */}
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="1"
              max="999"
              placeholder="ID du f*ct (ex: 42)"
              value={factIdInput}
              onChange={e => setFactIdInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                outline: 'none',
              }}
            />
            <Btn
              color="#8B5CF6"
              onClick={() => {
                const id = parseInt(factIdInput)
                if (!isNaN(id) && id > 0) {
                  act(`F*ct du jour → #${id}`, () => devActions.overrideDailyFact(id))
                } else {
                  setToast('❌ ID invalide')
                  setTimeout(() => setToast(null), 2000)
                }
              }}>
              Appliquer
            </Btn>
          </div>

          <ScenarioBtn onClick={() => act('Révélation VIP', () => devActions.testVIPReveal())}>
            ✨ Tester révélation VIP (avec animation)
          </ScenarioBtn>
        </Section>

        {/* ─── Section 5 — Logs ────────────────────────────────────────────── */}
        <Section title="📊 Section 5 — Analytics Logs" defaultOpen={false}>
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-white/35 text-xs">{logs.length} événement{logs.length !== 1 ? 's' : ''}</span>
            <div className="flex gap-1.5">
              <Btn
                danger
                onClick={() => act('Logs effacés', () => { clearDevLogs(); setLogs([]) })}>
                Effacer
              </Btn>
              <Btn
                color="#3B82F6"
                onClick={() => {
                  const text = logs.map(l => `[${l.time}] ${l.name}  ${JSON.stringify(l.data)}`).join('\n')
                  navigator.clipboard?.writeText(text)
                    .then(() => { setToast('✓ Logs copiés'); setTimeout(() => setToast(null), 2000) })
                    .catch(() => { setToast('❌ Clipboard non autorisé'); setTimeout(() => setToast(null), 2000) })
                }}>
                Copier
              </Btn>
            </div>
          </div>

          <div
            className="rounded-xl overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.5)', maxHeight: 220, border: '1px solid rgba(255,255,255,0.05)' }}>
            {logs.length === 0 ? (
              <div className="text-white/25 text-xs p-4 text-center">
                Aucun événement enregistré.<br />
                Joue une session pour voir les logs apparaître.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={log.id || i}
                  className="flex items-start gap-2 px-3 py-1.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="text-white/25 text-xs font-mono shrink-0 mt-0.5">{log.time}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-green-400 text-xs font-bold">{log.name}</span>
                    {Object.keys(log.data).length > 0 && (
                      <span className="text-white/35 text-xs ml-1.5 font-mono">
                        {JSON.stringify(log.data)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Section>

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  )
}

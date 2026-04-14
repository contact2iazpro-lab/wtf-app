import { useMemo, useState, useEffect, useRef } from 'react'
import GameModal from '../components/GameModal'
import { useGoBack } from '../hooks/useGoBack'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getValidFacts } from '../data/factsService'
import SettingsModal from '../components/SettingsModal'
import { getAllBadges } from '../utils/badgeManager'
import { getBalances } from '../services/currencyService'
import { useCurrency } from '../context/CurrencyContext'
import { readWtfData } from '../utils/storageHelper'
import { AVATAR_FRAMES, getFrameById, readFrameState, setEquippedFrame } from '../data/avatarFrames'

const S = (px) => `calc(${px}px * var(--scale))`

const MODE_LABELS = {
  flash_solo: { icon: '⚡', name: 'Flash' },
  parcours: { icon: '⭐', name: 'Quest' },
  explorer: { icon: '🗺️', name: 'Explorer' },
  blitz: { icon: '⏱️', name: 'Blitz' },
  wtf_du_jour: { icon: '🔥', name: 'Hunt' },
}

export default function ProfilPage() {
  const goBack = useGoBack()
  const { isConnected, user, signInWithGoogle, signOut } = useAuth()
  const [showSettings, setShowSettings] = useState(false)

  // Edit name
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Edit avatar
  const avatarInputRef = useRef(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [frameState, setFrameState] = useState(() => readFrameState())
  const [showFrameSelector, setShowFrameSelector] = useState(false)
  useEffect(() => {
    const refresh = () => setFrameState(readFrameState())
    window.addEventListener('wtf_storage_sync', refresh)
    return () => window.removeEventListener('wtf_storage_sync', refresh)
  }, [])
  const currentFrame = getFrameById(frameState.equipped)

  // Load avatar from user metadata or localStorage
  // Google peut exposer l'avatar dans plusieurs champs selon la configuration :
  // user_metadata.avatar_url | user_metadata.picture | identities[0].identity_data.*
  useEffect(() => {
    const url = user?.user_metadata?.avatar_url
             || user?.user_metadata?.picture
             || user?.identities?.[0]?.identity_data?.avatar_url
             || user?.identities?.[0]?.identity_data?.picture
             || localStorage.getItem('wtf_player_avatar')
    setAvatarUrl(url || null)
  }, [user])

  async function handleSaveName() {
    const clean = nameInput.replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, '').trim().slice(0, 20)
    if (!clean) return
    setSavingName(true)
    try {
      const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      data.playerName = clean
      data.lastModified = Date.now()
      localStorage.setItem('wtf_data', JSON.stringify(data))
      window.dispatchEvent(new Event('wtf_storage_sync'))
      if (isConnected) {
        await supabase.auth.updateUser({ data: { name: clean } })
        await supabase.from('profiles').update({ username: clean }).eq('id', user.id)
      }
      setEditingName(false)
    } catch (err) {
      console.error('Erreur mise à jour nom:', err)
    } finally {
      setSavingName(false)
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const bitmap = await createImageBitmap(file)
      const size = isConnected ? 200 : 100
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / bitmap.width, size / bitmap.height)
      const w = bitmap.width * scale, h = bitmap.height * scale
      ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)

      if (isConnected) {
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85))
        const path = `avatars/${user.id}.jpg`
        await supabase.storage.createBucket('avatars', { public: true }).catch(() => {})
        const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        const urlWithBust = `${publicUrl}?v=${Date.now()}`
        await supabase.auth.updateUser({ data: { avatar_url: urlWithBust } })
        await supabase.from('profiles').update({ avatar_url: urlWithBust }).eq('id', user.id)
        setAvatarUrl(urlWithBust)
      } else {
        const base64 = canvas.toDataURL('image/jpeg', 0.7)
        localStorage.setItem('wtf_player_avatar', base64)
        setAvatarUrl(base64)
      }
    } catch (err) {
      console.error('Erreur upload avatar:', err)
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const [resetStep, setResetStep] = useState(0) // 0=hidden, 1=first confirm, 2=second confirm

  async function executeReset() {
    setResetStep(0)
    if (isConnected && user) {
      try {
        // Valeurs F2P officielles CLAUDE.md : 50 coins / 1 ticket / 3 indices / 5 énergies
        await supabase.from('profiles').update({
          coins: 50, total_score: 0, streak_current: 0, streak_max: 0,
          tickets: 1, hints: 3, energy: 5, updated_at: new Date().toISOString(),
        }).eq('id', user.id)
      } catch { /* ignore */ }
    }

    const kept = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && (k.startsWith('sb-') || k.startsWith('supabase.auth') || k === 'wtf_app_version' || k.startsWith('skip_launch_'))) {
        kept[k] = localStorage.getItem(k)
      }
    }
    localStorage.clear()
    Object.entries(kept).forEach(([k, v]) => localStorage.setItem(k, v))
    window.location.reload()
  }

  const playerData = useMemo(() => readWtfData(), [])
  const allFacts = useMemo(() => getValidFacts(), [])
  const unlockedIds = useMemo(() => new Set(playerData.unlockedFacts || []), [playerData])

  const pseudo = user?.user_metadata?.name || playerData.playerName || 'Joueur WTF!'
  const gamesPlayed = playerData.gamesPlayed || 0
  const bestStreak = playerData.bestStreak || 0
  const totalCorrect = playerData.totalCorrect || 0
  const totalAnswered = playerData.totalAnswered || 0
  const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  const { coins, tickets, hints } = useCurrency()
  const balances = { coins, tickets, hints }
  const unlockedWtf = allFacts.filter(f => unlockedIds.has(f.id) && f.isVip).length
  const unlockedFunny = allFacts.filter(f => unlockedIds.has(f.id) && !f.isVip).length

  const badges = getAllBadges()
  const badgesEarned = badges.filter(b => b.earned).length

  const statsByMode = playerData.statsByMode || {}

  const STATS = [
    { label: 'Meilleure série', value: `${bestStreak} j`, emoji: '🔥' },
    { label: 'Taux de réussite', value: `${successRate}%`, emoji: '🎯' },
    { label: 'Parties jouées', value: gamesPlayed, emoji: '🎮' },
    { label: 'Badges', value: `${badgesEarned}/${badges.length}`, emoji: '🏆' },
  ]

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80) }}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {resetStep === 1 && (
        <GameModal
          emoji="⚠️"
          title="Réinitialiser ta progression ?"
          message="Tu vas perdre tous tes coins, tickets, indices, ta collection et ta progression. Cette action est irréversible."
          confirmLabel="Continuer"
          cancelLabel="Annuler"
          danger
          onConfirm={() => setResetStep(2)}
          onCancel={() => setResetStep(0)}
        />
      )}
      {resetStep === 2 && (
        <GameModal
          emoji="🚨"
          title="Dernière chance !"
          message="Toute ta progression sera définitivement perdue. Confirmer la réinitialisation ?"
          confirmLabel="Réinitialiser"
          cancelLabel="Annuler"
          danger
          onConfirm={executeReset}
          onCancel={() => setResetStep(0)}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-2 pb-1 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <h1 className="flex-1 text-sm font-black" style={{ color: '#1a1a2e' }}>Mon Profil</h1>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}
          >
            <img src="/assets/ui/icon-settings.png" style={{ width: 20, height: 20 }} alt="" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-24">
        {/* Avatar + pseudo */}
        <div className="flex flex-col items-center py-2">
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <img
              src={avatarUrl || '/assets/ui/avatar-default.png'}
              alt="avatar"
              className="rounded-full"
              style={{
                width: 72, height: 72,
                border: currentFrame.border,
                objectFit: 'cover', cursor: 'pointer',
                opacity: uploadingAvatar ? 0.5 : 1, transition: 'opacity 0.3s, box-shadow 0.3s, border-color 0.3s',
                boxShadow: currentFrame.glow,
              }}
              onClick={() => avatarInputRef.current?.click()}
            />
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              width: 24, height: 24, borderRadius: '50%',
              background: '#FF6B1A', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, cursor: 'pointer',
            }} onClick={() => avatarInputRef.current?.click()}>📷</div>
            <div style={{
              position: 'absolute', top: -2, right: -2,
              width: 24, height: 24, borderRadius: '50%',
              background: '#FFD700', border: '2px solid white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }} onClick={() => setShowFrameSelector(true)} title="Changer de cadre">✨</div>
            {uploadingAvatar && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: 11, fontWeight: 700,
              }}>...</div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          {/* Pseudo éditable */}
          {editingName ? (
            <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value.slice(0, 20))}
                maxLength={20}
                autoFocus
                className="text-center font-black text-sm px-2 py-1 rounded-lg"
                style={{ color: '#1a1a2e', border: '2px solid #FF6B1A', outline: 'none', width: 160 }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
              />
              <button onClick={handleSaveName} disabled={savingName} className="text-green-500 font-bold text-lg active:scale-90">{savingName ? '...' : '✓'}</button>
              <button onClick={() => setEditingName(false)} className="text-red-400 font-bold text-lg active:scale-90">✗</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5" style={{ marginTop: 6 }}>
              <span className="font-black text-sm" style={{ color: '#1a1a2e' }}>{pseudo}</span>
              <button onClick={() => { setNameInput(pseudo); setEditingName(true) }} className="text-slate-400 hover:text-slate-600 active:scale-90 transition-all" style={{ fontSize: 12 }}>✏️</button>
            </div>
          )}

          {/* Email si connecté, ID anonyme sinon */}
          {isConnected ? (
            <span className="text-xs font-semibold" style={{ color: '#6B7280', marginTop: 4 }}>{user?.email}</span>
          ) : (
            <span
              className="text-xs font-bold"
              style={{
                color: '#9CA3AF', marginTop: 4,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '0.06em',
              }}
              title="ID local (pour support)"
            >
              ID : {playerData.anonymousId || '000 000 000'}
            </span>
          )}

          {isConnected ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', marginTop: 8 }}>
                <span style={{ fontSize: 10 }}>✅</span>
                <span className="text-xs font-bold" style={{ color: '#22C55E' }}>Progression sauvegardée</span>
              </div>
              <button
                onClick={async () => {
                  await signOut()
                  // Hard reload pour garantir que toute la state (Auth, Currency, etc.)
                  // soit rechargée à zéro — window.location.href seul est parfois
                  // intercepté en SPA et ne recharge pas vraiment.
                  window.location.replace('/')
                  setTimeout(() => window.location.reload(), 50)
                }}
                className="rounded-xl text-xs font-bold active:scale-95 transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', marginTop: 8, padding: '8px 16px' }}
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <button
              onClick={() => signInWithGoogle().catch(e => {
                console.error('[ProfilPage] Google sign-in failed:', e?.message || e)
                alert('Connexion Google échouée : ' + (e?.message || 'erreur inconnue'))
              })}
              className="rounded-2xl font-black text-sm active:scale-95 transition-all"
              style={{ background: '#FF6B1A', color: 'white', border: 'none', marginTop: 8, padding: '10px 20px' }}
            >
              Se connecter avec Google
            </button>
          )}
        </div>

        {/* Ressources */}
        <div className="rounded-2xl mb-3" style={{ background: 'rgba(0,0,0,0.04)', padding: 8, display: 'flex', gap: 6 }}>
          {[
            { emoji: '🪙', value: balances.coins, label: 'coins' },
            { emoji: '🎟️', value: balances.tickets, label: 'tickets' },
            { emoji: '💡', value: balances.hints, label: 'indices' },
          ].map(r => (
            <div key={r.label} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 18, display: 'block' }}>{r.emoji}</span>
              <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{r.value}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{r.label}</span>
            </div>
          ))}
        </div>

        {/* Collection WTF! vs Funny */}
        <div className="flex gap-1.5 mb-3">
          <div className="flex-1 rounded-2xl p-2 text-center" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)' }}>
            <span className="text-base block">⭐</span>
            <span className="font-black text-sm block" style={{ color: '#D97706' }}>{unlockedWtf}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>WTF!</span>
          </div>
          <div className="flex-1 rounded-2xl p-2 text-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <span className="text-base block">🎭</span>
            <span className="font-black text-sm block" style={{ color: '#7C3AED' }}>{unlockedFunny}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Funny</span>
          </div>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl p-2 text-center" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <span className="text-base block">{s.emoji}</span>
              <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{s.value}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Stats par mode */}
        {Object.entries(statsByMode).filter(([, s]) => s.gamesPlayed > 0).length > 0 && (
          <>
            <h2 className="font-black text-xs mb-2" style={{ color: '#1a1a2e' }}>Statistiques par mode</h2>
            <div className="flex flex-col gap-2 mb-3">
              {Object.entries(statsByMode).filter(([, s]) => s.gamesPlayed > 0).map(([key, s]) => {
                const mode = MODE_LABELS[key] || { icon: '🎮', name: key }
                const rate = s.totalAnswered > 0 ? Math.round((s.totalCorrect / s.totalAnswered) * 100) : 0
                return (
                  <div key={key} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <span style={{ fontSize: 14 }}>{mode.icon}</span>
                      <span className="font-black text-xs" style={{ color: '#1a1a2e' }}>{mode.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[
                        { label: 'Parties', value: s.gamesPlayed },
                        { label: 'Réussite', value: `${rate}%` },
                        { label: 'Série max', value: s.bestStreak || 0 },
                      ].map(st => (
                        <div key={st.label} style={{ flex: 1, textAlign: 'center' }}>
                          <span className="font-black text-xs block" style={{ color: '#1a1a2e' }}>{st.value}</span>
                          <span style={{ fontSize: 8, color: '#9CA3AF', fontWeight: 600 }}>{st.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Réinitialiser progression */}
        <div style={{ marginTop: 16, paddingBottom: 16, textAlign: 'center' }}>
          <button
            onClick={() => setResetStep(1)}
            style={{
              background: '#DC2626', color: 'white', border: 'none',
              borderRadius: 12, padding: '10px 16px',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Réinitialiser ma progression
          </button>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6 }}>
            Action irréversible. Toute ta progression sera perdue.
          </p>
        </div>
      </div>

      {/* Modal sélection de cadre */}
      {showFrameSelector && (
        <div
          onClick={() => setShowFrameSelector(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 20, padding: 20,
              maxWidth: 360, width: '100%',
              fontFamily: 'Nunito, sans-serif',
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>✨ Cadre de profil</h3>
              <button
                onClick={() => setShowFrameSelector(false)}
                style={{ background: '#F3F4F6', border: 'none', borderRadius: 8, width: 28, height: 28, fontSize: 14, fontWeight: 900, cursor: 'pointer', color: '#6B7280' }}
              >✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {AVATAR_FRAMES.map(frame => {
                const isOwned = frameState.owned.includes(frame.id)
                const isEquipped = frameState.equipped === frame.id
                return (
                  <button
                    key={frame.id}
                    onClick={() => {
                      if (!isOwned) return
                      setEquippedFrame(frame.id)
                      setFrameState(readFrameState())
                    }}
                    disabled={!isOwned}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: 10, borderRadius: 12,
                      background: isEquipped ? 'rgba(255,107,26,0.1)' : '#F9FAFB',
                      border: isEquipped ? '2px solid #FF6B1A' : '1.5px solid #E5E7EB',
                      cursor: isOwned ? 'pointer' : 'not-allowed',
                      opacity: isOwned ? 1 : 0.45,
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: '#D1D5DB',
                      border: frame.border, boxShadow: frame.glow,
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#1a1a2e' }}>{frame.label}</span>
                    {isEquipped ? (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#FF6B1A' }}>✓ Équipé</span>
                    ) : isOwned ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF' }}>Équiper</span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF' }}>🔒 {frame.cost} 🪙</span>
                    )}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 12 }}>
              Débloque de nouveaux cadres dans la Boutique
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

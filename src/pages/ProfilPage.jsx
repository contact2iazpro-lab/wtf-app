import { useMemo, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getValidFacts } from '../data/factsService'
import SettingsModal from '../components/SettingsModal'
import { getAllBadges } from '../utils/badgeManager'

const S = (px) => `calc(${px}px * var(--scale))`

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function ProfilPage() {
  const navigate = useNavigate()
  const { isConnected, user, signInWithGoogle, signOut } = useAuth()
  const [showConnectedToast, setShowConnectedToast] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Edit name
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Edit avatar
  const avatarInputRef = useRef(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Show toast when user just connected
  useEffect(() => {
    if (isConnected && user) {
      setShowConnectedToast(true)
      const timer = setTimeout(() => setShowConnectedToast(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isConnected, user])

  // Load avatar from user metadata or localStorage
  useEffect(() => {
    const url = user?.user_metadata?.avatar_url || localStorage.getItem('wtf_player_avatar')
    if (url) setAvatarUrl(url)
  }, [user])

  async function handleSaveName() {
    const clean = nameInput.replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, '').trim().slice(0, 20)
    if (!clean) return
    setSavingName(true)
    try {
      // Toujours sauvegarder en local
      localStorage.setItem('wtf_player_name', clean)
      const data = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      data.pseudo = clean
      localStorage.setItem('wtf_data', JSON.stringify(data))
      // Si connecté, sync vers Supabase
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
      const size = isConnected ? 200 : 100 // Plus petit en local pour limiter le base64
      const canvas = document.createElement('canvas')
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / bitmap.width, size / bitmap.height)
      const w = bitmap.width * scale, h = bitmap.height * scale
      ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)

      if (isConnected) {
        // Upload vers Supabase Storage
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
        // Sauvegarder en base64 dans localStorage (100x100)
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

  const playerData = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('wtf_data') || '{}') } catch { return {} }
  }, [])

  const unlockedIds = useMemo(() => new Set(playerData.unlockedFacts || []), [playerData])
  const allFacts = getValidFacts()
  const pseudo = user?.user_metadata?.name || localStorage.getItem('wtf_player_name') || playerData.pseudo || 'Joueur WTF!'
  const gamesPlayed = playerData.gamesPlayed || 0
  const bestStreak = playerData.bestStreak || 0
  const totalCorrect = playerData.totalCorrect || 0
  const totalAnswered = playerData.totalAnswered || 0
  const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  // Ressources
  const playerCoins = playerData.wtfCoins || 0
  const playerTickets = playerData.tickets || 0
  const playerHints = parseInt(localStorage.getItem('wtf_hints_available') || '0', 10)

  // Collection WTF! vs Funny
  const unlockedWtf = allFacts.filter(f => unlockedIds.has(f.id) && f.isVip).length
  const unlockedFunny = allFacts.filter(f => unlockedIds.has(f.id) && !f.isVip).length

  // Badges
  const badges = getAllBadges()
  const badgesEarned = badges.filter(b => b.earned).length

  // Stats par mode
  const statsByMode = playerData.statsByMode || {}
  const MODE_LABELS = {
    flash_solo: { icon: '⚡', name: 'Flash' },
    parcours: { icon: '⭐', name: 'Quest' },
    marathon: { icon: '🗺️', name: 'Explorer' },
    blitz: { icon: '⏱️', name: 'Blitz' },
    wtf_du_jour: { icon: '🔥', name: 'Hunt' },
  }

  const STATS = [
    { label: 'Meilleure série', value: `${bestStreak} j`, emoji: '🔥' },
    { label: 'Taux de réussite', value: `${successRate}%`, emoji: '🎯' },
    { label: 'Parties jouées', value: gamesPlayed, emoji: '🎮' },
    { label: 'Badges', value: `${badgesEarned}/12`, emoji: '🏆' },
  ]

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#FAFAF8', paddingBottom: S(80) }}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {/* Toast connexion réussie */}
      {showConnectedToast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, background: '#22C55E', color: 'white',
          borderRadius: 12, padding: '10px 20px',
          fontWeight: 700, fontSize: 14, textAlign: 'center', whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
          animation: 'fadeInDown 0.35s ease',
        }}>
          Connecté ! {user?.user_metadata?.name || user?.email}
        </div>
      )}
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#374151' }}
          >←</button>
          <h1 className="flex-1 text-lg font-black" style={{ color: '#1a1a2e' }}>Mon Profil</h1>
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
        <div className="flex flex-col items-center py-4">
          {/* Avatar cliquable */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <img
              src={avatarUrl || '/assets/ui/avatar-default.png'}
              alt="avatar"
              className="rounded-full"
              style={{
                width: 72, height: 72, border: '3px solid white',
                objectFit: 'cover', cursor: 'pointer',
                opacity: uploadingAvatar ? 0.5 : 1, transition: 'opacity 0.3s',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              }}
              onClick={() => avatarInputRef.current?.click()}
            />
            <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 24, height: 24, borderRadius: '50%',
                background: '#FF6B1A', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, cursor: 'pointer',
              }} onClick={() => avatarInputRef.current?.click()}>
                📷
              </div>
            {uploadingAvatar && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: 11, fontWeight: 700,
              }}>⟳</div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          {/* Pseudo éditable */}
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value.slice(0, 20))}
                maxLength={20}
                autoFocus
                className="text-center font-black text-base px-2 py-1 rounded-lg"
                style={{ color: '#1a1a2e', border: '2px solid #FF6B1A', outline: 'none', width: 160 }}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
              />
              <button onClick={handleSaveName} disabled={savingName} className="text-green-500 font-bold text-lg active:scale-90">{savingName ? '⟳' : '✓'}</button>
              <button onClick={() => setEditingName(false)} className="text-red-400 font-bold text-lg active:scale-90">✗</button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base" style={{ color: '#1a1a2e' }}>{pseudo}</span>
              <button onClick={() => { setNameInput(pseudo); setEditingName(true) }} className="text-slate-400 hover:text-slate-600 active:scale-90 transition-all" style={{ fontSize: 14 }}>✏️</button>
            </div>
          )}
          {isConnected ? (
            <>
              <span className="text-xs font-semibold mt-1" style={{ color: '#6B7280' }}>{user?.email}</span>
              <div className="flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <span style={{ fontSize: 10 }}>✅</span>
                <span className="text-xs font-bold" style={{ color: '#22C55E' }}>Progression sauvegardée</span>
              </div>
              <button
                onClick={async () => { try { await signOut() } catch {} finally { window.location.reload() } }}
                className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold active:scale-95 transition-all"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444' }}
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="mt-3 px-5 py-2.5 rounded-2xl font-black text-sm active:scale-95 transition-all"
              style={{ background: '#FF6B1A', color: 'white', border: 'none' }}
            >
              Se connecter avec Google
            </button>
          )}
        </div>

        {/* Ressources */}
        <div className="rounded-2xl mb-4" style={{ background: 'rgba(0,0,0,0.04)', padding: '12px', display: 'flex', gap: 8 }}>
          {[
            { emoji: '🪙', value: playerCoins, label: 'coins' },
            { emoji: '🎟️', value: playerTickets, label: 'tickets' },
            { emoji: '💡', value: playerHints, label: 'indices' },
          ].map(r => (
            <div key={r.label} style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: 18, display: 'block' }}>{r.emoji}</span>
              <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{r.value}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{r.label}</span>
            </div>
          ))}
        </div>

        {/* Collection WTF! vs Funny */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.3)' }}>
            <span className="text-lg block">⭐</span>
            <span className="font-black text-base block" style={{ color: '#D97706' }}>{unlockedWtf}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>WTF!</span>
          </div>
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <span className="text-lg block">🎭</span>
            <span className="font-black text-base block" style={{ color: '#7C3AED' }}>{unlockedFunny}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Funny</span>
          </div>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {STATS.map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <span className="text-lg block">{s.emoji}</span>
              <span className="font-black text-base block" style={{ color: '#1a1a2e' }}>{s.value}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Stats par mode */}
        {Object.entries(statsByMode).filter(([, s]) => s.gamesPlayed > 0).length > 0 && (
          <>
            <h2 className="font-black text-sm mb-2" style={{ color: '#1a1a2e' }}>Statistiques par mode</h2>
            <div className="flex flex-col gap-2 mb-4">
              {Object.entries(statsByMode).filter(([, s]) => s.gamesPlayed > 0).map(([key, s]) => {
                const mode = MODE_LABELS[key] || { icon: '🎮', name: key }
                const rate = s.totalAnswered > 0 ? Math.round((s.totalCorrect / s.totalAnswered) * 100) : 0
                return (
                  <div key={key} style={{ background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{mode.icon}</span>
                      <span className="font-black text-xs" style={{ color: '#1a1a2e' }}>{mode.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[
                        { label: 'Parties', value: s.gamesPlayed },
                        { label: 'Réussite', value: `${rate}%` },
                        { label: 'Série max', value: s.bestStreak || 0 },
                      ].map(st => (
                        <div key={st.label} style={{ flex: 1, textAlign: 'center' }}>
                          <span className="font-black text-sm block" style={{ color: '#1a1a2e' }}>{st.value}</span>
                          <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600 }}>{st.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Réinitialiser progression ───────────────────────────── */}
        <div style={{ marginTop: 32, paddingBottom: 24, textAlign: 'center' }}>
          <button
            onClick={async () => {
              if (!window.confirm('⚠️ ATTENTION : Cette action est IRRÉVERSIBLE.\nTu vas perdre tous tes coins, tickets, indices, ta collection et ta progression.\nEs-tu sûr de vouloir continuer ?')) return
              if (!window.confirm('Dernière chance !\nToute ta progression sera définitivement perdue.\nConfirmer la réinitialisation ?')) return

              // Reset Supabase si connecté
              if (isConnected && user) {
                try {
                  await supabase.from('profiles').update({
                    coins: 0, total_score: 0, streak_current: 0, streak_max: 0,
                    tickets: 0, hints: 0, updated_at: new Date().toISOString(),
                  }).eq('id', user.id)
                } catch { /* ignore */ }
              }

              // Vider localStorage sauf les clés auth (sb-*, supabase.auth.*)
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
            }}
            style={{
              background: '#DC2626', color: 'white', border: 'none',
              borderRadius: 12, padding: '12px 24px',
              fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Réinitialiser ma progression
          </button>
          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
            Action irréversible. Toute ta progression sera perdue.
          </p>
        </div>
      </div>
    </div>
  )
}

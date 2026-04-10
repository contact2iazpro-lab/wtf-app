import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { pullFromServer, pushToServer } from '../services/playerSyncService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load profile from profiles table
  const loadProfile = useCallback(async (userId) => {
    if (!isSupabaseConfigured) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) setProfile(data)
    } catch {
      // Profile may not exist yet
    }
  }, [])

  // Create profile on first sign-up
  const createProfile = useCallback(async (userId, email) => {
    if (!isSupabaseConfigured) return
    const username = email.split('@')[0]
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      let data
      if (!existing) {
        // Nouveau profil → créer avec les valeurs de départ
        const result = await supabase
          .from('profiles')
          .insert({ id: userId, username, coins: 0, tickets: 3, hints: 3 })
          .select()
          .single()
        data = result.data
      } else {
        // Profil existant → juste mettre à jour le username si vide
        const result = await supabase
          .from('profiles')
          .update({ username })
          .eq('id', userId)
          .select()
          .single()
        data = result.data
      }
      if (data) setProfile(data)
    } catch (err) {
      console.error('[Auth] createProfile error:', err)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u.id)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          if (event === 'SIGNED_IN') await createProfile(u.id, u.email)
          loadProfile(u.id)
          // Sync local data to/from Supabase on sign-in, then refresh App state
          try {
            await pullFromServer(u.id)
            // Sync local name/avatar to Supabase si pas de données cloud
            const localName = localStorage.getItem('wtf_player_name')
            const localAvatar = localStorage.getItem('wtf_player_avatar')
            if (localName && !u.user_metadata?.name) {
              await supabase.auth.updateUser({ data: { name: localName } })
              await supabase.from('profiles').update({ username: localName }).eq('id', u.id).catch(() => {})
            }
            if (localAvatar && !u.user_metadata?.avatar_url && !localAvatar.startsWith('data:')) {
              // Ne pas sync les base64 vers Supabase (trop gros)
            }
            // Notify App.jsx to reload storage from localStorage
            window.dispatchEvent(new Event('wtf_storage_sync'))
          } catch { /* ignore */ }
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadProfile, createProfile])

  const signUpWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }, [])

  const signInWithEmail = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      }
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    // Supabase gère automatiquement le nettoyage des tokens
    await supabase.auth.signOut().catch(() => {})

    // Nettoyer les données du joueur précédent (garder settings uniquement)
    try {
      const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      // Garder: coff settings, pas de progression
      const cleanData = {
        coffreClaimedDays: wtfData.coffreClaimedDays,
        coffreWeekStart: wtfData.coffreWeekStart,
        seenModes: wtfData.seenModes,
      }
      localStorage.setItem('wtf_data', JSON.stringify(cleanData))
      localStorage.removeItem('wtf_hints_available')
      localStorage.removeItem('wtf_my_friend_code')
      localStorage.removeItem('wtf_facts_cache')
      localStorage.removeItem('wtf_tutorial_state')
    } catch { /* ignore */ }

    // Reset state
    setUser(null)
    setProfile(null)
  }, [])

  const updateProfile = useCallback(async (updates) => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }, [user])

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isConnected: !!user,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      updateProfile,
      isSupabaseConfigured,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

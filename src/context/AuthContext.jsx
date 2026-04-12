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

  // Create profile on first sign-up (supporte users anonymes : email peut être null)
  const createProfile = useCallback(async (userId, email) => {
    if (!isSupabaseConfigured) return
    // Anonymous users ont email=null → username par défaut
    const username = email ? email.split('@')[0] : `joueur_${userId.slice(0, 8)}`
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      let data
      if (!existing) {
        // Nouveau profil → créer avec les valeurs de départ (cohérent avec bloc 1 SQL)
        const result = await supabase
          .from('profiles')
          .insert({ id: userId, username, coins: 0, tickets: 1, hints: 3, energy: 3 })
          .select()
          .single()
        data = result.data
      } else if (email) {
        // Profil existant ET on a un vrai email → mettre à jour le username
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

  // Crée une session anonyme si aucune n'existe. Retourne true si une nouvelle
  // session anonyme a été créée, false si une session (anonyme ou non) existait déjà.
  const ensureAnonymousSession = useCallback(async () => {
    if (!isSupabaseConfigured) return false
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) return false
      const { data, error } = await supabase.auth.signInAnonymously()
      if (error) {
        console.error('[Auth] signInAnonymously failed:', error.message)
        return false
      }
      console.log('[Auth] Anonymous session created:', data.user?.id)
      return true
    } catch (e) {
      console.error('[Auth] ensureAnonymousSession error:', e)
      return false
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // Get initial session. Si aucune session → crée automatiquement une session
    // anonyme. L'event SIGNED_IN déclenché par signInAnonymously se charge du reste.
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.warn('[Auth] Session recovery failed, re-anonymizing:', error.message)
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        await ensureAnonymousSession()
        return
      }
      const u = session?.user ?? null
      if (u) {
        setUser(u)
        loadProfile(u.id)
        setLoading(false)
      } else {
        // Aucune session → anonymize. Le reste du cycle passera par onAuthStateChange.
        await ensureAnonymousSession()
        // loading sera set à false dans SIGNED_IN handler
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') {
          const u = session?.user ?? null
          setUser(u)
          if (u) loadProfile(u.id)
          setLoading(false)
          return
        }
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('[Auth] Token refresh failed, signing out')
          supabase.auth.signOut().catch(() => {})
          setUser(null)
          setProfile(null)
          return
        }
        const u = session?.user ?? null
        setUser(u)
        setLoading(false)
        if (u) {
          if (event === 'SIGNED_IN') await createProfile(u.id, u.email)
          loadProfile(u.id)
          // Sync local data to/from Supabase on sign-in, then refresh App state
          // Skip pullFromServer pour users anonymes (pas de données legacy à rapatrier)
          if (u.is_anonymous) {
            window.dispatchEvent(new Event('wtf_storage_sync'))
            return
          }
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
            // Re-fetch le user complet pour s'assurer qu'on a tous les metadata
            // (avatar_url, name, identities, etc.) — après SIGNED_IN/TOKEN_REFRESHED
            // l'objet session peut être partiel.
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              try {
                const { data: { user: freshUser } } = await supabase.auth.getUser()
                if (freshUser) setUser(freshUser)
              } catch { /* ignore */ }
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
    // Si user anonyme → tenter linkIdentity pour préserver user_id + données.
    // Requiert "Manual Linking" activé dans Supabase Auth settings. Si désactivé
    // ou si linkIdentity échoue, fallback sur signInWithOAuth standard
    // (l'user anonyme devient orphan mais le login réussit).
    const isAnon = user?.is_anonymous === true
    const oauthOptions = {
      provider: 'google',
      options: {
        redirectTo: window.location.href.split('#')[0],
        queryParams: { prompt: 'select_account' },
      },
    }
    if (isAnon) {
      try {
        const { error } = await supabase.auth.linkIdentity(oauthOptions)
        if (error) throw error
        console.log('[Auth] linkIdentity initiated (anonymous → Google)')
        return
      } catch (e) {
        console.warn('[Auth] linkIdentity failed, falling back to signInWithOAuth:', e?.message || e)
        // Fallback : standard OAuth (nouvel user, les données anon seront perdues)
      }
    }
    const { error } = await supabase.auth.signInWithOAuth(oauthOptions)
    if (error) {
      console.error('[Auth] signInWithOAuth failed:', error.message)
      throw error
    }
  }, [user])

  const signOut = useCallback(async () => {
    // 1. Déconnexion Supabase — scope 'local' pour clear le token localStorage
    //    même si le réseau est down. Log explicite si erreur (pas de silent catch).
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) console.warn('[Auth] signOut warning:', error.message)
    } catch (e) {
      console.error('[Auth] signOut error:', e)
    }

    // 2. Force-clear toutes les clés Supabase résiduelles (au cas où signOut
    //    local n'a pas tout nettoyé à cause d'un state bizarre). Les clés
    //    Supabase commencent par sb-<project-ref>-
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.startsWith('sb-') || k.startsWith('supabase.auth'))) {
          keysToRemove.push(k)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch { /* ignore */ }

    // 3. Nettoyer les données du joueur précédent (garder settings uniquement)
    try {
      const wtfData = JSON.parse(localStorage.getItem('wtf_data') || '{}')
      const cleanData = {
        coffreClaimedDays: wtfData.coffreClaimedDays,
        coffreWeekStart: wtfData.coffreWeekStart,
        seenModes: wtfData.seenModes,
      }
      localStorage.setItem('wtf_data', JSON.stringify(cleanData))
      localStorage.removeItem('wtf_hints_available') // legacy, plus utilisé
      localStorage.removeItem('wtf_my_friend_code')
      localStorage.removeItem('wtf_facts_cache')
      localStorage.removeItem('wtf_tutorial_state')
      localStorage.removeItem('wtf_cached_friends')
      localStorage.removeItem('wtf_player_avatar')
      localStorage.removeItem('wtf_player_name')
    } catch { /* ignore */ }

    // 4. Reset state React
    setUser(null)
    setProfile(null)

    // 5. Recrée une session anonyme immédiatement. L'user peut continuer à
    //    jouer sans compte, son state repart à zéro (nouveau user_id).
    await ensureAnonymousSession()
  }, [ensureAnonymousSession])

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

  // isAnonymous : true si l'user courant est une session anonyme Supabase
  // isConnected : true SEULEMENT si compte réel (pas anonyme). Les features
  //               sociales (amis, défis, profil Google) utilisent isConnected.
  //               Les features économie/collection utilisent hasSession (=!!user).
  const isAnonymous = !!user?.is_anonymous
  const hasSession  = !!user
  const isConnected = hasSession && !isAnonymous

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      hasSession,
      isAnonymous,
      isConnected,
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

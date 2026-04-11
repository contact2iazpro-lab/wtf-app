import { supabase, supabaseLight } from '../lib/supabase'

// LECTURE → supabaseLight (pas de Web Lock, pas de contention multi-tab)
// ÉCRITURE → supabase (client principal, session auth pour RLS INSERT/UPDATE/DELETE)
// Note : avec la clé service_role, la RLS est bypassée pour les deux clients.
// Mais le light client évite le blocage du Web Lock sur mobile.

function generateFriendCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function getOrCreateFriendCode(userId, displayName, avatarUrl) {
  // Lecture via light client
  const { data: existing, error: existingError } = await supabaseLight
    .from('friend_codes')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) {
    console.error('[friendService] Error checking existing code:', existingError)
  }

  if (existing) {
    if (existing.display_name !== displayName || existing.avatar_url !== avatarUrl) {
      // Écriture via client principal (ou light — les deux ont la clé service_role)
      await supabaseLight.from('friend_codes').update({ display_name: displayName, avatar_url: avatarUrl }).eq('user_id', userId)
    }
    return existing
  }

  const code = generateFriendCode()

  const { data, error } = await supabaseLight
    .from('friend_codes')
    .insert({ user_id: userId, code, display_name: displayName, avatar_url: avatarUrl })
    .select()
    .single()

  if (error) {
    console.error('[friendService] Error creating friend code:', error)
    throw error
  }

  return data
}

export async function findPlayerByCode(code) {
  const { data, error } = await supabaseLight
    .from('friend_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) {
    console.error('[friendService] findPlayerByCode error:', error)
    return null
  }
  return data || null
}

export async function sendFriendRequest(fromUserId, toUserId) {
  const { data: existing } = await supabaseLight
    .from('friendships')
    .select('*')
    .or(`and(user1_id.eq.${fromUserId},user2_id.eq.${toUserId}),and(user1_id.eq.${toUserId},user2_id.eq.${fromUserId})`)
    .maybeSingle()

  if (existing) return { alreadyExists: true, friendship: existing }

  const { data, error } = await supabaseLight
    .from('friendships')
    .insert({ user1_id: fromUserId, user2_id: toUserId, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return { alreadyExists: false, friendship: data }
}

export async function acceptFriendRequest(friendshipId) {
  const { data, error } = await supabaseLight
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectFriendRequest(friendshipId) {
  const { error } = await supabaseLight.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

export async function getFriends(userId) {
  const { data, error } = await supabaseLight
    .from('friendships')
    .select('*')
    .or(`and(user1_id.eq.${userId},status.eq.accepted),and(user2_id.eq.${userId},status.eq.accepted)`)
  if (error) throw error

  const friendIds = (data || []).map(f => f.user1_id === userId ? f.user2_id : f.user1_id)
  if (friendIds.length === 0) return []

  const { data: infos } = await supabaseLight.from('friend_codes').select('*').in('user_id', friendIds)

  return data.map(f => {
    const fid = f.user1_id === userId ? f.user2_id : f.user1_id
    const info = infos?.find(i => i.user_id === fid)
    return { friendshipId: f.id, userId: fid, displayName: info?.display_name || 'Joueur WTF!', avatarUrl: info?.avatar_url, code: info?.code, since: f.accepted_at }
  })
}

export async function getPendingRequests(userId) {
  const { data, error } = await supabaseLight
    .from('friendships')
    .select('*')
    .eq('user2_id', userId)
    .eq('status', 'pending')
  if (error) throw error

  const senderIds = (data || []).map(f => f.user1_id)
  if (senderIds.length === 0) return []

  const { data: infos } = await supabaseLight.from('friend_codes').select('*').in('user_id', senderIds)

  return data.map(f => {
    const info = infos?.find(i => i.user_id === f.user1_id)
    return { friendshipId: f.id, userId: f.user1_id, displayName: info?.display_name || 'Joueur WTF!', avatarUrl: info?.avatar_url, since: f.created_at }
  })
}

export async function removeFriend(friendshipId) {
  const { error } = await supabaseLight.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

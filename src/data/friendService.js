import { supabase, supabaseAnon } from '../lib/supabase'

function generateFriendCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function getOrCreateFriendCode(userId, displayName, avatarUrl) {
  console.log('[friendService] getOrCreateFriendCode for user:', userId)
  const { data: existing, error: existingError } = await supabase
    .from('friend_codes')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingError) {
    console.error('[friendService] Error checking existing code:', existingError)
  }

  if (existing) {
    console.log('[friendService] Found existing code:', existing.code)
    if (existing.display_name !== displayName || existing.avatar_url !== avatarUrl) {
      await supabase.from('friend_codes').update({ display_name: displayName, avatar_url: avatarUrl }).eq('user_id', userId)
    }
    return existing
  }

  const code = generateFriendCode()
  console.log('[friendService] Creating new friend code:', code)
  const { data, error } = await supabase
    .from('friend_codes')
    .insert({ user_id: userId, code, display_name: displayName, avatar_url: avatarUrl })
    .select()
    .single()

  if (error) {
    console.error('[friendService] Error creating friend code:', error)
    throw error
  }
  console.log('[friendService] Friend code created successfully:', data)
  return data
}

export async function findPlayerByCode(code) {
  console.log('[friendService] findPlayerByCode looking for:', code.toUpperCase())
  // Use anon client — no auth session/lock needed for public code lookup
  const { data, error } = await supabaseAnon
    .from('friend_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()
  if (error) {
    console.error('[friendService] findPlayerByCode error:', error)
    return null
  }
  console.log('[friendService] findPlayerByCode result:', data)
  return data || null
}

export async function sendFriendRequest(fromUserId, toUserId) {
  const { data: existing } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user1_id.eq.${fromUserId},user2_id.eq.${toUserId}),and(user1_id.eq.${toUserId},user2_id.eq.${fromUserId})`)
    .maybeSingle()

  if (existing) return { alreadyExists: true, friendship: existing }

  const { data, error } = await supabase
    .from('friendships')
    .insert({ user1_id: fromUserId, user2_id: toUserId, status: 'pending' })
    .select()
    .single()

  if (error) throw error
  return { alreadyExists: false, friendship: data }
}

export async function acceptFriendRequest(friendshipId) {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectFriendRequest(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

export async function getFriends(userId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .eq('status', 'accepted')
  if (error) throw error

  const friendIds = (data || []).map(f => f.user1_id === userId ? f.user2_id : f.user1_id)
  if (friendIds.length === 0) return []

  const { data: infos } = await supabase.from('friend_codes').select('*').in('user_id', friendIds)

  return data.map(f => {
    const fid = f.user1_id === userId ? f.user2_id : f.user1_id
    const info = infos?.find(i => i.user_id === fid)
    return { friendshipId: f.id, userId: fid, displayName: info?.display_name || 'Joueur WTF!', avatarUrl: info?.avatar_url, code: info?.code, since: f.accepted_at }
  })
}

export async function getPendingRequests(userId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('*')
    .eq('user2_id', userId)
    .eq('status', 'pending')
  if (error) throw error

  const senderIds = (data || []).map(f => f.user1_id)
  if (senderIds.length === 0) return []

  const { data: infos } = await supabase.from('friend_codes').select('*').in('user_id', senderIds)

  return data.map(f => {
    const info = infos?.find(i => i.user_id === f.user1_id)
    return { friendshipId: f.id, userId: f.user1_id, displayName: info?.display_name || 'Joueur WTF!', avatarUrl: info?.avatar_url, since: f.created_at }
  })
}

export async function removeFriend(friendshipId) {
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

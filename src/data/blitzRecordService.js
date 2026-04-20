// blitzRecordService — CRUD table blitz_records (Supabase).
//
// Shape : { id, user_id, variant, category_id, palier, score, time_seconds, created_at }
// - variant : 'rush' | 'speedrun'
// - rush : category_id=null, palier=null, score=nb bonnes, time_seconds=null (ou 60)
// - speedrun : category_id+palier obligatoires, time_seconds=temps final, score=nb bonnes
//
// Chaque run est historisée (pas d'UPDATE). L'agrégation "meilleur record"
// par (variant, cat, palier) se fait côté lecture.

import { supabase } from '../lib/supabase'

/**
 * Insère un nouveau record Blitz. Retourne la ligne créée (ou null si erreur).
 * Ne throw jamais — le save record ne doit pas bloquer le flow joueur.
 */
export async function saveBlitzRecord({ userId, variant, categoryId = null, palier = null, score, timeSeconds = null }) {
  if (!userId || !variant) return null
  try {
    const { data, error } = await supabase
      .from('blitz_records')
      .insert({
        user_id: userId,
        variant,
        category_id: categoryId,
        palier,
        score,
        time_seconds: timeSeconds,
      })
      .select()
      .single()
    if (error) {
      console.warn('[blitzRecord] save failed:', error.message)
      return null
    }
    return data
  } catch (e) {
    console.warn('[blitzRecord] save exception:', e?.message || e)
    return null
  }
}

/**
 * Retourne tous les records du user agrégés par (variant, cat, palier).
 * Garde le MEILLEUR : max score (rush) ou min time_seconds (speedrun).
 */
export async function getMyBlitzRecords(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('blitz_records')
      .select('id, variant, category_id, palier, score, time_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error || !data) return []
    const byKey = new Map()
    for (const r of data) {
      const key = `${r.variant}_${r.category_id || 'all'}_${r.palier || 0}`
      const cur = byKey.get(key)
      if (!cur) { byKey.set(key, r); continue }
      if (r.variant === 'rush') {
        if ((r.score ?? 0) > (cur.score ?? 0)) byKey.set(key, r)
      } else {
        if (r.time_seconds != null && (cur.time_seconds == null || r.time_seconds < cur.time_seconds)) {
          byKey.set(key, r)
        }
      }
    }
    return Array.from(byKey.values())
  } catch (e) {
    console.warn('[blitzRecord] getMy exception:', e?.message || e)
    return []
  }
}

/**
 * Leaderboard entre amis pour un triplet (variant, cat?, palier?).
 * Rush : category_id/palier ignorés (pool all). Tri par score desc.
 * Speedrun : cat+palier obligatoires. Tri par time_seconds asc.
 * Retourne 1 ligne par user (son meilleur).
 */
export async function getFriendsLeaderboard({ variant, categoryId = null, palier = null, userIds }) {
  if (!Array.isArray(userIds) || userIds.length === 0) return []
  try {
    let q = supabase
      .from('blitz_records')
      .select('user_id, variant, category_id, palier, score, time_seconds, created_at')
      .eq('variant', variant)
      .in('user_id', userIds)
    if (variant === 'speedrun') {
      if (!categoryId || !palier) return []
      q = q.eq('category_id', categoryId).eq('palier', palier)
    }
    const { data, error } = await q.limit(500)
    if (error || !data) return []
    const byUser = new Map()
    for (const r of data) {
      const cur = byUser.get(r.user_id)
      if (!cur) { byUser.set(r.user_id, r); continue }
      if (variant === 'rush') {
        if ((r.score ?? 0) > (cur.score ?? 0)) byUser.set(r.user_id, r)
      } else {
        if (r.time_seconds != null && r.time_seconds < cur.time_seconds) byUser.set(r.user_id, r)
      }
    }
    const list = Array.from(byUser.values())
    list.sort((a, b) => {
      if (variant === 'rush') return (b.score ?? 0) - (a.score ?? 0)
      return (a.time_seconds ?? Infinity) - (b.time_seconds ?? Infinity)
    })
    return list
  } catch (e) {
    console.warn('[blitzRecord] leaderboard exception:', e?.message || e)
    return []
  }
}

/**
 * Historique des N dernières runs d'un user (pour graphique progression).
 */
export async function getMyBlitzHistory(userId, { variant = null, categoryId = null, palier = null, limit = 20 } = {}) {
  if (!userId) return []
  try {
    let q = supabase
      .from('blitz_records')
      .select('id, variant, category_id, palier, score, time_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (variant) q = q.eq('variant', variant)
    if (categoryId) q = q.eq('category_id', categoryId)
    if (palier) q = q.eq('palier', palier)
    const { data, error } = await q
    if (error || !data) return []
    return data
  } catch (e) {
    console.warn('[blitzRecord] history exception:', e?.message || e)
    return []
  }
}

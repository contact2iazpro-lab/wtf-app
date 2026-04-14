// ─── Duel Service ──────────────────────────────────────────────────────────
// Gestion du système de duels persistants entre 2 joueurs.
// Un duel = une relation durable entre 2 users, avec des "rounds" (challenges)
// empilés dessus. Chaque round a un winner, une expiration, et des flags seen.

import { supabase } from '../lib/supabase'

/**
 * Normalise les 2 IDs pour garantir player1_id < player2_id.
 * La table duels a une contrainte UNIQUE + CHECK qui exige cet ordre.
 */
export function normalizePair(userAId, userBId) {
  if (userAId < userBId) return { player1_id: userAId, player2_id: userBId }
  return { player1_id: userBId, player2_id: userAId }
}

/**
 * Récupère ou crée un duel entre 2 joueurs.
 * @returns Object duel ou null si erreur
 */
export async function getOrCreateDuel(userAId, userBId) {
  if (!userAId || !userBId || userAId === userBId) return null
  const { player1_id, player2_id } = normalizePair(userAId, userBId)

  // Lookup existant
  const { data: existing, error: selErr } = await supabase
    .from('duels')
    .select('*')
    .eq('player1_id', player1_id)
    .eq('player2_id', player2_id)
    .maybeSingle()
  if (selErr) console.warn('[duelService] getOrCreateDuel select error:', selErr.message)
  if (existing) return existing

  // Création
  const { data: created, error: insErr } = await supabase
    .from('duels')
    .insert({ player1_id, player2_id })
    .select()
    .single()
  if (insErr) {
    console.warn('[duelService] getOrCreateDuel insert error:', insErr.message)
    return null
  }
  return created
}

/**
 * Récupère tous les duels impliquant l'user (pour SocialPage / liste amis).
 * @returns Array [{ duel, lastRound, state }]
 */
export async function getUserDuels(userId) {
  if (!userId) return []
  const { data: duels, error } = await supabase
    .from('duels')
    .select('*')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .order('updated_at', { ascending: false })
  if (error) {
    console.warn('[duelService] getUserDuels error:', error.message)
    return []
  }
  if (!duels || duels.length === 0) return []

  // Pour chaque duel, récupérer le dernier round
  const duelIds = duels.map(d => d.id)
  const { data: rounds } = await supabase
    .from('challenges')
    .select('*')
    .in('duel_id', duelIds)
    .order('created_at', { ascending: false })

  return duels.map(duel => {
    const roundsOfDuel = (rounds || []).filter(r => r.duel_id === duel.id)
    const lastRound = roundsOfDuel[0] || null
    return { duel, lastRound, allRounds: roundsOfDuel }
  })
}

/**
 * Calcule l'état d'un duel pour un user donné — utilisé pour afficher
 * le bon bouton/label à côté de chaque ami dans SocialPage.
 *
 * @returns {Object} { label, action, disabled, pending, hasResultToSee, opponentId }
 */
/**
 * Calcule l'état d'un seul round (challenge).
 * Helper interne pour computeAllDuelStates.
 */
function computeRoundState(round, meId) {
  // isMe1 dérivé du round (le créateur), PAS du duel (normalisé alphabétiquement)
  const isMe1 = round.player1_id === meId
  const myField = isMe1 ? 'player1_time' : 'player2_time'
  const theirField = isMe1 ? 'player2_time' : 'player1_time'
  const mySeenField = isMe1 ? 'seen_by_p1' : 'seen_by_p2'

  // Round expiré
  const isExpiredByDate = round.expires_at
    && new Date(round.expires_at) < new Date()
    && round.status === 'pending'
  if (round.status === 'expired' || isExpiredByDate) {
    return null // Expiré, ne pas afficher
  }

  // Round pending : un des 2 doit encore jouer
  if (round.status === 'pending') {
    const iHavePlayed = round[myField] != null
    const theyHavePlayed = round[theirField] != null
    if (iHavePlayed && !theyHavePlayed) {
      return { label: '⏳ Attente', action: null, disabled: true, pending: true }
    }
    if (!iHavePlayed && theyHavePlayed) {
      return { label: '🎯 Relever', action: 'accept', disabled: false }
    }
    // Aucun n'a joué → ne pas afficher
    return null
  }

  // Round complété : voir résultat OU revanche
  if (round.status === 'completed') {
    const iveSeenIt = round[mySeenField] === true
    if (!iveSeenIt) {
      return { label: '🏆 Résultat', action: 'view', disabled: false, hasResultToSee: true }
    }
    return { label: '⚔️ Revanche', action: 'rematch', disabled: false, canDecline: true }
  }

  return null
}

/**
 * Calcule l'état de TOUS les défis d'un duel (pas juste le dernier).
 * Retourne une liste de { label, action, disabled, code, created_at, ...state }
 * Filtre les défis refusés (challenges.declined_by côté Supabase, multi-device)
 */
export function computeAllDuelStates(duel, allRounds, meId) {
  if (!duel) return []

  const states = []

  // Traiter tous les rounds, du plus récent au plus ancien
  for (const round of allRounds) {
    // Passer les défis refusés par moi (persisté Supabase)
    if (Array.isArray(round.declined_by) && round.declined_by.includes(meId)) continue

    const roundState = computeRoundState(round, meId)
    if (roundState) {
      states.push({
        ...roundState,
        roundId: round.id,
        code: round.code,
        categoryId: round.category_id,
        categoryLabel: round.category_label,
        questionCount: round.question_count,
        created_at: round.created_at,
      })
    }
  }

  return states
}

/**
 * Marque un round comme refusé par le user courant (revanche déclinée).
 * Persisté côté Supabase via RPC decline_round → multi-device.
 */
export async function declineRound(roundId) {
  if (!roundId) return { error: 'missing roundId' }
  const { error } = await supabase.rpc('decline_round', { p_round_id: roundId })
  if (error) {
    console.warn('[duelService] declineRound error:', error.message)
    return { error: error.message }
  }
  return { ok: true }
}

/**
 * Calcule l'état d'un duel pour un user donné — utilisé pour afficher
 * le bon bouton/label à côté de chaque ami dans SocialPage.
 *
 * @returns {Object} { label, action, disabled, pending, hasResultToSee, opponentId }
 */
export function computeDuelState(duel, lastRound, meId) {
  if (!duel || !lastRound) {
    return { label: '⚔️ Défier', action: 'create', disabled: false }
  }

  const state = computeRoundState(lastRound, meId)

  // Si le dernier round n'est pas affichable, revenir à "Défier"
  if (!state) {
    return { label: '⚔️ Défier', action: 'create', disabled: false }
  }

  return { ...state, roundId: lastRound.id }
}

/**
 * Crée un nouveau round (challenge) dans un duel existant ou nouveau.
 * Appelé quand le joueur A finit son Blitz et envoie le défi à B.
 */
export async function createDuelRound({
  duelId, categoryId, categoryLabel, questionCount,
  player1Time, player1Id, player1Name,
  opponentId,
}) {
  // 48h expiration
  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString()
  // Génère un code unique partageable
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      duel_id: duelId,
      code,
      category_id: categoryId,
      category_label: categoryLabel,
      question_count: questionCount,
      player1_id: player1Id,
      player1_name: player1Name,
      player1_time: player1Time,
      player2_id: opponentId || null, // pré-assigné si on connaît l'adversaire
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single()
  if (error) {
    console.error('[duelService] createDuelRound error:', error.message)
    throw error
  }
  return data
}

/**
 * Complète un round (appelé quand player2 joue son Blitz en relevant le défi).
 * Le trigger SQL auto-calcule winner + met à jour duels stats.
 */
export async function completeDuelRound({ roundId, playerTime, playerId, playerName }) {
  const { data, error } = await supabase
    .from('challenges')
    .update({
      player2_id: playerId,
      player2_name: playerName,
      player2_time: playerTime,
      status: 'completed',
    })
    .eq('id', roundId)
    .select()
    .single()
  if (error) {
    console.error('[duelService] completeDuelRound error:', error.message)
    throw error
  }
  return data
}

/**
 * Marque un round comme "vu" côté user courant (ferme le badge "résultat à voir").
 */
export async function markRoundSeen(roundId, userId) {
  // Lire pour savoir si user est player1 ou player2
  const { data: round } = await supabase
    .from('challenges')
    .select('player1_id, player2_id, seen_by_p1, seen_by_p2')
    .eq('id', roundId)
    .maybeSingle()
  if (!round) return null

  const field = round.player1_id === userId ? 'seen_by_p1'
              : round.player2_id === userId ? 'seen_by_p2'
              : null
  if (!field) return null
  if (round[field]) return round // déjà vu

  const { data, error } = await supabase
    .from('challenges')
    .update({ [field]: true })
    .eq('id', roundId)
    .select()
    .single()
  if (error) console.warn('[duelService] markRoundSeen error:', error.message)
  return data
}

/**
 * Historique complet d'un duel (pour DuelHistoryScreen).
 * @returns Array de rounds du plus récent au plus ancien
 */
export async function getDuelHistory(userAId, userBId, limit = 50) {
  const duel = await getOrCreateDuel(userAId, userBId)
  if (!duel) return { duel: null, rounds: [] }
  const { data: rounds } = await supabase
    .from('challenges')
    .select('*')
    .eq('duel_id', duel.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { duel, rounds: rounds || [] }
}

/**
 * Stats par catégorie d'un duel (pour savoir où on bat notre ami).
 * @returns { perCategory: [{ category, p1_wins, p2_wins }], ... }
 */
export function computeDuelStatsByCategory(rounds, meId, opponentId) {
  const stats = {}
  for (const r of rounds) {
    if (r.status !== 'completed') continue
    const cat = r.category_id || 'all'
    if (!stats[cat]) stats[cat] = { category: cat, categoryLabel: r.category_label, meWins: 0, opponentWins: 0, ties: 0, total: 0 }
    stats[cat].total += 1
    if (r.winner_id === meId) stats[cat].meWins += 1
    else if (r.winner_id === opponentId) stats[cat].opponentWins += 1
    else stats[cat].ties += 1
  }
  return Object.values(stats).sort((a, b) => b.total - a.total)
}

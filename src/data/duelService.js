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
  let rematchAlreadyShown = false

  // Traiter tous les rounds, du plus récent au plus ancien
  for (const round of allRounds) {
    // Passer les défis refusés par moi (persisté Supabase)
    if (Array.isArray(round.declined_by) && round.declined_by.includes(meId)) continue

    const roundState = computeRoundState(round, meId)
    if (roundState) {
      // Revanche unique : seul le round complété le plus récent garde l'action
      // 'rematch'. Pour les plus anciens, on dégrade en 'view' (juste voir le
      // résultat, plus de bouton revanche).
      let finalState = roundState
      if (roundState.action === 'rematch') {
        if (rematchAlreadyShown) {
          finalState = { label: '🏆 Résultat', action: 'view', disabled: false }
        } else {
          rematchAlreadyShown = true
        }
      }
      states.push({
        ...finalState,
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
 * RPC atomique (Palier 3) — upsert duel + insert challenge + génération code.
 * Cf. supabase/migrations/add_create_duel_challenge_rpc.sql
 *
 * Note : le débit des 200 coins se fait côté client via applyCurrencyDelta
 * dans useBlitzHandlers.
 * Retourne { challenge_id, code, duel_id, ... } ou throw en cas d'erreur.
 */
export async function createDuelChallenge({
  opponentId, categoryId, categoryLabel, questionCount,
  player1Time, player1Correct, player1Name, variant = 'rush',
}) {
  const { data, error } = await supabase.rpc('create_duel_challenge', {
    p_opponent_id: opponentId || null,
    p_category_id: categoryId,
    p_category_label: categoryLabel,
    p_question_count: questionCount,
    p_player1_time: player1Time,
    p_player1_correct: player1Correct,
    p_player1_name: player1Name,
    p_variant: variant,
  })
  if (error) {
    console.error('[duelService] create_duel_challenge RPC error:', error.message)
    throw error
  }
  return data
}

/**
 * Accepte un défi et débite immédiatement les 100 coins du player2.
 * Appelé AVANT de lancer la partie (ChallengeScreen → start Blitz).
 * Idempotent : si déjà accepté (reload), retourne { already_accepted: true }.
 */
export async function acceptDuelChallenge(challengeId) {
  const { data, error } = await supabase.rpc('accept_duel_challenge', {
    p_challenge_id: challengeId,
  })
  if (error) {
    console.error('[duelService] accept_duel_challenge RPC error:', error.message)
    throw error
  }
  return data
}

/**
 * Complète un round (appelé quand player2 joue son Blitz en relevant le défi).
 * Le trigger SQL auto-calcule winner + met à jour duels stats.
 * Note : si accept_duel_challenge a déjà débité 100c, complete_duel_round
 * skip le débit (détecte via player2_accepted_at).
 */
export async function completeDuelRound({ roundId, playerTime, playerCorrect, playerId: _playerId, playerName }) {
  // Passe par la RPC atomique `complete_duel_round` : debit 100c accepteur +
  // update challenge + trigger winner + credit 150c winner (ou refund 100c
  // chacun si égalité parfaite). Tout en 1 transaction.
  const { data, error } = await supabase.rpc('complete_duel_round', {
    p_challenge_id: roundId,
    p_player_time: playerTime,
    p_player_correct: playerCorrect,
    p_player_name: playerName,
  })
  if (error) {
    console.error('[duelService] complete_duel_round RPC error:', error.message)
    throw error
  }
  return data
}

/**
 * Marque tous les challenges pending dont expires_at < NOW() comme 'expired'
 * et rembourse les 100c misés au créateur. Idempotent — peut être appelé
 * sans risque à chaque mount de SocialPage / MultiPage.
 */
export async function expirePendingChallenges() {
  const { data, error } = await supabase.rpc('expire_pending_challenges')
  if (error) {
    console.warn('[duelService] expire_pending_challenges failed:', error.message)
    return 0
  }
  return data || 0
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

/**
 * Stats par parcours (nb de questions) d'un duel.
 * Permet de voir les matchs gagnés regroupés par format (5Q, 10Q, 20Q, …).
 */
export function computeDuelStatsByQuestionCount(rounds, meId, opponentId) {
  const stats = {}
  for (const r of rounds) {
    if (r.status !== 'completed') continue
    const qc = r.question_count || 0
    if (!stats[qc]) stats[qc] = { questionCount: qc, meWins: 0, opponentWins: 0, ties: 0, total: 0 }
    stats[qc].total += 1
    if (r.winner_id === meId) stats[qc].meWins += 1
    else if (r.winner_id === opponentId) stats[qc].opponentWins += 1
    else stats[qc].ties += 1
  }
  return Object.values(stats).sort((a, b) => a.questionCount - b.questionCount)
}

/**
 * challengeService — lecture et création "simple" de challenges.
 *
 * Pour le flow complet (défi entre amis avec debit ticket atomique + upsert duel),
 * voir `duelService.createDuelChallenge` (RPC Palier 3).
 * Ce service est conservé pour :
 *   - `getChallenge` → lecture d'un code partagé (ChallengeScreen)
 *   - `createChallenge` → flow solo post-Blitz "Défier un ami" (BlitzResultsScreen)
 *     qui crée un challenge sans duel_id ni debit ticket (sharing score).
 */

import { supabase } from '../lib/supabase'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Créer un défi "share score" (solo post-Blitz, pas de duel associé, pas de ticket débité)
export async function createChallenge({ categoryId, categoryLabel, questionCount, playerTime, playerId, playerName }) {
  const code = generateCode()

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      code,
      category_id: categoryId,
      category_label: categoryLabel,
      question_count: questionCount,
      player1_id: playerId,
      player1_name: playerName,
      player1_time: playerTime,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Récupérer un défi par code
export async function getChallenge(code) {
  if (!code) throw new Error('missing code')
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('Défi introuvable')
  return data
}

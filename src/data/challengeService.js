import { supabase, supabaseLight } from '../lib/supabase'

// Générer un code unique de 6 caractères (pas de I, O, 0, 1 pour éviter la confusion)
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Créer un défi
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
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (error) throw error
  return data
}

// Compléter un défi (joueur 2)
export async function completeChallenge({ challengeId, playerTime, playerId, playerName }) {
  const { data, error } = await supabase
    .from('challenges')
    .update({
      player2_id: playerId,
      player2_name: playerName,
      player2_time: playerTime,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Récupérer les défis d'un joueur
export async function getPlayerChallenges(playerId) {
  const { data, error } = await supabaseLight
    .from('challenges')
    .select('*')
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data || []
}

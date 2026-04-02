import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')
    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body
    const { question, short_answer, explanation, category, hint1, hint2 } = await req.json()
    if (!question || !short_answer) {
      return new Response(JSON.stringify({ error: 'question et short_answer requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Anthropic API key
    const anthropicKey = Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_KEY non configurée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build prompt
    const prompt = `Tu es un assistant pour le jeu WTF! Facts (quiz en français avec des anecdotes surprenantes).
On te donne un fact existant et tu dois l'enrichir avec des indices et des fausses réponses.

FACT :
- Question : ${question}
- Réponse : ${short_answer}
- Explication : ${explanation || '(non fournie)'}
- Catégorie : ${category || '(non fournie)'}
- Indice 1 actuel : ${hint1 || '(vide)'}
- Indice 2 actuel : ${hint2 || '(vide)'}

TÂCHE :
Génère les données suivantes en JSON :

1. "hint1" : Si l'indice 1 actuel fait plus d'un mot, reformule-le en UN SEUL MOT pertinent. Sinon garde-le tel quel. Si vide, invente-en un.
2. "hint2" : Même règle pour l'indice 2.
3. "hint3" : Un 3ème indice en UN SEUL MOT, différent des deux premiers, en lien avec le fact mais sans donner la réponse.
4. "hint4" : Un 4ème indice en UN SEUL MOT, différent des trois autres.
5. "funny_wrong_1" : Une fausse réponse clairement fausse mais drôle, qui fait sourire (1 à 5 mots max).
6. "funny_wrong_2" : Une autre fausse réponse drôle et absurde (1 à 5 mots max).
7. "close_wrong_1" : Une fausse réponse très proche de la vraie réponse, qui pourrait tromper (1 à 5 mots max).
8. "close_wrong_2" : Une autre fausse réponse proche (1 à 5 mots max).
9. "plausible_wrong_1" : Une fausse réponse plausible dans l'univers du fact, fausse mais crédible (1 à 5 mots max).
10. "plausible_wrong_2" : Une autre fausse réponse plausible (1 à 5 mots max).
11. "plausible_wrong_3" : Une 3ème fausse réponse plausible (1 à 5 mots max).

RÈGLES STRICTES :
- Les 4 indices (hint1 à hint4) doivent être UN SEUL MOT chacun, sans espace, sans ponctuation
- Les fausses réponses drôles doivent faire sourire ou être absurdes
- Les fausses réponses proches doivent ressembler à la vraie réponse
- Les fausses réponses plausibles doivent sembler vraies sans l'être
- Toutes les réponses en français

Retourne UNIQUEMENT un objet JSON valide avec ces 11 clés, SANS texte avant ni après.`

    // Call Anthropic (Opus)
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return new Response(JSON.stringify({ error: `Erreur Anthropic (${anthropicRes.status}): ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await anthropicRes.json()
    const text = data.content[0].text.trim()

    // Extract JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Réponse API invalide — pas de JSON trouvé' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = JSON.parse(jsonMatch[0])

    // Validate expected keys
    const expectedKeys = [
      'hint1', 'hint2', 'hint3', 'hint4',
      'funny_wrong_1', 'funny_wrong_2',
      'close_wrong_1', 'close_wrong_2',
      'plausible_wrong_1', 'plausible_wrong_2', 'plausible_wrong_3',
    ]
    for (const key of expectedKeys) {
      if (!result[key] || typeof result[key] !== 'string') {
        return new Response(JSON.stringify({ error: `Clé manquante ou invalide dans la réponse : ${key}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

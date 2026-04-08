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
    const prompt = `Tu es le redacteur en chef de "What The F*ct!", un jeu de trivia mobile francais ou chaque question doit provoquer une reaction forte chez le joueur. Ce n'est PAS un quiz scolaire. C'est un jeu de faits incroyables, absurdes, droles et surprenants.

On te donne un fact existant et tu dois l'enrichir avec des indices, une explication fun, et des fausses réponses WTF!.

FACT :
- Question : ${question}
- Réponse : ${short_answer}
- Explication : ${explanation || '(non fournie)'}
- Catégorie : ${category || '(non fournie)'}
- Indice 1 actuel : ${hint1 || '(vide)'}
- Indice 2 actuel : ${hint2 || '(vide)'}

=== RÈGLES INDICES ===

Les indices hint1 et hint2 doivent etre des PHRASES COURTES (MAX 20 CARACTERES), PAS un seul mot.
Un indice est un PONT vers la reponse : il aide le joueur a eliminer des mauvaises reponses.

INTERDIT :
- Repeter un mot ou concept de la question
- Etre trop evident (ex: la definition meme du terme cherche)
- N'aider que celui qui connait deja (ex: detail d'expert)

BON INDICE :
- Reduit le champ des possibles
- Cree une image mentale

Exemples :
❌ Question "cartons rouges" → Indice "Expulsion" = definition du carton rouge
✅ Question "cartons rouges" → Indice "Match 5eme div." = oriente vers amateur/chaos
❌ Question "cadeau Noel" → Indice "Argentine" = seul un expert saurait
✅ Question "cadeau Noel" → Indice "Suivi temps reel" = oriente vers tracking/connecte

=== EXPLICATION ===

Si l'explication existe et fait >= 200 caracteres, garde-la.
Sinon, genere une explication ENTRE 200 ET 300 CARACTERES.

Ton "pote au bar" PAS encyclopedique :
BON : "A ce rythme-la, si tu battais des bras aussi vite, tu t'envolerais... ou tu te deboiterais les epaules"
MAUVAIS : "Selon une etude publiee dans le Journal of..."

=== FAUSSES REPONSES ===

"funny_wrong_1", "funny_wrong_2" : DROLES et absurdes, font sourire ou rire
"close_wrong_1", "close_wrong_2" : PROCHES de la vraie, credibles et piegeuses
"plausible_wrong_1", "plausible_wrong_2", "plausible_wrong_3" : PLAUSIBLES, fausses mais sonnent vraies

La bonne reponse doit etre celle qui semble la MOINS probable (effet WTF!).

=== TÂCHE ===

Genere un objet JSON avec :
1. "hint1" : Phrase courte MAX 20 caracteres. Si vide, invente-en une. Sinon reformule en respectant les regles.
2. "hint2" : Idem.
3. "hint3" : "" (vide, pour compatibilite)
4. "hint4" : "" (vide, pour compatibilite)
5. "funny_wrong_1" : Fausse reponse drole (1-5 mots max)
6. "funny_wrong_2" : Fausse reponse drole absurde (1-5 mots max)
7. "close_wrong_1" : Fausse reponse proche (1-5 mots max)
8. "close_wrong_2" : Fausse reponse proche (1-5 mots max)
9. "plausible_wrong_1" : Fausse reponse plausible (1-5 mots max)
10. "plausible_wrong_2" : Fausse reponse plausible (1-5 mots max)
11. "plausible_wrong_3" : Fausse reponse plausible (1-5 mots max)
12. "explanation" : Explication 200-300 caracteres, ton fun decale. Si l'explication fournie >= 200 caracteres, tu peux la garder. Sinon genere-la.

REGLES STRICTES :
- Tous les indices en francais
- Tous les indices MAX 20 caracteres
- Toutes les fausses reponses en francais
- Explication ENTRE 200 ET 300 CARACTERES (ne pas depasser)
- hint3 et hint4 TOUJOURS "" (vide)

Retourne UNIQUEMENT un objet JSON valide avec ces 12 clés, SANS texte avant ni après.`

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
        max_tokens: 2048,
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
      'explanation',
    ]
    for (const key of expectedKeys) {
      if (typeof result[key] !== 'string') {
        return new Response(JSON.stringify({ error: `Clé manquante ou invalide dans la réponse : ${key}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Tronquer les indices si trop longs (max 20 caractères)
    if (result.hint1 && result.hint1.length > 20) {
      result.hint1 = result.hint1.substring(0, 20).trim()
    }
    if (result.hint2 && result.hint2.length > 20) {
      result.hint2 = result.hint2.substring(0, 20).trim()
    }

    // Explication : si < 200 chars, garder l'ancienne
    const newExplanationLength = (result.explanation || '').length
    if (newExplanationLength < 200) {
      // Fallback to original explanation if new one is too short
      result.explanation = explanation || ''
      console.log(`Fact: explication générée trop courte (${newExplanationLength} chars), utilisation de l'ancienne`)
    } else if (newExplanationLength > 300) {
      // Tronquer si trop longue
      result.explanation = result.explanation.substring(0, 300).trim()
      console.log(`Fact: explication tronquée de ${newExplanationLength} à 300 chars`)
    }
    if (result.hint3 !== '' || result.hint4 !== '') {
      return new Response(JSON.stringify({ error: 'hint3 et hint4 doivent être vides ("")' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

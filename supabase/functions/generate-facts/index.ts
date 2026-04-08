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
    const { category, categoryLabel, count, difficulty_distribution, theme } = await req.json()
    // Limiter à 10 facts max par appel pour éviter les JSON tronqués
    const safeCount = Math.min(count || 5, 10)
    if (!category || !count) {
      return new Response(JSON.stringify({ error: 'category et count requis' }), {
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

    // ── Fetch existing facts for deduplication ──────────────────────────
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    let existingFacts: { question: string; short_answer: string }[] = []

    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const existResp = await fetch(
          `${SUPABASE_URL}/rest/v1/facts?select=question,short_answer&order=id.asc`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        )
        if (existResp.ok) {
          existingFacts = await existResp.json()
        }
      } catch (_) {
        // Continue without dedup if fetch fails
      }
    }

    // Build dedup context (first 80 chars of each question + answer)
    const existingList = existingFacts
      .map((f: any) => `- Q: ${(f.question || '').slice(0, 80)} | R: ${(f.short_answer || '').slice(0, 50)}`)
      .join('\n')
    const dedupBlock = existingFacts.length > 0
      ? `\n\nFACTS EXISTANTS (NE PAS DUPLIQUER — si un sujet/réponse est trop similaire, choisis un autre sujet) :\n${existingList}`
      : ''

    // ── Build prompt ────────────────────────────────────────────────────
    const themeContext = theme
      ? `\n\nTHEME PERSONNALISE : "${theme}" — utilise ce theme comme contexte additionnel et inspiration pour generer les facts. Les facts doivent rester dans la categorie "${categoryLabel || category}", mais s'inspirer fortement du theme propose.`
      : ''

    const prompt = `Tu es le redacteur en chef de "What The F*ct!", un jeu de trivia mobile francais ou chaque question doit provoquer une reaction forte chez le joueur. Ce n'est PAS un quiz scolaire. C'est un jeu de faits incroyables, absurdes, droles et surprenants.

Genere exactement ${safeCount} facts sur la categorie "${categoryLabel || category}".${themeContext}

=== REGLES DE FORMULATION ===

1. CHAQUE fact doit provoquer une REACTION FORTE : rire, surprise, choc, incredulite, etonnement ou absurdite.

2. PRIORISE des questions qui ne soient PAS des quiz d'identification ("Quel animal...", "Quel pays...", "Qui a invente..."). Ces formats sont autorises occasionnellement si le fact est suffisamment fou en lui-meme, mais la majorite des questions doivent creer une image mentale absurde ou intrigante.

Le WTF! doit etre dans la REPONSE, pas dans la QUESTION. La question plante le decor et intrigue. La reponse fait "WTF!".
Exemple MAUVAIS : "Quel criminel a ete trahi par le GPS de sa chaussure connectee ?" (tu devoiles tout!)
Exemple BON : "Pourquoi un criminel en fuite a-t-il maudit son cadeau de Noel ?" (suspense → reponse "ses chaussures connectees" = WTF!)

3. TECHNIQUES A UTILISER (au moins 1 par fact) :
   a) ABSURDE HUMANISANT : personnifier un animal/objet dans une situation humaine absurde
   b) RETOURNEMENT : la reponse est completement inattendue par rapport a la question
   c) EXAGERATION VISUELLE : comparaison avec le quotidien qui cree une image mentale WTF
   d) HUMOUR DECALE : question formulee avec ironie, derision ou absurdite
   e) CHIFFRE INCONCEVABLE : un nombre tellement extreme qu'il semble impossible

4. Le "LE SAVIEZ-VOUS" (explanation) doit etre FUN, pas encyclopedique (ENTRE 200 ET 300 CARACTERES).
   INTERDIT : "Selon une etude publiee dans le Journal of..."
   BON : "A ce rythme-la, si tu battais des bras aussi vite, tu t'envolerais... ou tu te deboiterais les epaules"
   Le ton est celui d'un pote qui raconte un truc dingue au bar, PAS un prof.

5. LES FAUSSES REPONSES :
   - "funny_wrong_1", "funny_wrong_2" : DROLES et absurdes, font sourire ou rire
   - "close_wrong_1", "close_wrong_2" : PROCHES de la vraie, credibles et piegeuses
   - "plausible_wrong_1", "plausible_wrong_2", "plausible_wrong_3" : PLAUSIBLES dans l'univers WTF, fausses mais sonnent vraies
   La bonne reponse doit etre celle qui semble la MOINS probable (effet WTF!)

6. LES INDICES — REGLES CRITIQUES :
   Chaque indice est une PHRASE COURTE (MAX 20 CARACTERES), PAS un mot isole.
   Un indice est un PONT vers la reponse : il aide le joueur a eliminer des mauvaises reponses.

   INTERDIT — Indice qui repete la question :
   Question contient "GPS" → Indice "Geolocalisation" = INUTILE, le joueur le sait deja

   INTERDIT — Indice trop evident :
   Question "cartons rouges" → Indice "Expulsion" ou "Arbitre" = c'est la definition meme d'un carton rouge

   INTERDIT — Indice qui n'aide que celui qui connait deja :
   Indice "Argentine" quand le match etait en Argentine = seul un expert connaitrait ce detail

   BON INDICE — Reduit le champ des possibles :
   "Match de 5eme div." (oriente vers amateur/chaos)
   "Plus que 22 joueurs" (aide a comprendre l'echelle)

   BON INDICE — Cree une image mentale :
   "Cadeau de Noel" (oriente vers objet connecte)
   "Suivi en temps reel" (le joueur comprend : tracking)

   hint1 : SUBTIL — oriente sans donner la direction exacte (MAX 20 CARACTERES)
   hint2 : PLUS DIRECT — reduit a 2-3 choix possibles (MAX 20 CARACTERES)
   Un indice ne doit JAMAIS repeter un mot ou concept de la question.
   Un indice doit apporter une NOUVELLE information.

=== VERIFICATION DOUBLONS ===

Les facts suivants existent deja dans TOUTES les categories. Ne PAS generer de fact sur le meme sujet, meme si la categorie est differente. Exemple : un fact sur un fugitif et ses chaussures connectees dans "Crimes" et dans "Lois et Regles" = DOUBLON a eviter.
${dedupBlock}

=== FORMAT DE SORTIE ===

POUR CHAQUE FACT, retourne un objet JSON avec ces champs :
1. "question" : question qui intrigue et cree du suspense (max 100 caracteres)
2. "short_answer" : la bonne reponse, courte et percutante (max 50 caracteres)
3. "explanation" : le "Saviez-vous" fun et decale (ENTRE 200 ET 300 CARACTERES, ton pote au bar)
4. "hint1" : indice subtil, phrase courte (MAX 20 CARACTERES, PAS un seul mot)
5. "hint2" : indice plus direct, phrase courte (MAX 20 CARACTERES, PAS un seul mot)
6. "hint3" : "" (vide, reserve pour usage futur)
7. "hint4" : "" (vide, reserve pour usage futur)
8. "funny_wrong_1", "funny_wrong_2" : 2 fausses reponses DROLES et absurdes (1 a 5 mots max)
9. "close_wrong_1", "close_wrong_2" : 2 fausses reponses PROCHES, credibles (1 a 5 mots max)
10. "plausible_wrong_1", "plausible_wrong_2", "plausible_wrong_3" : 3 fausses reponses PLAUSIBLES (1 a 5 mots max)
11. "source_url" : URL source verifiable si trouvable, sinon ""

Chaque fact doit etre VERIFIE et VRAI. Un fact faux = disqualification.
Les facts doivent etre VARIES — pas 3 facts sur le meme theme.
Privilegie les facts que la plupart des gens NE CONNAISSENT PAS.
Si un fact est trop connu, il n'est pas WTF! → passe.

Retourne UNIQUEMENT un tableau JSON valide de ${safeCount} objets, SANS texte avant ni apres.`

    // ── Call Anthropic (Opus) ────────────────────────────────────────────
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 16384,
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
    const stopReason = data.stop_reason // 'end_turn' or 'max_tokens'

    // Extract JSON array
    let jsonMatch = text.match(/\[[\s\S]*\]/)

    // If no closing bracket found but we have an opening one, the response was truncated
    if (!jsonMatch && text.includes('[')) {
      let truncated = text.slice(text.indexOf('['))
      // Try to repair: find last complete object (ends with })
      const lastBrace = truncated.lastIndexOf('}')
      if (lastBrace > 0) {
        truncated = truncated.slice(0, lastBrace + 1) + ']'
        jsonMatch = [truncated]
        console.warn(`JSON tronqué (stop_reason: ${stopReason}) — réparé en coupant après le dernier objet complet`)
      }
    }

    if (!jsonMatch) {
      return new Response(JSON.stringify({
        error: 'Réponse API invalide — pas de JSON trouvé',
        stop_reason: stopReason,
        raw_length: text.length,
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let facts: any[]
    try {
      facts = JSON.parse(jsonMatch[0])
    } catch (parseErr: any) {
      // Last resort: try to salvage complete objects from the truncated JSON
      try {
        const objects: any[] = []
        const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
        let match
        while ((match = objectRegex.exec(jsonMatch[0])) !== null) {
          try { objects.push(JSON.parse(match[0])) } catch { /* skip malformed */ }
        }
        if (objects.length > 0) {
          facts = objects
          console.warn(`JSON.parse échoué, ${objects.length} objets récupérés individuellement`)
        } else {
          throw parseErr
        }
      } catch {
        return new Response(JSON.stringify({
          error: `JSON invalide: ${parseErr.message}`,
          stop_reason: stopReason,
          raw_length: text.length,
          hint: stopReason === 'max_tokens' ? 'Réponse tronquée — réduisez le nombre de facts par appel' : undefined,
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!Array.isArray(facts)) {
      return new Response(JSON.stringify({ error: 'Réponse API invalide — pas un tableau' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Post-process: dedup against existing facts ──────────────────────
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç0-9\s]/g, '').trim()

    const existingNormalized = existingFacts.map((f: any) => ({
      q: normalize(f.question),
      a: normalize(f.short_answer),
    }))

    const isTooSimilar = (newFact: any) => {
      const nq = normalize(newFact.question)
      const na = normalize(newFact.short_answer)
      for (const ex of existingNormalized) {
        // Same answer AND question shares >60% of words
        if (na === ex.a) {
          const newWords = new Set(nq.split(/\s+/))
          const existWords = ex.q.split(/\s+/)
          const overlap = existWords.filter((w: string) => newWords.has(w)).length
          if (overlap / Math.max(existWords.length, 1) > 0.6) return true
        }
      }
      return false
    }

    // Filter out duplicates
    const uniqueFacts = facts.filter((f: any) => !isTooSimilar(f))

    // Attach difficulties and metadata
    const difficulties = difficulty_distribution || []
    const enrichedFacts = uniqueFacts.map((f: any, i: number) => ({
      ...f,
      difficulty: difficulties[i] || 'Normal',
      category,
      type: 'generated',
      status: 'draft',
      is_published: false,
      pack_id: 'free',
      correct_index: typeof f.correct_index === 'number' ? f.correct_index : 0,
    }))

    return new Response(JSON.stringify(enrichedFacts), {
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

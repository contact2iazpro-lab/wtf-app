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

    // ── Build prompt (unifié pipeline 4 étapes + 2 formulations par fact) ─
    const themeContext = theme
      ? `\n\nTHÈME PERSONNALISÉ : "${theme}" — utilise ce thème comme inspiration. Les faits restent dans la catégorie "${categoryLabel || category}" mais s'inspirent fortement du thème.`
      : ''

    const prompt = `Tu es l'auteur en chef de "What The F*ct!", jeu de trivia mobile français. Objectif : des faits qui font ARRÊTER LE SCROLL, lever un sourcil, déclencher un "sérieux ?!" et être racontés à des potes le soir même.

=== TEST DE VALIDATION UNIQUE ===

Pour chaque fait : "Est-ce qu'un joueur raconterait ce fact à ses potes au bar ce soir ?"
Si NON → passe, trouves-en un autre.

=== PIPELINE EN 4 ÉTAPES ===

ÉTAPE 1 — RECHERCHE FACTUELLE (utilise le tool web_search)
Trouve ${safeCount} faits RÉELS, VÉRIFIABLES et surprenants sur la catégorie "${categoryLabel || category}".${themeContext}
- Sources prioritaires : Wikipedia, .gov / .edu / .org, musées, presse établie.
- SPÉCIFICITÉ : noms propres, dates, lieux, chiffres exacts.
- ÉVITE : fun facts déjà ultra-viraux (Walt Disney peur des souris, Cléopâtre contemporaine des iPhones…).
- PRIVILÉGIE : faits obscurs mais vérifiables qui déclenchent l'effet WTF.
- Les ${safeCount} faits doivent être sur des SUJETS DIFFÉRENTS (pas 3 facts sur le même personnage).

ÉTAPE 2 — 7 ARCHÉTYPES DE FORMULATION
Pour chaque fait, choisis les 2 ARCHÉTYPES qui le mettent le MIEUX en scène :
1. ABSURDE INSTITUTIONNEL — Institution sérieuse + chose ridicule (ex: interdit en Suisse d'avoir 1 seul cochon d'Inde)
2. RETOURNEMENT TRAGIQUE — Setup héroïque → chute absurde (ex: survit aux chutes du Niagara, meurt d'une peau de banane)
3. PROXIMITÉ DÉRANGEANTE — Touche le corps, quotidien, nourriture (ex: 90% des billets US ont des traces de cocaïne)
4. EXISTENCE IMPOSSIBLE — Ne devrait pas exister mais existe (ex: Lolito a mangé un avion)
5. SURVIE / MORT ABSURDE — Survit à l'impossible ou meurt bêtement (ex: implants mammaires déviant une balle)
6. ANIMAL HUMAIN — Animal fait un truc très humain (ex: dauphins se droguant avec poissons-globes)
7. FORMULATION PIÈGE — Question oriente, réponse détruit l'attente (ex: célébrité videur de bar → pape François)

ÉTAPE 3 — CHOISIR LE MEILLEUR ARCHÉTYPE
Pour chaque fait, teste mentalement 2 archétypes de l'étape 2.
Retiens celui qui produit la formulation la plus percutante (wtf_score le plus élevé).

QUESTION (max 100 chars) :
- Crée une PRÉDICTION → la réponse la CONTREDIT (WTF DANS la réponse, pas dans la question)
- JAMAIS les mots "étonnant/surprenant/incroyable"
- Spécificité : dates/noms/lieux/chiffres exacts
- MAUVAIS : "Quel criminel a été trahi par son GPS ?" (spoile la réponse)
- BON : "Pourquoi un fugitif a-t-il maudit son cadeau de Noël ?" (suspense → chaussures connectées)

SHORT_ANSWER (max 8 mots, idéal 3-5) :
- Punchline qui fait "sérieux ?!"

ÉTAPE 4 — ENRICHISSEMENTS (par formulation)

INDICES (hint1 + hint2) — NOUVELLE RÈGLE CRITIQUE :
- **PRIVILÉGIER UN SEUL MOT ÉVOCATEUR** quand c'est possible (c'est préféré).
- Si un mot seul n'est pas assez clair, phrase TRÈS courte max 20 chars.
- hint1 : SUBTIL — oriente sans donner la direction exacte
- hint2 : PLUS DIRECT — réduit à 2-3 choix possibles
- JAMAIS répéter un mot ou concept de la question
- JAMAIS la définition du terme cherché
- BON : "Noël" / "Tracking" / "Amateur" / "Chute"
- MAUVAIS : "Geolocalisation" (répète GPS de la question)

FAUSSES RÉPONSES (1-5 mots max) :
- funny_wrong_1/2 : drôles et absurdes (font sourire)
- close_wrong_1/2 : proches de la vraie, piégeuses
- plausible_wrong_1/2/3 : plausibles, fausses mais sonnent vraies

EXPLANATION (200-300 chars, ton "pote au bar", PAS académique) :
- INTERDIT : "Selon une étude publiée dans le Journal of…"
- BON : "À ce rythme, si tu battais des bras aussi vite, tu décollerais... ou tu te démolirais les épaules"

WTF_SCORE (1-5, auto-évaluation honnête, INDICATIF uniquement) :
- 1 = banal, 2 = sympa, 3 = bon fact, 4 = très WTF, 5 = légendaire

SOURCE_URL : URL vérifiable trouvée à l'étape 1 (sinon "")

=== DÉDUPLICATION ===
${dedupBlock}

=== FORMAT DE SORTIE ===

Tableau JSON de ${safeCount} faits. Chaque élément = UN fact avec la meilleure formulation choisie :

[
  {
    "question": "...",
    "short_answer": "...",
    "explanation": "Le saviez-vous fun 200-300 chars",
    "hint1": "...",
    "hint2": "...",
    "hint3": "",
    "hint4": "",
    "funny_wrong_1": "...", "funny_wrong_2": "...",
    "close_wrong_1": "...", "close_wrong_2": "...",
    "plausible_wrong_1": "...", "plausible_wrong_2": "...", "plausible_wrong_3": "...",
    "source_url": "https://... vérifiée ou ''",
    "archetype": 4,
    "archetype_name": "Existence Impossible",
    "wtf_score": 4
  }
]

Retourne UNIQUEMENT le tableau JSON valide, SANS texte avant ni après.`

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
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 15 }],
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
    // Avec web_search, la réponse contient plusieurs blocks (tool_use, tool_result, text).
    // Le JSON final est dans le DERNIER block de type 'text'.
    const contentBlocks = Array.isArray(data.content) ? data.content : []
    const textBlocks = contentBlocks.filter((b: any) => b.type === 'text' && typeof b.text === 'string')
    const text = (textBlocks[textBlocks.length - 1]?.text || '').trim()
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

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
    const { category, categoryLabel, count, difficulty_distribution } = await req.json()
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
    const prompt = `Tu es un créateur de contenu pour WTF! Facts, un jeu de quiz en français avec des anecdotes surprenantes et fascinantes.

Génère exactement ${count} facts sur la catégorie "${categoryLabel || category}".

POUR CHAQUE FACT, retourne un objet JSON avec ces champs :

1. "question" : une question OUVERTE, surprenante et captivante (max 100 caractères)
   - JAMAIS de "Vrai ou Faux"
   - JAMAIS commencer par "Est-ce que"
   - La question doit provoquer curiosité, surprise ou amusement
   - Exemples de bons formats : "Quel animal...", "Combien de...", "Pourquoi les...", "Dans quel pays...", "Que se passe-t-il quand..."

2. "short_answer" : la bonne réponse, courte et percutante (max 50 caractères)

3. "explanation" : le "saviez-vous", une explication détaillée et fascinante (ENTRE 100 ET 300 caractères)

4. "hint1", "hint2", "hint3", "hint4" : 4 indices, chacun est UN SEUL MOT (pas de phrase, pas d'espace), qui oriente vers la réponse sans la donner directement

5. "funny_wrong_1", "funny_wrong_2" : 2 fausses réponses DRÔLES et absurdes qui font sourire (1 à 5 mots max chacune)

6. "close_wrong_1", "close_wrong_2" : 2 fausses réponses PROCHES de la vraie, crédibles et piégeuses, qui font hésiter (1 à 5 mots max chacune)

7. "plausible_wrong_1", "plausible_wrong_2", "plausible_wrong_3" : 3 fausses réponses PLAUSIBLES dans l'univers WTF, fausses mais qui sonnent vraies (1 à 5 mots max chacune)

8. "source_url" : URL source vérifiable si trouvable, sinon ""

RÈGLES DE QUALITÉ STRICTES :
- Le fact DOIT être 100% vrai et vérifiable
- Les 4 indices sont UN SEUL MOT chacun, sans espace, sans ponctuation
- Les réponses drôles doivent VRAIMENT faire sourire, être absurdes mais marrantes
- Les réponses proches doivent être assez similaires à la vraie réponse pour tromper
- Les réponses plausibles doivent sonner WTF mais être fausses
- Pas de sujets sensibles (politique, religion, violence)
- Rédaction en français, ton fun et accessible
- Chaque fact doit être UNIQUE — pas de doublons ni de reformulations${dedupBlock}

Retourne UNIQUEMENT un tableau JSON valide de ${count} objets, SANS texte avant ni après.`

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
        max_tokens: 8192,
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

    // Extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Réponse API invalide — pas de JSON trouvé' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const facts = JSON.parse(jsonMatch[0])
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

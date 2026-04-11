import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
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
    const { category, categoryLabel, count, theme } = await req.json()
    const safeCount = Math.min(count || 3, 5)
    if (!category || !theme) {
      return new Response(JSON.stringify({ error: 'category et theme requis' }), {
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

    const existingList = existingFacts
      .map((f: any) => `- Q: ${(f.question || '').slice(0, 80)} | R: ${(f.short_answer || '').slice(0, 50)}`)
      .join('\n')
    const dedupBlock = existingFacts.length > 0
      ? `\n\nFACTS EXISTANTS (NE PAS DUPLIQUER — si un sujet/reponse est trop similaire, choisis un autre sujet) :\n${existingList}`
      : ''

    // ── Build VIP prompt ────────────────────────────────────────────────
    const prompt = `Tu es l'auteur en chef du jeu "WTF! — What The F*ct". Ton travail se fait en 2 etapes :

ETAPE 1 : Tu trouves des FAITS INSOLITES reels et verifiables sur un sous-theme donne.
ETAPE 2 : Pour CHAQUE fait trouve, tu proposes 3 FORMULATIONS DIFFERENTES en utilisant 3 archetypes differents.

L'objectif : un meme fait peut etre WTF! ou bof selon comment on le formule. Tu dois proposer les 3 meilleures formulations possibles pour que l'editeur humain choisisse la plus percutante.

=== LES 7 ARCHETYPES DE FORMULATION ===

1. L'ABSURDE INSTITUTIONNEL — Une institution serieuse + quelque chose de ridicule
   Ex: "Qu'est-il interdit de posseder en un seul exemplaire en Suisse ?" → "Un cochon d'Inde"

2. LE RETOURNEMENT TRAGIQUE — Setup heroique → chute absurde
   Ex: "Comment Bobby Leach, qui a survecu aux chutes du Niagara, est-il mort ?" → "Il a glisse sur une peau de banane"

3. LA PROXIMITE DERANGEANTE — Ca touche notre corps, notre quotidien, notre nourriture
   Ex: "Qu'ont en commun les billets de banque americains ?" → "90% ont des traces de cocaine"

4. L'EXISTENCE IMPOSSIBLE — Quelque chose qui ne devrait pas exister mais existe
   Ex: "Quelle prouesse alimentaire Michel Lolito a-t-il realisee ?" → "Il a mange un avion"

5. LA SURVIE MIRACULEUSE / MORT ABSURDE — Survit a l'impossible ou meurt d'un truc improbable
   Ex: "Comment une femme a survecu a un tir en pleine poitrine ?" → "Ses implants mammaires ont devie la balle"

6. LE COMPORTEMENT ANIMAL HUMAIN — Un animal fait un truc tres humain
   Ex: "Qu'est-ce qui motive les dauphins a se rapprocher des poissons-globes ?" → "Se droguer"

7. LA FORMULATION PIEGE — La question oriente vers un champ semantique, la reponse detruit cette attente
   Ex: "Quelle celebrite a ete videur de bar ?" → "Le pape Francois"

=== REGLES DE FORMULATION ===

- La REPONSE est une PUNCHLINE : maximum 8 mots, idealement 3-5
- La QUESTION force une PREDICTION que la reponse contredit
- La question ne dit JAMAIS "etonnant/surprenant/incroyable"
- SPECIFICITE : noms propres, dates, lieux, chiffres precis
- TEST DE TABLE : "Est-ce que quelqu'un raconterait ca a ses amis ce soir ?"
- VRAI et VERIFIABLE

=== PIEGES A EVITER ===

- Fun facts Wikipedia sans choc
- Chiffres impressionnants sans collision
- Fait deja viral TikTok/Instagram
- Reponse > 8 mots
- Question qui spoile le WTF

=== TA MISSION ===

Sous-theme : "${theme}"
Categorie : "${categoryLabel || category}"

Trouve exactement ${safeCount} faits insolites, verifiables et WTF! sur ce sous-theme.

Pour CHAQUE fait, propose 3 formulations differentes utilisant 3 archetypes differents (choisis les 3 les plus pertinents parmi les 7).

=== INDICES (pour chaque formulation) ===

hint1 : phrase courte MAX 20 CARACTERES, subtil, oriente sans donner la direction
hint2 : phrase courte MAX 20 CARACTERES, plus direct, reduit a 2-3 choix possibles
Un indice ne repete JAMAIS un mot de la question.

=== EXPLICATION ===

Une seule explication par fait (partagee entre les 3 formulations).
ENTRE 200 ET 300 CARACTERES. Ton "pote au bar", PAS encyclopedique.

=== FAUSSES REPONSES (pour chaque formulation) ===

"funny_wrong_1", "funny_wrong_2" : droles et absurdes (1-5 mots)
"close_wrong_1", "close_wrong_2" : proches de la vraie, credibles (1-5 mots)
"plausible_wrong_1", "plausible_wrong_2", "plausible_wrong_3" : plausibles, fausses mais sonnent vraies (1-5 mots)

=== VERIFICATION DOUBLONS ===
${dedupBlock}

=== FORMAT DE SORTIE ===

Retourne un tableau JSON. Chaque element represente UN FAIT avec 3 formulations :

{
  "raw_fact": "Le fait brut en une phrase (ex: Walt Disney avait peur des souris)",
  "source_url": "URL source verifiable ou ''",
  "explanation": "Le saviez-vous fun, 200-300 caracteres",
  "formulations": [
    {
      "archetype": 1,
      "archetype_name": "Absurde Institutionnel",
      "question": "La question formulee selon cet archetype (max 100 chars)",
      "short_answer": "La punchline max 8 mots",
      "collision": "Resume 2-3 mots de la dissonance",
      "wtf_score": 4,
      "hint1": "Indice subtil max 20 chars",
      "hint2": "Indice direct max 20 chars",
      "funny_wrong_1": "...", "funny_wrong_2": "...",
      "close_wrong_1": "...", "close_wrong_2": "...",
      "plausible_wrong_1": "...", "plausible_wrong_2": "...", "plausible_wrong_3": "..."
    },
    {
      "archetype": 7,
      "archetype_name": "Formulation Piege",
      "question": "...",
      "short_answer": "...",
      "collision": "...",
      "wtf_score": 3,
      "hint1": "...", "hint2": "...",
      "funny_wrong_1": "...", "funny_wrong_2": "...",
      "close_wrong_1": "...", "close_wrong_2": "...",
      "plausible_wrong_1": "...", "plausible_wrong_2": "...", "plausible_wrong_3": "..."
    },
    {
      "archetype": 4,
      "archetype_name": "Existence Impossible",
      "question": "...",
      "short_answer": "...",
      "collision": "...",
      "wtf_score": 3,
      "hint1": "...", "hint2": "...",
      "funny_wrong_1": "...", "funny_wrong_2": "...",
      "close_wrong_1": "...", "close_wrong_2": "...",
      "plausible_wrong_1": "...", "plausible_wrong_2": "...", "plausible_wrong_3": "..."
    }
  ]
}

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
    const stopReason = data.stop_reason

    // Extract JSON array
    let jsonMatch = text.match(/\[[\s\S]*\]/)

    if (!jsonMatch && text.includes('[')) {
      let truncated = text.slice(text.indexOf('['))
      const lastBrace = truncated.lastIndexOf('}')
      if (lastBrace > 0) {
        truncated = truncated.slice(0, lastBrace + 1) + ']'
        jsonMatch = [truncated]
      }
    }

    if (!jsonMatch) {
      return new Response(JSON.stringify({
        error: 'Reponse API invalide — pas de JSON trouve',
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
      try {
        const objects: any[] = []
        const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g
        let match
        while ((match = objectRegex.exec(jsonMatch[0])) !== null) {
          try { objects.push(JSON.parse(match[0])) } catch { /* skip malformed */ }
        }
        if (objects.length > 0) {
          facts = objects
        } else {
          throw parseErr
        }
      } catch {
        return new Response(JSON.stringify({
          error: `JSON invalide: ${parseErr.message}`,
          stop_reason: stopReason,
          raw_length: text.length,
          hint: stopReason === 'max_tokens' ? 'Reponse tronquee' : undefined,
        }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    if (!Array.isArray(facts)) {
      return new Response(JSON.stringify({ error: 'Reponse API invalide — pas un tableau' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Post-process: dedup + truncate ──────────────────────────────────
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿç0-9\s]/g, '').trim()

    const existingNormalized = existingFacts.map((f: any) => ({
      q: normalize(f.question),
      a: normalize(f.short_answer),
    }))

    const enrichedFacts = facts.map((fact: any) => {
      // Truncate explanation
      if (fact.explanation && fact.explanation.length > 300) {
        fact.explanation = fact.explanation.substring(0, 300).trim()
      }

      // Process each formulation
      if (Array.isArray(fact.formulations)) {
        fact.formulations = fact.formulations.map((f: any) => {
          if (f.hint1 && f.hint1.length > 20) f.hint1 = f.hint1.substring(0, 20).trim()
          if (f.hint2 && f.hint2.length > 20) f.hint2 = f.hint2.substring(0, 20).trim()
          return f
        })
      }

      return {
        ...fact,
        category,
      }
    })

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

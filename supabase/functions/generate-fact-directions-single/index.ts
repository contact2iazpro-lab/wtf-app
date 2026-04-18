import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const OPUS_MODEL = 'claude-opus-4-5'

const buildRefinePrompt = (fact: any, rawIdea: string) => `Tu es directeur artistique pour What The F*ct!, un jeu mobile de trivia basé sur des faits surprenants, absurdes ou inattendus.

FACT À ILLUSTRER :
Question : ${fact.question}
Réponse : ${fact.short_answer}
Contexte : ${fact.explanation || '(non fourni)'}
Catégorie : ${fact.category || '(non fournie)'}

IDÉE BRUTE PROPOSÉE PAR L'UTILISATEUR :
${rawIdea}

TA MISSION :
Cette idée a du potentiel mais manque de détails visuels concrets pour servir de brief à un modèle de génération d'image. Retravaille-la en UNE direction de scène structurée dans l'esprit WTF, en 3-4 phrases.

Garde fidèlement :
- Le concept central, l'angle et l'élément "WTF" proposés par l'utilisateur
- Le ton et l'intention de départ (ne pas adoucir ni réinterpréter)

Ajoute ou précise :
- Composition / cadrage (plan serré, contre-plongée, grand angle…)
- Lumière / ambiance / palette de couleurs
- Détails visuels concrets qui rendent la scène mémorable
- Élément "WTF" clarifié si pas explicite

L'ADN WTF :
- Intriguer avant d'illustrer, privilégier l'angle décalé, l'absurde crédible
- Rester lisible sur mobile (1 sujet principal fort, composition claire)

CONTRAINTES À RESPECTER :
- Scène pour image carrée 1:1
- AUCUN texte, lettre, chiffre, label, watermark
- AUCUN téléphone, écran, interface, référence à un jeu

Retourne UNIQUEMENT un JSON avec UN SEUL objet (pas un array) :
{"titre": "3-5 mots accrocheurs", "description": "..."}

AUCUN texte avant ou après le JSON.`

const buildPrompt = (fact: any, autoPick: boolean = false) => `Tu es directeur artistique pour What The F*ct!, un jeu mobile de trivia basé sur des faits surprenants, absurdes ou inattendus. Ton rôle : imaginer des images qui provoquent un effet "WTF" immédiat — celui qui fait arrêter le scroll, lever un sourcil, déclencher un "sérieux ?!".

L'ADN WTF :
- Surprendre avant d'expliquer. L'image doit INTRIGUER, pas illustrer platement.
- Privilégier l'angle décalé, le contraste, l'absurde crédible, le détail qui interpelle — plutôt que la représentation littérale évidente.
- Sortir du premier degré : si le fact parle d'un lion, ne montre pas juste un lion qui rugit. Trouve la scène qui rend le fait mémorable.
- Garder une lisibilité mobile : 1 sujet principal fort, composition claire, pas de scène chargée.

FACT À ILLUSTRER :
Question : ${fact.question}
Réponse : ${fact.short_answer}
Contexte : ${fact.explanation || '(non fourni)'}
Catégorie : ${fact.category || '(non fournie)'}

TA MISSION :
Propose exactement 3 IDÉES DE SCÈNE différentes pour illustrer ce fact. Chaque idée doit explorer un angle narratif distinct (pas un style graphique — le style viendra après). Varie les approches :
- une plus directe et percutante,
- une plus décalée / absurde / métaphorique,
- une plus inattendue / conceptuelle / surprenante par son cadrage.

Pour chaque idée, décris en 2-3 phrases max :
- Le sujet principal et l'action
- La composition / le cadrage
- L'élément "WTF" (ce qui intrigue ou détonne)
- Ambiance / éclairage suggéré

CONTRAINTES STRICTES :
- Format carré 1:1
- AUCUN texte, lettre, chiffre, label, watermark dans l'image
- AUCUN téléphone, écran, interface, référence à un jeu ou un quiz
- Scène visuellement lisible sur un petit écran

${autoPick ? `ÉTAPE SUPPLÉMENTAIRE (auto_pick) :
Après avoir proposé les 3 idées, CHOISIS celle qui produit l'effet WTF le plus fort — la plus mémorable, celle qu'un joueur raconterait à ses potes.
Indique son id dans le champ "picked_id".` : ''}

Retourne UNIQUEMENT un JSON ${autoPick ? 'objet' : 'array'} :
${autoPick
  ? `{
  "directions": [
    {"id": 1, "titre": "3-5 mots accrocheurs", "description": "..."},
    {"id": 2, "titre": "...", "description": "..."},
    {"id": 3, "titre": "...", "description": "..."}
  ],
  "picked_id": 2
}`
  : `[
  {"id": 1, "titre": "3-5 mots accrocheurs", "description": "..."},
  {"id": 2, "titre": "...", "description": "..."},
  {"id": 3, "titre": "...", "description": "..."}
]`}
AUCUN texte avant ou après le JSON.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')
    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { fact_id, raw_idea, auto_pick } = await req.json()
    if (!fact_id) {
      return new Response(JSON.stringify({ error: 'fact_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const isRefineMode = typeof raw_idea === 'string' && raw_idea.trim().length > 0
    const isAutoPick = !!auto_pick

    const anthropicKey = Deno.env.get('ANTHROPIC_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!anthropicKey || !SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({ error: 'Config manquante (ANTHROPIC_KEY / SUPABASE)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch fact
    const factRes = await fetch(
      `${SUPABASE_URL}/rest/v1/facts?select=id,question,short_answer,explanation,category&id=eq.${fact_id}`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    )
    const factData = await factRes.json()
    const fact = factData?.[0]
    if (!fact) {
      return new Response(JSON.stringify({ error: 'Fact introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Opus — soit 3 idées fraîches (avec ou sans auto_pick), soit refine d'une idée utilisateur
    const promptToSend = isRefineMode
      ? buildRefinePrompt(fact, raw_idea.trim())
      : buildPrompt(fact, isAutoPick)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: OPUS_MODEL,
        max_tokens: isRefineMode ? 600 : 1400,
        messages: [{ role: 'user', content: promptToSend }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      return new Response(JSON.stringify({ error: `Claude API error (${anthropicRes.status}): ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await anthropicRes.json()
    const text = data.content?.[0]?.text?.trim() || ''

    // Mode refine → on attend UN objet {titre, description}
    if (isRefineMode) {
      const objMatch = text.match(/\{[\s\S]*\}/)
      if (!objMatch) {
        return new Response(JSON.stringify({ error: 'JSON absent de la réponse Opus', raw: text }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      let refined
      try {
        refined = JSON.parse(objMatch[0])
      } catch (e) {
        return new Response(JSON.stringify({ error: 'JSON invalide', raw: objMatch[0] }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!refined || typeof refined !== 'object' || !refined.description) {
        return new Response(JSON.stringify({ error: 'Direction retravaillée invalide' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ success: true, refined }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mode auto_pick → objet { directions: [...], picked_id: N }
    if (isAutoPick) {
      const objMatch = text.match(/\{[\s\S]*\}/)
      if (!objMatch) {
        return new Response(JSON.stringify({ error: 'JSON absent de la réponse Opus', raw: text }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      let parsed
      try {
        parsed = JSON.parse(objMatch[0])
      } catch (e) {
        return new Response(JSON.stringify({ error: 'JSON invalide', raw: objMatch[0] }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!parsed || !Array.isArray(parsed.directions) || parsed.directions.length === 0) {
        return new Response(JSON.stringify({ error: 'Directions invalides (auto_pick)' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const pickedId = Number(parsed.picked_id) || parsed.directions[0].id || 1
      return new Response(JSON.stringify({
        success: true,
        directions: parsed.directions,
        picked_id: pickedId,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Mode normal → array de 3 directions
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'JSON absent de la réponse Opus', raw: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let directions
    try {
      directions = JSON.parse(jsonMatch[0])
    } catch (e) {
      return new Response(JSON.stringify({ error: 'JSON invalide', raw: jsonMatch[0] }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!Array.isArray(directions) || directions.length === 0) {
      return new Response(JSON.stringify({ error: 'Directions invalides' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, directions }), {
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

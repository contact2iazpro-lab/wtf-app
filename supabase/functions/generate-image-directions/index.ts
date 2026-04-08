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
    const { fact_ids, fact_type } = await req.json()
    if (!fact_ids || !Array.isArray(fact_ids) || !fact_type) {
      return new Response(JSON.stringify({ error: 'fact_ids (array) et fact_type (vip|funny) requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['vip', 'funny'].includes(fact_type)) {
      return new Response(JSON.stringify({ error: 'fact_type doit être vip ou funny' }), {
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

    // Supabase
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase credentials missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Process each fact
    const results: any[] = []
    const errors: string[] = []

    for (const factId of fact_ids) {
      try {
        // Fetch fact
        const { data: fact, error: factError } = await fetch(
          `${SUPABASE_URL}/rest/v1/facts?select=id,question,short_answer,explanation,category&id=eq.${factId}`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
            },
          }
        )
          .then(r => r.json())
          .then(data => ({ data: data?.[0], error: null }))
          .catch(err => ({ data: null, error: err }))

        if (factError || !fact) {
          errors.push(`Fact ${factId} not found`)
          continue
        }

        // Build prompt
        const prompt = fact_type === 'vip'
          ? `Tu es un directeur artistique pour un jeu mobile de trivia appelé What The F*ct!. On te donne un fact surprenant et tu dois proposer 6 directions visuelles pour l'illustrer. Chaque direction doit être une description précise d'image (composition, éléments visuels, ambiance) en 2-3 phrases. L'image sera carrée (1:1). AUCUN TEXTE, mot, lettre, chiffre, label ou watermark dans l'image. Pas de téléphone, écran ou référence à un jeu.

Fact : ${fact.question} — Réponse : ${fact.short_answer}
Contexte : ${fact.explanation || '(non fourni)'}
Catégorie : ${fact.category || '(non fournie)'}

Propose 6 directions visuelles. Pour chaque direction, décris précisément la scène, la composition, l'éclairage et l'ambiance. Base-toi UNIQUEMENT sur la question, la réponse et l'explication du fact :

1. RÉALISTE — Photo ou illustration photorréaliste. Éclairage naturel, décor crédible. L'image montre le sujet du fact de manière directe, comme une photo de reportage ou de documentaire.

2. HUMORISTIQUE — Illustration cartoon colorée et exagérée. Style dessin animé avec des expressions comiques, des proportions déformées, des couleurs vives et un ton léger et drôle. Le fact est illustré de manière amusante.

3. MÉTAPHORIQUE — Peinture artistique et symbolique. Atmosphère onirique avec des pastels doux, des formes fluides et un style éthéral et poétique. Le fact est représenté de manière conceptuelle et abstraite, pas littérale.

4. RÉTRO POP ART — Style pop art vintage années 60. Couleurs primaires saturées, trames de points halftone, contours épais et composition graphique audacieuse. Inspiré de Roy Lichtenstein et Andy Warhol.

5. ULTRA RÉALISTE ABSURDE — Photo ultra réaliste qui ressemble à une vraie photo prise avec un appareil professionnel (éclairage naturel, profondeur de champ, textures détaillées). MAIS la situation représentée est complètement absurde : le sujet du fact est placé dans un contexte totalement décalé — comportement humain par des animaux, objets hors contexte, situation de bureau ou de la vie quotidienne complètement détournée. Tout semble réel mais la scène est impossible.

6. WTF CINÉMATIQUE — Photo cinématique avec éclairage dramatique de film hollywoodien, lens flare, color grading. Le sujet du fact est en TOTAL CONTRASTE avec son environnement : décalage d'époque, de lieu, de taille, d'échelle ou de comportement. Des éléments surréels sont intégrés dans un décor ultra réaliste. L'image ressemble à une scène de film mais la situation provoque un effet WTF immédiat.

Retourne UNIQUEMENT un JSON array avec exactement 6 objets : [{"id": 1, "style": "réaliste", "description": "..."}, ...] SANS texte avant ni après.`
          : `Tu es un directeur artistique pour un jeu mobile de trivia appelé What The F*ct!. On te donne un fact surprenant et tu dois proposer 1 direction visuelle ULTRA RÉALISTE ABSURDE qui l'illustre de manière mémorable.

Fact : ${fact.question} — Réponse : ${fact.short_answer}
Contexte : ${fact.explanation || '(non fourni)'}
Catégorie : ${fact.category || '(non fournie)'}

Propose 1 seule direction visuelle ULTRA RÉALISTE ABSURDE : photo ultra réaliste prise avec un appareil professionnel, tout semble réel (éclairage, textures, profondeur de champ) mais la situation est complètement absurde et décalée. Le sujet du fact est placé dans un contexte totalement inattendu. Description précise de 2-3 phrases basée sur la question, la réponse et l'explication.

Retourne UNIQUEMENT un JSON array avec 1 objet : [{"id": 1, "style": "ultra_realiste_absurde", "description": "..."}] SANS texte avant ni après.`

        // Call Anthropic
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: fact_type === 'vip' ? 3000 : 500,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!anthropicRes.ok) {
          const errText = await anthropicRes.text()
          errors.push(`Fact ${factId}: Claude API error (${anthropicRes.status}): ${errText}`)
          continue
        }

        const data = await anthropicRes.json()
        const text = data.content[0].text.trim()

        // Extract JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          errors.push(`Fact ${factId}: No JSON found in response`)
          continue
        }

        const directions = JSON.parse(jsonMatch[0])

        // Validate
        if (!Array.isArray(directions) || directions.length === 0) {
          errors.push(`Fact ${factId}: Invalid directions array`)
          continue
        }

        // Insert into image_pipeline
        const { error: insertError } = await fetch(
          `${SUPABASE_URL}/rest/v1/image_pipeline`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              fact_id: factId,
              fact_type,
              directions,
              status: 'directions_generated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          }
        )
          .then(r => r.json().catch(() => ({ error: null })))
          .then(data => ({ error: data?.error || null }))
          .catch(err => ({ error: err }))

        if (insertError) {
          errors.push(`Fact ${factId}: Failed to insert into pipeline`)
          continue
        }

        results.push({
          fact_id: factId,
          directions_count: directions.length,
          status: 'directions_generated',
        })
      } catch (err) {
        errors.push(`Fact ${factId}: ${err.message || 'Unknown error'}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results,
      errors,
    }), {
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

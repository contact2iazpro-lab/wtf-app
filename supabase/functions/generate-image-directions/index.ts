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
          ? `Tu es un directeur artistique pour un jeu mobile de trivia appelé What The F*ct!. On te donne un fact surprenant et tu dois proposer 5 directions visuelles pour l'illustrer. Chaque direction doit être une description précise d'image (style, composition, couleurs, ambiance) en 2-3 phrases.

Fact : ${fact.question} — Réponse : ${fact.short_answer}
Contexte : ${fact.explanation || '(non fourni)'}
Catégorie : ${fact.category || '(non fournie)'}

Propose 5 directions visuelles, du plus réaliste au plus décalé :
1. RÉALISTE — Photo/illustration réaliste qui illustre le fact directement
2. HUMORISTIQUE — Interprétation drôle/absurde du fact
3. MÉTAPHORIQUE — Représentation symbolique/métaphorique
4. RÉTRO/POP ART — Style vintage, pop art ou affiche rétro
5. WTF ABSURDE — Image complètement déjantée qui fait dire WTF!

Pour chaque direction, donne une description précise utilisable comme prompt pour un générateur d'images. Inclus le style artistique, les éléments visuels, les couleurs dominantes, l'ambiance.

Retourne UNIQUEMENT un JSON array avec exactement 5 objets : [{"id": 1, "style": "réaliste", "description": "..."}, ...] SANS texte avant ni après.`
          : `Tu es un directeur artistique pour un jeu mobile de trivia appelé What The F*ct!. On te donne un fact surprenant et tu dois proposer 1 direction visuelle HUMORISTIQUE qui l'illustre de manière fun et mémorable.

Fact : ${fact.question} — Réponse : ${fact.short_answer}
Contexte : ${fact.explanation || '(non fourni)'}
Catégorie : ${fact.category || '(non fournie)'}

Propose 1 seule direction visuelle HUMORISTIQUE. Description précise de 2-3 phrases utilisable comme prompt pour un générateur d'images. Inclus le style artistique, les éléments visuels, les couleurs dominantes, l'ambiance.

Retourne UNIQUEMENT un JSON array avec 1 objet : [{"id": 1, "style": "humoristique", "description": "..."}] SANS texte avant ni après.`

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
            max_tokens: fact_type === 'vip' ? 2000 : 500,
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

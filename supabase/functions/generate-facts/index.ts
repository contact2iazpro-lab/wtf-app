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
    const { category, count, difficulty_distribution } = await req.json()
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

    // Build prompt
    const prompt = `Tu es un créateur de contenu pour le jeu WTF! Facts (jeu de quiz en français).
Génère exactement ${count} facts surprenants et fascinants en français sur la catégorie "${category}".

RÈGLES STRICTES :
- question : affirmation vraie ou fausse, surprenante (MAXIMUM 100 caractères)
- hint1 : indice court (MAXIMUM 20 caractères)
- hint2 : deuxième indice (MAXIMUM 20 caractères)
- short_answer : "VRAI" ou "FAUX" uniquement (MAXIMUM 50 caractères)
- explanation : explication détaillée (ENTRE 100 ET 300 caractères)
- options : tableau de 4 réponses QCM en français
- correct_index : index de la bonne réponse (0 à 3)
- source_url : URL source si connue, sinon ""

Retourne UNIQUEMENT un tableau JSON valide, SANS texte avant ni après.
Format exact : [{"question":"...","hint1":"...","hint2":"...","short_answer":"VRAI","explanation":"...","options":["A","B","C","D"],"correct_index":0,"source_url":""}]`

    // Call Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
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

    // Attach difficulties and metadata
    const difficulties = difficulty_distribution || []
    const enrichedFacts = facts.map((f: any, i: number) => ({
      ...f,
      difficulty: difficulties[i] || 'Normal',
      category,
      status: 'draft',
      is_published: false,
      pack_id: 'free',
      options: Array.isArray(f.options) ? f.options : [],
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

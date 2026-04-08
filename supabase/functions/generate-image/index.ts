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
    const { pipeline_id } = await req.json()
    if (!pipeline_id) {
      return new Response(JSON.stringify({ error: 'pipeline_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get Supabase client credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleApiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !googleApiKey) {
      return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Fetch image_pipeline record ────────────────────────────────────────────
    const pipelineRes = await fetch(`${supabaseUrl}/rest/v1/image_pipeline?id=eq.${pipeline_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
    })

    if (!pipelineRes.ok) {
      return new Response(JSON.stringify({ error: 'Erreur fetch image_pipeline' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pipelineData = await pipelineRes.json()
    if (!pipelineData || pipelineData.length === 0) {
      return new Response(JSON.stringify({ error: 'Pipeline record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pipeline = pipelineData[0]
    const { fact_id, selected_direction, custom_direction } = pipeline

    // ── Fetch fact record ──────────────────────────────────────────────────────
    const factRes = await fetch(`${supabaseUrl}/rest/v1/facts?id=eq.${fact_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
    })

    if (!factRes.ok) {
      return new Response(JSON.stringify({ error: 'Erreur fetch fact' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const factData = await factRes.json()
    if (!factData || factData.length === 0) {
      return new Response(JSON.stringify({ error: 'Fact not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fact = factData[0]
    const { question, short_answer, explanation, category } = fact

    // ── Build image prompt ────────────────────────────────────────────────────
    const direction = custom_direction || selected_direction || 'Photo réelle'
    const imagePrompt = `Create a high-quality square illustration for this surprising fact.

Fact question: ${question}
Answer: ${short_answer}
Context: ${explanation || 'No additional context'}

Visual direction: ${direction}

CRITICAL RULES:
- Square format (1:1 aspect ratio)
- Do NOT include ANY text, words, letters, numbers, labels, captions, or watermarks
- Do NOT include phones, screens, devices, or game/quiz references
- Pure visual illustration only, no text whatsoever
- The image should visually represent the fact in a memorable and surprising way
- Style: vivid colors, engaging composition, suitable for a mobile trivia game card`

    console.log(`Generating image for fact #${fact_id} with direction: ${direction}`)

    // ── Call Google Gemini 3 Pro Image Preview API ─────────────────────────────
    let imageBase64: string | null = null
    let mimeType: string = 'image/png'

    try {
      console.log('Calling Gemini 3 Pro Image Preview for fact #' + fact_id)

      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=' + googleApiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: imagePrompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      })

      console.log('API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        const parts = data.candidates?.[0]?.content?.parts || []
        const imagePart = parts.find((p: any) => p.inlineData)
        if (imagePart) {
          imageBase64 = imagePart.inlineData.data
          mimeType = imagePart.inlineData.mimeType || 'image/png'
        }
      } else {
        console.log('API error body:', await response.text())
      }
    } catch (err) {
      console.warn(`Exception: ${err.message}`)
    }

    // ── Fallback: use Gemini 2.5 Flash Image ──
    if (!imageBase64) {
      console.log('Falling back to Gemini 2.5 Flash Image...')
      try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' + googleApiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: imagePrompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] },
          }),
        })

        console.log('API response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          const parts = data.candidates?.[0]?.content?.parts || []
          const imagePart = parts.find((p: any) => p.inlineData)
          if (imagePart) {
            imageBase64 = imagePart.inlineData.data
            mimeType = imagePart.inlineData.mimeType || 'image/png'
          }
        } else {
          console.log('API error body:', await response.text())
        }
      } catch (err) {
        console.warn(`Exception: ${err.message}`)
      }
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Impossible de générer l\'image' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Convert base64 to binary and upload to Supabase Storage ────────────────
    const binaryData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0))
    const ext = mimeType.includes('webp') ? 'webp' : mimeType.includes('jpeg') ? 'jpg' : 'png'
    const fileName = `facts/${fact_id}.${ext}`

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/fact-images/${fileName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': mimeType,
        'x-upsert': 'true',
      },
      body: binaryData,
    })

    console.log('Upload to Storage status:', uploadRes.status)

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error(`Storage upload error (${uploadRes.status}): ${errText}`)
      return new Response(JSON.stringify({ error: 'Erreur upload image' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Get public URL ────────────────────────────────────────────────────────
    const imageUrl = `${supabaseUrl}/storage/v1/object/public/fact-images/${fileName}`

    console.log('Image URL:', imageUrl)

    // ── Update image_pipeline record ───────────────────────────────────────────
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/image_pipeline?id=eq.${pipeline_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        status: 'image_generated',
        updated_at: new Date().toISOString(),
      }),
    })

    if (!updateRes.ok) {
      const errText = await updateRes.text()
      console.error(`Update image_pipeline error (${updateRes.status}): ${errText}`)
      return new Response(JSON.stringify({ error: 'Erreur update image_pipeline' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`✓ Image pipeline updated for fact #${fact_id}`)

    // NOTE: facts.image_url ne doit être mis à jour QUE lors de la validation dans l'Admin Tool
    // L'image est stockée dans image_pipeline.image_url avec status='image_generated'
    // Elle sera transférée à facts.image_url seulement après validation par Michael

    return new Response(JSON.stringify({ success: true, image_url: imageUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Erreur interne:', err.message)
    return new Response(JSON.stringify({ error: err.message || 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

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
    const { question, short_answer, category } = fact

    // ── Build image prompt ────────────────────────────────────────────────────
    const direction = custom_direction || selected_direction || 'Photo réelle'
    const imagePrompt = `Create a high-quality image for a trivia fact.
Fact: "${question}"
Answer: "${short_answer}"
Category: ${category}
Style: ${direction}

The image should be visually engaging, clear, and suitable for a mobile trivia game.
Make it vibrant and fun, with good composition.`

    console.log(`Generating image for fact #${fact_id} with direction: ${direction}`)

    // ── Call Google Gemini Imagen API ─────────────────────────────────────────
    let imageBase64: string | null = null

    try {
      const imagenRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=' + googleApiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
            safetyFilterLevel: 'block_few',
          },
        }),
      })

      if (imagenRes.ok) {
        const imagenData = await imagenRes.json()
        if (imagenData?.predictions?.[0]?.bytesBase64Encoded) {
          imageBase64 = imagenData.predictions[0].bytesBase64Encoded
          console.log(`✓ Image generated via Imagen for fact #${fact_id}`)
        } else {
          console.warn(`Imagen response missing bytesBase64Encoded for fact #${fact_id}`)
        }
      } else {
        const errText = await imagenRes.text()
        console.warn(`Imagen API error (${imagenRes.status}): ${errText}`)
      }
    } catch (err) {
      console.warn(`Imagen API exception: ${err.message}`)
    }

    // ── Fallback: use Gemini 2.0 Flash if Imagen failed ────────────────────────
    if (!imageBase64) {
      console.log(`Falling back to Gemini 2.0 Flash for fact #${fact_id}`)
      try {
        const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + googleApiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: imagePrompt }] }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        })

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json()
          // Extract image from response (structure varies)
          if (geminiData?.candidates?.[0]?.content?.parts) {
            for (const part of geminiData.candidates[0].content.parts) {
              if (part.inlineData?.data) {
                imageBase64 = part.inlineData.data
                console.log(`✓ Image generated via Gemini for fact #${fact_id}`)
                break
              }
            }
          }
        } else {
          const errText = await geminiRes.text()
          console.error(`Gemini API error (${geminiRes.status}): ${errText}`)
        }
      } catch (err) {
        console.error(`Gemini API exception: ${err.message}`)
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
    const fileName = `facts/${fact_id}.webp`

    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/fact-images/${fileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'image/webp',
      },
      body: binaryData,
    })

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

    console.log(`✓ Image uploaded to Storage: ${imageUrl}`)

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

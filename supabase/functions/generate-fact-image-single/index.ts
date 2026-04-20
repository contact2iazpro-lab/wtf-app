import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ─────────────────────────────────────────────────────────────────────────────
// Style blocks (injectés dans le prompt image)
// ─────────────────────────────────────────────────────────────────────────────
const STYLE_BLOCKS: Record<string, { name: string; block: string }> = {
  realiste: {
    name: 'Réaliste',
    block: `Photorealistic editorial photography. Natural lighting, credible setting, documentary or reportage feel. The fact is depicted directly and faithfully, as if captured by a professional photographer on assignment. No surrealism, no dramatic staging — just a beautifully shot real moment that makes the fact vivid.`,
  },
  wtf: {
    name: 'WTF',
    block: `Hyperrealistic photograph that looks 100% real (natural light, shallow depth of field, detailed textures, grain) BUT the situation depicted is absurd, unexpected or impossible. Animals acting like humans, objects out of context, mundane life flipped sideways — everything looks real, yet the scene cannot exist. The viewer's brain glitches for a second.`,
  },
  cinema: {
    name: 'Cinéma',
    block: `Cinematic movie-still quality. Dramatic lighting, cinematic color grading, lens flare, shallow depth of field, Hollywood blockbuster feel. The subject of the fact is in strong CONTRAST with its environment — era mismatch, scale mismatch, surreal element embedded in a hyper-real setting. Feels like a frozen frame from an epic film where something impossible is happening.`,
  },
}

const buildImagePrompt = (
  fact: any,
  directionDescription: string,
  styleKey: string,
) => {
  const s = STYLE_BLOCKS[styleKey]
  return `Create a high-quality square (1:1) image for a mobile trivia game called What The F*ct!. The goal is to create a visually striking image that makes the viewer go "wait, what?!"

CONTEXT (for understanding only — do not depict as text):
- Question: ${fact.question}
- Answer: ${fact.short_answer}
- Explanation: ${fact.explanation || 'No additional context'}

SCENE TO DEPICT:
${directionDescription}

RENDER STYLE — ${s.name}:
${s.block}

UNIVERSAL RULES (non-negotiable):
- Square 1:1 aspect ratio
- ZERO text, letters, numbers, labels, captions, watermarks, signatures
- NO phones, screens, devices, UI elements, game/quiz references
- NO modern intrusions if the scene is set in another era
- One strong focal subject, mobile-readable composition
- Rich colors, engaging lighting, premium editorial quality`
}

// ─────────────────────────────────────────────────────────────────────────────
// Providers — chaque fonction retourne { base64, mimeType }
// ─────────────────────────────────────────────────────────────────────────────

async function generateWithGemini(
  model: 'gemini-2.5-flash' | 'gemini-3-pro',
  prompt: string,
  apiKey: string,
): Promise<{ base64: string; mimeType: string }> {
  const modelId = model === 'gemini-3-pro'
    ? 'gemini-3-pro-image-preview'
    : 'gemini-2.5-flash-image'

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini ${modelId} error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find((p: any) => p.inlineData)
  if (!imagePart) throw new Error(`Gemini ${modelId}: aucune image retournée`)

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  }
}

async function generateWithOpenAI(
  prompt: string,
  apiKey: string,
): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',
      output_format: 'png',
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI gpt-image-1 error (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const b64 = data.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI gpt-image-1: aucune image retournée')

  return { base64: b64, mimeType: 'image/png' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────
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

    const { fact_id, direction_title, direction_description, styles, model, variants_per_style } = await req.json()
    if (!fact_id || !direction_description || !Array.isArray(styles) || styles.length === 0 || !model) {
      return new Response(JSON.stringify({ error: 'fact_id, direction_description, styles[], model requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const variantsPerStyle = Math.max(1, Math.min(4, Number(variants_per_style) || 1))

    const validStyles = styles.filter((s: string) => STYLE_BLOCKS[s])
    if (validStyles.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucun style valide (realiste | wtf | cinema)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['gpt-image-1', 'gemini-2.5-flash', 'gemini-3-pro'].includes(model)) {
      return new Response(JSON.stringify({ error: 'Modèle invalide' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const googleKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return new Response(JSON.stringify({ error: 'Supabase config manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (model.startsWith('gemini') && !googleKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_GENERATIVE_AI_API_KEY manquante' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (model === 'gpt-image-1' && !openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY manquante' }), {
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

    // Construit la liste des jobs (1 par variante × chaque style)
    const jobs: string[] = []
    for (const styleKey of validStyles) {
      for (let i = 0; i < variantsPerStyle; i++) jobs.push(styleKey)
    }

    // Génère toutes les images en parallèle
    const genPromises = jobs.map(async (styleKey: string) => {
      const prompt = buildImagePrompt(fact, direction_description, styleKey)
      try {
        const result = model === 'gpt-image-1'
          ? await generateWithOpenAI(prompt, openaiKey!)
          : await generateWithGemini(model as any, prompt, googleKey!)

        // Upload to Storage
        const binary = Uint8Array.from(atob(result.base64), c => c.charCodeAt(0))
        const ext = result.mimeType.includes('webp') ? 'webp'
                  : result.mimeType.includes('jpeg') ? 'jpg'
                  : 'png'
        const ts = Date.now()
        const rand = Math.random().toString(36).slice(2, 8)
        const storagePath = `facts/${fact_id}/variants/${ts}-${styleKey}-${rand}.${ext}`

        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/fact-images/${storagePath}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${SUPABASE_KEY}`,
              apikey: SUPABASE_KEY,
              'Content-Type': result.mimeType,
              'x-upsert': 'true',
            },
            body: binary,
          },
        )

        if (!uploadRes.ok) {
          const errText = await uploadRes.text()
          throw new Error(`Upload failed (${uploadRes.status}): ${errText}`)
        }

        // URL publique absolue (object/public). Pour activer WebP à la volée,
        // il faut un plan Supabase Pro et basculer vers /render/image/public/
        // avec ?width=1024&quality=75&format=webp
        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/fact-images/${storagePath}`

        // Insert variant
        const insertRes = await fetch(
          `${SUPABASE_URL}/rest/v1/fact_image_variants`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              fact_id,
              direction_title: direction_title || null,
              direction_description,
              style: styleKey,
              model,
              image_url: imageUrl,
              storage_path: storagePath,
            }),
          },
        )

        if (!insertRes.ok) {
          const errText = await insertRes.text()
          throw new Error(`Insert failed (${insertRes.status}): ${errText}`)
        }

        const inserted = await insertRes.json()
        return { ok: true, style: styleKey, variant: inserted?.[0] }
      } catch (err) {
        return { ok: false, style: styleKey, error: err.message || 'Erreur génération' }
      }
    })

    const results = await Promise.all(genPromises)
    const variants = results.filter(r => r.ok).map(r => r.variant)
    const errors = results.filter(r => !r.ok).map(r => ({ style: r.style, error: r.error }))

    return new Response(JSON.stringify({
      success: true,
      variants,
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

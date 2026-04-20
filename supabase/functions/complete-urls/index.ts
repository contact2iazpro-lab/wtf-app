import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MODEL = 'gpt-4o-search-preview'
const MAX_RETRIES = 3
const HEAD_TIMEOUT_MS = 5000

// Test HTTP HEAD avec timeout → retourne true si 2xx/3xx
async function isUrlAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS)
    const resp = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; WTF-Admin/1.0)',
      },
    })
    clearTimeout(timer)
    // Certains serveurs rejettent HEAD → retry GET si 405
    if (resp.status === 405) {
      return isUrlAliveGet(url)
    }
    return resp.status >= 200 && resp.status < 400
  } catch {
    return false
  }
}

async function isUrlAliveGet(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS)
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; WTF-Admin/1.0)',
      },
    })
    clearTimeout(timer)
    return resp.status >= 200 && resp.status < 400
  } catch {
    return false
  }
}

function buildPrompt(fact: any, attempt: number, previousUrl: string | null): string {
  const base = `Tu recherches une URL de source FIABLE qui confirme le fait suivant.

Question : ${fact.question}
Réponse : ${fact.short_answer}
Explication : ${fact.explanation || '(non fournie)'}
Catégorie : ${fact.category || '(non fournie)'}

RÈGLES :
- Priorité aux sources fiables : Wikipedia (FR puis EN), sites gouvernementaux (.gouv.fr, .gov), musées, encyclopédies reconnues (Britannica, Larousse), médias établis (Le Monde, BBC, Nat Geo, National Geographic).
- L'URL doit être une page SPÉCIFIQUE qui confirme le fait, pas une page d'accueil.
- Vérifie mentalement que la page existe et traite bien du sujet.
- Ne propose JAMAIS une URL inventée ou devinée.

RÉPONSE :
- Si tu trouves une source fiable : UNIQUEMENT l'URL complète (https://...), rien d'autre.
- Si tu n'en trouves pas : UNIQUEMENT le mot INTROUVABLE.

Aucun autre texte, pas de markdown, pas de guillemets.`

  if (attempt === 0 || !previousUrl) return base

  return base + `\n\nATTENTION : à l'essai précédent tu avais proposé ${previousUrl} qui est invalide ou renvoie une erreur. Propose une URL DIFFÉRENTE et VALIDE.`
}

async function callOpenAISearch(prompt: string, apiKey: string): Promise<string> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      web_search_options: { search_context_size: 'medium' },
      messages: [
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`OpenAI error (${resp.status}): ${errText}`)
  }
  const data = await resp.json()
  const text = data.choices?.[0]?.message?.content?.trim() || ''
  return text
}

// Extrait la première URL valide d'une réponse potentiellement bruitée
function extractUrl(text: string): string | null {
  if (!text) return null
  const trimmed = text.trim()
  if (/^INTROUVABLE/i.test(trimmed)) return null
  const match = trimmed.match(/https?:\/\/[^\s\])"'<>]+/)
  if (!match) return null
  return match[0].replace(/[.,;)"'>]+$/, '')
}

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

    const { fact_id, question, short_answer, explanation, category } = await req.json()
    if (!fact_id || !question || !short_answer) {
      return new Response(JSON.stringify({ error: 'fact_id, question et short_answer requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY non configurée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fact = { question, short_answer, explanation, category }
    const attempts: { attempt: number; url: string | null; valid: boolean }[] = []
    let lastCandidate: string | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const prompt = buildPrompt(fact, attempt, lastCandidate)
      let text = ''
      try {
        text = await callOpenAISearch(prompt, openaiKey)
      } catch (err) {
        attempts.push({ attempt, url: null, valid: false })
        continue
      }

      const url = extractUrl(text)
      if (!url) {
        attempts.push({ attempt, url: null, valid: false })
        // Si explicitement INTROUVABLE → arrêter le retry
        if (/^INTROUVABLE/i.test(text)) break
        continue
      }

      lastCandidate = url
      const alive = await isUrlAlive(url)
      attempts.push({ attempt, url, valid: alive })

      if (alive) {
        return new Response(JSON.stringify({
          success: true,
          status: 'ok',
          url,
          attempts,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: 'not_found',
      url: null,
      attempts,
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

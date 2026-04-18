import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

/**
 * deep-research-url — recherche exhaustive pour UN fact via OpenAI Deep Research.
 *
 * Utilise o4-mini-deep-research (moins cher que o3, ~0,16$/fact).
 * Mode ASYNC + polling interne (la function reste ouverte et poll toutes les 20s).
 * Timeout interne : 8 min max par fact.
 *
 * Valide HTTP HEAD avant retour.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MODEL = 'o4-mini-deep-research-2025-06-26'
const MAX_WAIT_MS = 8 * 60 * 1000
const POLL_INTERVAL_MS = 20_000
const HEAD_TIMEOUT_MS = 5_000

async function isUrlAlive(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS)
    const resp = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; WTF-Admin/1.0)' },
    })
    clearTimeout(timer)
    if (resp.status === 405) return isUrlAliveGet(url)
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
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; WTF-Admin/1.0)' },
    })
    clearTimeout(timer)
    return resp.status >= 200 && resp.status < 400
  } catch {
    return false
  }
}

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

    const prompt = `Trouve une URL de source FIABLE qui confirme explicitement le fait suivant.

Question : ${question}
Réponse : ${short_answer}
Explication : ${explanation || '(non fournie)'}
Catégorie : ${category || '(non fournie)'}

RÈGLES STRICTES :
- L'URL doit être une page SPÉCIFIQUE qui traite du sujet et confirme le fait (pas une page d'accueil).
- Priorité : Wikipedia (FR puis EN), sites .gov / .edu / .org, musées, encyclopédies reconnues (Britannica, Larousse), presse établie (Le Monde, BBC, National Geographic), archives scientifiques.
- Cette fois, tu peux aussi consulter des sources SECONDAIRES fiables : archives de presse, bibliothèques numériques, revues scientifiques PDF, bases académiques (JSTOR, ResearchGate, archive.org).
- Vérifie que la page existe vraiment avant de la proposer (tu as accès au web).
- Ne propose JAMAIS une URL inventée, devinée ou hypothétique.

RÉPONSE :
- Si tu trouves une source fiable : UNIQUEMENT l'URL complète (https://...), rien d'autre.
- Si après recherche approfondie tu ne trouves pas : UNIQUEMENT le mot INTROUVABLE.

Aucun autre texte, pas de markdown, pas de guillemets.`

    // ── 1. Lance le job Deep Research en background ─────────────────────
    const startResp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        background: true,
        tools: [
          { type: 'web_search_preview' },
        ],
      }),
    })

    if (!startResp.ok) {
      const errText = await startResp.text()
      return new Response(JSON.stringify({ error: `OpenAI start error (${startResp.status}): ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const startData = await startResp.json()
    const responseId: string | undefined = startData.id
    if (!responseId) {
      return new Response(JSON.stringify({ error: 'Pas de response id reçu', raw: startData }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Poll until completed / failed / timeout ──────────────────────
    const deadline = Date.now() + MAX_WAIT_MS
    let finalText = ''
    let finalStatus = ''

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
      const pollResp = await fetch(`https://api.openai.com/v1/responses/${responseId}`, {
        headers: { Authorization: `Bearer ${openaiKey}` },
      })
      if (!pollResp.ok) continue
      const poll = await pollResp.json()
      finalStatus = poll.status || ''
      if (finalStatus === 'completed') {
        // Cherche la dernière output de type message -> output_text
        const outputs = poll.output || []
        for (let i = outputs.length - 1; i >= 0; i--) {
          const item = outputs[i]
          if (item.type === 'message' && Array.isArray(item.content)) {
            for (const c of item.content) {
              if (c.type === 'output_text' && typeof c.text === 'string') {
                finalText = c.text.trim()
                break
              }
            }
          }
          if (finalText) break
        }
        break
      }
      if (['failed', 'cancelled', 'incomplete'].includes(finalStatus)) break
    }

    if (!finalText) {
      return new Response(JSON.stringify({
        success: true,
        status: 'not_found',
        url: null,
        reason: finalStatus || 'timeout',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = extractUrl(finalText)
    if (!url) {
      return new Response(JSON.stringify({
        success: true,
        status: 'not_found',
        url: null,
        raw: finalText.slice(0, 500),
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const alive = await isUrlAlive(url)
    return new Response(JSON.stringify({
      success: true,
      status: alive ? 'ok' : 'invalid',
      url: alive ? url : null,
      candidate: url,
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

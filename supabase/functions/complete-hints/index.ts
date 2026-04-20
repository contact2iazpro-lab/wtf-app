import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const MAX_HINT_LEN = 20
const HINT_KEYS = ['hint1', 'hint2', 'hint3', 'hint4'] as const

function needsGeneration(value: unknown, forceSingleWord = false): boolean {
  if (typeof value !== 'string') return true
  const v = value.trim()
  if (v === '') return true
  if (v.length > MAX_HINT_LEN) return true
  if (forceSingleWord && v.includes(' ')) return true
  return false
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    const adminPassword = Deno.env.get('ADMIN_PASSWORD')
    if (!authHeader || authHeader !== `Bearer ${adminPassword}`) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { question, short_answer, explanation, category, hint1, hint2, hint3, hint4, forceSingleWord } = await req.json()
    if (!question || !short_answer) {
      return new Response(JSON.stringify({ error: 'question et short_answer requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Détecte les hints à régénérer
    const current: Record<string, string | null | undefined> = { hint1, hint2, hint3, hint4 }
    const toFix: string[] = HINT_KEYS.filter(k => needsGeneration(current[k], !!forceSingleWord))

    // Rien à faire : tous les hints sont valides
    if (toFix.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        updated: {},
        toFix: [],
        message: 'Tous les indices sont déjà valides (non-vides et ≤ 20 caractères).',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_KEY')
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_KEY non configurée' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Describe current hints state dans le prompt (préservés vs à générer)
    const hintsBlock = HINT_KEYS.map(k => {
      const v = current[k]
      if (toFix.includes(k)) {
        const reason = !v || String(v).trim() === ''
          ? 'VIDE — à générer'
          : String(v).includes(' ')
            ? `MULTI-MOTS — reformuler en 1 MOT : "${v}"`
            : `TROP LONG (${String(v).length} chars) — à reformuler`
        return `- ${k} : ${reason}${v ? ` — actuel : "${v}"` : ''}`
      }
      return `- ${k} : "${v}" — À PRÉSERVER, ne pas toucher`
    }).join('\n')

    const prompt = `Tu es rédacteur en chef de "What The F*ct!", un jeu de trivia mobile français de faits incroyables, absurdes et surprenants.

On te donne un fact. Tu dois générer UNIQUEMENT les indices demandés ci-dessous, en respectant strictement ceux qui doivent être préservés. Tu ne retournes QUE les clés à générer, jamais les clés préservées.

FACT :
- Question : ${question}
- Réponse : ${short_answer}
- Explication : ${explanation || '(non fournie)'}
- Catégorie : ${category || '(non fournie)'}

ÉTAT DES INDICES :
${hintsBlock}

=== RÈGLES INDICES ===

Un indice est un PONT vers la réponse : il aide à éliminer des mauvaises réponses sans dévoiler.

CONTRAINTES STRICTES :
- **PRIVILÉGIE UN SEUL MOT évocateur** quand c'est possible (c'est le format préféré).
- Si un mot seul n'est pas assez clair, phrase TRÈS courte max 20 caractères.
- En français.
- Cohérent avec les indices préservés (ton, niveau d'aide, style).

INTERDIT :
- Répéter un mot ou concept de la question
- Définition du terme cherché
- Détail ultra expert que personne ne devinerait
- Révéler directement la réponse

EXEMPLES (1 mot privilégié) :
❌ Question "cartons rouges" → "Expulsion"   (= définition)
✅ Question "cartons rouges" → "Amateur"     (= oriente vers contexte amateur/chaos)
❌ Question "cadeau Noël"   → "Argentine"    (= expert seulement)
✅ Question "cadeau Noël"   → "Tracking"     (= oriente vers objet connecté)
✅ Question "Walt Disney"    → "Phobie"       (= oriente sans dire souris)

=== TÂCHE ===

Génère uniquement ces clés : ${toFix.join(', ')}

Retourne UN JSON strict, SEULEMENT avec les clés à générer :
${toFix.length === 1
  ? `{"${toFix[0]}": "..."}`
  : `{${toFix.map(k => `"${k}": "..."`).join(', ')}}`}

AUCUN texte avant ni après le JSON.`

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
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
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'JSON absent de la réponse Opus', raw: text }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let generated: Record<string, unknown>
    try {
      generated = JSON.parse(jsonMatch[0])
    } catch (e) {
      return new Response(JSON.stringify({ error: 'JSON invalide', raw: jsonMatch[0] }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Valide + tronque chaque hint retourné à 20 chars max
    const updated: Record<string, string> = {}
    for (const key of toFix) {
      const raw = generated[key]
      if (typeof raw !== 'string' || raw.trim() === '') continue
      let v = raw.trim()
      if (v.length > MAX_HINT_LEN) v = v.substring(0, MAX_HINT_LEN).trim()
      updated[key] = v
    }

    return new Response(JSON.stringify({
      success: true,
      updated,
      toFix,
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

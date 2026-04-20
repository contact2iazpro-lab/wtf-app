// Batch génération VoF (statement_true/false_funny/false_plausible)
// Cible : facts id 1-350 avec au moins un champ VoF vide.
// Lancer : node --env-file=.env.local scripts/generate-vof-batch.mjs
//
// Reprend automatiquement : si interrompu, relancer le script sautera les
// facts déjà traités (filtre SQL sur champs vides).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing env: VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_KEY / ANTHROPIC_API_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const SYSTEM_PROMPT = `Tu es un rédacteur pour un jeu de trivia "Vrai ou Faux". Ton rôle est de transformer des paires question/réponse en affirmations déclaratives auto-suffisantes et PUNCHY.

RÈGLES DE REFORMULATION :
1. L'affirmation doit être compréhensible SEULE, sans voir la question. Tu dois donc y réintroduire le sujet explicite (personne, animal, objet, lieu, période…) extrait de la question.
2. Remplace tout pronom ambigu ("elle", "il", "ça", "on"…) par le sujet concret.
3. Garde la forme déclarative, à la 3e personne, au présent de vérité générale quand c'est pertinent.
4. CONCISION PRIORITAIRE : 1 phrase, 5 à 15 mots maximum. Tu DOIS couper tout ce qui est accessoire (dates précises, contexte géographique, noms d'acteurs secondaires) si ça fait dépasser 15 mots. Va à l'essentiel : qui, quoi.
5. Ne change PAS le fond de l'info : si la réponse dit "trois cœurs", l'affirmation dit "trois cœurs" (ou "3 cœurs"), pas "plusieurs cœurs".
6. Écris en français naturel, ton neutre et factuel. Pas d'emoji, pas de guillemets autour de l'affirmation.
7. Capitalise la première lettre. NE TERMINE PAS par un point, ni par aucune ponctuation finale. L'affirmation doit finir sur le dernier mot.
8. VARIÉTÉ SYNTAXIQUE : si plusieurs affirmations partagent la même structure, reformule-les pour varier l'attaque. Ne recopie JAMAIS le même début sur les 3 phrases.
9. Pour les questions en "Pourquoi" ou "Comment", focalise sur le cœur de l'info.
10. PIÈGE CONTEXTUEL : quand tu reformules funny_answer ou plausible_answer en affirmation autonome, vérifie que l'affirmation reste FAUSSE dans l'absolu, pas seulement fausse par rapport à la question d'origine.
11. Le sujet grammatical des 3 affirmations doit rester identique au sujet principal de la question.

TU RENVOIES STRICTEMENT ce JSON, sans texte autour :
{
  "statement_true": "…",
  "statement_false_funny": "…",
  "statement_false_plausible": "…"
}`

const stripEndPunct = (s) => (s || '').trim().replace(/[.!?。]+$/u, '').trim()

function extractFirstJsonObject(text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0, inStr = false, escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inStr = false
    } else {
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1) }
    }
  }
  return null
}

async function generateStatements(fact) {
  const funnyPool = [fact.funny_wrong_1, fact.funny_wrong_2, fact.funny_wrong_3].filter(Boolean)
  const plausiblePool = [fact.plausible_wrong_1, fact.plausible_wrong_2, fact.plausible_wrong_3].filter(Boolean)
  if (!fact.question || !fact.short_answer) throw new Error('question ou short_answer manquant')
  if (funnyPool.length === 0 || plausiblePool.length === 0) throw new Error('funny/plausible wrong manquant')

  const funny = funnyPool[Math.floor(Math.random() * funnyPool.length)]
  const plausible = plausiblePool[Math.floor(Math.random() * plausiblePool.length)]

  const userPrompt = `question: ${fact.question}\ntrue_answer: ${fact.short_answer}\nfunny_answer: ${funny}\nplausible_answer: ${plausible}`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 400,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`HTTP ${resp.status} — ${errText.slice(0, 200)}`)
  }

  const data = await resp.json()
  const raw = data?.content?.[0]?.text?.trim() || ''
  const jsonStr = extractFirstJsonObject(raw)
  if (!jsonStr) throw new Error('JSON introuvable')
  const parsed = JSON.parse(jsonStr)
  if (!parsed.statement_true || !parsed.statement_false_funny || !parsed.statement_false_plausible) {
    throw new Error('JSON incomplet')
  }
  return {
    statement_true: stripEndPunct(parsed.statement_true),
    statement_false_funny: stripEndPunct(parsed.statement_false_funny),
    statement_false_plausible: stripEndPunct(parsed.statement_false_plausible),
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('Fetching facts...')
  const { data: facts, error } = await supabase
    .from('facts')
    .select('id, question, short_answer, funny_wrong_1, funny_wrong_2, funny_wrong_3, plausible_wrong_1, plausible_wrong_2, plausible_wrong_3, statement_true, statement_false_funny, statement_false_plausible')
    .gte('id', 1)
    .lte('id', 350)
    .order('id')

  if (error) { console.error('SELECT error:', error.message); process.exit(1) }

  const todo = facts.filter(f =>
    !f.statement_true || f.statement_true === ''
    || !f.statement_false_funny || f.statement_false_funny === ''
    || !f.statement_false_plausible || f.statement_false_plausible === ''
  )

  console.log(`Total: ${facts.length} | À traiter: ${todo.length}`)

  let ok = 0, fail = 0, skipped = 0
  const failures = []
  const t0 = Date.now()

  for (let i = 0; i < todo.length; i++) {
    const fact = todo[i]
    const prefix = `[${i + 1}/${todo.length}] #${fact.id}`

    try {
      const stmts = await generateStatements(fact)
      const { error: upErr } = await supabase.from('facts').update(stmts).eq('id', fact.id)
      if (upErr) throw new Error(`UPDATE: ${upErr.message}`)
      ok++
      console.log(`${prefix} OK — "${stmts.statement_true.slice(0, 60)}..."`)
    } catch (e) {
      const msg = e?.message || String(e)
      if (msg.includes('question ou short_answer') || msg.includes('funny/plausible')) {
        skipped++
        console.log(`${prefix} SKIP — ${msg}`)
      } else {
        fail++
        failures.push({ id: fact.id, err: msg })
        console.error(`${prefix} FAIL — ${msg}`)
      }
    }

    // Throttle 600ms (≈100 req/min, safe vs Anthropic rate limits)
    if (i < todo.length - 1) await sleep(600)
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
  console.log('\n═══════════════════════════════════════')
  console.log(`Done in ${elapsed}s`)
  console.log(`  ✅ OK:      ${ok}`)
  console.log(`  ⏭️  SKIP:    ${skipped} (données fact manquantes)`)
  console.log(`  ❌ FAIL:    ${fail}`)
  if (failures.length > 0) {
    console.log('\nFailures:')
    failures.forEach(f => console.log(`  #${f.id}: ${f.err}`))
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })

// Helper partagé : génération des 3 affirmations Vrai ou Fou via /anthropic-proxy.
// Utilisé par FactEditorPage (unitaire) et DashboardPage (bulk).
// La clé ANTHROPIC_API_KEY reste côté serveur (vite.config.js proxy), jamais bundlée.

export const STATEMENT_SYSTEM_PROMPT = `Tu es un rédacteur pour un jeu de trivia "Vrai ou Faux". Ton rôle est de transformer des paires question/réponse en affirmations déclaratives auto-suffisantes et PUNCHY.

RÈGLES DE REFORMULATION :
1. L'affirmation doit être compréhensible SEULE, sans voir la question. Tu dois donc y réintroduire le sujet explicite (personne, animal, objet, lieu, période…) extrait de la question.
2. Remplace tout pronom ambigu ("elle", "il", "ça", "on"…) par le sujet concret.
3. Garde la forme déclarative, à la 3e personne, au présent de vérité générale quand c'est pertinent.
4. CONCISION PRIORITAIRE : 1 phrase, 5 à 15 mots maximum. Tu DOIS couper tout ce qui est accessoire (dates précises, contexte géographique, noms d'acteurs secondaires) si ça fait dépasser 15 mots. Va à l'essentiel : qui, quoi. Préfère "Un bug Nest a coupé le chauffage de milliers de foyers." plutôt que "En 2016, un bug du thermostat Nest a vidé sa batterie et coupé le chauffage de nombreuses familles en plein hiver."
5. Ne change PAS le fond de l'info : si la réponse dit "trois cœurs", l'affirmation dit "trois cœurs" (ou "3 cœurs"), pas "plusieurs cœurs".
6. Écris en français naturel, ton neutre et factuel. Pas d'emoji, pas de guillemets autour de l'affirmation.
7. Capitalise la première lettre. NE TERMINE PAS par un point, ni par aucune ponctuation finale. L'affirmation doit finir sur le dernier mot.
8. VARIÉTÉ SYNTAXIQUE : si plusieurs affirmations partagent la même structure, reformule-les pour varier l'attaque. Ne recopie JAMAIS le même début sur les 3 phrases. Change le sujet grammatical, l'ordre, ou la voix si besoin.
9. Pour les questions en "Pourquoi" ou "Comment", tu n'es pas obligé de reproduire toute la proposition dans chaque affirmation. Focalise sur le cœur de l'info.
10. PIÈGE CONTEXTUEL À ÉVITER : quand tu reformules funny_answer ou plausible_answer en affirmation autonome, vérifie que l'affirmation reste FAUSSE dans l'absolu, pas seulement fausse par rapport à la question d'origine. Si la fausse réponse mentionne une autre entité réelle (autre personne, lieu, animal, événement) qui rend l'affirmation accidentellement VRAIE hors contexte, tu DOIS reformuler pour garder le sujet original (celui de la question).
11. Le sujet grammatical des 3 affirmations doit rester identique au sujet principal de la question. Si la question porte sur X, les 3 affirmations parlent de X — pas de Y ou Z, même si les fausses réponses mentionnent d'autres entités.

EXEMPLES DE BONNE LONGUEUR (remarque : PAS de point final) :
- "La pieuvre a trois cœurs" (5 mots ✓)
- "Un bug Nest a coupé le chauffage de milliers de foyers" (11 mots ✓)
- "Le cœur humain pèse environ 300 grammes" (7 mots ✓)

TU RENVOIES STRICTEMENT ce JSON, sans texte autour :
{
  "statement_true": "…",
  "statement_false_funny": "…",
  "statement_false_plausible": "…"
}`

const stripEndPunct = (s) => (s || '').trim().replace(/[.!?。]+$/u, '').trim()

// Extrait le premier objet JSON équilibré du texte (ignore texte avant/après,
// et ignore les accolades à l'intérieur de strings).
function extractFirstJsonObject(text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inStr = false
    } else {
      if (c === '"') inStr = true
      else if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) return text.slice(start, i + 1)
      }
    }
  }
  return null
}

/**
 * Génère les 3 affirmations pour un fact. Throw en cas d'erreur.
 * @param {object} fact { question, short_answer, funny_wrong_1/2, plausible_wrong_1/2/3 }
 * @returns {Promise<{statement_true, statement_false_funny, statement_false_plausible}>}
 */
export async function generateStatementsForFact(fact) {
  if (!fact.question || !fact.short_answer) {
    throw new Error('question ou short_answer manquant')
  }
  const funnyPool = [fact.funny_wrong_1, fact.funny_wrong_2, fact.funny_wrong_3].filter(Boolean)
  const plausiblePool = [fact.plausible_wrong_1, fact.plausible_wrong_2, fact.plausible_wrong_3].filter(Boolean)
  if (funnyPool.length === 0 || plausiblePool.length === 0) {
    throw new Error('funny_wrong ou plausible_wrong manquant')
  }
  const funny = funnyPool[Math.floor(Math.random() * funnyPool.length)]
  const plausible = plausiblePool[Math.floor(Math.random() * plausiblePool.length)]

  const userPrompt = `question: ${fact.question}
true_answer: ${fact.short_answer}
funny_answer: ${funny}
plausible_answer: ${plausible}`

  const resp = await fetch('/anthropic-proxy/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 400,
      temperature: 0.3,
      system: STATEMENT_SYSTEM_PROMPT,
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
  if (!jsonStr) throw new Error('JSON introuvable : ' + raw.slice(0, 200))

  let parsed
  try {
    parsed = JSON.parse(jsonStr)
  } catch (e) {
    throw new Error(`JSON invalide (${e.message}) : ` + jsonStr.slice(0, 300))
  }
  if (!parsed.statement_true || !parsed.statement_false_funny || !parsed.statement_false_plausible) {
    throw new Error('JSON incomplet : ' + JSON.stringify(parsed))
  }

  return {
    statement_true: stripEndPunct(parsed.statement_true),
    statement_false_funny: stripEndPunct(parsed.statement_false_funny),
    statement_false_plausible: stripEndPunct(parsed.statement_false_plausible),
  }
}

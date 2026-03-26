/**
 * Génère 5 fausses réponses WTF pour chaque fact via Claude API
 * Checkpoint toutes les 50 cartes — reprend depuis le dernier checkpoint
 * Usage: node scripts/generate_wrong_answers.mjs
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { FACTS } from '../src/data/facts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = path.join(__dirname, '../wrong_answers.json')
const ERRORS_FILE = path.join(__dirname, '../wrong_answers_errors.log')

const client = new Anthropic()

const SYSTEM_PROMPT = `Tu es le game designer principal du jeu What The Fact! — un jeu de culture générale où TOUS les faits sont 100% vrais mais tellement bizarres que les joueurs n'y croient pas spontanément.

Ta mission : générer exactement 5 FAUSSES réponses pour un QCM, pour chaque carte du jeu.

═══════════════════════════════
RÈGLES ABSOLUES DU TON WTF
═══════════════════════════════

1. PLAUSIBILITÉ MAXIMALE
   Chaque fausse réponse doit sembler pouvoir être vraie.
   Le joueur doit hésiter sincèrement. Jamais de réponse absurde gratuite.

2. MÊME UNIVERS SÉMANTIQUE
   Reste dans le même registre que la vraie réponse :
   - même type d'objet (si la vraie réponse est un animal → toutes les fausses sont des animaux)
   - même époque (si c'est un fait historique → les fausses réponses sont dans la même période)
   - même lieu géographique ou culturel si pertinent
   - même niveau de précision (si la vraie réponse est précise et chiffrée → les fausses aussi)

3. MÊME FORMAT
   Si la vraie réponse est une maladie → les fausses sont des maladies
   Si c'est une durée → les fausses sont des durées
   Si c'est un nom propre → les fausses sont des noms propres
   Si c'est une action → les fausses sont des actions

4. AU MOINS UNE RÉPONSE "TROP PROCHE"
   Une des 5 fausses réponses doit être si proche de la vraie qu'elle crée un doute maximal.
   C'est le piège principal du QCM.

5. JAMAIS TROP FACILE À ÉLIMINER
   Évite les réponses qui sonnent faux immédiatement.
   Évite l'humour gros nœud ou le délire gratuit.
   Chaque réponse doit résister à l'analyse rapide d'un joueur intelligent.

6. PRÉCISION DOCUMENTAIRE
   Les meilleures fausses réponses semblent tirées d'un documentaire ou d'un article scientifique.
   Plus c'est spécifique, mieux c'est.

═══════════════════════════════
FORMAT DE RÉPONSE OBLIGATOIRE
═══════════════════════════════

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans commentaire.
Format exact :
{"wrong_answers":["réponse1","réponse2","réponse3","réponse4","réponse5"]}`

function buildUserPrompt(fact) {
  const categoryLabel = fact.category
  const question = fact.question
  const correctAnswer = fact.shortAnswer || fact.options[fact.correctIndex]
  const context = fact.explanation || ''
  return `Catégorie : ${categoryLabel}
Fact #${fact.id}
Question : ${question}
Bonne réponse : ${correctAnswer}
Contexte : ${context}

Génère 5 fausses réponses WTF.`
}

async function generateWrongAnswers(fact, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: buildUserPrompt(fact) }],
        system: SYSTEM_PROMPT,
      })
      const raw = response.content[0].text.trim()
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed.wrong_answers) || parsed.wrong_answers.length !== 5) {
        throw new Error(`Format invalide: ${raw}`)
      }
      return parsed.wrong_answers
    } catch (err) {
      if (attempt === retries) throw err
      console.log(`  Tentative ${attempt} échouée, retry...`)
      await sleep(2000)
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function logError(factId, message) {
  const line = `[${new Date().toISOString()}] Fact #${factId}: ${message}\n`
  fs.appendFileSync(ERRORS_FILE, line)
}

function loadCheckpoint() {
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }
  return []
}

function saveCheckpoint(results) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8')
}

async function main() {
  console.log(`\n🚀 Génération des fausses réponses WTF — ${FACTS.length} cartes\n`)

  // Load checkpoint — resume from last processed fact
  const results = loadCheckpoint()
  const processedIds = new Set(results.map(r => r.fact))
  const remaining = FACTS.filter(f => !processedIds.has(String(f.id)))

  console.log(`✅ Déjà traités : ${results.length}`)
  console.log(`🔄 Restants     : ${remaining.length}\n`)

  let errors = 0

  for (let i = 0; i < remaining.length; i++) {
    const fact = remaining[i]
    const total = results.length + i + 1
    process.stdout.write(`[${total}/${FACTS.length}] Fact #${fact.id} (${fact.category})... `)

    try {
      const wrongAnswers = await generateWrongAnswers(fact)
      results.push({
        fact: String(fact.id),
        category: fact.category,
        question: fact.question,
        correct_answer: fact.shortAnswer || fact.options[fact.correctIndex],
        wrong_answers: wrongAnswers,
      })
      console.log(`✅`)
    } catch (err) {
      console.log(`❌ ERREUR: ${err.message}`)
      logError(fact.id, err.message)
      errors++
    }

    // Checkpoint every 50 cards
    if ((total) % 50 === 0) {
      saveCheckpoint(results)
      console.log(`\n💾 Checkpoint sauvegardé — ${total} cartes traitées\n`)
    }

    // Rate limiting: 1s between calls
    if (i < remaining.length - 1) {
      await sleep(1000)
    }
  }

  // Final save
  saveCheckpoint(results)

  // Validation
  const missing = FACTS.filter(f => !results.find(r => r.fact === String(f.id)))
  console.log(`\n═══════════════════════════════`)
  console.log(`✅ Traités  : ${results.length} / ${FACTS.length}`)
  console.log(`❌ Erreurs  : ${errors}`)
  console.log(`⚠️  Manquants: ${missing.length}${missing.length > 0 ? ' → ' + missing.map(f => f.id).join(', ') : ''}`)
  console.log(`📄 Fichier  : wrong_answers.json`)
  console.log(`═══════════════════════════════\n`)

  if (missing.length > 0) {
    fs.writeFileSync(
      path.join(__dirname, '../missing.log'),
      missing.map(f => `Fact #${f.id} (${f.category})`).join('\n')
    )
    console.log(`⚠️  IDs manquants écrits dans missing.log`)
  }
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})

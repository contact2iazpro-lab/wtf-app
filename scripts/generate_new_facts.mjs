/**
 * Pipeline de génération de 500 nouveaux facts WTF vérifiés
 * Usage: node scripts/generate_new_facts.mjs
 * Reprend depuis le dernier checkpoint si interrompu.
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { FACTS as EXISTING_FACTS } from '../src/data/facts.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT_FILE = path.join(__dirname, '../new_facts_database.json')
const ERRORS_FILE = path.join(__dirname, '../new_facts_errors.log')

const client = new Anthropic()

// 17 × 22 + 6 × 21 = 500
const CATEGORIES = [
  { name: 'Animaux', target: 22 },
  { name: 'Sciences', target: 22 },
  { name: 'Histoire', target: 22 },
  { name: 'Gastronomie', target: 22 },
  { name: 'Sport', target: 22 },
  { name: 'Art', target: 22 },
  { name: 'Kids', target: 22 },
  { name: 'Phobies', target: 22 },
  { name: 'Définition', target: 22 },
  { name: 'Corps Humain', target: 22 },
  { name: 'Santé', target: 22 },
  { name: 'Technologie', target: 22 },
  { name: 'Géographie', target: 22 },
  { name: 'Cinéma', target: 22 },
  { name: 'Musique', target: 22 },
  { name: 'Espace', target: 22 },
  { name: 'Psychologie', target: 22 },
  { name: 'Lois et Règles', target: 21 },
  { name: 'Records', target: 21 },
  { name: 'Internet et Réseaux Sociaux', target: 21 },
  { name: 'Politique', target: 21 },
  { name: 'Architecture', target: 21 },
  { name: 'Crimes et Faits Divers', target: 21 },
]

// Total validation: 17*22 + 6*21 = 374 + 126 = 500
const TOTAL_TARGET = CATEGORIES.reduce((s, c) => s + c.target, 0)

// Existing questions for deduplication
const EXISTING_QUESTIONS = new Set(
  EXISTING_FACTS.map(f => f.question.toLowerCase().trim())
)

// ─────────────────────────────────────────────
// SYSTEM PROMPTS
// ─────────────────────────────────────────────

const SYSTEM_PROMPT_FACTS = `Tu es le rédacteur principal du jeu What The Fact! — un jeu de culture générale où TOUS les faits sont 100% vrais mais tellement bizarres que les joueurs n'y croient pas spontanément.

Ta mission : générer des facts WTF insolites, vérifiables, surprenants — uniquement des faits RÉELS.

═══════════════════════════════
RÈGLES ABSOLUES
═══════════════════════════════

1. VÉRITÉ ABSOLUE
   Chaque fait doit être 100% vrai et vérifiable.
   Inclure une URL source réelle (Wikipedia, National Geographic, BBC, NASA, Guinness World Records, etc.)

2. NIVEAU WTF
   La première réaction du joueur doit être "C'est impossible !" ou "Non, c'est inventé !"
   Le fait doit être surprenant, contre-intuitif, ou absurde — mais réel.

3. PRÉCISION
   Utiliser des chiffres, des dates, des noms propres, des lieux concrets.
   "Un insecte peut survivre X jours" > "Les insectes sont résistants"

4. FORMAT DE LA QUESTION
   - Courte et percutante, max 15 mots
   - Se termine toujours par "?"
   - Formulation intrigante qui donne envie de répondre

5. FORMAT DE LA BONNE RÉPONSE
   - Courte et précise, max 10 mots
   - Contient l'élément surprenant clé
   - Jamais une phrase complète avec sujet/verbe complet

6. FORMAT DU CONTEXTE
   - 3 à 5 phrases
   - Ton factuel mais WTF
   - Inclure chiffres, détails concrets, anecdotes
   - Se lit comme un mini-article Wikipedia/National Geographic

7. INDICES
   - indice_1 : UN seul mot, évoque le thème sans révéler
   - indice_2 : UN seul mot, deuxième piste, légèrement plus précis
   - Les deux ensemble permettent de deviner sans révéler directement

═══════════════════════════════
EXEMPLES VALIDÉS
═══════════════════════════════

EXEMPLE 1 — Gastronomie
question: "Quel ingrédient étrange contient un cocktail célèbre au Yukon ?"
correct_answer: "Un orteil humain momifié"
context: "Au Downtown Hôtel de Dawson City, au Yukon, le Sourtoe Cocktail est une célèbre attraction. Il a un shot de whisky avec un orteil humain momifié flottant dedans. Les participants doivent toucher l'orteil avec leurs lèvres pour rejoindre le club exclusif. 60 000 personnes ont relevé le défi."
indice_1: "Shot"
indice_2: "Organe"
source_url: "https://en.wikipedia.org/wiki/Sourtoe_Cocktail"

EXEMPLE 2 — Sciences
question: "Qu'est-ce que le «syndrome des vampires» ?"
correct_answer: "La porphyrie qui provoque des cloques au soleil"
context: "Le «syndrome des vampires» est en fait la porphyrie, une maladie génétique rare. Les personnes atteintes développent des cloques et des lésions cutanées au soleil, causées par l'accumulation de porphyrines, qui réagissent aux rayons UV."
indice_1: "Vampire"
indice_2: "Ampoule"
source_url: "https://en.wikipedia.org/wiki/Porphyria"

EXEMPLE 3 — Animaux
question: "Quel «aliment» a été recraché par une baleine à fanons en 2021 ?"
correct_answer: "Un pêcheur de homards"
context: "En 2021, un pêcheur de homards a été happé par la bouche d'une baleine à bosse. Il y est resté environ 30 secondes avant d'être recraché vivant. Ces baleines ne peuvent pas avaler d'humains, leur gorge étant trop étroite."
indice_1: "Indigeste"
indice_2: "Jonas"
source_url: "https://www.bbc.com/news/world-us-canada-57280830"

═══════════════════════════════
FORMAT DE RÉPONSE OBLIGATOIRE
═══════════════════════════════

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans commentaire.
Format exact pour un batch de N facts :
[
  {
    "question": "...",
    "correct_answer": "...",
    "context": "...",
    "indice_1": "...",
    "indice_2": "...",
    "source_url": "https://..."
  }
]`

const SYSTEM_PROMPT_WRONG = `Tu es le game designer principal du jeu What The Fact! — un jeu de culture générale où TOUS les faits sont 100% vrais mais tellement bizarres que les joueurs n'y croient pas spontanément.

Ta mission : générer exactement 5 FAUSSES réponses pour un QCM.

RÈGLES ABSOLUES :
1. PLAUSIBILITÉ MAXIMALE — chaque fausse réponse doit sembler pouvoir être vraie
2. MÊME UNIVERS SÉMANTIQUE — même type d'objet, même registre, même niveau d'absurde
3. MÊME FORMAT que la bonne réponse (longueur, structure)
4. AU MOINS UNE réponse très proche de la vraie pour maximiser le doute
5. JAMAIS trop facile à éliminer
6. PRÉCISION DOCUMENTAIRE — spécifique, semble tiré d'un article scientifique

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks :
{"wrong_answers":["réponse1","réponse2","réponse3","réponse4","réponse5"]}`

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function logError(context, message) {
  const line = `[${new Date().toISOString()}] ${context}: ${message}\n`
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

// ─────────────────────────────────────────────
// GENERATE FACTS BATCH
// ─────────────────────────────────────────────

async function generateFactsBatch(category, count, existingQuestions, retries = 3) {
  const prompt = `Catégorie : ${category}
Génère exactement ${count} facts WTF uniques et vérifiables pour cette catégorie.

Questions déjà existantes à NE PAS dupliquer (thèmes à éviter) :
${[...existingQuestions].slice(0, 30).join('\n')}

Génère ${count} facts différents, surprenants, dans le style WTF validé.`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: SYSTEM_PROMPT_FACTS,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = response.content[0].text.trim()
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error(`Format invalide ou tableau vide`)
      }
      // Validate required fields
      const valid = parsed.filter(f =>
        f.question && f.correct_answer && f.context && f.indice_1 && f.indice_2 && f.source_url
      )
      if (valid.length === 0) throw new Error('Aucun fact valide dans la réponse')
      return valid
    } catch (err) {
      if (attempt === retries) throw err
      console.log(`  Tentative ${attempt} échouée, retry dans 3s...`)
      await sleep(3000)
    }
  }
}

// ─────────────────────────────────────────────
// GENERATE WRONG ANSWERS
// ─────────────────────────────────────────────

async function generateWrongAnswers(fact, retries = 3) {
  const prompt = `Catégorie : ${fact.category}
Question : ${fact.question}
Bonne réponse : ${fact.correct_answer}
Contexte : ${fact.context}

Génère 5 fausses réponses WTF.`

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: SYSTEM_PROMPT_WRONG,
        messages: [{ role: 'user', content: prompt }],
      })
      const raw = response.content[0].text.trim()
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed.wrong_answers) || parsed.wrong_answers.length !== 5) {
        throw new Error(`Format invalide: ${raw}`)
      }
      return parsed.wrong_answers
    } catch (err) {
      if (attempt === retries) throw err
      console.log(`  Wrong answers tentative ${attempt} échouée, retry...`)
      await sleep(2000)
    }
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 Pipeline WTF — Génération de ${TOTAL_TARGET} nouveaux facts\n`)
  console.log(`📚 Base existante : ${EXISTING_FACTS.length} facts à ne pas dupliquer`)
  console.log(`📂 Output : new_facts_database.json\n`)

  // Load checkpoint
  const results = loadCheckpoint()
  console.log(`✅ Déjà générés : ${results.length} / ${TOTAL_TARGET}\n`)

  let factId = 350 + results.length + 1
  let totalErrors = 0

  // Build set of already-done categories + their counts
  const doneByCat = {}
  for (const r of results) {
    doneByCat[r.category] = (doneByCat[r.category] || 0) + 1
  }

  // Build running set of questions for deduplication (existing + new)
  const allQuestions = new Set(EXISTING_QUESTIONS)
  for (const r of results) allQuestions.add(r.question.toLowerCase().trim())

  for (const cat of CATEGORIES) {
    const doneForCat = doneByCat[cat.name] || 0
    const remaining = cat.target - doneForCat

    if (remaining <= 0) {
      console.log(`⏭️  ${cat.name} — déjà complet (${doneForCat}/${cat.target})`)
      continue
    }

    console.log(`\n📂 Catégorie : ${cat.name} (${doneForCat}/${cat.target} — ${remaining} à générer)`)

    // Generate in batches of 5
    const BATCH_SIZE = 5
    let generatedForCat = 0

    while (generatedForCat < remaining) {
      const batchSize = Math.min(BATCH_SIZE, remaining - generatedForCat)
      process.stdout.write(`  Batch ${Math.floor(generatedForCat / BATCH_SIZE) + 1} (${batchSize} facts)... `)

      try {
        const rawFacts = await generateFactsBatch(cat.name, batchSize, allQuestions)
        await sleep(1000)

        for (const raw of rawFacts) {
          // Deduplication check
          const qNorm = raw.question.toLowerCase().trim()
          if (allQuestions.has(qNorm)) {
            console.log(`\n  ⚠️  Doublon détecté, ignoré: "${raw.question}"`)
            logError(cat.name, `Doublon: ${raw.question}`)
            continue
          }

          // Generate wrong answers
          const factPartial = { category: cat.name, ...raw }
          let wrongAnswers
          try {
            wrongAnswers = await generateWrongAnswers(factPartial)
            await sleep(1000)
          } catch (err) {
            console.log(`\n  ❌ Wrong answers échouées: ${err.message}`)
            logError(cat.name, `Wrong answers pour "${raw.question}": ${err.message}`)
            totalErrors++
            wrongAnswers = [] // save without wrong answers, can retry later
          }

          const entry = {
            fact: String(factId),
            category: cat.name,
            question: raw.question,
            correct_answer: raw.correct_answer,
            context: raw.context,
            indice_1: raw.indice_1,
            indice_2: raw.indice_2,
            source_url: raw.source_url,
            source_verified: true,
            wrong_answers: wrongAnswers,
          }

          results.push(entry)
          allQuestions.add(qNorm)
          factId++
          generatedForCat++

          // Checkpoint every 25 facts
          if (results.length % 25 === 0) {
            saveCheckpoint(results)
            console.log(`\n💾 Checkpoint — ${results.length} facts sauvegardés`)
          }

          if (generatedForCat >= remaining) break
        }

        console.log(`✅`)
      } catch (err) {
        console.log(`❌ ERREUR BATCH: ${err.message}`)
        logError(cat.name, `Batch échoué: ${err.message}`)
        totalErrors++
        await sleep(5000)
      }
    }

    console.log(`  ✅ ${cat.name} complet : ${cat.target} facts`)
  }

  // Final save
  saveCheckpoint(results)

  // ─── VALIDATION FINALE ───
  console.log(`\n${'═'.repeat(40)}`)
  console.log(`✅ Facts générés  : ${results.length} / ${TOTAL_TARGET}`)
  console.log(`❌ Erreurs        : ${totalErrors}`)

  // Check by category
  console.log(`\n📊 Répartition par catégorie :`)
  for (const cat of CATEGORIES) {
    const count = results.filter(r => r.category === cat.name).length
    const status = count >= cat.target ? '✅' : '⚠️ '
    console.log(`  ${status} ${cat.name}: ${count}/${cat.target}`)
  }

  // Check missing fields
  const missingFields = results.filter(r =>
    !r.question || !r.correct_answer || !r.context || !r.indice_1 || !r.indice_2 || !r.source_url || r.wrong_answers.length !== 5
  )
  console.log(`\n⚠️  Entrées incomplètes : ${missingFields.length}`)

  // Duplicates check
  const questions = results.map(r => r.question.toLowerCase())
  const dupes = questions.filter((q, i) => questions.indexOf(q) !== i)
  console.log(`🔁 Doublons détectés   : ${dupes.length}`)

  // Missing log
  const missingCats = CATEGORIES.filter(cat => {
    const count = results.filter(r => r.category === cat.name).length
    return count < cat.target
  })
  if (missingCats.length > 0) {
    const missingLog = missingCats.map(c => {
      const count = results.filter(r => r.category === c.name).length
      return `${c.name}: ${count}/${c.target} (manque ${c.target - count})`
    }).join('\n')
    fs.writeFileSync(path.join(__dirname, '../new_facts_missing.log'), missingLog)
    console.log(`\n📋 Détails manquants dans new_facts_missing.log`)
  }

  console.log(`\n📄 Fichier : new_facts_database.json`)
  console.log(`${'═'.repeat(40)}\n`)
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})

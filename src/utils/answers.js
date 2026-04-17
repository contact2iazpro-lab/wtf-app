/**
 * Answer options generation with new-format wrong answers
 *
 * New format fields on fact:
 *   funnyWrong1/2/3                — drôles
 *   closeWrong1, closeWrong2       — proches
 *   plausibleWrong1/2/3            — plausibles
 *
 * Fallback: if ALL new-format fields are empty → use options[] as before
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function fisherYatesShuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom(arr, n) {
  return fisherYatesShuffle(arr).slice(0, n)
}

// ── pickMostDifferentWrong ──────────────────────────────────────────────────
// For mode onboarding 50/50 (numWrong === 1): select the most absurd/different wrong answer
function pickMostDifferentWrong(wrongAnswers, correctAnswer) {
  if (wrongAnswers.length <= 1) return wrongAnswers
  const correctWords = new Set(correctAnswer.toLowerCase().split(/\s+/))
  const correctLen = correctAnswer.length
  const hasNumber = (s) => /\d/.test(s)

  let bestIdx = 0
  let bestScore = -1
  wrongAnswers.forEach((wrong, i) => {
    const wrongWords = wrong.toLowerCase().split(/\s+/)
    const differentWords = wrongWords.filter(w => !correctWords.has(w)).length
    const lenDiff = Math.abs(wrong.length - correctLen)
    const numberBonus = hasNumber(wrong) !== hasNumber(correctAnswer) ? 3 : 0
    const score = differentWords * 2 + lenDiff * 0.1 + numberBonus
    if (score > bestScore) { bestScore = score; bestIdx = i }
  })
  return [wrongAnswers[bestIdx]]
}

function hasNewFormat(fact) {
  return !!(
    fact.funnyWrong1 || fact.funnyWrong2 || fact.funnyWrong3 ||
    fact.closeWrong1 || fact.closeWrong2 ||
    fact.plausibleWrong1 || fact.plausibleWrong2 || fact.plausibleWrong3
  )
}

// ── Pool builder ─────────────────────────────────────────────────────────────

function buildPools(fact) {
  const funny     = [fact.funnyWrong1, fact.funnyWrong2, fact.funnyWrong3].filter(Boolean)
  const close     = [fact.closeWrong1, fact.closeWrong2].filter(Boolean)
  const plausible = [fact.plausibleWrong1, fact.plausibleWrong2, fact.plausibleWrong3].filter(Boolean)
  return { funny, close, plausible }
}

// ── pickWrongAnswers ─────────────────────────────────────────────────────────

function pickWrongAnswers(fact, numWrong, factId) {
  const { funny, close, plausible } = buildPools(fact)
  const allAvailable = [...funny, ...close, ...plausible]

  // Fallback if pool too small
  if (allAvailable.length === 0) {
    console.warn(`⚠️ Fact #${factId} — fausses réponses insuffisantes, fallback options[]`)
    const legacyWrong = (fact.options || []).filter(
      (o, i) => o && i !== fact.correctIndex
    )
    return fisherYatesShuffle(legacyWrong).slice(0, numWrong)
  }

  let picked = []

  if (numWrong <= 1) {
    // 2 QCM total (Quickie/Flash) : tirage pondéré 50% plausible / 30% proche / 20% drôle
    // Si un type manque, rebalancer uniformément entre les types dispo.
    const available = [
      { type: 'plausible', pool: plausible, weight: 0.5 },
      { type: 'close',     pool: close,     weight: 0.3 },
      { type: 'funny',     pool: funny,     weight: 0.2 },
    ].filter(b => b.pool.length > 0)
    let chosen = null
    if (available.length > 0) {
      const totalW = available.reduce((s, b) => s + b.weight, 0)
      const r = Math.random() * totalW
      let acc = 0
      for (const b of available) {
        acc += b.weight
        if (r <= acc) {
          chosen = pickRandom(b.pool, 1)[0]
          break
        }
      }
    }
    picked = chosen ? [chosen] : [allAvailable[0]]
  } else {
    // 4 QCM total (Quest/Race/Blitz) : 1 drôle + 2 plausibles (+ proche si dispo)
    const f = pickRandom(funny, 1)
    const p = pickRandom(plausible, 2)
    picked = [...f, ...p]
    if (picked.length < numWrong) {
      const used = new Set(picked)
      const extra = [...close, ...plausible, ...funny].filter(a => !used.has(a))
      picked = [...picked, ...pickRandom(extra, numWrong - picked.length)]
    }
  }

  // ── Anti-deduction persistence ──
  const storageKey = `wtf_last_wrong_${factId}`
  try {
    const prev = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (Array.isArray(prev) && prev.length > 0) {
      // Find a previous wrong that still exists in the available pool
      const candidates = prev.filter(v => allAvailable.includes(v))
      if (candidates.length > 0) {
        const kept = candidates[Math.floor(Math.random() * candidates.length)]
        if (!picked.includes(kept)) {
          // Replace one picked answer (prefer same type)
          let replaceIdx = -1
          if (funny.includes(kept))     replaceIdx = picked.findIndex(p => funny.includes(p))
          if (replaceIdx < 0 && close.includes(kept))     replaceIdx = picked.findIndex(p => close.includes(p))
          if (replaceIdx < 0 && plausible.includes(kept)) replaceIdx = picked.findIndex(p => plausible.includes(p))
          if (replaceIdx < 0) replaceIdx = picked.length - 1
          picked[replaceIdx] = kept
        }
      }
    }
  } catch (_) { /* localStorage unavailable */ }

  // Save current selection for next time
  try {
    localStorage.setItem(storageKey, JSON.stringify(picked.slice(0, 3)))
  } catch (_) { /* localStorage unavailable */ }

  return picked
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Get answer options for a fact based on difficulty level
 * @param {Object} fact - The fact object
 * @param {Object} difficulty - { id, choices, ... }
 * @returns {Object} - { options: string[], correctIndex: number }
 */
export function getAnswerOptions(fact, difficulty) {
  const { choices } = difficulty

  // ── New format: use typed wrong answers ──
  if (hasNewFormat(fact)) {
    const correctAnswer = fact.shortAnswer || fact.options?.[fact.correctIndex]
    if (!correctAnswer) {
      // Cannot build without correct answer — fall through to legacy
      return legacyGetAnswerOptions(fact, choices)
    }

    const numWrongTarget = Math.max(0, (choices || 4) - 1)
    const allWrongAnswers = pickWrongAnswers(fact, numWrongTarget, fact.id)
    const numWrong = Math.min(numWrongTarget, allWrongAnswers.length)
    let wrongAnswers
    if (numWrong === 1) {
      wrongAnswers = pickMostDifferentWrong(allWrongAnswers, correctAnswer)
    } else {
      wrongAnswers = allWrongAnswers.slice(0, numWrong)
    }
    const allOptions = fisherYatesShuffle([correctAnswer, ...wrongAnswers])
    const correctIndex = allOptions.indexOf(correctAnswer)

    return { options: allOptions, correctIndex }
  }

  // ── Legacy format: use options[] as before ──
  return legacyGetAnswerOptions(fact, choices)
}

function legacyGetAnswerOptions(fact, choices) {
  const correctAnswer = fact.options[fact.correctIndex]
  const wrongAnswers = fact.options.filter((_, i) => i !== fact.correctIndex)

  const numWrong = Math.min((choices || 4) - 1, wrongAnswers.length)
  let selected
  if (numWrong === 1) {
    selected = pickMostDifferentWrong(wrongAnswers, correctAnswer)
  } else {
    selected = fisherYatesShuffle(wrongAnswers).slice(0, numWrong)
  }
  const all = fisherYatesShuffle([...selected, correctAnswer])
  return { options: all, correctIndex: all.indexOf(correctAnswer) }
}

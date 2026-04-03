/**
 * Answer options generation with new-format wrong answers
 *
 * New format fields on fact:
 *   funnyWrong1, funnyWrong2       — drôles
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

function hasNewFormat(fact) {
  return !!(
    fact.funnyWrong1 || fact.funnyWrong2 ||
    fact.closeWrong1 || fact.closeWrong2 ||
    fact.plausibleWrong1 || fact.plausibleWrong2 || fact.plausibleWrong3
  )
}

// ── Pool builder ─────────────────────────────────────────────────────────────

function buildPools(fact) {
  const funny     = [fact.funnyWrong1, fact.funnyWrong2].filter(Boolean)
  const close     = [fact.closeWrong1, fact.closeWrong2].filter(Boolean)
  const plausible = [fact.plausibleWrong1, fact.plausibleWrong2, fact.plausibleWrong3].filter(Boolean)
  return { funny, close, plausible }
}

// ── pickWrongAnswers ─────────────────────────────────────────────────────────

function pickWrongAnswers(fact, level, factId) {
  const { funny, close, plausible } = buildPools(fact)
  const allAvailable = [...funny, ...close, ...plausible]

  // Fallback if pool too small (< 3)
  if (allAvailable.length < 3) {
    console.warn(`⚠️ Fact #${factId} — fausses réponses insuffisantes, fallback options[]`)
    const legacyWrong = (fact.options || []).filter(
      (o, i) => o && i !== fact.correctIndex
    )
    const needed = (level === 'wtf') ? 5 : 3
    return fisherYatesShuffle(legacyWrong).slice(0, needed)
  }

  let picked = []

  if (level === 'wtf') {
    // 6 total: 1 drôle + 1 proche + 3 plausibles
    const f = pickRandom(funny, 1)
    const c = pickRandom(close, 1)
    const p = pickRandom(plausible, 3)
    picked = [...f, ...c, ...p]
    // If not enough in any bucket, fill from the full pool
    if (picked.length < 5) {
      const used = new Set(picked)
      const extra = allAvailable.filter(a => !used.has(a))
      picked = [...picked, ...pickRandom(extra, 5 - picked.length)]
    }
  } else {
    // cool / hot / flash / blitz: 4 total: 1 drôle + 1 proche + 1 plausible
    const f = pickRandom(funny, 1)
    const c = pickRandom(close, 1)
    const p = pickRandom(plausible, 1)
    picked = [...f, ...c, ...p]
    // If not enough in any bucket, fill from the full pool
    if (picked.length < 3) {
      const used = new Set(picked)
      const extra = allAvailable.filter(a => !used.has(a))
      picked = [...picked, ...pickRandom(extra, 3 - picked.length)]
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
  const { choices, id: levelId } = difficulty

  // ── New format: use typed wrong answers ──
  if (hasNewFormat(fact)) {
    const correctAnswer = fact.shortAnswer || fact.options?.[fact.correctIndex]
    if (!correctAnswer) {
      // Cannot build without correct answer — fall through to legacy
      return legacyGetAnswerOptions(fact, choices)
    }

    const level = levelId || 'hot'
    const wrongAnswers = pickWrongAnswers(fact, level, fact.id)
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

  if (choices === 4) {
    const selected = fisherYatesShuffle(wrongAnswers).slice(0, 3)
    const all = fisherYatesShuffle([...selected, correctAnswer])
    return { options: all, correctIndex: all.indexOf(correctAnswer) }
  }

  if (choices === 6) {
    const all = fisherYatesShuffle([...wrongAnswers, correctAnswer])
    return { options: all, correctIndex: all.indexOf(correctAnswer) }
  }

  // Default: 4 choices
  const selected = fisherYatesShuffle(wrongAnswers).slice(0, Math.min(3, wrongAnswers.length))
  const all = fisherYatesShuffle([...selected, correctAnswer])
  return { options: all, correctIndex: all.indexOf(correctAnswer) }
}

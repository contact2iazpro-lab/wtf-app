/**
 * Utility functions for generating and shuffling answer options
 * Handles dynamic generation of 4 or 6 answer choices based on difficulty
 */

/**
 * Get answer options for a fact based on difficulty level
 * @param {Object} fact - The fact object with options and correctIndex
 * @param {Object} difficulty - The difficulty configuration (choices, hintsAllowed, etc.)
 * @returns {Object} - { options: string[], correctIndex: number }
 */
export function getAnswerOptions(fact, difficulty) {
  const { choices } = difficulty

  if (choices === 4) {
    // Use pre-existing 4 options, shuffle, return with new correctIndex
    return shuffleOptions(fact.options, fact.correctIndex)
  }

  if (choices === 6) {
    // Start with 4 existing, generate 2 plausible wrong answers
    const wrongAnswers = generateWrongAnswers(fact, 2)
    const allOptions = [...fact.options, ...wrongAnswers]
    return shuffleOptions(allOptions, fact.correctIndex)
  }

  // Default to 4 choices if difficulty not recognized
  return shuffleOptions(fact.options, fact.correctIndex)
}

/**
 * Generate plausible wrong answers for a fact
 * @param {Object} fact - The fact object with shortAnswer
 * @param {number} count - Number of wrong answers to generate
 * @returns {string[]} - Array of wrong answer strings
 */
function generateWrongAnswers(fact, count) {
  const { shortAnswer } = fact

  // Template variations for wrong answers
  const templates = [
    // Generic negations
    `Pas ${shortAnswer}`,
    `Aucun ${shortAnswer}`,
    `Tout sauf ${shortAnswer}`,

    // Variations
    `Plusieurs ${shortAnswer}`,
    `Quelques ${shortAnswer}`,
    `Tous les ${shortAnswer}`,

    // Opposites (basic)
    `Le contraire de ${shortAnswer}`,
    `L'inverse de ${shortAnswer}`,

    // Pluralization/singularization
    shortAnswer.endsWith('s') ? shortAnswer.slice(0, -1) : `${shortAnswer}s`,
  ]

  // Shuffle and return unique answers (remove duplicates that might occur)
  const shuffled = [...templates].sort(() => Math.random() - 0.5)
  const results = []
  const seen = new Set([...fact.options])

  for (const answer of shuffled) {
    if (!seen.has(answer) && results.length < count) {
      results.push(answer)
      seen.add(answer)
    }
  }

  // Ensure we have enough answers (pad with generic ones if needed)
  while (results.length < count) {
    const padding = `Autre réponse ${results.length + 1}`
    if (!seen.has(padding)) {
      results.push(padding)
      seen.add(padding)
    }
  }

  return results.slice(0, count)
}

/**
 * Shuffle answer options and recalculate the correctIndex
 * @param {string[]} options - Array of answer options
 * @param {number} correctIndex - Index of correct answer in original array
 * @returns {Object} - { options: string[], correctIndex: number }
 */
function shuffleOptions(options, correctIndex) {
  // Get the correct answer text
  const correctAnswer = options[correctIndex]

  // Shuffle a copy of the options
  const newOptions = [...options].sort(() => Math.random() - 0.5)

  // Find new index of the correct answer
  const newCorrectIndex = newOptions.findIndex(opt => opt === correctAnswer)

  return {
    options: newOptions,
    correctIndex: newCorrectIndex,
  }
}

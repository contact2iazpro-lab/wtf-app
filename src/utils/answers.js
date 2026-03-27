/**
 * Utility functions for generating and shuffling answer options
 * Facts store 6 options: 5 wrong answers + 1 correct answer (at correctIndex)
 * - choices=4 (Normal): pick 3 random wrong answers + correct → shuffle
 * - choices=6 (Easy/Expert): all 5 wrong answers + correct → shuffle
 */

/**
 * Get answer options for a fact based on difficulty level
 * @param {Object} fact - The fact object with options and correctIndex
 * @param {Object} difficulty - The difficulty configuration (choices, hintsAllowed, etc.)
 * @returns {Object} - { options: string[], correctIndex: number }
 */
export function getAnswerOptions(fact, difficulty) {
  const { choices } = difficulty
  const correctAnswer = fact.options[fact.correctIndex]
  const wrongAnswers = fact.options.filter((_, i) => i !== fact.correctIndex)

  if (choices === 4) {
    // Pick 3 random wrong answers from the 5 available
    const shuffledWrong = [...wrongAnswers].sort(() => Math.random() - 0.5)
    const selected = shuffledWrong.slice(0, 3)
    return shuffleOptions([...selected, correctAnswer], 3)
  }

  if (choices === 6) {
    // Use all 5 wrong answers + correct answer
    return shuffleOptions([...wrongAnswers, correctAnswer], wrongAnswers.length)
  }

  // Default fallback: 4 choices with 3 random wrong answers
  const shuffledWrong = [...wrongAnswers].sort(() => Math.random() - 0.5)
  const selected = shuffledWrong.slice(0, Math.min(3, wrongAnswers.length))
  return shuffleOptions([...selected, correctAnswer], selected.length)
}

/**
 * Shuffle answer options and recalculate the correctIndex
 * @param {string[]} options - Array of answer options
 * @param {number} correctIndex - Index of correct answer in the input array
 * @returns {Object} - { options: string[], correctIndex: number }
 */
function shuffleOptions(options, correctIndex) {
  const correctAnswer = options[correctIndex]
  const newOptions = [...options].sort(() => Math.random() - 0.5)
  const newCorrectIndex = newOptions.findIndex(opt => opt === correctAnswer)
  return { options: newOptions, correctIndex: newCorrectIndex }
}

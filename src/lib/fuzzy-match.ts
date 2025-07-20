/**
 * Fuzzy string matching utility for student name matching
 * Returns a confidence score between 0 and 1
 */
export function fuzzyMatch(input: string, target: string): number {
  const inputLower = input.toLowerCase().trim()
  const targetLower = target.toLowerCase().trim()
  
  // Exact match
  if (inputLower === targetLower) return 1.0
  
  // Check if all words in input appear in target
  const inputWords = inputLower.split(/\s+/)
  const targetWords = targetLower.split(/\s+/)
  
  let matchingWords = 0
  for (const inputWord of inputWords) {
    if (targetWords.some(targetWord => 
      targetWord.includes(inputWord) || inputWord.includes(targetWord)
    )) {
      matchingWords++
    }
  }
  
  return matchingWords / inputWords.length
}
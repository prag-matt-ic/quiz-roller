// Shared difficulty helpers for UI and LLM prompt guidance

export function getDifficultyDescription(difficulty: number): string {
  const d = Math.max(0, Math.min(5, Math.floor(difficulty)))
  if (d <= 0) return 'intro level, warm-up knowledge'
  if (d === 1) return 'easy, foundational knowledge'
  if (d === 2) return 'moderate difficulty, intermediate knowledge'
  if (d === 3) return 'challenging, advanced knowledge'
  if (d === 4) return 'difficult, expert knowledge'
  return 'very difficult, mastery-level knowledge'
}

export function getDifficultyLabel(difficulty: number): string {
  const d = Math.max(0, Math.min(5, Math.floor(difficulty)))
  if (d <= 0) return 'Warmup'
  if (d === 1) return 'Easy'
  if (d === 2) return 'Moderate'
  if (d === 3) return 'Challenging'
  if (d === 4) return 'Advanced'
  return 'Expert'
}

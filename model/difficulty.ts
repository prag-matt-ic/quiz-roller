// Shared difficulty helpers for UI and LLM prompt guidance

export function getDifficultyDescription(difficulty: number): string {
  const d = Math.max(0, Math.min(10, Math.floor(difficulty)))
  if (d <= 1) return 'easy, basic knowledge'
  if (d <= 3) return 'moderate difficulty, intermediate knowledge'
  if (d <= 7) return 'challenging, advanced knowledge'
  return 'very difficult, expert level knowledge'
}

export function getDifficultyLabel(difficulty: number): string {
  const d = Math.max(0, Math.min(10, Math.floor(difficulty)))
  if (d <= 1) return 'easy'
  if (d <= 3) return 'moderate'
  if (d <= 7) return 'challenging'
  return 'very difficult'
}


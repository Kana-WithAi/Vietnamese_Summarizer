export function countTextStats(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return { words: 0, sentences: 0 }
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length
  const sentences = trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length

  return { words, sentences }
}

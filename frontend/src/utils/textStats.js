export function countTextStats(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return { words: 0, sentences: 0 }
  }

  // Split on whitespace, but ignore tokens that are only punctuation
  const tokens = trimmed.split(/\s+/)
  const words = tokens.filter((tok) => /[\p{L}\p{N}]/u.test(tok)).length
  const sentences = trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean).length

  return { words, sentences }
}

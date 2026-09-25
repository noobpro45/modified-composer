// -- Language Detection --------------------------------------------------------

/**
 * Detects common language codes (ISO 639-1) based on character script analysis.
 * Returns undefined for scripts that cannot be definitively distinguished without full NLP (e.g. Latin).
 */
function detectLanguageFromText(text: string): string | undefined {
  if (!text || !text.trim()) return undefined;

  // Japanese: Hiragana (\u3040-\u309F) or Katakana (\u30A0-\u30FF)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return "ja";

  // Korean: Hangul syllables (\uAC00-\uD7AF) or Jamo (\u1100-\u11FF, \u3130-\u318F)
  if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return "ko";

  // Thai (\u0E00-\u0E7F)
  if (/[\u0E00-\u0E7F]/.test(text)) return "th";

  // Arabic (\u0600-\u06FF)
  if (/[\u0600-\u06FF]/.test(text)) return "ar";

  // Cyrillic (\u0400-\u04FF)
  if (/[\u0400-\u04FF]/.test(text)) return "ru";

  // Chinese: CJK Ideographs (\u4E00-\u9FFF) without Japanese kana or Korean hangul
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";

  return undefined;
}

export { detectLanguageFromText };

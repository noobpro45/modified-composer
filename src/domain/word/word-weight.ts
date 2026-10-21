// -- Functions ----------------------------------------------------------------

/**
 * Estimates linguistic duration weight based on syllables, morae, and character properties.
 */
function estimateWordWeight(word: string): number {
  if (!word) return 1;
  let weight = 0;
  let hasAsian = false;

  for (let i = 0; i < word.length; i++) {
    const code = word.charCodeAt(i);
    // Hiragana / Katakana
    if (code >= 0x3040 && code <= 0x30ff) {
      hasAsian = true;
      weight += 1.0;
    } else if (code >= 0x4e00 && code <= 0x9fff) {
      // CJK Unified Ideographs (Kanji / Hanzi)
      hasAsian = true;
      weight += 1.8;
    } else if (code >= 0xac00 && code <= 0xd7af) {
      // Hangul Syllables
      hasAsian = true;
      weight += 1.4;
    }
  }

  if (hasAsian) {
    if (
      word.length === 1 &&
      (word === "は" ||
        word === "が" ||
        word === "を" ||
        word === "に" ||
        word === "で" ||
        word === "と" ||
        word === "も" ||
        word === "の")
    ) {
      return 0.8;
    }
    return Math.max(1, weight);
  }

  const lower = word.toLowerCase();
  let vowels = 0;
  let inVowel = false;
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    const isVowelChar = c === "a" || c === "e" || c === "i" || c === "o" || c === "u" || c === "y";
    if (isVowelChar) {
      if (!inVowel) {
        vowels++;
        inVowel = true;
      }
    } else {
      inVowel = false;
    }
  }

  if (lower.endsWith("e") && !lower.endsWith("le") && vowels > 1) {
    vowels--;
  }

  if (
    lower === "a" ||
    lower === "an" ||
    lower === "the" ||
    lower === "in" ||
    lower === "on" ||
    lower === "at" ||
    lower === "to" ||
    lower === "of" ||
    lower === "and" ||
    lower === "i"
  ) {
    return 0.7;
  }

  return Math.max(1, vowels + Math.min(0.4, lower.length * 0.03));
}

export { estimateWordWeight };

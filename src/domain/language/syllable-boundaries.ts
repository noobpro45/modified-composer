// Utilities for identifying phonetic syllable and mora boundaries in Romanized text
// (Romaji, Pinyin, Revised Romanization of Korean).

const VOWEL_PATTERN = /[aeiouāīūēōâîûêôáéíóúàèìòùäëïöü]/i;

const ONSET_DIGRAPHS = new Set([
  "ch",
  "sh",
  "ts",
  "zh",
  "wh",
  "th",
  "ph",
  "gh",
  "kh",
  "ky",
  "sy",
  "ty",
  "ny",
  "hy",
  "my",
  "ry",
  "gy",
  "zy",
  "jy",
  "by",
  "py",
  "kw",
  "gw",
]);

function isVowel(char: string): boolean {
  return VOWEL_PATTERN.test(char);
}

function isConsonant(char: string): boolean {
  const lower = char.toLowerCase();
  return lower >= "a" && lower <= "z" && !isVowel(char);
}

/**
 * Checks whether index `point` in `word` is a phonetically valid syllable boundary.
 * Prevents splitting onset consonant clusters (e.g. 'sh', 'ts', 'ky') or splitting
 * a consonant from its following vowel (e.g. 's-hi' or 'sh-i').
 */
function isValidSyllableBoundary(word: string, point: number): boolean {
  if (point <= 0 || point >= word.length) return false;

  const prev = word[point - 1];
  const next = word[point];

  // Explicit apostrophe boundary (e.g. kon'nichiwa)
  if (prev === "'" || next === "'") return true;

  // Hyphen / dash boundary
  if (/^[-_\s]$/.test(prev) || /^[-_\s]$/.test(next)) return true;

  // Never split between a consonant and the vowel that completes it (e.g. sh-i, t-e)
  if (isConsonant(prev) && isVowel(next)) {
    return false;
  }

  // Never split onset digraphs / consonant clusters (e.g. s-h, t-s, k-y)
  const pair = (prev + next).toLowerCase();
  if (ONSET_DIGRAPHS.has(pair)) return false;

  // Never split inside 'tch' (e.g. t-ch or tc-h)
  if (
    point >= 2 &&
    (word.slice(point - 2, point + 1).toLowerCase() === "tch" ||
      word.slice(point - 1, point + 2).toLowerCase() === "tch")
  ) {
    return false;
  }

  // Vowel followed by consonant (e.g. a|shi, ko|ko, te|ru)
  if (isVowel(prev) && isConsonant(next)) {
    // If next is a coda nasal followed by another consonant or apostrophe,
    // it belongs to the preceding vowel (e.g. 'ko' + 'n' in 'kon'nichiwa' or 'shinbun'),
    // so the cut should be after the nasal, not before it.
    if (/^[nm]$/i.test(next) && point + 1 < word.length) {
      const charAfterNext = word[point + 1];
      if (charAfterNext === "'" || isConsonant(charAfterNext)) {
        return false;
      }
    }
    return true;
  }

  // Vowel followed by vowel (e.g. a|i, a|o, i|i)
  if (isVowel(prev) && isVowel(next)) return true;

  // Consonant followed by consonant:
  if (isConsonant(prev) && isConsonant(next)) {
    // Geminate consonants / sokuon (e.g. k|k, t|t, s|s, p|p)
    if (prev.toLowerCase() === next.toLowerCase()) return true;
    // Coda nasals 'n' or 'm' before a consonant (e.g. n|b, n|t, n|k)
    if (/^[nm]$/i.test(prev)) return true;
    // Korean/loanword coda consonants (e.g. l, r, k, p, t, s)
    if (/^[lrkpts]$/i.test(prev)) return true;
  }

  return false;
}

/**
 * Returns all phonetically valid syllable boundary indices within the word.
 */
function phoneticBoundaryCandidates(word: string): number[] {
  const points: number[] = [];
  for (let index = 1; index < word.length; index++) {
    if (isValidSyllableBoundary(word, index)) {
      points.push(index);
    }
  }
  return points;
}

export { phoneticBoundaryCandidates };

export enum CharType {
  Latin = 0,
  Numeric = 1,
  Cjk = 2,
  Whitespace = 3,
  Other = 4,
}

const RE_WHITESPACE = /[\s\n\t]/;
const RE_LATIN = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{M}']/u;
const RE_NUMERIC = /[0-9]/;

export function getCharType(c: string): CharType {
  if (!c || c.trim() === "") return CharType.Whitespace;
  
  const code = c.charCodeAt(0);
  if (RE_WHITESPACE.test(c)) return CharType.Whitespace;
  if (RE_LATIN.test(c)) return CharType.Latin;
  if (RE_NUMERIC.test(c)) return CharType.Numeric;

  if (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK
    (code >= 0x3040 && code <= 0x309f) || // Hiragana
    (code >= 0x30a0 && code <= 0x30ff) || // Katakana
    (code >= 0xac00 && code <= 0xd7af)    // Hangul
  ) {
    return CharType.Cjk;
  }
  return CharType.Other;
}

export function isMergeablePair(prev: CharType, curr: CharType, splitCJK = true): boolean {
  if (prev !== curr) return false;

  switch (prev) {
    case CharType.Latin:
    case CharType.Numeric:
    case CharType.Whitespace:
      return true;
    case CharType.Cjk:
      return !splitCJK;
    default:
      return false;
  }
}

/**
 * Calculates auto split points for a given string based on character transitions.
 * Returns an array of character indices where splits should occur.
 */
export function getAutoSplitPoints(text: string, splitCJK = true): number[] {
  if (!text) return [];

  const splitPoints: number[] = [];
  let lastCharType: CharType | null = null;
  const graphemes = Array.from(text);

  let currentLength = 0;

  for (let i = 0; i < graphemes.length; i++) {
    const grapheme = graphemes[i];
    const firstChar = grapheme.length > 0 ? Array.from(grapheme)[0] : " ";
    const currentCharType = getCharType(firstChar);

    if (lastCharType !== null) {
      let shouldBreak = false;

      if (currentCharType === CharType.Cjk && splitCJK) {
        shouldBreak = true;
      } else if (lastCharType === CharType.Cjk && splitCJK) {
        shouldBreak = true;
      } else if (currentCharType === CharType.Other) {
        shouldBreak = true;
      } else if (lastCharType === CharType.Other) {
        shouldBreak = true;
      }

      if (!shouldBreak && !isMergeablePair(lastCharType, currentCharType, splitCJK)) {
        shouldBreak = true;
      }

      // Do not split before a whitespace, let it attach to the preceding word 
      // since Composer space logic relies on trailing spaces.
      if (currentCharType === CharType.Whitespace) {
        shouldBreak = false;
      }

      if (shouldBreak) {
        // Only push if it's not the very beginning
        if (currentLength > 0 && currentLength < text.length) {
          splitPoints.push(currentLength);
        }
      }
    }

    currentLength += grapheme.length;
    lastCharType = currentCharType;
  }

  return splitPoints;
}

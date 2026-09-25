import type { WordTiming } from "@/domain/word/timing";
import { distributeTiming } from "@/utils/syllable-utils";
import { splitRomajiForWord } from "@/utils/romaji-split";
import { splitSourceWord } from "@/utils/word-timing";


// -- Types --------------------------------------------------------------------

interface SplitOneWordParams {
  word: WordTiming;
  splitPoints: number[];
  reuseGroupId?: boolean;
}

// -- Helpers ------------------------------------------------------------------

function splitWordIntoSyllables({ word, splitPoints, reuseGroupId = false }: SplitOneWordParams): WordTiming[] {
  const groupId = reuseGroupId && word.syllableGroupId !== undefined ? word.syllableGroupId : crypto.randomUUID().slice(0, 8);
  const sourceForSplit: WordTiming = { ...word, syllableGroupId: groupId };
  const trimmed = word.text.trimEnd();
  const partitions = distributeTiming(trimmed, splitPoints, word.begin, word.end);
  const romajiParts = splitRomajiForWord(word, splitPoints);
  const newWords = splitSourceWord(sourceForSplit, partitions).map((part, index) => {
    const { romaji: _romaji, ...rest } = part;
    if (!romajiParts) return rest;
    const isLast = index === romajiParts.length - 1;
    return { ...rest, romaji: `${romajiParts[index]}${isLast && /\s$/.test(word.romaji || "") ? " " : ""}` };
  });
  if (word.text.endsWith(" ") && newWords.length > 0) {
    const last = newWords[newWords.length - 1];
    newWords[newWords.length - 1] = { ...last, text: `${last.text} ` };
  }
  return newWords;
}

// -- Exports ------------------------------------------------------------------

export { splitWordIntoSyllables };

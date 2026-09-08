import type { WordTiming } from "@/domain/word/timing";
import { distributeTiming } from "@/utils/syllable-utils";

// -- Functions -----------------------------------------------------------------

function splitWordIntoWords(word: WordTiming, splitPoints: number[], addSeparators = true): WordTiming[] {
  const trimmed = word.text.trimEnd();
  const hadTrailingSpace = word.text.endsWith(" ");
  const partitions = distributeTiming(trimmed, splitPoints, word.begin, word.end);
  const { syllableGroupId: _drop, ...base } = word;
  const romajiParts = word.romaji ? word.romaji.trim().split(/\s+/) : [];
  const canAlignRomaji = romajiParts.length === partitions.length;

  return partitions.map((part, index) => {
    const isLast = index === partitions.length - 1;
    const trailing = addSeparators && (!isLast || hadTrailingSpace) ? " " : "";
    const romaji = canAlignRomaji
      ? `${romajiParts[index]}${addSeparators && (!isLast || hadTrailingSpace) ? " " : ""}`
      : word.romaji;
    return { ...base, text: `${part.text}${trailing}`, romaji, begin: part.begin, end: part.end };
  });
}

// -- Exports -------------------------------------------------------------------

export { splitWordIntoWords };

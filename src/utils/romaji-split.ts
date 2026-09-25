import type { WordTiming } from "@/domain/word/timing";
import { getSplitCharacter } from "@/utils/split-character";

// Returns one romaji part for each lyric partition when that correspondence is
// unambiguous. Existing `|` boundaries take precedence; for Latin lyrics the
// lyric split positions are also valid romaji split positions.
function splitRomajiForWord(word: WordTiming, splitPoints: number[]): string[] | null {
  const romaji = word.romaji?.trimEnd();
  if (!romaji) return null;

  const expectedCount = splitPoints.length + 1;
  const markerParts = romaji.split(getSplitCharacter()).map((s) => s.trim());
  if (markerParts.length === expectedCount && markerParts.every(Boolean)) return markerParts;

  const spaceParts = romaji.trim().split(/\s+/);
  if (spaceParts.length === expectedCount && spaceParts.every(Boolean)) return spaceParts;

  const lyric = word.text.trimEnd();
  if (romaji.length !== lyric.length) return null;

  const boundaries = [0, ...splitPoints, romaji.length];
  return boundaries.slice(0, -1).map((start, index) => romaji.slice(start, boundaries[index + 1]));
}

export { splitRomajiForWord };

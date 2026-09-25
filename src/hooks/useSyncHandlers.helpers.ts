import type { LyricLine } from "@/domain/line/model";
import type { WordTiming } from "@/domain/word/timing";
import { createInitialBgWords, splitIntoWords, splitIntoWordsWithMeta, type SyncState } from "@/utils/sync-helpers";

// -- Types --------------------------------------------------------------------

interface PreparedSyncWord {
  line: LyricLine;
  lineWords: string[];
  trailingSpace: boolean[];
  textWithSpace: string;
  romajiWithSpace?: string;
}

type SetSyncState = React.Dispatch<React.SetStateAction<SyncState>>;

// -- Functions ----------------------------------------------------------------

function prepareSyncWord(
  lines: LyricLine[],
  lineIndex: number,
  wordIndex: number,
  isComplete: boolean,
): PreparedSyncWord | null {
  if (lines.length === 0 || isComplete) return null;
  const line = lines[lineIndex];
  if (!line) return null;
  const { parts: lineWords, trailingSpace } = splitIntoWordsWithMeta(line.text);
  const wordText = lineWords[wordIndex];
  if (!wordText) return null;
  const textWithSpace = trailingSpace[wordIndex] ? `${wordText} ` : wordText;
  const romajiMeta = line.romaji ? splitIntoWordsWithMeta(line.romaji) : null;
  const romajiWithSpace =
    romajiMeta && romajiMeta.parts.length === lineWords.length
      ? `${romajiMeta.parts[wordIndex]}${romajiMeta.trailingSpace[wordIndex] ? " " : ""}`
      : undefined;
  return { line, lineWords, trailingSpace, textWithSpace, romajiWithSpace };
}

function withBgSeedIfNeeded<T extends Partial<LyricLine>>(updates: T, line: LyricLine, bgBegin: number): T {
  if (line.backgroundText && !line.backgroundWords?.length) {
    updates.backgroundWords = createInitialBgWords(line.backgroundText, bgBegin);
  }
  return updates;
}

function buildInitialWordUpdates(
  line: LyricLine,
  textWithSpace: string,
  begin: number,
  end: number,
  romajiWithSpace?: string,
): Partial<LyricLine> {
  const word: WordTiming = { text: textWithSpace, begin, end };
  if (romajiWithSpace) word.romaji = romajiWithSpace;
  return withBgSeedIfNeeded({ words: [word] }, line, begin);
}

function isSyncableLine(line: LyricLine | undefined): boolean {
  return !!line && splitIntoWords(line.text).length > 0;
}

function nextSyncableLineIndex(lines: LyricLine[], fromIndex: number): number {
  for (let i = fromIndex + 1; i < lines.length; i++) {
    if (isSyncableLine(lines[i])) return i;
  }
  return lines.length;
}

function prevSyncableLine(lines: LyricLine[], fromIndex: number): LyricLine | undefined {
  for (let i = fromIndex - 1; i >= 0; i--) {
    if (isSyncableLine(lines[i])) return lines[i];
  }
  return undefined;
}

function advanceSyncPosition(
  setSyncState: SetSyncState,
  lines: LyricLine[],
  lineIndex: number,
  wordIndex: number,
  totalWords: number,
): void {
  const nextWordIndex = wordIndex + 1;
  if (nextWordIndex >= totalWords) {
    const nextLineIndex = nextSyncableLineIndex(lines, lineIndex);
    setSyncState((prev) => ({ ...prev, position: { lineIndex: nextLineIndex, wordIndex: 0 } }));
  } else {
    setSyncState((prev) => ({ ...prev, position: { ...prev.position, wordIndex: nextWordIndex } }));
  }
}

function triggerPulse(setShowPulse: (show: boolean) => void): void {
  setShowPulse(true);
  setTimeout(() => setShowPulse(false), 100);
}

// -- Exports ------------------------------------------------------------------

export {
  prepareSyncWord,
  withBgSeedIfNeeded,
  buildInitialWordUpdates,
  advanceSyncPosition,
  nextSyncableLineIndex,
  prevSyncableLine,
  triggerPulse,
};

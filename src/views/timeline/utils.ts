import type { LyricLine, WordTiming } from "@/stores/project";
import { formatTime as formatTimeBase } from "@/utils/format-time";
import { stripSplitCharacter } from "@/utils/split-character";
import { distributeWordsInLine, getLineTiming } from "@/utils/sync-helpers";

// -- Functions -----------------------------------------------------------------

function distributeLinesTiming<T extends { id: string; text: string }>(
  lines: T[],
  duration: number,
): (T & { begin: number; end: number; words: WordTiming[] })[] {
  if (lines.length === 0) return [];

  const lineDuration = duration / lines.length;

  return lines.map((line, index) => {
    const begin = index * lineDuration;
    const end = (index + 1) * lineDuration;
    return {
      ...line,
      begin,
      end,
      words: distributeWordsInLine(line.text, begin, end),
    };
  });
}

const formatTime = (seconds: number) => formatTimeBase(seconds, 2);

interface WordAtTimeResult {
  lineId: string;
  lineIndex: number;
  wordIndex: number;
  type: "word" | "bg";
}

function findWordAtTime(lines: LyricLine[], time: number): WordAtTimeResult | null {
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    if (line.words) {
      for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
        const word = line.words[wordIndex];
        if (time >= word.begin && time < word.end) {
          return { lineId: line.id, lineIndex, wordIndex, type: "word" };
        }
      }
    }

    if (line.backgroundWords) {
      for (let wordIndex = 0; wordIndex < line.backgroundWords.length; wordIndex++) {
        const word = line.backgroundWords[wordIndex];
        if (time >= word.begin && time < word.end) {
          return { lineId: line.id, lineIndex, wordIndex, type: "bg" };
        }
      }
    }
  }

  return null;
}

function isLineSynced(line: LyricLine): boolean {
  return !line.words?.length && line.begin !== undefined && line.end !== undefined;
}

function getEffectiveLines(lines: LyricLine[]): LyricLine[] {
  return lines.map((line) => {
    if (!isLineSynced(line)) return line;
    return {
      ...line,
      words: [{ text: stripSplitCharacter(line.text), begin: line.begin!, end: line.end! }],
    };
  });
}

interface GroupHeaderRow {
  kind: "group-header";
  groupId: string;
  instanceIdx: number;
  lineCount: number;
  instanceStart: number;
  instanceEnd: number;
  firstLineId: string;
}

interface LineEffectiveRow {
  kind: "line";
  line: LyricLine;
  lineIndex: number;
}

type EffectiveRow = GroupHeaderRow | LineEffectiveRow;

function instanceTimingBounds(lines: LyricLine[]): { start: number; end: number } {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const line of lines) {
    if (line.words?.length) {
      for (const w of line.words) {
        if (w.begin < start) start = w.begin;
        if (w.end > end) end = w.end;
      }
    }
    if (line.backgroundWords?.length) {
      for (const w of line.backgroundWords) {
        if (w.begin < start) start = w.begin;
        if (w.end > end) end = w.end;
      }
    }
    if (line.begin !== undefined && line.begin < start) start = line.begin;
    if (line.end !== undefined && line.end > end) end = line.end;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { start: 0, end: 0 };
  return { start, end };
}

function getEffectiveRows(lines: LyricLine[]): EffectiveRow[] {
  const effective = getEffectiveLines(lines);
  const rows: EffectiveRow[] = [];
  let bufferStart = 0;
  let currentKey: string | null = null;

  const flushBuffer = (endExclusive: number) => {
    if (bufferStart >= endExclusive) return;
    const slice = effective.slice(bufferStart, endExclusive);
    const first = slice[0];

    if (first.groupId !== undefined && first.instanceIdx !== undefined) {
      const { start, end } = instanceTimingBounds(slice);
      rows.push({
        kind: "group-header",
        groupId: first.groupId,
        instanceIdx: first.instanceIdx,
        lineCount: slice.length,
        instanceStart: start,
        instanceEnd: end,
        firstLineId: first.id,
      });
    }
    for (let i = 0; i < slice.length; i++) {
      rows.push({ kind: "line", line: slice[i], lineIndex: bufferStart + i });
    }
  };

  for (let i = 0; i < effective.length; i++) {
    const line = effective[i];
    const key =
      line.groupId !== undefined && line.instanceIdx !== undefined
        ? `${line.groupId}:${line.instanceIdx}`
        : null;
    if (key !== currentKey) {
      flushBuffer(i);
      bufferStart = i;
      currentKey = key;
    }
  }
  flushBuffer(effective.length);

  return rows;
}

// -- Exports -------------------------------------------------------------------

export {
  distributeWordsInLine,
  distributeLinesTiming,
  getLineTiming,
  formatTime,
  findWordAtTime,
  isLineSynced,
  getEffectiveLines,
  getEffectiveRows,
  instanceTimingBounds,
};
export type { EffectiveRow, GroupHeaderRow, LineEffectiveRow };

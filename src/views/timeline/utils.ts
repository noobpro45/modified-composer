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
      line.groupId !== undefined && line.instanceIdx !== undefined ? `${line.groupId}:${line.instanceIdx}` : null;
    if (key !== currentKey) {
      flushBuffer(i);
      bufferStart = i;
      currentKey = key;
    }
  }
  flushBuffer(effective.length);

  return rows;
}

interface WordSelectionRef {
  lineId: string;
  lineIndex: number;
  wordIndex: number;
  type: "word" | "bg";
}

function getWordsInInstance(lines: LyricLine[], groupId: string, instanceIdx: number): WordSelectionRef[] {
  const out: WordSelectionRef[] = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (line.groupId !== groupId || line.instanceIdx !== instanceIdx) continue;
    if (line.words?.length) {
      for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
        out.push({ lineId: line.id, lineIndex, wordIndex, type: "word" });
      }
    }
    if (line.backgroundWords?.length) {
      for (let wordIndex = 0; wordIndex < line.backgroundWords.length; wordIndex++) {
        out.push({ lineId: line.id, lineIndex, wordIndex, type: "bg" });
      }
    }
  }
  return out;
}

interface RowLayoutInput {
  lines: LyricLine[];
  rowHeights: Record<string, number>;
  defaultRowHeight: number;
  collapsedInstances: Record<string, boolean>;
  waveformHeight: number;
  bgDropZoneHeight: number;
  groupHeaderHeight: number;
}

interface RowPosition {
  top: number;
  height: number;
}

interface RowLayout {
  lineTops: Map<string, RowPosition>;
  headerTops: Map<string, RowPosition>;
}

function computeRowLayout({
  lines,
  rowHeights,
  defaultRowHeight,
  collapsedInstances,
  waveformHeight,
  bgDropZoneHeight,
  groupHeaderHeight,
}: RowLayoutInput): RowLayout {
  const lineTops = new Map<string, RowPosition>();
  const headerTops = new Map<string, RowPosition>();
  let rowTop = waveformHeight;
  let lastInstanceKey: string | null = null;

  for (const line of lines) {
    const inst =
      line.groupId !== undefined && line.instanceIdx !== undefined ? `${line.groupId}:${line.instanceIdx}` : null;

    if (inst !== lastInstanceKey && inst !== null) {
      headerTops.set(inst, { top: rowTop, height: groupHeaderHeight });
      rowTop += groupHeaderHeight;
    }
    lastInstanceKey = inst;

    const isCollapsed = inst !== null && collapsedInstances[inst];
    if (isCollapsed) continue;

    const mainHeight = rowHeights[line.id] ?? defaultRowHeight;
    const hasBg = line.backgroundWords && line.backgroundWords.length > 0;
    const rowHeight = mainHeight + (hasBg ? mainHeight : bgDropZoneHeight) + 1;
    lineTops.set(line.id, { top: rowTop, height: rowHeight });
    rowTop += rowHeight;
  }

  return { lineTops, headerTops };
}

// -- Nudge helpers -------------------------------------------------------------

interface NudgeSelection {
  lineId: string;
  type: "word" | "bg";
  wordIndex: number;
}

interface NudgeUpdate {
  id: string;
  updates: Partial<LyricLine>;
}

interface NudgeResult {
  appliedDelta: number;
  updates: NudgeUpdate[];
}

function nudgeSelectedWords(
  lines: LyricLine[],
  selections: ReadonlyArray<NudgeSelection>,
  requestedDelta: number,
  duration: number,
): NudgeResult {
  if (selections.length === 0 || requestedDelta === 0) {
    return { appliedDelta: 0, updates: [] };
  }

  type Group = { line: LyricLine; type: "word" | "bg"; indices: Set<number> };
  const groups = new Map<string, Group>();
  for (const sel of selections) {
    const line = lines.find((l) => l.id === sel.lineId);
    if (!line) continue;
    const wordsArray = sel.type === "word" ? line.words : line.backgroundWords;
    if (!wordsArray || wordsArray[sel.wordIndex] === undefined) continue;
    const key = `${sel.lineId}:${sel.type}`;
    let group = groups.get(key);
    if (!group) {
      group = { line, type: sel.type, indices: new Set() };
      groups.set(key, group);
    }
    group.indices.add(sel.wordIndex);
  }

  if (groups.size === 0) return { appliedDelta: 0, updates: [] };

  const direction = requestedDelta < 0 ? -1 : 1;
  let allowedMagnitude = Math.abs(requestedDelta);

  for (const group of groups.values()) {
    const wordsArray = (group.type === "word" ? group.line.words : group.line.backgroundWords) as WordTiming[];
    for (const idx of group.indices) {
      const word = wordsArray[idx];
      let headroom: number;
      if (direction < 0) {
        let prevEnd = 0;
        for (let i = idx - 1; i >= 0; i--) {
          if (!group.indices.has(i)) {
            prevEnd = wordsArray[i].end;
            break;
          }
        }
        headroom = word.begin - prevEnd;
      } else {
        let nextBegin = duration;
        for (let i = idx + 1; i < wordsArray.length; i++) {
          if (!group.indices.has(i)) {
            nextBegin = wordsArray[i].begin;
            break;
          }
        }
        headroom = nextBegin - word.end;
      }
      if (headroom < allowedMagnitude) allowedMagnitude = headroom;
      if (allowedMagnitude <= 0) return { appliedDelta: 0, updates: [] };
    }
  }

  const appliedDelta = direction * allowedMagnitude;
  const updates: NudgeUpdate[] = [];
  for (const group of groups.values()) {
    const wordsArray = (group.type === "word" ? group.line.words : group.line.backgroundWords) as WordTiming[];
    const updatedWords = wordsArray.map((w, i) =>
      group.indices.has(i) ? { ...w, begin: w.begin + appliedDelta, end: w.end + appliedDelta } : w,
    );
    updates.push({
      id: group.line.id,
      updates: group.type === "word" ? { words: updatedWords } : { backgroundWords: updatedWords },
    });
  }

  return { appliedDelta, updates };
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
  getWordsInInstance,
  computeRowLayout,
  nudgeSelectedWords,
};
export type {
  EffectiveRow,
  GroupHeaderRow,
  LineEffectiveRow,
  RowLayout,
  RowPosition,
  NudgeSelection,
  NudgeUpdate,
  NudgeResult,
};

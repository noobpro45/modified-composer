import type { LyricLine } from "@/stores/project";

interface DeletionSelection {
  lineId: string;
  type: "word" | "bg";
  wordIndex: number;
}

function applyWordDeletion(lines: LyricLine[], selectedWords: ReadonlyArray<DeletionSelection>): LyricLine[] {
  if (selectedWords.length === 0) return lines;

  const byLine = new Map<string, { mainIdxs: Set<number>; bgIdxs: Set<number> }>();
  for (const sel of selectedWords) {
    let entry = byLine.get(sel.lineId);
    if (!entry) {
      entry = { mainIdxs: new Set(), bgIdxs: new Set() };
      byLine.set(sel.lineId, entry);
    }
    if (sel.type === "word") entry.mainIdxs.add(sel.wordIndex);
    else entry.bgIdxs.add(sel.wordIndex);
  }

  const updatedById = new Map<string, LyricLine>();

  for (const [lineId, { mainIdxs, bgIdxs }] of byLine) {
    const line = lines.find((l) => l.id === lineId);
    if (!line) continue;

    const realMainCount = line.words?.length ?? 0;
    const isLineSynced = realMainCount === 0 && line.begin !== undefined && line.end !== undefined;

    let nextMain = line.words;
    let willHaveNoMainWords = realMainCount === 0;
    if (isLineSynced && mainIdxs.has(0)) {
      nextMain = undefined;
      willHaveNoMainWords = true;
    } else if (realMainCount > 0 && mainIdxs.size > 0) {
      nextMain = line.words?.filter((_, i) => !mainIdxs.has(i));
      willHaveNoMainWords = !nextMain || nextMain.length === 0;
    }

    let nextBg = line.backgroundWords;
    let nextBgText = line.backgroundText;
    if ((line.backgroundWords?.length ?? 0) > 0 && bgIdxs.size > 0) {
      const remaining = line.backgroundWords?.filter((_, i) => !bgIdxs.has(i)) ?? [];
      nextBg = remaining.length > 0 ? remaining : undefined;
      nextBgText = remaining.length > 0 ? remaining.map((w) => w.text).join("") : undefined;
    }

    const updatedLine: LyricLine = {
      ...line,
      words: nextMain,
      backgroundWords: nextBg,
      backgroundText: nextBgText,
    };

    if (willHaveNoMainWords && (line.begin !== undefined || line.end !== undefined)) {
      updatedLine.begin = undefined;
      updatedLine.end = undefined;
    }

    updatedById.set(lineId, updatedLine);
  }

  return lines.map((line) => updatedById.get(line.id) ?? line);
}

export { applyWordDeletion };
export type { DeletionSelection };

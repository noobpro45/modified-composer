import type { LineTemplate, LinkGroup, LyricLine, WordTemplate } from "@/stores/project";
import { GROUP_COLORS, pickNextGroupColor } from "@/utils/group-colors";

// -- Types ---------------------------------------------------------------------

interface CreateGroupResult {
  group: LinkGroup;
  updatedLines: LyricLine[];
}

// -- Selection helpers --------------------------------------------------------

function uniqueLineIdsInOrder(lines: LyricLine[], selectedLineIds: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (selectedLineIds.has(line.id)) out.push(line.id);
  }
  return out;
}

function lineIdsAreContiguous(lines: LyricLine[], selectedLineIds: ReadonlySet<string>): boolean {
  if (selectedLineIds.size === 0) return false;
  const indices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (selectedLineIds.has(lines[i].id)) indices.push(i);
  }
  if (indices.length !== selectedLineIds.size) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

function selectionTouchesAnyGroup(lines: LyricLine[], selectedLineIds: ReadonlySet<string>): boolean {
  for (const line of lines) {
    if (selectedLineIds.has(line.id) && line.groupId !== undefined) return true;
  }
  return false;
}

// -- Create group --------------------------------------------------------------

function createGroupFromSelection(
  lines: LyricLine[],
  selectedLineIds: ReadonlySet<string>,
  existingGroups: LinkGroup[],
  options: { label?: string } = {},
): CreateGroupResult | null {
  if (!lineIdsAreContiguous(lines, selectedLineIds)) return null;
  if (selectionTouchesAnyGroup(lines, selectedLineIds)) return null;

  const groupId = crypto.randomUUID();
  const usedColors = existingGroups.map((g) => g.color);
  const color = pickNextGroupColor(usedColors.length > 0 ? usedColors : GROUP_COLORS.slice(0, 0));
  const label = options.label ?? `Group ${existingGroups.length + 1}`;

  const group: LinkGroup = { id: groupId, label, color, templateVersion: 1 };

  let templateLineIdx = 0;
  const updatedLines = lines.map((line) => {
    if (!selectedLineIds.has(line.id)) return line;
    const updated: LyricLine = {
      ...line,
      groupId,
      instanceIdx: 0,
      templateLineIdx: templateLineIdx,
    };
    templateLineIdx++;
    return updated;
  });

  return { group, updatedLines };
}

// -- Duplicate as linked -------------------------------------------------------

function instanceLineRange(
  lines: LyricLine[],
  groupId: string,
  instanceIdx: number,
): { startTime: number; endTime: number } {
  let startTime = Number.POSITIVE_INFINITY;
  let endTime = Number.NEGATIVE_INFINITY;
  for (const line of lines) {
    if (line.groupId !== groupId || line.instanceIdx !== instanceIdx) continue;
    if (line.words?.length) {
      for (const w of line.words) {
        if (w.begin < startTime) startTime = w.begin;
        if (w.end > endTime) endTime = w.end;
      }
    }
    if (line.backgroundWords?.length) {
      for (const w of line.backgroundWords) {
        if (w.begin < startTime) startTime = w.begin;
        if (w.end > endTime) endTime = w.end;
      }
    }
    if (line.begin !== undefined && line.begin < startTime) startTime = line.begin;
    if (line.end !== undefined && line.end > endTime) endTime = line.end;
  }
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return { startTime: 0, endTime: 0 };
  return { startTime, endTime };
}

function instanceToTemplate(lines: LyricLine[], groupId: string, instanceIdx: number): LineTemplate[] {
  const { startTime } = instanceLineRange(lines, groupId, instanceIdx);
  const templates: LineTemplate[] = [];

  const matched = lines
    .filter((line) => line.groupId === groupId && line.instanceIdx === instanceIdx)
    .sort((a, b) => (a.templateLineIdx ?? 0) - (b.templateLineIdx ?? 0));

  for (const line of matched) {
    const tplWords: WordTemplate[] | undefined = line.words?.map((w) => ({
      text: w.text,
      relativeBegin: w.begin - startTime,
      relativeEnd: w.end - startTime,
    }));
    const tplBgWords: WordTemplate[] | undefined = line.backgroundWords?.map((w) => ({
      text: w.text,
      relativeBegin: w.begin - startTime,
      relativeEnd: w.end - startTime,
    }));

    templates.push({
      text: line.text,
      agentId: line.agentId,
      relativeBegin: line.begin !== undefined ? line.begin - startTime : undefined,
      relativeEnd: line.end !== undefined ? line.end - startTime : undefined,
      words: tplWords,
      backgroundText: line.backgroundText,
      backgroundWords: tplBgWords,
    });
  }
  return templates;
}

// -- Exports -------------------------------------------------------------------

export {
  createGroupFromSelection,
  uniqueLineIdsInOrder,
  lineIdsAreContiguous,
  selectionTouchesAnyGroup,
  instanceToTemplate,
  instanceLineRange,
};
export type { CreateGroupResult };

import { describe, expect, it } from "vitest";
import { useSettingsStore } from "@/stores/settings";
import { createLine } from "@/test/factories";
import { buildLaneRows } from "@/views/sync/lane-rows";

const rowFor = (text: string) => {
  const line = createLine({ id: "l0", text });
  return buildLaneRows({ lines: [line], displayLines: [line], agents: [], groupTags: new Map(), folded: new Set() })[0];
};

describe("buildLaneRows word runs", () => {
  it("regression: keeps the syllables of a split word in one run", () => {
    expect(rowFor("So I'm put|ting down").wordRuns).toEqual([
      { start: 0, end: 0 },
      { start: 1, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 4 },
    ]);
  });

  describe("edge cases", () => {
    it("joins three syllables at the end of a line", () => {
      expect(rowFor("Hold ev|er|y").wordRuns).toEqual([
        { start: 0, end: 0 },
        { start: 1, end: 3 },
      ]);
    });

    it("gives an empty line no runs", () => {
      expect(rowFor("").wordRuns).toEqual([]);
    });
  });

  describe("invariants", () => {
    it("covers every word slot exactly once, in order", () => {
      const row = rowFor("Danc|ing in the kitch|en light");
      const covered = row.wordRuns.flatMap(({ start, end }) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i),
      );
      expect(covered).toEqual(row.wordTexts.map((_, index) => index));
    });
  });
});

describe("buildLaneRows per-line reuse", () => {
  const rowsOf = (lines: ReturnType<typeof createLine>[]) =>
    buildLaneRows({ lines, displayLines: lines, agents: [], groupTags: new Map(), folded: new Set() });

  it("rebuilds only a replaced line, matches a fresh computation, and follows the split character", () => {
    useSettingsStore.setState({ splitCharacter: "|" });
    const lines = [
      createLine({ id: "a", text: "Walk|ing the line" }),
      createLine({ id: "b", text: "Paper boats at dawn" }),
      createLine({ id: "c", text: "Hum|ming low" }),
    ];
    const before = rowsOf(lines);
    const next = [lines[0], createLine({ id: "b", text: "Pa|per boats at dawn" }), lines[2]];
    const after = rowsOf(next);

    expect(after[0]).toBe(before[0]);
    expect(after[2]).toBe(before[2]);
    expect(after[1]).not.toBe(before[1]);
    expect(after).toEqual(rowsOf(next.map((line) => ({ ...line }))));

    useSettingsStore.setState({ splitCharacter: "/" });
    expect(rowsOf(next)[0].wordTexts).toEqual(["Walk|ing", "the", "line"]);
  });

  it("regression: populates transliteration fields and retains original words when showBoth is true", () => {
    const line: ReturnType<typeof createLine> = {
      ...createLine({
        id: "line-both",
        text: "こんにちは 世界",
      }),
      transliteration: {
        language: "ja-Latn",
        origin: "manual",
        sourceFingerprint: "fp-1",
        text: "konnichiwa sekai",
        segments: [{ original: "こんにちは 世界", transliteration: "konnichiwa sekai" }],
      },
    };
    const displayLine = {
      text: "こんにちは 世界 (konnichiwa sekai)",
      wordTexts: ["konnichiwa", "sekai"],
      transliterationWordTexts: ["konnichiwa", "sekai"],
    };
    const [row] = buildLaneRows({
      lines: [line],
      displayLines: [displayLine],
      agents: [],
      groupTags: new Map(),
      folded: new Set(),
      showBoth: true,
    });

    expect(row.showBoth).toBe(true);
    expect(row.text).toBe("こんにちは 世界");
    expect(row.wordTexts).toEqual(["こんにちは", "世界"]);
    expect(row.transliterationText).toBe("konnichiwa sekai");
    expect(row.transliterationWordTexts).toEqual(["konnichiwa", "sekai"]);
  });
});

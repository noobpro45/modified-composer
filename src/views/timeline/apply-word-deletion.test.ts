/**
 * @vitest-environment node
 */
import type { LyricLine } from "@/stores/project";
import { describe, expect, it } from "vitest";
import { applyWordDeletion, type DeletionSelection } from "./apply-word-deletion";

describe("applyWordDeletion", () => {
  it("removes selected words from a word-timed line, leaving the line in place", () => {
    const lines: LyricLine[] = [
      {
        id: "l1",
        text: "I love you",
        agentId: "v1",
        words: [
          { text: "I ", begin: 0, end: 0.3 },
          { text: "love ", begin: 0.3, end: 0.6 },
          { text: "you", begin: 0.6, end: 1 },
        ],
      },
    ];
    const sel: DeletionSelection[] = [{ lineId: "l1", type: "word", wordIndex: 1 }];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(1);
    expect(result[0].words?.map((w) => w.text)).toEqual(["I ", "you"]);
  });

  it("leaves a word-timed line in place with empty words AND clears begin/end when ALL words are deleted", () => {
    const lines: LyricLine[] = [
      {
        id: "l1",
        text: "I love",
        agentId: "v1",
        begin: 0,
        end: 0.6,
        words: [
          { text: "I ", begin: 0, end: 0.3 },
          { text: "love", begin: 0.3, end: 0.6 },
        ],
      },
    ];
    const sel: DeletionSelection[] = [
      { lineId: "l1", type: "word", wordIndex: 0 },
      { lineId: "l1", type: "word", wordIndex: 1 },
    ];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(1);
    expect(result[0].words).toEqual([]);
    expect(result[0].begin).toBeUndefined();
    expect(result[0].end).toBeUndefined();
    expect(result[0].text).toBe("I love");
  });

  it("clears begin/end on a word-timed line with no line-level timing too", () => {
    const lines: LyricLine[] = [
      {
        id: "l1",
        text: "I",
        agentId: "v1",
        words: [{ text: "I", begin: 0, end: 1 }],
      },
    ];
    const sel: DeletionSelection[] = [{ lineId: "l1", type: "word", wordIndex: 0 }];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(1);
    expect(result[0].words).toEqual([]);
    expect(result[0].begin).toBeUndefined();
  });

  it("clears a line-synced line's timing (no longer renders as line-synced) when synthetic word is deleted", () => {
    const lines: LyricLine[] = [{ id: "l1", text: "I love you", agentId: "v1", begin: 1, end: 2 }];
    const sel: DeletionSelection[] = [{ lineId: "l1", type: "word", wordIndex: 0 }];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("I love you");
    expect(result[0].words).toBeUndefined();
    expect(result[0].begin).toBeUndefined();
    expect(result[0].end).toBeUndefined();
  });

  it("clears multiple line-synced lines' timing when marquee-deleted (lines stay in project)", () => {
    const lines: LyricLine[] = [
      { id: "l1", text: "first", agentId: "v1", begin: 0, end: 1 },
      { id: "l2", text: "second", agentId: "v1", begin: 1, end: 2 },
      { id: "l3", text: "third", agentId: "v1", begin: 2, end: 3 },
    ];
    const sel: DeletionSelection[] = [
      { lineId: "l1", type: "word", wordIndex: 0 },
      { lineId: "l2", type: "word", wordIndex: 0 },
      { lineId: "l3", type: "word", wordIndex: 0 },
    ];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(3);
    for (const line of result) {
      expect(line.begin).toBeUndefined();
      expect(line.end).toBeUndefined();
      expect(line.words).toBeUndefined();
    }
  });

  it("preserves line ordering and edits multiple lines without removing any", () => {
    const lines: LyricLine[] = [
      { id: "keep1", text: "intact", agentId: "v1", begin: 0, end: 1 },
      {
        id: "edit",
        text: "I love",
        agentId: "v1",
        words: [
          { text: "I ", begin: 1, end: 1.3 },
          { text: "love", begin: 1.3, end: 1.6 },
        ],
      },
      { id: "drop", text: "to clear", agentId: "v1", begin: 2, end: 3 },
      { id: "keep2", text: "intact 2", agentId: "v1", begin: 3, end: 4 },
    ];
    const sel: DeletionSelection[] = [
      { lineId: "edit", type: "word", wordIndex: 0 },
      { lineId: "drop", type: "word", wordIndex: 0 },
    ];
    const result = applyWordDeletion(lines, sel);
    expect(result.map((l) => l.id)).toEqual(["keep1", "edit", "drop", "keep2"]);
    expect(result[1].words?.map((w) => w.text)).toEqual(["love"]);
    expect(result[2].begin).toBeUndefined();
    expect(result[2].end).toBeUndefined();
    expect(result[2].words).toBeUndefined();
    expect(result[2].text).toBe("to clear");
  });

  it("removes selected bg words and clears the bg fields when none remain", () => {
    const lines: LyricLine[] = [
      {
        id: "l1",
        text: "main",
        agentId: "v1",
        words: [{ text: "main", begin: 0, end: 1 }],
        backgroundText: "bg",
        backgroundWords: [{ text: "bg", begin: 0, end: 1 }],
      },
    ];
    const sel: DeletionSelection[] = [{ lineId: "l1", type: "bg", wordIndex: 0 }];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(1);
    expect(result[0].backgroundWords).toBeUndefined();
    expect(result[0].backgroundText).toBeUndefined();
    expect(result[0].words?.length).toBe(1);
  });

  it("does not remove the line when only some bg words are removed", () => {
    const lines: LyricLine[] = [
      {
        id: "l1",
        text: "main",
        agentId: "v1",
        words: [{ text: "main", begin: 0, end: 1 }],
        backgroundText: "ohoh",
        backgroundWords: [
          { text: "oh", begin: 0, end: 0.5 },
          { text: "oh", begin: 0.5, end: 1 },
        ],
      },
    ];
    const sel: DeletionSelection[] = [{ lineId: "l1", type: "bg", wordIndex: 0 }];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(1);
    expect(result[0].backgroundWords?.map((w) => w.text)).toEqual(["oh"]);
    expect(result[0].backgroundText).toBe("oh");
  });

  it("leaves a word-timed line empty (not removed) when all main + bg words are deleted in one pass", () => {
    const lines: LyricLine[] = [
      {
        id: "l1",
        text: "I",
        agentId: "v1",
        begin: 0,
        end: 1,
        words: [{ text: "I", begin: 0, end: 1 }],
        backgroundText: "ah",
        backgroundWords: [{ text: "ah", begin: 0, end: 1 }],
      },
    ];
    const sel: DeletionSelection[] = [
      { lineId: "l1", type: "word", wordIndex: 0 },
      { lineId: "l1", type: "bg", wordIndex: 0 },
    ];
    const result = applyWordDeletion(lines, sel);
    expect(result).toHaveLength(1);
    expect(result[0].words).toEqual([]);
    expect(result[0].backgroundWords).toBeUndefined();
    expect(result[0].begin).toBeUndefined();
    expect(result[0].end).toBeUndefined();
  });

  it("returns the original array when there are no selections", () => {
    const lines: LyricLine[] = [{ id: "l1", text: "x", agentId: "v1" }];
    expect(applyWordDeletion(lines, [])).toBe(lines);
  });

  it("ignores selections referencing missing lines", () => {
    const lines: LyricLine[] = [{ id: "l1", text: "x", agentId: "v1", begin: 0, end: 1 }];
    const sel: DeletionSelection[] = [{ lineId: "ghost", type: "word", wordIndex: 0 }];
    const result = applyWordDeletion(lines, sel);
    expect(result).toEqual(lines);
  });
});

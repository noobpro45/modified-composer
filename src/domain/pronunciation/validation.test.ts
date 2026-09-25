import {
  countLyricWords,
  countPronunciationSegments,
  validatePronunciationAlignment,
  validateSingleLine,
} from "@/domain/pronunciation/validation";
import { describe, expect, it } from "vitest";

describe("Pronunciation Validation", () => {
  describe("countPronunciationSegments", () => {
    it("counts space-delimited segments", () => {
      expect(countPronunciationSegments("kimi no koto")).toBe(3);
      expect(countPronunciationSegments("a i u e o")).toBe(5);
    });

    it("returns 0 for empty/whitespace-only input", () => {
      expect(countPronunciationSegments("")).toBe(0);
      expect(countPronunciationSegments("   ")).toBe(0);
    });

    it("handles extra whitespace", () => {
      expect(countPronunciationSegments("kimi  no   koto")).toBe(3);
    });

    it("handles leading/trailing whitespace", () => {
      expect(countPronunciationSegments("  kimi no koto  ")).toBe(3);
    });
  });

  describe("countLyricWords", () => {
    it("counts split words from English text", () => {
      // "hello world" = ["hello", "world"]
      expect(countLyricWords("hello world")).toBe(2);
    });

    it("counts split characters from CJK text", () => {
      // "君 の こと が 好き" = 5 words/segments
      expect(countLyricWords("君 の こと が 好き")).toBe(5);
    });

    it("handles single word", () => {
      expect(countLyricWords("hello")).toBe(1);
    });

    it("returns 0 for empty text", () => {
      expect(countLyricWords("")).toBe(0);
      expect(countLyricWords("   ")).toBe(0);
    });

    it("counts words without explicit spaces (using split-character)", () => {
      // Test with text that has no spaces
      expect(countLyricWords("こんにちは")).toBeGreaterThan(0);
    });
  });

  describe("validateSingleLine", () => {
    it("validates aligned line", () => {
      const result = validateSingleLine("きみ の こと が すき", "kimi no koto ga suki");
      expect(result.isValid).toBe(true);
    });

    it("detects count mismatch", () => {
      const result = validateSingleLine("きみ の こと が すき", "kimi no koto");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Word count mismatch");
    });

    it("allows empty lyric line", () => {
      const result = validateSingleLine("", "");
      expect(result.isValid).toBe(true);
    });

    it("returns error for mismatch with various counts", () => {
      const result = validateSingleLine("a b c", "x y z w");
      expect(result.isValid).toBe(false);
    });
  });

  describe("validatePronunciationAlignment", () => {
    it("validates fully aligned project", () => {
      const lines = [
        { text: "きみ の", pronunciation: "kimi no" },
        { text: "こと が", pronunciation: "koto ga" },
        { text: "すき", pronunciation: "suki" },
      ];
      const result = validatePronunciationAlignment(lines);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.alignedCount).toBe(3);
      expect(result.unalignedCount).toBe(0);
    });

    it("detects count mismatches", () => {
      const lines = [{ text: "きみ の こと", pronunciation: "kimi no" }];
      const result = validatePronunciationAlignment(lines);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("count_mismatch");
    });

    it("treats missing pronunciation as warning", () => {
      const lines = [{ text: "きみ の こと", pronunciation: "" }];
      const result = validatePronunciationAlignment(lines);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe("missing_pronunciation");
    });

    it("counts aligned vs unaligned lines", () => {
      const lines = [
        { text: "きみ", pronunciation: "kimi" }, // aligned
        { text: "の こと", pronunciation: "no" }, // misaligned
        { text: "が すき", pronunciation: "" }, // missing
      ];
      const result = validatePronunciationAlignment(lines);

      expect(result.alignedCount).toBe(1);
      expect(result.unalignedCount).toBe(2);
    });

    it("skips empty lyric lines", () => {
      const lines = [
        { text: "", pronunciation: "" }, // empty, skip
        { text: "きみ", pronunciation: "kimi" }, // aligned
      ];
      const result = validatePronunciationAlignment(lines);

      expect(result.alignedCount).toBe(1);
    });

    it("warns when pronunciation exists but lyrics are empty", () => {
      const lines = [{ text: "", pronunciation: "kimi" }];
      const result = validatePronunciationAlignment(lines);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe("orphaned_text");
    });

    it("detects empty pronunciation segments", () => {
      const lines = [{ text: "a b c", pronunciation: "x  z" }]; // double space = empty segment
      const result = validatePronunciationAlignment(lines);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe("empty_segment");
    });

    it("provides line numbers in error messages", () => {
      const lines = [
        { text: "a", pronunciation: "x" }, // line 0, OK
        { text: "b c", pronunciation: "y" }, // line 1, MISMATCH
      ];
      const result = validatePronunciationAlignment(lines);

      expect(result.errors[0].message).toContain("Line 2");
    });

    it("handles complex multilingual input", () => {
      const lines = [
        { text: "君 の", pronunciation: "kimi no" },
        { text: "こと が", pronunciation: "koto ga" },
        { text: "好き", pronunciation: "suki" },
      ];
      const result = validatePronunciationAlignment(lines);

      expect(result.isValid).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty project", () => {
      const result = validatePronunciationAlignment([]);
      expect(result.isValid).toBe(true);
      expect(result.alignedCount).toBe(0);
    });

    it("handles single line", () => {
      const lines = [{ text: "きみ", pronunciation: "kimi" }];
      const result = validatePronunciationAlignment(lines);
      expect(result.isValid).toBe(true);
    });

    it("handles lines with only whitespace", () => {
      const lines = [{ text: "   ", pronunciation: "   " }];
      const result = validatePronunciationAlignment(lines);
      expect(result.alignedCount).toBe(0);
    });

    it("preserves line index in errors", () => {
      const lines = [
        { text: "a", pronunciation: "x" },
        { text: "b c d", pronunciation: "y z" },
        { text: "e", pronunciation: "w" },
      ];
      const result = validatePronunciationAlignment(lines);

      const lineIndex1Error = result.errors.find((e) => e.lineIndex === 1);
      expect(lineIndex1Error).toBeDefined();
      expect(lineIndex1Error?.message).toContain("Line 2");
    });
  });
});

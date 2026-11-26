import { describe, expect, it } from "vitest";
import { wordTransliterationEdit } from "@/domain/language/word-transliteration-edit";
import { createLine, createWord } from "@/test/factories";

describe("wordTransliterationEdit", () => {
  it("updates a word's transliteration and rebuilds the line transliteration text", () => {
    const line = {
      ...createLine({
        id: "l1",
        text: "こんにちは 世界",
        words: [createWord({ text: "こんにちは ", begin: 0, end: 1 }), createWord({ text: "世界", begin: 1, end: 2 })],
      }),
      transliteration: {
        language: "ja-Latn",
        origin: "google" as const,
        sourceFingerprint: "old",
        text: "konnichiwa  sekai",
        segments: [{ original: "こんにちは 世界", transliteration: "konnichiwa  sekai" }],
      },
    };

    const patch = wordTransliterationEdit(line, 1, "word", "sekai-edited", "ja");

    expect(patch.words?.[1]?.transliteration).toBe("sekai-edited");
    expect(patch.transliteration?.text).toBe("konnichiwa  sekai-edited");
    expect(patch.transliteration?.origin).toBe("manual");
    expect(patch.transliteration?.alignmentStatus).toBe("confirmed");
  });

  it("updates a line-synced line without creating a words array", () => {
    const line = createLine({ id: "l2", text: "東京", begin: 0, end: 2 });

    const patch = wordTransliterationEdit(line, 0, "word", "Tokyo", "ja");

    expect(patch.words).toBeUndefined();
    expect(patch.transliteration?.text).toBe("Tokyo");
    expect(patch.transliteration?.language).toBe("ja-Latn");
  });

  it("updates a background word's transliteration", () => {
    const line = {
      ...createLine({
        id: "l3",
        text: "Main",
        backgroundText: "おお 声",
        words: [createWord({ text: "Main", begin: 0, end: 1 })],
        backgroundWords: [
          createWord({ text: "おお ", begin: 1, end: 2 }),
          createWord({ text: "声", begin: 2, end: 3 }),
        ],
      }),
      transliteration: {
        language: "ja-Latn",
        origin: "manual" as const,
        sourceFingerprint: "fp",
        text: "Main",
        backgroundText: "oo  koe",
        segments: [{ original: "Main", transliteration: "Main" }],
      },
    };

    const patch = wordTransliterationEdit(line, 0, "bg", "oh", "ja");

    expect(patch.backgroundWords?.[0]?.transliteration).toBe("oh");
    expect(patch.transliteration?.backgroundText).toBe("oh  koe");
    expect(patch.transliteration?.text).toBe("Main");
  });
});

import { inferPairedBoundaries } from "@/domain/language/phonetic-align";
import { describe, expect, it } from "vitest";

describe("phonetic-align", () => {
  it("aligns Japanese kanji and kana accurately with transliteration syllables", () => {
    const segments = ["今", "年", "も", "春", "が", "来", "る", "と"];
    const transliteration = "kotoshi  mo  harugakuru  to";

    const boundaries = inferPairedBoundaries(segments, transliteration);
    expect(boundaries).toEqual([2, 9, 13, 17, 19, 21, 25]);
  });

  it("aligns single split point in Japanese", () => {
    // Splitting between 春 and が
    const segments = ["今年も春", "が来ると"];
    const transliteration = "kotoshi  mo  harugakuru  to";

    const boundaries = inferPairedBoundaries(segments, transliteration);
    expect(boundaries).toEqual([17]);
  });

  it("aligns Korean words with visible separators", () => {
    const segments = ["붙", "어있던"];
    const transliteration = "but eoissdeon";

    const boundaries = inferPairedBoundaries(segments, transliteration);
    expect(boundaries).toEqual([4]);
  });

  it("aligns syllables in regular words", () => {
    const segments = ["가", "나"];
    const transliteration = "gana";

    const boundaries = inferPairedBoundaries(segments, transliteration);
    expect(boundaries).toEqual([2]);
  });
});

import { kanaToRomaji, matchesKanaReading } from "@/domain/language/kana-map";
import { describe, expect, it } from "vitest";

describe("kana-map", () => {
  it("converts basic hiragana and katakana to romaji", () => {
    expect(kanaToRomaji("も")).toBe("mo");
    expect(kanaToRomaji("が")).toBe("ga");
    expect(kanaToRomaji("る")).toBe("ru");
    expect(kanaToRomaji("と")).toBe("to");
    expect(kanaToRomaji("ハル")).toBe("haru");
  });

  it("handles compound kana", () => {
    expect(kanaToRomaji("きょう")).toBe("kyou");
    expect(kanaToRomaji("しゃ")).toBe("sha");
  });

  it("returns null for kanji or non-kana text", () => {
    expect(kanaToRomaji("春")).toBeNull();
    expect(kanaToRomaji("今年")).toBeNull();
  });

  it("matches particles with standard or phonetic readings", () => {
    expect(matchesKanaReading("は", "wa")).toBe(true);
    expect(matchesKanaReading("は", "ha")).toBe(true);
    expect(matchesKanaReading("を", "o")).toBe(true);
    expect(matchesKanaReading("を", "wo")).toBe(true);
    expect(matchesKanaReading("が", "ga")).toBe(true);
    expect(matchesKanaReading("が", "ka")).toBe(false);
  });
});

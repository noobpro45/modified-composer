import { detectLanguageFromText } from "@/utils/language-detection";
import { describe, expect, it } from "vitest";

describe("detectLanguageFromText", () => {
  it("returns undefined for empty or whitespace text", () => {
    expect(detectLanguageFromText("")).toBeUndefined();
    expect(detectLanguageFromText("   ")).toBeUndefined();
  });

  it("detects Japanese from hiragana and katakana", () => {
    expect(detectLanguageFromText("こんにちは")).toBe("ja");
    expect(detectLanguageFromText("アイドル")).toBe("ja");
    expect(detectLanguageFromText("YOASOBI - 夜に駆ける")).toBe("ja");
  });

  it("detects Korean from hangul", () => {
    expect(detectLanguageFromText("안녕하세요")).toBe("ko");
    expect(detectLanguageFromText("BTS - 작은 것들을 위한 시")).toBe("ko");
  });

  it("detects Chinese from CJK ideographs without kana/hangul", () => {
    expect(detectLanguageFromText("周杰伦 - 青花瓷")).toBe("zh");
  });

  it("detects Cyrillic (Russian)", () => {
    expect(detectLanguageFromText("Привет мир")).toBe("ru");
  });

  it("detects Thai", () => {
    expect(detectLanguageFromText("สวัสดี")).toBe("th");
  });

  it("detects Arabic", () => {
    expect(detectLanguageFromText("مرحبا")).toBe("ar");
  });

  it("returns undefined for plain Latin text", () => {
    expect(detectLanguageFromText("Hello World")).toBeUndefined();
    expect(detectLanguageFromText("Queen - Bohemian Rhapsody")).toBeUndefined();
  });
});

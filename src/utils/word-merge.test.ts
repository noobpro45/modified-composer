import { describe, expect, it } from "vitest";
import { mergeWordText, mergeWordTransliteration } from "@/utils/word-merge";

describe("mergeWordText", () => {
  it("drops spaces between merged words", () => {
    expect(mergeWordText(["every ", "day"])).toBe("everyday");
    expect(mergeWordText(["a ", "b ", "c"])).toBe("abc");
  });
  it("keeps the final word's trailing space", () => {
    expect(mergeWordText(["every ", "day "])).toBe("everyday ");
  });
});

describe("mergeWordTransliteration", () => {
  it("returns an empty object when no words have transliteration", () => {
    expect(
      mergeWordTransliteration([
        { text: "hello", begin: 0, end: 1 },
        { text: "world", begin: 1, end: 2 },
      ]),
    ).toEqual({});
  });

  it("merges transliteration with joiners when words have transliteration", () => {
    expect(
      mergeWordTransliteration([
        { text: "kon", begin: 0, end: 1, transliteration: "kon", transliterationJoinerAfter: "" },
        { text: "nichi", begin: 1, end: 2, transliteration: "nichi", transliterationJoinerAfter: "  " },
      ]),
    ).toEqual({
      transliteration: "konnichi",
      transliterationJoinerAfter: "  ",
    });
  });

  it("defaults to single space when transliterationJoinerAfter is undefined", () => {
    expect(
      mergeWordTransliteration([
        { text: "every ", begin: 0, end: 1, transliteration: "every" },
        { text: "day", begin: 1, end: 2, transliteration: "day", transliterationJoinerAfter: "  " },
      ]),
    ).toEqual({
      transliteration: "every day",
      transliterationJoinerAfter: "  ",
    });
  });

  it("preserves transliteration when one word has transliteration and another does not", () => {
    expect(
      mergeWordTransliteration([
        { text: "hello", begin: 0, end: 1, transliteration: "hello", transliterationJoinerAfter: " " },
        { text: "!", begin: 1, end: 2 },
      ]),
    ).toEqual({
      transliteration: "hello",
    });
  });

  it("preserves transliteration when the first word has no transliteration", () => {
    expect(
      mergeWordTransliteration([
        { text: "(", begin: 0, end: 0.5 },
        { text: "yeah)", begin: 0.5, end: 1.5, transliteration: "yeah", transliterationJoinerAfter: "  " },
      ]),
    ).toEqual({
      transliteration: "yeah",
      transliterationJoinerAfter: "  ",
    });
  });
});

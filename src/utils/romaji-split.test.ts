import { splitRomajiForWord } from "@/utils/romaji-split";
import { describe, expect, it } from "vitest";

describe("splitRomajiForWord", () => {
  it("returns null if word has no romaji", () => {
    expect(splitRomajiForWord({ text: "hello", begin: 0, end: 1 }, [2])).toBeNull();
  });

  it("splits romaji using split character (|)", () => {
    const word = { text: "watashi", romaji: "wa|ta|shi", begin: 0, end: 1 };
    expect(splitRomajiForWord(word, [2, 4])).toEqual(["wa", "ta", "shi"]);
  });

  it("trims whitespace around split characters", () => {
    const word = { text: "watashi", romaji: "wa | ta | shi", begin: 0, end: 1 };
    expect(splitRomajiForWord(word, [2, 4])).toEqual(["wa", "ta", "shi"]);
  });

  it("splits romaji using whitespace when count matches partitions", () => {
    const word = { text: "everyday", romaji: "e ve ry", begin: 0, end: 1 };
    expect(splitRomajiForWord(word, [1, 3])).toEqual(["e", "ve", "ry"]);
  });

  it("splits romaji using 1:1 character boundaries when lengths match", () => {
    const word = { text: "everyday", romaji: "everyday", begin: 0, end: 1 };
    expect(splitRomajiForWord(word, [5, 6])).toEqual(["every", "d", "ay"]);
  });

  it("returns null when romaji parts count does not match expected partitions", () => {
    const word = { text: "watashi", romaji: "wa|shi", begin: 0, end: 1 };
    expect(splitRomajiForWord(word, [2, 4])).toBeNull();
  });

  it("returns null when length does not match and no delimiters are present", () => {
    const word = { text: "私", romaji: "watashi", begin: 0, end: 1 };
    expect(splitRomajiForWord(word, [1])).toBeNull();
  });
});

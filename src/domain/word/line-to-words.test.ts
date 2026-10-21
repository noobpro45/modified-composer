import { convertLineToWordsSmart } from "@/domain/word/line-to-words";
import { describe, expect, it } from "vitest";

describe("convertLineToWordsSmart", () => {
  it("splits a single-word line to fill the line duration", () => {
    const result = convertLineToWordsSmart({
      text: "Hello",
      begin: 1.0,
      end: 3.0,
    });

    expect(result).toEqual([
      {
        text: "Hello",
        begin: 1.0,
        end: 3.0,
      },
    ]);
  });

  it("distributes duration using syllable weights when no onsets are provided", () => {
    // "I" (short, 1 syllable) vs "supercalifragilisticexpialidocious" (long)
    const result = convertLineToWordsSmart({
      text: "I supercalifragilisticexpialidocious",
      begin: 0,
      end: 10,
    });

    expect(result.length).toBe(2);
    expect(result[0].text).toBe("I ");
    expect(result[1].text).toBe("supercalifragilisticexpialidocious");
    // "I" should get much less time than the long word
    expect(result[0].end - result[0].begin).toBeLessThan(result[1].end - result[1].begin);
    expect(result[0].begin).toBe(0);
    expect(result[1].end).toBe(10);
  });

  it("snaps words directly to onsets when onsets count matches words count", () => {
    const result = convertLineToWordsSmart({
      text: "I love you so much",
      begin: 10.0,
      end: 15.0,
      onsets: [10.2, 11.1, 12.0, 13.0, 14.1],
    });

    expect(result.length).toBe(5);
    expect(result[0].begin).toBe(10.2);
    expect(result[1].begin).toBe(11.1);
    expect(result[2].begin).toBe(12.0);
    expect(result[3].begin).toBe(13.0);
    expect(result[4].begin).toBe(14.1);
    expect(result[4].end).toBe(15.0);
  });

  it("picks the most appropriate onsets when there are more onsets than words (melisma)", () => {
    // 3 words: "I love you", expected roughly at 1.0, 2.0, 3.0 in [1.0, 4.0]
    // 4 onsets: 1.05 (I), 2.02 (love), 2.45 (melisma on love), 3.08 (you)
    const result = convertLineToWordsSmart({
      text: "I love you",
      begin: 1.0,
      end: 4.0,
      onsets: [1.05, 2.02, 2.45, 3.08],
    });

    expect(result.length).toBe(3);
    expect(result[0].begin).toBe(1.05);
    expect(result[1].begin).toBe(2.02);
    // "you" should snap to 3.08, not the melisma at 2.45
    expect(result[2].begin).toBe(3.08);
  });

  it("anchors available onsets and interpolates legato words when onsets are fewer than words", () => {
    // 4 words: "one two three four"
    // Only 2 onsets: 0.0 (one) and 3.0 (four), "two" and "three" are sung legato
    const result = convertLineToWordsSmart({
      text: "one two three four",
      begin: 0.0,
      end: 4.0,
      onsets: [0.0, 3.0],
    });

    expect(result.length).toBe(4);
    expect(result[0].begin).toBe(0.0);
    expect(result[3].begin).toBe(3.0);
    // Words 1 and 2 should sit strictly between 0.0 and 3.0 in order
    expect(result[1].begin).toBeGreaterThan(0.0);
    expect(result[2].begin).toBeGreaterThan(result[1].begin);
    expect(result[2].begin).toBeLessThan(3.0);
  });

  it("automatically pairs transliteration to individual words for Japanese lyrics", () => {
    const result = convertLineToWordsSmart({
      text: "懐かしい 声 が する ような",
      transliterationText: "natsukashii  koe  ga  suru  yō  na",
      begin: 5.0,
      end: 10.0,
      onsets: [5.0, 6.2, 7.0, 7.8, 8.9],
    });

    expect(result.length).toBe(5);
    expect(result[0].text).toBe("懐かしい ");
    expect(result[0].transliteration).toBe("natsukashii");
    expect(result[1].text).toBe("声 ");
    expect(result[1].transliteration).toBe("koe");
    expect(result[2].text).toBe("が ");
    expect(result[2].transliteration).toBe("ga");
    expect(result[3].text).toBe("する ");
    expect(result[3].transliteration).toBe("suru");
    expect(result[4].text).toBe("ような");
    expect(result[4].transliteration).toBe("yō  na");
  });
});

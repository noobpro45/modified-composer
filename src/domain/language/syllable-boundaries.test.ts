import { phoneticBoundaryCandidates } from "@/domain/language/syllable-boundaries";
import { describe, expect, it } from "vitest";

describe("phoneticBoundaryCandidates", () => {
  it("never splits inside onset digraphs like 'sh', 'ts', 'ch', 'ky'", () => {
    const candidates = phoneticBoundaryCandidates("ashita");
    // "a" (1), "shi" (4), "ta" (6) -> valid cuts: [1, 4]
    expect(candidates).toEqual([1, 4]);
    // index 2 (s-h) and index 3 (h-i) must not be present
    expect(candidates).not.toContain(2);
    expect(candidates).not.toContain(3);
  });

  it("identifies proper syllable boundaries for 'aishiteru'", () => {
    const candidates = phoneticBoundaryCandidates("aishiteru");
    // "ai" (2), "shi" (5), "te" (7), "ru" (9)
    // plus vowel-vowel hiatus at 1
    expect(candidates).toEqual([1, 2, 5, 7]);
    expect(candidates).not.toContain(3); // s|h
    expect(candidates).not.toContain(4); // h|i
    expect(candidates).not.toContain(6); // t|e
    expect(candidates).not.toContain(8); // r|u
  });

  it("handles double consonants / sokuon properly (e.g. kitte, chotto)", () => {
    const kitte = phoneticBoundaryCandidates("kitte");
    // k-i(2), i-t(2), t-t(3)
    expect(kitte).toEqual([2, 3]);

    const chotto = phoneticBoundaryCandidates("chotto");
    // ch-o(3), o-t(3), t-t(4)
    expect(chotto).toEqual([3, 4]);
  });

  it("preserves 'ky' in 'tokyo'", () => {
    const candidates = phoneticBoundaryCandidates("tokyo");
    expect(candidates).toEqual([2]);
  });

  it("supports apostrophe separation in 'kon'nichiwa'", () => {
    const candidates = phoneticBoundaryCandidates("kon'nichiwa");
    // after ' (4), after ni (6), after chi (9)
    expect(candidates).toEqual([3, 4, 6, 9]);
  });

  it("supports Mandarin Pinyin 'woaini'", () => {
    const candidates = phoneticBoundaryCandidates("woaini");
    expect(candidates).toEqual([2, 3, 4]);
  });
});

import { matchesKanaReading, normalizeRomaji } from "@/domain/language/kana-map";
import { matchesKanjiReading } from "@/domain/language/kanji-readings";
import { phoneticBoundaryCandidates } from "@/domain/language/syllable-boundaries";
import { graphemeUnits, normalizeSplitPointAtSeparator, separatorRuns } from "@/utils/split-separators";

// -- Types --------------------------------------------------------------------

interface Slice {
  start: number;
  end: number;
  text: string;
}

// -- Helpers ------------------------------------------------------------------

function extractSlices(transliteration: string): Slice[] {
  const units = graphemeUnits(transliteration);
  const separators = separatorRuns(transliteration, units, "separator");
  const phonetic = phoneticBoundaryCandidates(transliteration);

  const candidateSet = new Set<number>();
  for (const p of phonetic) {
    candidateSet.add(normalizeSplitPointAtSeparator(transliteration, p));
  }
  for (const run of separators) {
    candidateSet.add(run.point);
  }

  const candidatePoints = [...candidateSet]
    .filter((p) => p > 0 && p < transliteration.length)
    .toSorted((a, b) => a - b);

  const cuts = [0, ...candidatePoints, transliteration.length];
  const slices: Slice[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const start = cuts[i];
    const end = cuts[i + 1];
    slices.push({
      start,
      end,
      text: transliteration.slice(start, end).trim(),
    });
  }
  return slices;
}

function computeSegmentCost(
  segment: string,
  slices: readonly Slice[],
  fromSlice: number,
  toSlice: number,
  totalSourceLength: number,
  totalTransLength: number,
): number {
  const start = slices[fromSlice].start;
  const end = slices[toSlice].end;
  const sliceCount = toSlice - fromSlice + 1;
  const chunkText = slices
    .slice(fromSlice, toSlice + 1)
    .map((s) => s.text)
    .join("");
  const cleanChunk = normalizeRomaji(chunkText);

  // 1. Exact Kana or Kanji reading matching check
  if (matchesKanaReading(segment, cleanChunk) || matchesKanjiReading(segment, cleanChunk)) {
    return 0;
  }

  let penalty = 0;

  // Pure kana penalty if it doesn't match
  if (/^[\u3040-\u309F\u30A0-\u30FF]+$/.test(segment)) {
    penalty += 800;
  } else {
    // If segment starts with Kana, chunk should start with its reading
    const firstChar = segment[0];
    if (/^[\u3040-\u309F\u30A0-\u30FF]$/.test(firstChar)) {
      const firstSliceText = normalizeRomaji(slices[fromSlice].text);
      if (matchesKanaReading(firstChar, firstSliceText)) {
        penalty -= 100;
      } else {
        penalty += 400;
      }
    }

    // If segment ends with Kana, chunk should end with its reading
    const lastChar = segment[segment.length - 1];
    if (/^[\u3040-\u309F\u30A0-\u30FF]$/.test(lastChar)) {
      const lastSliceText = normalizeRomaji(slices[toSlice].text);
      if (matchesKanaReading(lastChar, lastSliceText)) {
        penalty -= 100;
      } else {
        penalty += 400;
      }
    }
  }

  // Kanji generally maps to 1 or 2 morae (slices)
  if (/^[\u4E00-\u9FFF]+$/.test(segment) && segment.length === 1) {
    if (sliceCount > 2) {
      penalty += 40 * (sliceCount - 2);
    }
  }

  // Proportional length penalty
  const expectedLength = Math.max(1, (segment.length / Math.max(1, totalSourceLength)) * totalTransLength);
  const actualLength = Math.max(1, end - start);
  const lengthPenalty = Math.abs(actualLength - expectedLength);

  return Math.max(0, penalty + lengthPenalty);
}

// -- Functions ----------------------------------------------------------------

/**
 * Aligns source segments with transliteration using phonetic boundaries and Kana anchoring.
 */
function inferPairedBoundaries(sourceSegments: string[], transliteration: string): number[] | null {
  if (sourceSegments.length <= 1) return [];
  const trimmedTrans = transliteration.trim();
  if (trimmedTrans.length < 2) return null;

  const slices = extractSlices(trimmedTrans);
  const numSegments = sourceSegments.length;
  const numSlices = slices.length;

  if (numSlices < numSegments) {
    return null;
  }

  const totalSourceLength = sourceSegments.reduce((sum, s) => sum + s.length, 0);
  const totalTransLength = trimmedTrans.length;

  // DP table: dp[segIndex][sliceIndex] = minimum cost to partition slices 0..sliceIndex into segIndex + 1 segments
  const dp: number[][] = Array.from({ length: numSegments }, () => Array(numSlices).fill(Number.POSITIVE_INFINITY));
  const parent: number[][] = Array.from({ length: numSegments }, () => Array(numSlices).fill(-1));

  // Base case: first segment (segIndex = 0)
  for (let s = 0; s < numSlices; s++) {
    dp[0][s] = computeSegmentCost(sourceSegments[0], slices, 0, s, totalSourceLength, totalTransLength);
  }

  // Fill DP
  for (let seg = 1; seg < numSegments; seg++) {
    for (let currentSlice = seg; currentSlice < numSlices; currentSlice++) {
      let minCost = Number.POSITIVE_INFINITY;
      let bestPrev = -1;

      for (let prevSlice = seg - 1; prevSlice < currentSlice; prevSlice++) {
        const segCost = computeSegmentCost(
          sourceSegments[seg],
          slices,
          prevSlice + 1,
          currentSlice,
          totalSourceLength,
          totalTransLength,
        );
        const total = dp[seg - 1][prevSlice] + segCost;
        if (total < minCost) {
          minCost = total;
          bestPrev = prevSlice;
        }
      }

      dp[seg][currentSlice] = minCost;
      parent[seg][currentSlice] = bestPrev;
    }
  }

  if (!Number.isFinite(dp[numSegments - 1][numSlices - 1])) {
    return null;
  }

  // Backtrack to find boundaries
  const chosenEndSlices: number[] = new Array(numSegments);
  let curr = numSlices - 1;
  for (let seg = numSegments - 1; seg >= 0; seg--) {
    chosenEndSlices[seg] = curr;
    curr = parent[seg][curr];
  }

  const boundaries: number[] = [];
  for (let seg = 0; seg < numSegments - 1; seg++) {
    const sliceEndIdx = chosenEndSlices[seg];
    boundaries.push(slices[sliceEndIdx].end);
  }

  return boundaries.length === numSegments - 1 && new Set(boundaries).size === boundaries.length ? boundaries : null;
}

export { inferPairedBoundaries };

import { inferPairedBoundaries } from "@/domain/language/phonetic-align";
import type { WordTiming } from "@/domain/word/timing";
import { estimateWordWeight } from "@/domain/word/word-weight";

// -- Types --------------------------------------------------------------------

interface ConvertLineToWordsParams {
  text: string;
  begin: number;
  end: number;
  onsets?: readonly number[];
  transliterationText?: string;
  splitCharacter?: string;
  evenly?: boolean;
}

interface TokenMeta {
  raw: string;
  clean: string;
  trailingSpace: boolean;
}

// -- Helpers ------------------------------------------------------------------

function splitTokens(text: string, splitChar?: string): TokenMeta[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const rawWords: string[] = [];
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (cur.length > 0) {
        rawWords.push(cur);
        cur = "";
      }
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) rawWords.push(cur);

  const tokens: TokenMeta[] = [];
  for (let w = 0; w < rawWords.length; w++) {
    const word = rawWords[w];
    const isLastWord = w === rawWords.length - 1;
    if (splitChar && word.includes(splitChar)) {
      const parts = word.split(splitChar).filter((p) => p.length > 0);
      for (let p = 0; p < parts.length; p++) {
        const isLastPart = p === parts.length - 1;
        tokens.push({
          raw: parts[p],
          clean: parts[p].trim(),
          trailingSpace: isLastPart && !isLastWord,
        });
      }
    } else {
      tokens.push({
        raw: word,
        clean: word.trim(),
        trailingSpace: !isLastWord,
      });
    }
  }
  return tokens;
}

function computeWordTimings(
  tokens: TokenMeta[],
  begin: number,
  end: number,
  onsets?: readonly number[],
  evenly?: boolean,
): Array<{ begin: number; end: number }> {
  const numWords = tokens.length;
  const totalDuration = end - begin;

  if (evenly) {
    const wordDuration = totalDuration / numWords;
    return tokens.map((_, i) => ({
      begin: begin + i * wordDuration,
      end: begin + (i + 1) * wordDuration,
    }));
  }

  const weights = tokens.map((t) => estimateWordWeight(t.clean));
  const sumWeights = weights.reduce((acc, w) => acc + w, 0);

  const targetStarts: number[] = [];
  let curTarget = begin;
  for (let i = 0; i < numWords; i++) {
    targetStarts.push(curTarget);
    curTarget += (weights[i] / Math.max(1e-6, sumWeights)) * totalDuration;
  }

  const validOnsets = (onsets ?? []).filter((o) => o >= begin - 0.05 && o <= end - 0.05).toSorted((a, b) => a - b);

  const numOnsets = validOnsets.length;

  if (numOnsets === 0) {
    return tokens.map((_, i) => ({
      begin: targetStarts[i],
      end: i === numWords - 1 ? end : targetStarts[i + 1],
    }));
  }

  if (numOnsets >= numWords) {
    const dp: number[][] = Array.from({ length: numWords }, () => Array(numOnsets).fill(Number.POSITIVE_INFINITY));
    const parent: number[][] = Array.from({ length: numWords }, () => Array(numOnsets).fill(-1));

    for (let j = 0; j <= numOnsets - numWords; j++) {
      dp[0][j] = Math.abs(validOnsets[j] - targetStarts[0]);
    }

    for (let i = 1; i < numWords; i++) {
      for (let j = i; j <= numOnsets - (numWords - i); j++) {
        let bestCost = Number.POSITIVE_INFINITY;
        let bestPrev = -1;
        for (let p = i - 1; p < j; p++) {
          if (dp[i - 1][p] < bestCost) {
            bestCost = dp[i - 1][p];
            bestPrev = p;
          }
        }
        dp[i][j] = bestCost + Math.abs(validOnsets[j] - targetStarts[i]);
        parent[i][j] = bestPrev;
      }
    }

    let bestFinalCost = Number.POSITIVE_INFINITY;
    let bestFinalJ = -1;
    for (let j = numWords - 1; j < numOnsets; j++) {
      if (dp[numWords - 1][j] < bestFinalCost) {
        bestFinalCost = dp[numWords - 1][j];
        bestFinalJ = j;
      }
    }

    const chosen: number[] = new Array(numWords);
    let currJ = bestFinalJ;
    for (let i = numWords - 1; i >= 0; i--) {
      chosen[i] = validOnsets[currJ];
      currJ = parent[i][currJ];
    }

    return tokens.map((_, i) => ({
      begin: chosen[i],
      end: i === numWords - 1 ? end : chosen[i + 1],
    }));
  }

  const usedWords = new Set<number>();
  const anchors: Array<{ wordIndex: number; time: number }> = [];

  for (let j = 0; j < numOnsets; j++) {
    const oTime = validOnsets[j];
    let bestDist = Number.POSITIVE_INFINITY;
    let bestIdx = -1;
    for (let i = 0; i < numWords; i++) {
      if (usedWords.has(i)) continue;
      const dist = Math.abs(targetStarts[i] - oTime);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    if (bestIdx !== -1) {
      usedWords.add(bestIdx);
      anchors.push({ wordIndex: bestIdx, time: oTime });
    }
  }

  anchors.sort((a, b) => a.wordIndex - b.wordIndex);

  if (anchors.length === 0 || anchors[0].wordIndex > 0) {
    anchors.unshift({ wordIndex: 0, time: begin });
  }
  anchors.push({ wordIndex: numWords, time: end });

  const wordBegins = new Array<number>(numWords);
  for (let a = 0; a < anchors.length - 1; a++) {
    const startW = anchors[a].wordIndex;
    const endW = anchors[a + 1].wordIndex;
    const startTime = anchors[a].time;
    const endTime = anchors[a + 1].time;

    wordBegins[startW] = startTime;
    if (endW > startW + 1) {
      let subWeightSum = 0;
      for (let k = startW; k < endW; k++) subWeightSum += weights[k];
      let accum = startTime;
      for (let k = startW + 1; k < endW; k++) {
        accum += (weights[k - 1] / Math.max(1e-6, subWeightSum)) * (endTime - startTime);
        wordBegins[k] = accum;
      }
    }
  }

  return tokens.map((_, i) => ({
    begin: wordBegins[i],
    end: i === numWords - 1 ? end : wordBegins[i + 1],
  }));
}

function resolveWordTransliterations(tokens: TokenMeta[], _sourceText: string, transliterationText?: string): string[] {
  if (!transliterationText) return [];
  const cleanTrans = transliterationText.trim();
  const segments = tokens.map((t) => t.clean);

  if (segments.length === 1) {
    return [cleanTrans];
  }

  const boundaries = inferPairedBoundaries(segments, cleanTrans);
  if (boundaries && boundaries.length === segments.length - 1) {
    const cuts = [0, ...boundaries, cleanTrans.length];
    const parts: string[] = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      parts.push(cleanTrans.slice(cuts[i], cuts[i + 1]).trim());
    }
    if (parts.length === segments.length) {
      return parts;
    }
  }

  const transWords = cleanTrans.split(/\s+/).filter((w) => w.length > 0);
  if (transWords.length === segments.length) {
    return transWords;
  }

  return [];
}

// -- Main Function ------------------------------------------------------------

/**
 * Converts a line-level synced timing into word-level timings using smart
 * linguistic weighting and vocal onset snapping.
 */
function convertLineToWordsSmart({
  text,
  begin,
  end,
  onsets,
  transliterationText,
  splitCharacter,
  evenly,
}: ConvertLineToWordsParams): WordTiming[] {
  const tokens = splitTokens(text, splitCharacter);
  if (tokens.length === 0) return [];

  if (tokens.length === 1) {
    const singleTrans = transliterationText ? transliterationText.trim() : undefined;
    return [
      {
        text: tokens[0].raw,
        begin,
        end,
        ...(singleTrans ? { transliteration: singleTrans } : {}),
      },
    ];
  }

  const timings = computeWordTimings(tokens, begin, end, onsets, evenly);
  const transliterations = resolveWordTransliterations(tokens, text, transliterationText);

  return tokens.map((token, index) => ({
    text: token.trailingSpace ? `${token.clean} ` : token.clean,
    begin: timings[index].begin,
    end: timings[index].end,
    ...(transliterations[index] ? { transliteration: transliterations[index] } : {}),
  }));
}

export { convertLineToWordsSmart };

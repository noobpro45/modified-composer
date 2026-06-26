import { CLEARED_BACKGROUND } from "@/domain/line/background";
import type { LyricLine } from "@/domain/line/model";
import { reconcileMatchedTiming } from "@/domain/line/reconcile-text";
import { cleanSplitCharacters, stripSplitCharacter } from "@/utils/split-character";

// -- Helpers ------------------------------------------------------------------

function textToLyricLines(text: string, defaultAgentId: string, existingLines: LyricLine[] = []): LyricLine[] {
  const newLines = text.split("\n");

  const existingKeys = existingLines.map((l) => stripSplitCharacter(l.text).trim());
  const newKeys = newLines.map((l) => stripSplitCharacter(cleanSplitCharacters(l.trim())));

  // Use a simple LCS to find exact unchanged lines in their original order
  const m = existingKeys.length;
  const n = newKeys.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (existingKeys[i - 1] === newKeys[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  const matchedExisting = new Array(m).fill(-1);
  const matchedNew = new Array(n).fill(-1);
  
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (existingKeys[i - 1] === newKeys[j - 1]) {
      matchedExisting[i - 1] = j - 1;
      matchedNew[j - 1] = i - 1;
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  // Fallback 1: For unmatched new lines, if there is exactly one unmatched existing line
  // between the surrounding matches, we assume it's an edit of that line.
  let lastMatchedNew = -1;
  let lastMatchedExisting = -1;
  
  for (let nj = 0; nj <= n; nj++) {
    const isMatchOrEnd = nj === n || matchedNew[nj] !== -1;
    if (isMatchOrEnd) {
      const nextMatchedExisting = nj === n ? m : matchedNew[nj];
      
      const newGapSize = nj - lastMatchedNew - 1;
      const existingGapSize = nextMatchedExisting - lastMatchedExisting - 1;
      
      // If exactly one unmatched line on both sides of the gap, it's an edit!
      if (newGapSize === 1 && existingGapSize === 1) {
        matchedNew[lastMatchedNew + 1] = lastMatchedExisting + 1;
        matchedExisting[lastMatchedExisting + 1] = lastMatchedNew + 1;
      } else if (newGapSize === existingGapSize && newGapSize > 0) {
        // If equal number of unmatched lines, map them positionally within the gap
        for (let k = 0; k < newGapSize; k++) {
          matchedNew[lastMatchedNew + 1 + k] = lastMatchedExisting + 1 + k;
          matchedExisting[lastMatchedExisting + 1 + k] = lastMatchedNew + 1 + k;
        }
      }
      
      lastMatchedNew = nj;
      lastMatchedExisting = nextMatchedExisting;
    }
  }

  const mapped = newLines.map((lineText, index) => {
    const trimmed = lineText.trim();
    const cleanedText = cleanSplitCharacters(trimmed);

    const existingIdx = matchedNew[index];
    if (existingIdx !== -1) {
      return reconcileMatchedTiming(existingLines[existingIdx], cleanedText);
    }

    return {
      id: crypto.randomUUID(),
      text: cleanedText,
      agentId: defaultAgentId,
    };
  });

  // Raw parentheses in `text` are the source of truth for background vocals;
  // a carried-over extracted backgroundText would double on re-extraction.
  return mapped.map((line) => (/\([^)]*\)/.test(line.text) ? { ...line, ...CLEARED_BACKGROUND } : line));
}

// -- Exports ------------------------------------------------------------------

export { textToLyricLines };

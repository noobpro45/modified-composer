import { splitIntoWordsWithMeta } from "@/utils/sync-helpers";

// -- Types --------------------------------------------------------------------

interface PronunciationValidationError {
  type: "count_mismatch" | "empty_segment" | "orphaned_text" | "missing_pronunciation";
  lineIndex: number;
  lineText: string;
  lineLength: number;
  pronunciationLength: number;
  message: string;
  severity: "error" | "warning";
}

interface PronunciationValidationResult {
  isValid: boolean;
  errors: PronunciationValidationError[];
  warnings: PronunciationValidationError[];
  alignedCount: number;
  unalignedCount: number;
}

// -- Helpers ------------------------------------------------------------------

function countPronunciationSegments(pronunciation?: string): number {
  if (!pronunciation || !pronunciation.trim()) return 0;
  return pronunciation.trim().split(/\s+/).length;
}

function countLyricWords(lyricText?: string): number {
  if (!lyricText || !lyricText.trim()) return 0;
  const { parts } = splitIntoWordsWithMeta(lyricText);
  return parts.length;
}

function validateLine(
  lineIndex: number,
  lineText: string,
  pronunciation?: string,
): PronunciationValidationError[] {
  const errors: PronunciationValidationError[] = [];

  if (!lineText.trim()) {
    // Empty lyric line is OK if pronunciation is also empty
    if (pronunciation?.trim()) {
      errors.push({
        type: "orphaned_text",
        lineIndex,
        lineText,
        lineLength: 0,
        pronunciationLength: countPronunciationSegments(pronunciation),
        message: `Line ${lineIndex + 1}: pronunciation exists but lyrics are empty`,
        severity: "warning",
      });
    }
    return errors;
  }

  // Count words and segments
  const lyricWordCount = countLyricWords(lineText);
  const pronunciationSegmentCount = countPronunciationSegments(pronunciation);

  // Check if pronunciation is provided
  if (!pronunciation || !pronunciation.trim()) {
    errors.push({
      type: "missing_pronunciation",
      lineIndex,
      lineText,
      lineLength: lyricWordCount,
      pronunciationLength: 0,
      message: `Line ${lineIndex + 1}: no pronunciation provided (${lyricWordCount} words)`,
      severity: "warning",
    });
    return errors;
  }

  // Check for count mismatch
  if (lyricWordCount !== pronunciationSegmentCount) {
    errors.push({
      type: "count_mismatch",
      lineIndex,
      lineText,
      lineLength: lyricWordCount,
      pronunciationLength: pronunciationSegmentCount,
      message: `Line ${lineIndex + 1}: ${lyricWordCount} lyrics but ${pronunciationSegmentCount} pronunciation segments`,
      severity: "error",
    });
  }

  // Check for empty segments
  const segments = pronunciation.trim().split(/\s/);
  const emptyIndices = segments
    .map((seg, idx) => (seg.trim() === "" ? idx : -1))
    .filter((idx) => idx !== -1);

  if (emptyIndices.length > 0) {
    errors.push({
      type: "empty_segment",
      lineIndex,
      lineText,
      lineLength: lyricWordCount,
      pronunciationLength: pronunciationSegmentCount,
      message: `Line ${lineIndex + 1}: empty pronunciation segment(s) at position ${emptyIndices.map((i) => i + 1).join(", ")}`,
      severity: "warning",
    });
  }

  return errors;
}

// -- Main Validation Function -------------------------------------------------

function validatePronunciationAlignment(
  lines: Array<{ text: string; pronunciation?: string }>,
): PronunciationValidationResult {
  const allErrors: PronunciationValidationError[] = [];
  let alignedCount = 0;
  let unalignedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const { text, pronunciation } = lines[i];

    if (!text.trim() && !pronunciation?.trim()) {
      continue; // Skip lines where both lyrics and pronunciation are empty
    }

    const lineErrors = validateLine(i, text, pronunciation);

    if (lineErrors.length === 0) {
      // This line is aligned and has no issues
      if (text.trim()) {
        alignedCount++;
      }
    } else {
      unalignedCount++;
      allErrors.push(...lineErrors);
    }
  }

  const errors = allErrors.filter((e) => e.severity === "error");
  const warnings = allErrors.filter((e) => e.severity === "warning");

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    alignedCount,
    unalignedCount,
  };
}

// -- Convenience function for single line validation -------------------------

function validateSingleLine(
  lineText: string,
  pronunciation?: string,
): { isValid: boolean; error?: string } {
  if (!lineText.trim()) {
    return { isValid: true };
  }

  const lyricWordCount = countLyricWords(lineText);
  const pronunciationSegmentCount = countPronunciationSegments(pronunciation);

  if (lyricWordCount !== pronunciationSegmentCount) {
    return {
      isValid: false,
      error: `Word count mismatch: ${lyricWordCount} lyrics, ${pronunciationSegmentCount} pronunciation segments`,
    };
  }

  return { isValid: true };
}

// -- Exports ------------------------------------------------------------------

export {
  validatePronunciationAlignment,
  validateSingleLine,
  countPronunciationSegments,
  countLyricWords,
};
export type { PronunciationValidationError, PronunciationValidationResult };

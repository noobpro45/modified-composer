import { mappedTransliteration, withAlignedTransliteration } from "@/domain/language/align";
import { languageSourceFingerprint } from "@/domain/language/fingerprint";
import { manualSegments } from "@/domain/language/manual-segments";
import type { TransliterationTrack } from "@/domain/language/model";
import { manualBackgroundWordEdit } from "@/domain/line/background";
import type { LyricLine } from "@/domain/line/model";
import { trackWords } from "@/domain/line/tracks";
import type { WordTiming } from "@/domain/word/timing";

// -- Helpers ------------------------------------------------------------------

function buildTransliterationTrack(
  rawLine: LyricLine,
  type: "word" | "bg",
  fullText: string,
  sourceLanguage?: string,
): TransliterationTrack {
  const existing = rawLine.transliteration;
  const language = existing?.language ?? `${sourceLanguage || "und"}-Latn`;
  const sourceFingerprint = languageSourceFingerprint(rawLine.text, rawLine.backgroundText);

  if (type === "word") {
    return {
      language,
      origin: "manual",
      sourceFingerprint,
      text: fullText,
      ...(existing?.backgroundText !== undefined ? { backgroundText: existing.backgroundText } : {}),
      segments: manualSegments(rawLine, fullText),
      ...(existing?.backgroundSegments ? { backgroundSegments: existing.backgroundSegments } : {}),
      alignmentStatus: "confirmed",
      ...(existing?.backgroundAlignmentStatus ? { backgroundAlignmentStatus: existing.backgroundAlignmentStatus } : {}),
    };
  }

  return {
    language,
    origin: "manual",
    sourceFingerprint,
    text: existing?.text ?? "",
    backgroundText: fullText,
    segments: existing?.segments ?? [],
    backgroundSegments: manualSegments({ ...rawLine, text: rawLine.backgroundText ?? "" }, fullText),
    ...(existing?.alignmentStatus ? { alignmentStatus: existing.alignmentStatus } : {}),
    backgroundAlignmentStatus: "confirmed",
  };
}

function seedWordTransliterations(
  words: readonly WordTiming[],
  wordIndex: number,
  nextTransliteration: string,
): WordTiming[] {
  return words.map((word, index) => {
    if (index === wordIndex) return { ...word, transliteration: nextTransliteration };
    if (word.transliteration === undefined) return { ...word, transliteration: word.text.trimEnd() };
    return word;
  });
}

// -- Functions ----------------------------------------------------------------

/**
 * Updates one word's (or line-synced line's) transliteration and keeps the
 * full-line `transliteration` track synchronized with per-word mappings.
 */
function wordTransliterationEdit(
  rawLine: LyricLine,
  wordIndex: number,
  type: "word" | "bg",
  nextTransliteration: string,
  sourceLanguage?: string,
): Partial<LyricLine> {
  const trimmed = nextTransliteration.trim();
  if (!trimmed) return {};

  // Line-synced lines have no `words` array; store transliteration on the line track only.
  if (type === "word" && !rawLine.words?.length) {
    return { transliteration: buildTransliterationTrack(rawLine, "word", trimmed, sourceLanguage) };
  }

  const aligned = withAlignedTransliteration(rawLine);
  const words = trackWords(aligned, type);
  if (!words || wordIndex < 0 || wordIndex >= words.length) return {};

  const updatedWords = seedWordTransliterations(words, wordIndex, trimmed);
  const fullText = mappedTransliteration(updatedWords) ?? trimmed;
  const transliteration = buildTransliterationTrack(rawLine, type, fullText, sourceLanguage);

  return type === "word"
    ? { words: updatedWords, transliteration }
    : { ...manualBackgroundWordEdit(updatedWords), transliteration };
}

// -- Exports ------------------------------------------------------------------

export { wordTransliterationEdit };

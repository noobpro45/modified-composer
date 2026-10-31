import type { WordTiming } from "@/domain/word/timing";

// -- Interfaces ----------------------------------------------------------------

interface MergedTransliteration {
  transliteration?: string;
  transliterationJoinerAfter?: string;
}

// -- Functions -----------------------------------------------------------------

function mergeWordText(texts: string[]): string {
  return texts.map((text, index) => (index === texts.length - 1 ? text : text.trimEnd())).join("");
}

function mergeWordTransliteration(words: WordTiming[]): MergedTransliteration {
  const transliterated = words.filter((w) => Boolean(w.transliteration?.trim()));
  if (transliterated.length === 0) return {};

  const parts: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const part = word.transliteration?.trim();
    if (part) {
      if (parts.length > 0) {
        parts.push(words[i - 1]?.transliterationJoinerAfter ?? " ");
      }
      parts.push(part);
    }
  }

  const last = words[words.length - 1];
  return {
    transliteration: parts.join(""),
    ...(last.transliterationJoinerAfter !== undefined
      ? { transliterationJoinerAfter: last.transliterationJoinerAfter }
      : {}),
  };
}

// -- Exports -------------------------------------------------------------------

export { mergeWordText, mergeWordTransliteration };
export type { MergedTransliteration };

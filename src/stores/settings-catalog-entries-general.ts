import type { SettingEntry } from "@/stores/settings-catalog";

// -- Catalog ------------------------------------------------------------------

const GENERAL_CATALOG_ENTRIES = {
  showShortcutHints: {
    section: "general",
    label: "Show shortcut hints",
    description: "Display keyboard shortcut badges on toolbar buttons.",
    keywords: ["badges", "keys", "hotkeys"],
    settingKey: "showShortcutHints",
  },
  showSyllableIndicators: {
    section: "general",
    label: "Show syllable indicators",
    description: "Visually group syllables split from one word.",
    keywords: ["split", "pipe"],
    settingKey: "showSyllableIndicators",
  },
  autoExtractBackgroundVocals: {
    section: "general",
    label: "Auto-extract background vocals",
    description: "Move parenthesised text into background vocals when lyrics are pasted, imported, or edited.",
    keywords: ["bg", "parentheses", "brackets"],
    settingKey: "autoExtractBackgroundVocals",
  },
  mergeStandaloneBackgroundLines: {
    section: "general",
    label: "Merge standalone background lines",
    description:
      "When a whole line is in parentheses, attach it to the line above instead of keeping it as its own line.",
    keywords: ["bg", "parentheses"],
    settingKey: "mergeStandaloneBackgroundLines",
  },
  preserveBracketsOnExtraction: {
    section: "general",
    label: "Preserve brackets when extracting",
    description: "Keep parentheses around extracted background vocals. Multiple snippets share one outer pair.",
    keywords: ["bg", "parentheses"],
    settingKey: "preserveBracketsOnExtraction",
  },
  languageAutoGenerate: {
    section: "general",
    label: "Auto-generate languages",
    description: "Generate transliteration and translations automatically when opening the Languages tab.",
    keywords: ["translate", "romanize", "romaji", "languages", "auto"],
    settingKey: "languageAutoGenerate",
  },
  languageDefaultTarget: {
    section: "general",
    label: "Default translation language",
    description: "The initial language track to translate lyrics into.",
    keywords: ["translate", "language", "english", "target"],
    settingKey: "languageDefaultTarget",
  },
  romanizationCase: {
    section: "general",
    label: "Romanization letter case",
    description: "Keep original capitalization or convert all transliterated text to lowercase.",
    keywords: ["romaji", "pinyin", "romanization", "lowercase", "capitalization"],
    settingKey: "romanizationCase",
  },
  musicBrainzLookup: {
    section: "general",
    label: "Song details from MusicBrainz",
    descriptionFor: (state) =>
      state.musicBrainzLookup === "off"
        ? "Composer never contacts MusicBrainz."
        : "Suggests album, ISRC, artists and songwriters in Export. Nothing is filled until you confirm.",
    keywords: ["metadata", "isrc", "songwriters", "album", "lookup"],
    settingKey: "musicBrainzLookup",
  },
  resetTour: {
    section: "general",
    label: "Reset product tour",
    description: "Restart the guided walkthrough that introduces Composer's features.",
    keywords: ["tour", "walkthrough", "onboarding", "guide"],
  },
  resetAllSettings: {
    section: "general",
    label: "Reset to defaults",
    description: "Restore all settings to their original values.",
    keywords: ["reset", "defaults", "restore"],
  },
} as const satisfies Record<string, SettingEntry>;

// -- Exports ------------------------------------------------------------------

export { GENERAL_CATALOG_ENTRIES };

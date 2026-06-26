import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_BRIDGE_URL } from "@/utils/composer-bridge-api";

// -- Types --------------------------------------------------------------------

type GranularityDefault = "word" | "line";
type LinkedDivergenceAction = "ask" | "apply" | "detach";
type PreviewRenderer = "braccato" | "am-lyrics";
type VocalModelVariant = "fp16" | "fp32";
type VisualizerMode = "waveform" | "spectrogram";


interface SettingsState {
  defaultPlaybackRate: number;
  rememberVolume: boolean;
  lastVolume: number;
  audioScrubPreview: boolean;

  defaultZoom: number;
  defaultRowHeight: number;
  followPlayhead: boolean;
  defaultRollingEdit: boolean;
  defaultPreviewSidebar: boolean;
  timelineSnap: boolean;
  timelineSnapThreshold: number;
  vocalOnsetSnap: boolean;
  snapPlayheadToPoints: boolean;
  timelineHorizontalScroll: boolean;
  visualizerMode: VisualizerMode;
  spectrogramHeight: number;
  spectrogramGain: number;

  nudgeAmount: number;
  defaultWordDuration: number;
  minWordDuration: number;
  defaultGranularity: GranularityDefault;

  autoSaveDelay: number;

  showShortcutHints: boolean;
  showSyllableIndicators: boolean;
  splitCharacter: string;
  autoExtractBackgroundVocals: boolean;
  mergeStandaloneBackgroundLines: boolean;
  preserveBracketsOnExtraction: boolean;

  confirmReplaceProjectFromHash: boolean;
  confirmReplaceLyrics: boolean;
  confirmSyncReset: boolean;
  confirmClearProject: boolean;
  confirmResetSettings: boolean;
  confirmResetShortcuts: boolean;
  confirmGroupDissolution: boolean;
  confirmApplyToAllSyllableSplit: boolean;
  linkedDivergenceAction: LinkedDivergenceAction;

  previewRenderer: PreviewRenderer;

  autoSeparateOnImport: boolean;
  vocalModelVariant: VocalModelVariant;

  composerBridgeUrl: string;
}

interface SettingsActions {
  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  resetToDefaults: () => void;
}

// -- Defaults -----------------------------------------------------------------

const DEFAULTS: SettingsState = {
  defaultPlaybackRate: 0.75,
  rememberVolume: true,
  lastVolume: 1,
  audioScrubPreview: true,

  defaultZoom: 100,
  defaultRowHeight: 44,
  followPlayhead: true,
  defaultRollingEdit: false,
  defaultPreviewSidebar: false,
  timelineSnap: true,
  timelineSnapThreshold: 12,
  vocalOnsetSnap: true,
  snapPlayheadToPoints: true,
  timelineHorizontalScroll: false,
  visualizerMode: "waveform",
  spectrogramHeight: 80,
  spectrogramGain: 1.5,

  nudgeAmount: 0.05,
  defaultWordDuration: 0.3,
  minWordDuration: 0.05,
  defaultGranularity: "word",

  autoSaveDelay: 2000,

  showShortcutHints: true,
  showSyllableIndicators: true,
  splitCharacter: "|",
  autoExtractBackgroundVocals: true,
  mergeStandaloneBackgroundLines: true,
  preserveBracketsOnExtraction: false,

  confirmReplaceProjectFromHash: true,
  confirmReplaceLyrics: true,
  confirmSyncReset: true,
  confirmClearProject: true,
  confirmResetSettings: true,
  confirmResetShortcuts: true,
  confirmGroupDissolution: true,
  confirmApplyToAllSyllableSplit: true,
  linkedDivergenceAction: "ask",

  previewRenderer: "braccato",

  autoSeparateOnImport: false,
  vocalModelVariant: "fp32",

  composerBridgeUrl: DEFAULT_BRIDGE_URL,
};

const SETTINGS_PERSIST_VERSION = 5;

function migrateSettings(persistedState: unknown, version: number): unknown {
  if (!persistedState || typeof persistedState !== "object") return persistedState;
  const state = persistedState as Partial<SettingsState>;
  const next: Partial<SettingsState> = { ...state };
  if (version < 2 || next.vocalModelVariant === "fp16") {
    next.vocalModelVariant = "fp32";
  }
  if (next.defaultRollingEdit === undefined) next.defaultRollingEdit = false;
  if (next.defaultPreviewSidebar === undefined) next.defaultPreviewSidebar = false;
  if (next.vocalOnsetSnap === undefined) next.vocalOnsetSnap = true;
  if (next.snapPlayheadToPoints === undefined) next.snapPlayheadToPoints = true;
  if (next.visualizerMode === undefined) next.visualizerMode = "waveform";
  if (next.spectrogramHeight === undefined) next.spectrogramHeight = 80;
  if (next.spectrogramGain === undefined) next.spectrogramGain = 1.5;
  return next;
}

// -- Store --------------------------------------------------------------------

const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      set: (key, value) => set({ [key]: value }),
      resetToDefaults: () =>
        set((state) => ({
          ...DEFAULTS,
          confirmReplaceProjectFromHash: state.confirmReplaceProjectFromHash,
          confirmReplaceLyrics: state.confirmReplaceLyrics,
          confirmSyncReset: state.confirmSyncReset,
          confirmClearProject: state.confirmClearProject,
          confirmResetSettings: state.confirmResetSettings,
          confirmResetShortcuts: state.confirmResetShortcuts,
          confirmGroupDissolution: state.confirmGroupDissolution,
          confirmApplyToAllSyllableSplit: state.confirmApplyToAllSyllableSplit,
          linkedDivergenceAction: state.linkedDivergenceAction,
          composerBridgeUrl: state.composerBridgeUrl,
        })),
    }),
    { name: "composer-settings", version: SETTINGS_PERSIST_VERSION, migrate: migrateSettings },
  ),
);

// -- Exports ------------------------------------------------------------------

export {
  useSettingsStore,
  DEFAULTS,
};
export type { SettingsState, LinkedDivergenceAction, VocalModelVariant };

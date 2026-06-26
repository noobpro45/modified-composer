import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { Shortcut } from "@/hooks/useKeyboardShortcuts";
import { getEffectiveBinding, useShortcutBindingsStore } from "@/stores/shortcut-bindings";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore, type SimpleTab } from "@/stores/project";
import { exportProjectToFile } from "@/lib/persistence";
import { useMemo } from "react";

interface GlobalShortcutActions {
  setActiveTab: (tab: SimpleTab) => void;
  setHelpOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

function useGlobalShortcuts(actions: GlobalShortcutActions): void {
  const { setActiveTab, setHelpOpen, setSettingsOpen } = actions;
  const overrides = useShortcutBindingsStore((s) => s.overrides);

  // biome-ignore lint/correctness/useExhaustiveDependencies: overrides triggers recomputation when bindings change
  const shortcuts: Shortcut[] = useMemo(() => {
    const playPause = getEffectiveBinding("global.playPause");
    const help = getEffectiveBinding("global.help");
    const settings = getEffectiveBinding("global.settings");
    const goToImport = getEffectiveBinding("global.goToImport");
    const goToEdit = getEffectiveBinding("global.goToEdit");
    const goToSync = getEffectiveBinding("global.goToSync");
    const goToTimeline = getEffectiveBinding("global.goToTimeline");
    const goToPreview = getEffectiveBinding("global.goToPreview");
    const goToExport = getEffectiveBinding("global.goToExport");
    const saveProject = getEffectiveBinding("global.saveProject");
    return [
      { ...goToImport, action: () => setActiveTab("import"), description: "Go to Import" },
      { ...goToEdit, action: () => setActiveTab("edit"), description: "Go to Edit" },
      { ...goToSync, action: () => setActiveTab("sync"), description: "Go to Sync" },
      { ...goToTimeline, action: () => setActiveTab("timeline"), description: "Go to Timeline" },
      { ...goToPreview, action: () => setActiveTab("preview"), description: "Go to Preview" },
      { ...goToExport, action: () => setActiveTab("export"), description: "Go to Export" },
      {
        key: playPause.key,
        shift: playPause.shift,
        alt: playPause.alt,
        action: () => {
          const { isPlaying, setIsPlaying } = useAudioStore.getState();
          setIsPlaying(!isPlaying);
        },
        description: "Play / Pause",
      },
      {
        key: help.key,
        shift: help.shift,
        alt: help.alt,
        action: () => setHelpOpen(true),
        description: "Show keyboard shortcuts",
      },
      {
        key: settings.key,
        shift: settings.shift,
        alt: settings.alt,
        action: () => setSettingsOpen(true),
        description: "Open settings",
      },
      {
        key: saveProject.key,
        shift: saveProject.shift,
        alt: saveProject.alt,
        mod: saveProject.mod,
        action: async () => {
          const store = useProjectStore.getState();
          const {
            metadata,
            agents,
            lines,
            groups,
            granularity,
            syllableSplitDefaults,
            dismissedSuggestions,
            dismissedExplicitSuggestions,
            customSnapPoints,
            currentFilePath,
          } = store;

          const audioSource = useAudioStore.getState().source;
          let savedAudioSource: { kind: "file"; name: string } | { kind: "youtube"; videoId: string } | undefined;
          if (audioSource?.type === "file") {
            savedAudioSource = { kind: "file", name: audioSource.file.name };
          } else if (audioSource?.type === "youtube") {
            savedAudioSource = { kind: "youtube", videoId: audioSource.videoId };
          }

          const path = await exportProjectToFile(
            metadata,
            agents,
            lines,
            groups,
            granularity,
            syllableSplitDefaults,
            dismissedSuggestions,
            dismissedExplicitSuggestions,
            customSnapPoints,
            savedAudioSource,
            currentFilePath,
          );
          if (path) {
            store.setCurrentFilePath(path);
            store.markClean();
          }
        },
        description: "Save Project",
      },
    ];
  }, [setActiveTab, setHelpOpen, setSettingsOpen, overrides]);

  useKeyboardShortcuts(shortcuts);
}

export { useGlobalShortcuts };

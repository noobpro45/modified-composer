import type { Stem } from "@/audio/separation/types";
import type { GranularityMode } from "@/stores/project";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS, type SyllableSplitDefaults } from "@/stores/project/types";
import type { Agent } from "@/domain/agent/model";
import type { LinkGroup } from "@/domain/group/template";
import type { LyricLine } from "@/domain/line/model";
import { PROJECT_STORE_NAME, deleteFromStore, getFromStore, setInStore } from "@/lib/persistence-idb";
import type { ProjectMetadata } from "@/domain/project/metadata";
import type { SnapPoint } from "@/domain/snap-point/model";

// -- Types --------------------------------------------------------------------

type SavedAudioSource = { kind: "file"; name: string } | { kind: "youtube"; videoId: string };

interface SavedProject {
  version: 1;
  savedAt: number;
  metadata: ProjectMetadata;
  agents: Agent[];
  lines: LyricLine[];
  groups?: LinkGroup[];
  granularity: GranularityMode;
  syllableSplitDefaults?: SyllableSplitDefaults;
  audioFileName?: string;
  audioSource?: SavedAudioSource;
  dismissedSuggestions?: string[];
  dismissedExplicitSuggestions?: string[];
  currentStem?: Stem;
  primingStripped?: boolean;
  customSnapPoints?: (SnapPoint | number)[];
}

// -- Constants ----------------------------------------------------------------

const CURRENT_PROJECT_KEY = "current";
const AUDIO_FILE_KEY = "current-audio";

// -- Public API ---------------------------------------------------------------

async function saveCurrentProject(
  metadata: ProjectMetadata,
  agents: Agent[],
  lines: LyricLine[],
  groups: LinkGroup[],
  granularity: GranularityMode,
  syllableSplitDefaults: SyllableSplitDefaults,
  audioSource: SavedAudioSource | undefined,
  dismissedSuggestions: string[],
  dismissedExplicitSuggestions: string[],
  currentStem: Stem,
  primingStripped: boolean,
  customSnapPoints: SnapPoint[],
): Promise<void> {
  const audioFileName = audioSource?.kind === "file" ? audioSource.name : undefined;
  const project: SavedProject = {
    version: 1,
    savedAt: Date.now(),
    metadata,
    agents,
    lines,
    groups,
    granularity,
    syllableSplitDefaults,
    audioFileName,
    audioSource,
    dismissedSuggestions,
    dismissedExplicitSuggestions,
    currentStem,
    primingStripped,
    customSnapPoints,
  };
  await setInStore(PROJECT_STORE_NAME, CURRENT_PROJECT_KEY, project);
}

async function loadCurrentProject(): Promise<SavedProject | undefined> {
  return getFromStore<SavedProject>(PROJECT_STORE_NAME, CURRENT_PROJECT_KEY);
}

async function replaceCurrentProject(project: SavedProject): Promise<void> {
  await setInStore(PROJECT_STORE_NAME, CURRENT_PROJECT_KEY, project);
}

async function clearCurrentProject(): Promise<void> {
  await deleteFromStore(PROJECT_STORE_NAME, CURRENT_PROJECT_KEY);
  await clearAudioFile();
}

// -- Audio File Persistence ---------------------------------------------------

interface SavedAudioFile {
  name: string;
  type: string;
  data: ArrayBuffer;
}

async function saveAudioFile(file: File): Promise<void> {
  const data = await file.arrayBuffer();
  await setInStore<SavedAudioFile>(PROJECT_STORE_NAME, AUDIO_FILE_KEY, {
    name: file.name,
    type: file.type,
    data,
  });
}

async function loadAudioFile(): Promise<File | undefined> {
  const saved = await getFromStore<SavedAudioFile>(PROJECT_STORE_NAME, AUDIO_FILE_KEY);
  if (!saved) return undefined;
  return new File([saved.data], saved.name, { type: saved.type });
}

async function clearAudioFile(): Promise<void> {
  await deleteFromStore(PROJECT_STORE_NAME, AUDIO_FILE_KEY);
}

async function exportProjectToFile(
  metadata: ProjectMetadata,
  agents: Agent[],
  lines: LyricLine[],
  groups: LinkGroup[],
  granularity: GranularityMode,
  syllableSplitDefaults: SyllableSplitDefaults,
  dismissedSuggestions: string[],
  dismissedExplicitSuggestions: string[],
  customSnapPoints: SnapPoint[],
  audioSource?: SavedAudioSource,
  currentFilePath?: string | null,
): Promise<string | null> {
  const audioFileName = audioSource?.kind === "file" ? audioSource.name : undefined;
  const project: SavedProject = {
    version: 1,
    savedAt: Date.now(),
    metadata,
    agents,
    lines,
    groups,
    granularity,
    syllableSplitDefaults,
    audioFileName,
    audioSource,
    dismissedSuggestions,
    dismissedExplicitSuggestions,
    customSnapPoints,
  };

  const json = JSON.stringify(project, null, 2);
  let targetPath = currentFilePath;

  if (typeof (window as any).go !== "undefined" && (window as any).go.app?.App) {
    if (!targetPath) {
      const suggestedName = `${metadata.title || "project"}.composer`;
      const defaultDir = await (window as any).go.app.App.DownloadDir();
      targetPath = await (window as any).go.app.App.ShowSaveFileDialog(suggestedName, defaultDir);
    }
    if (targetPath) {
      await (window as any).go.app.App.WriteProjectFile(targetPath, json);
      return targetPath;
    }
    return null;
  }

  // Fallback for web mode
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${metadata.title || "project"}-${new Date().toISOString().slice(0, 10)}.ttml-project.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return null;
}

async function importProjectFromFile(file: File): Promise<SavedProject> {
  const text = await file.text();
  return importProjectFromText(text);
}

function importProjectFromText(text: string): SavedProject {
  const project = JSON.parse(text) as SavedProject;

  if (project.version !== 1) {
    throw new Error(`Unsupported project version: ${project.version}`);
  }

  if (!project.syllableSplitDefaults) {
    project.syllableSplitDefaults = DEFAULT_SYLLABLE_SPLIT_DEFAULTS;
  }

  return project;
}

// -- Exports ------------------------------------------------------------------

export {
  saveCurrentProject,
  loadCurrentProject,
  replaceCurrentProject,
  clearCurrentProject,
  exportProjectToFile,
  importProjectFromFile,
  importProjectFromText,
  saveAudioFile,
  loadAudioFile,
  clearAudioFile,
};
export type { SavedAudioSource, SavedProject };

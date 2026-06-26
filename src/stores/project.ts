import { createAgentsSlice } from "@/stores/project/agents-slice";
import { createDismissalsSlice } from "@/stores/project/dismissals-slice";
import { createGroupsSlice } from "@/stores/project/groups-slice";
import { createHistorySlice } from "@/stores/project/history-slice";
import { createLinesSlice } from "@/stores/project/lines-slice";
import { createMetadataSlice, createProjectInitialState } from "@/stores/project/metadata-slice";
import { createSnapPointsSlice } from "@/stores/project/snap-points-slice";
import type { ProjectState, ProjectStore } from "@/stores/project/types";
import { createUiSlice } from "@/stores/project/ui-slice";
import { create } from "zustand";
import type { SavedProject } from "@/lib/persistence";
import { DEFAULT_SYLLABLE_SPLIT_DEFAULTS } from "@/stores/project/types";

// -- Initial State ------------------------------------------------------------

function createInitialState(): ProjectState {
  return createProjectInitialState();
}

const INITIAL_STATE: ProjectState = createInitialState();

// -- Store --------------------------------------------------------------------

const useProjectStore = create<ProjectStore>((set, get, api) => ({
  ...createMetadataSlice(set, get, api),
  ...createLinesSlice(set, get, api),
  ...createAgentsSlice(set, get, api),
  ...createGroupsSlice(set, get, api),
  ...createUiSlice(set, get, api),
  ...createHistorySlice(set, get, api),
  ...createDismissalsSlice(set, get, api),
  ...createSnapPointsSlice(set, get, api),
}));

export { useProjectStore, INITIAL_STATE };

export function loadSavedProjectToStore(project: SavedProject, path?: string) {
  const store = useProjectStore.getState();
  store.setMetadata(project.metadata);
  store.setLines(project.lines);
  store.setGroups(project.groups ?? []);
  store.setDismissedSuggestions(project.dismissedSuggestions ?? []);
  store.setDismissedExplicitSuggestions(project.dismissedExplicitSuggestions ?? []);
  store.setGranularity(project.granularity);
  store.setSyllableSplitDefaults(project.syllableSplitDefaults ?? DEFAULT_SYLLABLE_SPLIT_DEFAULTS);
  store.setAgents(project.agents);
  store.setCustomSnapPoints(project.customSnapPoints ?? []);
  if (path) {
    store.setCurrentFilePath(path);
  }
  store.markClean();
}

export type { GranularityMode, SimpleTab } from "@/stores/project/types";

import type { ProjectMetadata } from "@/domain/project/metadata";
import { openProjectIdSnapshot } from "@/lib/open-project-session";
import { useProjectStore } from "@/stores/project";
import { pluralize } from "@/utils/pluralize";
import { toast } from "sonner";

// -- State --------------------------------------------------------------------

let lastUndoAction: (() => void) | null = null;

// -- Functions ----------------------------------------------------------------

function triggerLastMetadataUndo(): boolean {
  if (lastUndoAction) {
    const run = lastUndoAction;
    lastUndoAction = null;
    run();
    toast.dismiss();
    return true;
  }
  return false;
}

// Metadata writes skip undo history, so Undo writes the captured values back.
function showMusicBrainzFillToast(previous: Partial<ProjectMetadata>, fieldName?: string): void {
  const filledProjectId = openProjectIdSnapshot();
  const undo = () => {
    if (openProjectIdSnapshot() === filledProjectId) useProjectStore.getState().setMetadata(previous);
  };
  lastUndoAction = undo;
  const count = Object.keys(previous).length;
  const message = fieldName
    ? `Applied ${fieldName} from MusicBrainz`
    : `Filled ${pluralize(count, "field")} from MusicBrainz`;
  toast.success(message, {
    action: {
      label: "Undo",
      onClick: () => {
        undo();
        lastUndoAction = null;
      },
    },
  });
}

// -- Exports ------------------------------------------------------------------

export { showMusicBrainzFillToast, triggerLastMetadataUndo };

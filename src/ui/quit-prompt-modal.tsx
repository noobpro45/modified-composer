import { useEffect, useState } from "react";
import { useProjectStore } from "@/stores/project";
import { useAudioStore } from "@/stores/audio";
import { exportProjectToFile } from "@/lib/persistence";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";

const QuitPromptModalHost: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window.go === "undefined" || !window.runtime) return;

    const off = window.runtime.EventsOn("bridge:request-close", () => {
      setIsOpen(true);
    });

    return () => {
      off();
    };
  }, []);

  const handleCancel = () => {
    setIsOpen(false);
  };

  const handleDontSave = async () => {
    if (window.go?.app?.App?.MarkQuitting) {
      await window.go.app.App.MarkQuitting();
    }
    if (window.runtime) {
      window.runtime.Quit();
    }
  };

  const handleSave = async () => {
    const project = useProjectStore.getState();
    const liveAudioSource = useAudioStore.getState().source;
    
    let savedAudioSource;
    if (liveAudioSource) {
      if (liveAudioSource.type === "file") {
        savedAudioSource = { kind: "file" as const, name: liveAudioSource.file.name };
      } else if (liveAudioSource.type === "youtube") {
        savedAudioSource = { kind: "youtube" as const, videoId: liveAudioSource.videoId };
      }
    }

    try {
      const path = await exportProjectToFile(
        project.metadata,
        project.agents,
        project.lines,
        project.groups,
        project.granularity,
        project.syllableSplitDefaults,
        project.dismissedSuggestions,
        project.dismissedExplicitSuggestions,
        project.customSnapPoints,
        savedAudioSource,
        project.currentFilePath
      );

      if (path) {
        project.setCurrentFilePath(path);
        project.markClean();
        
        setTimeout(async () => {
          if (window.go?.app?.App?.MarkQuitting) {
            await window.go.app.App.MarkQuitting();
          }
          if (window.runtime) window.runtime.Quit();
        }, 100);
      }
    } catch (e) {
      console.error("Failed to save project on quit:", e);
    }
  };

  if (!isOpen) return null;

  const title = useProjectStore.getState().metadata.title || "Untitled";

  return (
    <Modal isOpen onClose={handleCancel} title="Composer" className="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="text-sm text-composer-text-secondary leading-relaxed select-text">
          Do you want to save changes to {title}?
        </div>

        <div className="flex items-center justify-end pt-2">
          <div className="flex gap-2 select-none">
            <Button size="sm" onClick={handleSave} className="bg-composer-accent-dark hover:bg-composer-accent text-white">
              Save
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDontSave}>
              Don't Save
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export { QuitPromptModalHost };

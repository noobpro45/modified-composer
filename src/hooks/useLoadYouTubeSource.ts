import { useCallback } from "react";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";

// -- Hook ---------------------------------------------------------------------

function useLoadYouTubeSource(): (videoId: string) => void {
  return useCallback((videoId: string) => {
    const audio = useAudioStore.getState();
    const prevVideoId = audio.source?.type === "youtube" ? audio.source.videoId : null;
    audio.setYouTubeSource(videoId);

    const project = useProjectStore.getState();
    if (!project.metadata.title || prevVideoId !== videoId) {
      project.setMetadata({ title: videoId });
    }
  }, []);
}

// -- Exports ------------------------------------------------------------------

export { useLoadYouTubeSource };

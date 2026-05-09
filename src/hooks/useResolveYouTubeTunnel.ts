import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useEnsureAuth } from "@/hooks/useEnsureAuth";
import { type AudioSource, useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import {
  DEFAULT_COBALT_INSTANCE_ID,
  getActiveCobaltInstance,
  isUsingDefaultCobaltInstance,
  useSettingsStore,
} from "@/stores/settings";
import { CobaltApiError, formatCobaltErrorForToast, getAudio, getAudioFromStandardCobalt } from "@/utils/cobalt-api";

// -- Constants ----------------------------------------------------------------

const LOG_PREFIX = "[YouTubeTunnel]";
const AUDIO_MIME = "audio/ogg";

// -- Module state -------------------------------------------------------------

const inFlight = new Map<string, AbortController>();

// -- Functions ----------------------------------------------------------------

function buildAudioFile(buffer: ArrayBuffer, filename: string | undefined, videoId: string): File {
  const safeName = (filename ?? videoId).replace(/[\\/:*?"<>|]/g, "").trim() || videoId;
  return new File([buffer], `${safeName}.opus`, { type: AUDIO_MIME });
}

// -- Hook ---------------------------------------------------------------------

function useResolveYouTubeTunnel(): void {
  const ensureAuth = useEnsureAuth();
  const ensureRef = useRef(ensureAuth);
  ensureRef.current = ensureAuth;

  useEffect(() => {
    const handleSourceChange = async (videoId: string, previousSource: AudioSource) => {
      const existing = inFlight.get(videoId);
      if (existing) return;

      const controller = new AbortController();
      inFlight.set(videoId, controller);
      useAudioStore.getState().setIsLoading(true);

      const instanceAtStart = getActiveCobaltInstance();
      const isDefault = isUsingDefaultCobaltInstance();
      try {
        let tunnelUrl: string;
        let filename: string | undefined;
        if (isDefault) {
          const jwt = await ensureRef.current();
          if (controller.signal.aborted) return;
          ({ tunnelUrl, filename } = await getAudio(videoId, jwt));
        } else {
          ({ tunnelUrl, filename } = await getAudioFromStandardCobalt(videoId));
        }
        if (controller.signal.aborted) return;

        const res = await fetch(tunnelUrl, { signal: controller.signal });
        if (!res.ok) throw new CobaltApiError("cobalt_failed", res.status);
        const buffer = await res.arrayBuffer();
        if (controller.signal.aborted) return;
        if (buffer.byteLength === 0) throw new CobaltApiError("empty_audio", res.status);

        const current = useAudioStore.getState().source;
        if (current?.type !== "youtube" || current.videoId !== videoId) return;

        const file = buildAudioFile(buffer, filename, videoId);
        useAudioStore.getState().setYouTubeFile(file);

        if (filename) {
          const project = useProjectStore.getState();
          const currentTitle = project.metadata.title;
          if (!currentTitle || currentTitle === videoId) {
            project.setMetadata({ title: filename });
          }
        }

        if (!isDefault && instanceAtStart.id !== DEFAULT_COBALT_INSTANCE_ID) {
          useSettingsStore.getState().recordCobaltInstanceResult(instanceAtStart.id, "success");
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(LOG_PREFIX, "tunnel fetch failed", err);
        const message = formatCobaltErrorForToast(err, {
          isDefault,
          instanceLabel: instanceAtStart.label,
        });
        toast.error(message);
        if (!isDefault && instanceAtStart.id !== DEFAULT_COBALT_INSTANCE_ID) {
          useSettingsStore.getState().recordCobaltInstanceResult(instanceAtStart.id, "error", message);
        }
        const current = useAudioStore.getState().source;
        if (current?.type === "youtube" && current.videoId === videoId) {
          useAudioStore.getState().setSource(previousSource);
        }
      } finally {
        if (inFlight.get(videoId) === controller) inFlight.delete(videoId);
        if (inFlight.size === 0) useAudioStore.getState().setIsLoading(false);
      }
    };

    const initial = useAudioStore.getState().source;
    if (initial?.type === "youtube" && !initial.file) {
      handleSourceChange(initial.videoId, null);
    }

    const unsubscribe = useAudioStore.subscribe((state, prev) => {
      if (state.source === prev.source) return;

      if (prev.source?.type === "youtube") {
        const stillNeeded = state.source?.type === "youtube" && state.source.videoId === prev.source.videoId;
        if (!stillNeeded) {
          const controller = inFlight.get(prev.source.videoId);
          if (controller) controller.abort();
        }
      }

      if (state.source?.type !== "youtube") return;
      if (state.source.file) return;
      handleSourceChange(state.source.videoId, prev.source);
    });

    return () => {
      unsubscribe();
      for (const controller of inFlight.values()) controller.abort();
      inFlight.clear();
    };
  }, []);
}

// -- Exports ------------------------------------------------------------------

export { useResolveYouTubeTunnel };

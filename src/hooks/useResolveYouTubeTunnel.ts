import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { flushPendingSave } from "@/lib/persistence-debounce";
import { getPersistenceSettled } from "@/lib/persistence-settled";
import { type AudioSource, useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useSettingsStore } from "@/stores/settings";
import {
  BridgeError,
  buildBridgeAudioFile,
  formatBridgeErrorForToast,
  getAudioFromBridge,
} from "@/utils/composer-bridge-api";

// -- Constants ----------------------------------------------------------------

const BRIDGE_INSTANCE_ID = "__composer_bridge__";
const BRIDGE_INSTANCE_LABEL = "Composer Bridge";

interface TunnelResult {
  file: File;
  filename: string | undefined;
  title?: string;
  artist?: string;
  album?: string;
  instanceLabel: string;
  instanceId: string;
  wasDefault: boolean;
}

class TunnelError extends Error {
  readonly cause: unknown;
  readonly instanceId: string;
  readonly instanceLabel: string;
  readonly wasDefault: boolean;

  constructor(cause: unknown, instanceId: string, instanceLabel: string, wasDefault: boolean) {
    super("tunnel_failed");
    this.name = "TunnelError";
    this.cause = cause;
    this.instanceId = instanceId;
    this.instanceLabel = instanceLabel;
    this.wasDefault = wasDefault;
  }
}

// -- Helpers ------------------------------------------------------------------

// -- Helpers ------------------------------------------------------------------

async function fetchViaBridge(videoId: string, signal: AbortSignal): Promise<TunnelResult> {
  const baseUrl = useSettingsStore.getState().composerBridgeUrl;
  try {
    const { buffer, mimeType, title, artist, album } = await getAudioFromBridge(baseUrl, videoId, signal);
    if (signal.aborted) throw new DOMException("aborted", "AbortError");
    const filename = [artist, title].filter(Boolean).join(" - ") || title;
    return {
      file: buildBridgeAudioFile(buffer, mimeType, videoId),
      filename: filename || undefined,
      title,
      artist,
      album,
      instanceLabel: BRIDGE_INSTANCE_LABEL,
      instanceId: BRIDGE_INSTANCE_ID,
      wasDefault: false,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new TunnelError(err, BRIDGE_INSTANCE_ID, BRIDGE_INSTANCE_LABEL, false);
  }
}

function fetchTunnel(videoId: string, signal: AbortSignal): Promise<TunnelResult> {
  return fetchViaBridge(videoId, signal);
}

// -- Hook ---------------------------------------------------------------------

function useResolveYouTubeTunnel(): void {
  const source = useAudioStore((s) => s.source);
  const previousSourceRef = useRef<AudioSource>(null);
  useEffect(() => {
    return () => {
      previousSourceRef.current = source;
    };
  }, [source]);

  const bridgeUrl = useSettingsStore((s) => s.composerBridgeUrl);
  const videoId = source?.type === "youtube" && !source.file ? source.videoId : null;

  const query = useQuery<TunnelResult>({
    queryKey: ["youtube-tunnel", videoId, bridgeUrl],
    enabled: videoId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    queryFn: ({ signal }) => fetchTunnel(videoId as string, signal),
  });

  useEffect(() => {
    if (!videoId) {
      useAudioStore.getState().setIsLoading(false);
      return;
    }
    useAudioStore.getState().setIsLoading(query.isFetching);
  }, [videoId, query.isFetching]);

  useEffect(() => {
    const data = query.data;
    if (!data || !videoId) return;
    let cancelled = false;
    void getPersistenceSettled().then(() => {
      if (cancelled) return;
      const current = useAudioStore.getState().source;
      if (current?.type !== "youtube" || current.videoId !== videoId) return;
      useAudioStore.getState().setYouTubeFile(data.file);
      useAudioStore.getState().setYouTubeLoadError(null);

      const project = useProjectStore.getState();
      const currentTitle = project.metadata.title;
      if (!currentTitle || currentTitle === videoId) {
        const metadataPatch: Partial<typeof project.metadata> = { title: data.filename || videoId };
        if (data.artist) metadataPatch.artist = data.artist;
        if (data.album) metadataPatch.album = data.album;
        project.setMetadata(metadataPatch);
        flushPendingSave();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query.data, videoId]);

  useEffect(() => {
    const err = query.error;
    if (!err || !videoId) return;

    const tunnelErr = err instanceof TunnelError ? err : null;
    const cause = tunnelErr?.cause ?? err;
    const message =
      cause instanceof BridgeError
        ? formatBridgeErrorForToast(cause)
        : cause instanceof Error
          ? cause.message
          : "Unknown error downloading from YouTube";

    toast.error(message);

    const current = useAudioStore.getState().source;
    if (current?.type === "youtube" && current.videoId === videoId) {
      useAudioStore.getState().setSource(previousSourceRef.current);
    }
    useAudioStore.getState().setYouTubeLoadError(message);
  }, [query.error, videoId]);
}

// -- Exports ------------------------------------------------------------------

export { useResolveYouTubeTunnel };

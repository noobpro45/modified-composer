import { ExportTrack, ListTracks, RemoveTrack } from "@/wailsjs/go/app/App";
import { library } from "@/wailsjs/go/models";
import { IconCheck, IconDownload, IconLoader2, IconMusic, IconTrash, IconFilePlus } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/stores/confirm-store";
import { useBridgeConfig } from "@/hooks/use-bridge-config";
import { BridgeSelectConfig } from "@/ui/settings/bridge-section";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";

// -- Library Section ----------------------------------------------------------

const LibrarySection: React.FC = () => {
  const [tracks, setTracks] = useState<library.Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<Record<string, "idle" | "downloading" | "done">>({});
  const confirm = useConfirm();
  const { config: backendConfig, update: updateBackendConfig } = useBridgeConfig();

  const fetchTracks = useCallback(async () => {
    try {
      if (typeof window.go === "undefined" || !window.go.app?.App) {
        setLoading(false);
        return;
      }
      const data = await ListTracks();
      // Sort by imported_at descending
      const sorted = [...(data || [])].sort((a, b) => b.imported_at - a.imported_at);
      setTracks(sorted);
    } catch (err) {
      toast.error("Failed to load audio library");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const handleExport = async (track: library.Track) => {
    const id = track.video_id;
    setDownloading((prev) => ({ ...prev, [id]: "downloading" }));
    try {
      await ExportTrack(
        id,
        `${track.artist ? track.artist + " - " : ""}${track.title}.m4a`
      );
      setDownloading((prev) => ({ ...prev, [id]: "done" }));
      toast.success(`"${track.title}" saved successfully`);
      // Reset back to idle after 3 seconds
      setTimeout(() => {
        setDownloading((prev) => ({ ...prev, [id]: "idle" }));
      }, 3000);
    } catch (err: any) {
      setDownloading((prev) => ({ ...prev, [id]: "idle" }));
      // User cancelled the save dialog — not an error
      if (err?.message?.includes("cancelled") || err?.message?.includes("canceled")) {
        return;
      }
      toast.error(`Failed to export track: ${err?.message || err}`);
      console.error(err);
    }
  };

  const handleUseInProject = async (track: library.Track) => {
    const currentSource = useAudioStore.getState().source;
    if (currentSource) {
      if (currentSource.type === "youtube" && currentSource.videoId === track.video_id) {
        toast.info("This track is already loaded in the project");
        return;
      }
      const ok = await confirm({
        title: "Replace Project Audio?",
        description: "Your current project already has an audio track loaded. Loading a new track will replace the current one. Are you sure you want to proceed?",
        confirmLabel: "Replace",
        cancelLabel: "Cancel",
        variant: "destructive",
      });
      if (!ok) return;
    }
    
    useAudioStore.getState().setYouTubeSource(track.video_id);
    useProjectStore.getState().setMetadata({ title: track.title, artist: track.artist });
    toast.success(`Loaded "${track.title}" into project`);
  };

  const handleDelete = async (track: library.Track) => {
    const ok = await confirm({
      title: "Delete Cached Track?",
      description: `Are you sure you want to completely delete "${track.title}" from your computer? This will free up storage but cannot be undone.`,
      confirmLabel: "Delete",
      variant: "destructive",
      settingsKey: "confirmDeleteCachedTrack",
    });
    if (!ok) return;

    try {
      // If the track is currently loaded in the player, release the file lock first
      const currentSource = useAudioStore.getState().source;
      if (currentSource?.type === "youtube" && currentSource.videoId === track.video_id) {
        useAudioStore.getState().setSource(null);
        // Wait a moment for React to unmount the audio element and the browser to release the file lock
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      await RemoveTrack(track.video_id);
      toast.success("Track deleted completely from storage");
      fetchTracks();
      
      // We don't automatically reload it. If they need it, they can reload the project.
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete track");
      console.error(err);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 MB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (typeof window.go === "undefined" || !window.go.app?.App) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-composer-text-muted">
        <IconMusic className="size-8 mb-4 opacity-50" />
        <p>Audio Library is only available in the desktop app.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-composer-border">
      {/* Audio Format Config */}
      {backendConfig && (
        <BridgeSelectConfig
          label="Default download format"
          description="Preferred audio container format when downloading tracks"
          value={backendConfig.audio_format}
          onChange={(v) => updateBackendConfig("audio_format", v)}
          options={[
            { value: "m4a", label: "M4A (Default)" },
            { value: "mp3", label: "MP3" },
            { value: "opus", label: "Opus" },
          ]}
        />
      )}

      {/* Track List */}
      <div className="py-3">
        <div className="flex flex-col gap-0.5 pb-3">
          <span className="text-sm font-medium text-composer-text">Downloaded Tracks</span>
        </div>
        {loading ? (
          <div className="text-sm text-composer-text-muted">Loading library...</div>
        ) : tracks.length === 0 ? (
          <div className="text-sm text-composer-text-muted">No tracks downloaded yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {tracks.map((track) => {
                const dlState = downloading[track.video_id] || "idle";
                return (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-2 rounded-md hover:bg-composer-bg-elevated transition-colors border border-transparent hover:border-composer-border"
                >
                  {/* Thumbnail */}
                  <div className="size-12 rounded bg-composer-bg-dark shrink-0 overflow-hidden flex items-center justify-center border border-white/5">
                    {track.thumbnail_url ? (
                      <img src={track.thumbnail_url} alt="Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                      <IconMusic className="size-5 text-composer-text-muted" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="text-sm font-medium truncate text-composer-text" title={track.title}>
                      {track.title || "Unknown Title"}
                    </div>
                    <div className="text-xs text-composer-text-muted truncate">
                      {track.artist || "Unknown Artist"} • {formatSize(track.audio_size)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center shrink-0 pr-2 gap-1">
                    <button
                      type="button"
                      onClick={() => handleUseInProject(track)}
                      className="p-1.5 text-composer-text-muted hover:text-composer-accent hover:bg-composer-accent/10 rounded-md transition-colors"
                      title="Use this track in current project"
                    >
                      <IconFilePlus className="size-4" />
                    </button>
                    <button
                      type="button"
                      disabled={dlState === "downloading"}
                      onClick={() => handleExport(track)}
                      className={`p-1.5 rounded-md transition-all ${
                        dlState === "downloading"
                          ? "text-composer-accent cursor-wait"
                          : dlState === "done"
                            ? "text-green-400"
                            : "text-composer-text-muted hover:text-composer-text hover:bg-composer-bg-dark"
                      }`}
                      title={
                        dlState === "downloading"
                          ? "Downloading..."
                          : dlState === "done"
                            ? "Saved!"
                            : "Save Track As..."
                      }
                    >
                      {dlState === "downloading" ? (
                        <IconLoader2 className="size-4 animate-spin" />
                      ) : dlState === "done" ? (
                        <IconCheck className="size-4" />
                      ) : (
                        <IconDownload className="size-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(track)}
                      className="p-1.5 text-composer-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                      title="Delete completely from storage"
                    >
                      <IconTrash className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { LibrarySection };

import type { ProjectMetadata } from "@/domain/project/metadata";
import type { AudioSource } from "@/stores/audio";
import type { LyricsSearchQuery } from "@/utils/lyrics-search/types";

function buildProjectPrefill(
  metadata: Partial<ProjectMetadata>,
  source: AudioSource | null,
  durationSec?: number,
): LyricsSearchQuery | null {
  const videoId = source?.type === "youtube" ? source.videoId : undefined;
  const rawTitle = metadata.title?.trim();
  const titleIsVideoId = Boolean(videoId && rawTitle === videoId);
  const track = rawTitle && !titleIsVideoId ? rawTitle : undefined;
  const artist = metadata.artists?.filter(Boolean).join(", ").trim() || undefined;
  const album = metadata.album?.trim() || undefined;
  const isrc = metadata.isrc?.trim() || undefined;
  const duration =
    typeof metadata.duration === "number" && metadata.duration > 0
      ? metadata.duration
      : durationSec && durationSec > 0
        ? Math.round(durationSec)
        : undefined;

  const prefill: LyricsSearchQuery = {};
  if (track) prefill.track = track;
  if (artist) prefill.artist = artist;
  if (album) prefill.album = album;
  if (duration !== undefined) prefill.durationSec = duration;
  if (isrc) prefill.isrc = isrc;
  if (videoId) prefill.videoId = videoId;

  return Object.keys(prefill).length > 0 ? prefill : null;
}

export { buildProjectPrefill };

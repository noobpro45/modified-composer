import { toUsableDurationSec } from "@/domain/lyrics-search/duration";
import type { LyricsSearchPayload, LyricsSearchResult } from "@/domain/lyrics-search/result";
import { type SyncType, detectLrcSyncType, detectTtmlSyncType } from "@/domain/lyrics-search/sync-type";
import { isAbortError } from "@/utils/abort-error";
import { isValidIsrc, normalizeIsrc } from "@/utils/isrc";
import { hasNonEmptyString } from "@/utils/lyrics-search/query-guards";
import type { LyricsSearchProvider, LyricsSearchQuery } from "@/utils/lyrics-search/types";

// -- Constants ----------------------------------------------------------------

const UNISON_BASE_URL = "https://unison.betterlyrics.org";
const SEARCH_PATH = "/lyrics/search";
const GET_PATH = "/lyrics";
const ID_PREFIX = "unison-";
const LOG_PREFIX = "[Unison]";
const MAX_SEARCH_RESULTS = 10;

// -- Types --------------------------------------------------------------------

interface UnisonLyricItem {
  id: number;
  videoId?: string | null;
  song: string;
  artist: string;
  album?: string | null;
  duration?: number | null;
  isrc?: string | null;
  format: "ttml" | "lrc" | "plain" | string;
  language?: string | null;
  syncType: "richsync" | "linesync" | "plain" | string;
  lyrics?: string;
}

interface UnisonSearchResponse {
  success?: boolean;
  data?: UnisonLyricItem[] | UnisonLyricItem;
}

// -- Helpers ------------------------------------------------------------------

function canSearch(query: LyricsSearchQuery): boolean {
  if (hasNonEmptyString(query.track)) return true;
  if (hasNonEmptyString(query.videoId)) return true;
  return hasNonEmptyString(query.isrc) && isValidIsrc(query.isrc);
}

function buildSearchUrl(query: LyricsSearchQuery): URL {
  const isrc = hasNonEmptyString(query.isrc) ? normalizeIsrc(query.isrc) : undefined;

  if (isrc && !hasNonEmptyString(query.track) && !hasNonEmptyString(query.videoId)) {
    const url = new URL(GET_PATH, UNISON_BASE_URL);
    url.searchParams.set("isrc", isrc);
    return url;
  }

  const url = new URL(SEARCH_PATH, UNISON_BASE_URL);

  if (hasNonEmptyString(query.track) && hasNonEmptyString(query.artist)) {
    url.searchParams.set("song", query.track.trim());
    url.searchParams.set("artist", query.artist.trim());
    if (hasNonEmptyString(query.videoId)) url.searchParams.set("v", query.videoId.trim());
  } else if (hasNonEmptyString(query.videoId)) {
    url.searchParams.set("v", query.videoId.trim());
    if (hasNonEmptyString(query.track)) url.searchParams.set("song", query.track.trim());
    if (hasNonEmptyString(query.artist)) url.searchParams.set("artist", query.artist.trim());
  } else if (hasNonEmptyString(query.track)) {
    url.searchParams.set("q", query.track.trim());
  }

  if (isrc) {
    url.searchParams.set("isrc", isrc);
  }

  if (hasNonEmptyString(query.album)) {
    url.searchParams.set("album", query.album.trim());
  }

  const duration = toUsableDurationSec(query.durationSec);
  if (duration !== undefined) {
    url.searchParams.set("duration", duration.toString());
  }

  return url;
}

function detectSyncType(format: string, content: string): SyncType {
  if (format === "ttml") {
    return detectTtmlSyncType(content);
  }
  if (format === "lrc") {
    return detectLrcSyncType(content);
  }
  return "unsynced";
}

function buildPayload(format: string, content: string): LyricsSearchPayload {
  if (format === "ttml") {
    return { kind: "ttml", xml: content };
  }
  if (format === "lrc") {
    return { kind: "lrc", synced: content, plain: null };
  }
  return { kind: "lrc", synced: null, plain: content };
}

function buildResult(item: UnisonLyricItem, content: string): LyricsSearchResult {
  return {
    id: `${ID_PREFIX}${item.id}`,
    source: "unison",
    sourceLabel: "Unison",
    syncType: detectSyncType(item.format, content),
    track: item.song.trim(),
    artist: item.artist.trim(),
    album: item.album?.trim() || undefined,
    durationSec: toUsableDurationSec(item.duration),
    payload: buildPayload(item.format, content),
  };
}

async function fetchLyricContent(item: UnisonLyricItem, signal: AbortSignal): Promise<string | null> {
  if (typeof item.lyrics === "string" && item.lyrics.trim().length > 0) {
    return item.lyrics;
  }
  try {
    const res = await fetch(`${UNISON_BASE_URL}/lyrics/${encodeURIComponent(item.id)}`, { signal });
    if (!res.ok) return null;
    const body = (await res.json()) as { success?: boolean; data?: { lyrics?: string } };
    if (!body || !body.success || typeof body.data?.lyrics !== "string") return null;
    return body.data.lyrics.trim().length > 0 ? body.data.lyrics : null;
  } catch {
    return null;
  }
}

// -- Search -------------------------------------------------------------------

async function search(query: LyricsSearchQuery, signal: AbortSignal): Promise<LyricsSearchResult[]> {
  if (!canSearch(query)) return [];
  if (signal.aborted) return [];

  try {
    const url = buildSearchUrl(query);
    const response = await fetch(url.toString(), { signal });

    if (signal.aborted) return [];
    if (response.status === 404) return [];
    if (!response.ok) {
      console.warn(LOG_PREFIX, `search returned ${response.status}, treating as no results`);
      return [];
    }

    const body = (await response.json()) as UnisonSearchResponse;
    if (!body || !body.success) return [];

    const rawData = body.data;
    const items = (Array.isArray(rawData) ? rawData : rawData ? [rawData] : []).slice(0, MAX_SEARCH_RESULTS);
    if (items.length === 0) return [];
    const contents = await Promise.all(items.map((item) => fetchLyricContent(item, signal)));

    const results: LyricsSearchResult[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const content = contents[i];
      if (!item || !content) continue;
      results.push(buildResult(item, content));
    }

    return results;
  } catch (error) {
    if (isAbortError(error)) return [];
    console.warn(LOG_PREFIX, "search request failed, treating as no results", error);
    return [];
  }
}

// -- Provider -----------------------------------------------------------------

const unisonProvider: LyricsSearchProvider = {
  name: "unison",
  sourceLabel: "Unison",
  canSearch,
  search,
};

// -- Exports ------------------------------------------------------------------

export { unisonProvider };

import { toUsableDurationSec } from "@/domain/lyrics-search/duration";
import type { LyricsSearchPayload, LyricsSearchResult } from "@/domain/lyrics-search/result";
import { type SyncType, detectLrcSyncType } from "@/domain/lyrics-search/sync-type";
import { isAbortError } from "@/utils/abort-error";
import { hasNonEmptyString } from "@/utils/lyrics-search/query-guards";
import type { LyricsSearchProvider, LyricsSearchQuery } from "@/utils/lyrics-search/types";

// -- Constants ----------------------------------------------------------------

const LRCLIB_BASE_URL = "https://lrclib.net";
const SEARCH_PATH = "/api/search";
const GET_PATH = "/api/get";
const ID_PREFIX = "lrclib-";
const LOG_PREFIX = "[LRCLib]";
const ARTIST_DELIMITERS = [",", "&", "/", "、"] as const;
const CV_PATTERN = /\s*[\(\[][Cc][Vv][:\s][^\)\]]+[\)\]]/g;
const FEAT_PAREN_PATTERN = /\s*[\(\[](?:feat|ft)\.?\s+[^\)\]]+[\)\]]/gi;
const FEAT_INLINE_PATTERN = /\s+(?:feat|ft)\.?\s+.*$/i;

// -- Types --------------------------------------------------------------------

interface LrcLibResponse {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

// -- Helpers ------------------------------------------------------------------

function hasNonEmptyTrack(query: LyricsSearchQuery): boolean {
  return hasNonEmptyString(query.track);
}

function buildSearchUrl(query: LyricsSearchQuery): URL {
  const url = new URL(SEARCH_PATH, LRCLIB_BASE_URL);
  url.searchParams.set("track_name", (query.track ?? "").trim());
  if (hasNonEmptyString(query.artist)) url.searchParams.set("artist_name", query.artist.trim());
  if (hasNonEmptyString(query.album)) url.searchParams.set("album_name", query.album.trim());
  if (typeof query.durationSec === "number" && Number.isFinite(query.durationSec)) {
    url.searchParams.set("duration", Math.round(query.durationSec).toString());
  }
  return url;
}

function buildGetUrl(query: LyricsSearchQuery): URL {
  const url = new URL(GET_PATH, LRCLIB_BASE_URL);
  url.searchParams.set("track_name", (query.track ?? "").trim());
  url.searchParams.set("artist_name", (query.artist ?? "").trim());
  url.searchParams.set("album_name", (query.album ?? "").trim());
  url.searchParams.set("duration", Math.round(query.durationSec as number).toString());
  return url;
}

function canRunGet(query: LyricsSearchQuery): boolean {
  return (
    hasNonEmptyString(query.track) &&
    hasNonEmptyString(query.artist) &&
    hasNonEmptyString(query.album) &&
    typeof query.durationSec === "number" &&
    Number.isFinite(query.durationSec)
  );
}

function deriveSyncType(synced: string | null, plain: string | null): SyncType | null {
  if (synced && synced.trim().length > 0) return detectLrcSyncType(synced);
  if (plain && plain.trim().length > 0) return "unsynced";
  return null;
}

function mapResponseToResult(response: LrcLibResponse): LyricsSearchResult | null {
  const synced = response.syncedLyrics ?? null;
  const plain = response.plainLyrics ?? null;
  const syncType = deriveSyncType(synced, plain);
  if (syncType === null) return null;

  const album = response.albumName && response.albumName.trim().length > 0 ? response.albumName : undefined;
  const payload: LyricsSearchPayload = { kind: "lrc", synced, plain };

  return {
    id: `${ID_PREFIX}${response.id.toString()}`,
    source: "lrclib",
    sourceLabel: "LRCLib",
    syncType,
    track: response.trackName,
    artist: response.artistName,
    album,
    durationSec: toUsableDurationSec(response.duration),
    payload,
  };
}

async function fetchSearch(query: LyricsSearchQuery, signal: AbortSignal): Promise<LrcLibResponse[]> {
  const url = buildSearchUrl(query);
  const response = await fetch(url.toString(), { signal });
  if (response.status === 404) return [];
  if (!response.ok) {
    console.warn(LOG_PREFIX, `/api/search returned ${response.status}, treating as no results`);
    return [];
  }
  const body = (await response.json()) as LrcLibResponse[];
  return Array.isArray(body) ? body : [];
}

async function fetchGet(query: LyricsSearchQuery, signal: AbortSignal): Promise<LrcLibResponse | null> {
  const url = buildGetUrl(query);
  const response = await fetch(url.toString(), { signal });
  if (response.status === 404) return null;
  if (!response.ok) {
    console.warn(LOG_PREFIX, `/api/get returned ${response.status}, treating as no results`);
    return null;
  }
  const body = (await response.json()) as LrcLibResponse;
  return body;
}

function cleanArtist(artist: string | undefined): string | undefined {
  if (!artist) return undefined;
  const stripped = artist.replace(CV_PATTERN, "").replace(FEAT_PAREN_PATTERN, "").replace(FEAT_INLINE_PATTERN, "");
  let primary = stripped;
  for (const delimiter of ARTIST_DELIMITERS) {
    const part = primary.split(delimiter)[0];
    if (part) primary = part;
  }
  const trimmed = primary.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// -- Search -------------------------------------------------------------------

async function executeSearch(query: LyricsSearchQuery, signal: AbortSignal): Promise<LyricsSearchResult[]> {
  const tasks: Promise<unknown>[] = [fetchSearch(query, signal)];
  if (canRunGet(query)) tasks.push(fetchGet(query, signal));

  const settled = await Promise.allSettled(tasks);

  if (signal.aborted) return [];

  const searchSettled = settled[0] as PromiseSettledResult<LrcLibResponse[]>;
  const getSettled = settled.length > 1 ? (settled[1] as PromiseSettledResult<LrcLibResponse | null>) : null;

  const searchResponses: LrcLibResponse[] =
    searchSettled.status === "fulfilled" ? searchSettled.value : handleSearchRejection(searchSettled.reason);
  const getResponse: LrcLibResponse | null =
    getSettled === null
      ? null
      : getSettled.status === "fulfilled"
        ? getSettled.value
        : handleGetRejection(getSettled.reason);

  const merged: LyricsSearchResult[] = [];
  const seenIds = new Set<string>();

  if (getResponse !== null) {
    const exact = mapResponseToResult(getResponse);
    if (exact !== null) {
      merged.push(exact);
      seenIds.add(exact.id);
    }
  }

  for (const candidate of searchResponses) {
    const mapped = mapResponseToResult(candidate);
    if (mapped === null) continue;
    if (seenIds.has(mapped.id)) continue;
    merged.push(mapped);
    seenIds.add(mapped.id);
  }

  return merged;
}

async function search(query: LyricsSearchQuery, signal: AbortSignal): Promise<LyricsSearchResult[]> {
  if (!hasNonEmptyTrack(query)) return [];
  if (signal.aborted) return [];

  const primary = await executeSearch(query, signal);
  if (primary.length > 0 || signal.aborted) return primary;

  const hasExtraConstraints = hasNonEmptyString(query.album) || typeof query.durationSec === "number";
  if (hasExtraConstraints) {
    const relaxed = await executeSearch({ track: query.track, artist: query.artist }, signal);
    if (relaxed.length > 0 || signal.aborted) return relaxed;
  }

  const cleanedArtist = cleanArtist(query.artist);
  if (cleanedArtist && cleanedArtist !== query.artist?.trim()) {
    const simplified = await executeSearch({ track: query.track, artist: cleanedArtist }, signal);
    if (simplified.length > 0 || signal.aborted) return simplified;
  }

  if (hasNonEmptyString(query.artist)) {
    const trackOnly = await executeSearch({ track: query.track }, signal);
    if (trackOnly.length > 0) return trackOnly;
  }

  return [];
}

function handleSearchRejection(reason: unknown): LrcLibResponse[] {
  if (isAbortError(reason)) return [];
  console.warn(LOG_PREFIX, "/api/search request failed, treating as no results", reason);
  return [];
}

function handleGetRejection(_reason: unknown): LrcLibResponse | null {
  return null;
}

// -- Provider -----------------------------------------------------------------

const lrclibProvider: LyricsSearchProvider = {
  name: "lrclib",
  sourceLabel: "LRCLib",
  canSearch: hasNonEmptyTrack,
  search,
};

// -- Exports ------------------------------------------------------------------

export { lrclibProvider };

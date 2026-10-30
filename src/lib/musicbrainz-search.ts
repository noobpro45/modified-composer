import { type SongQuery, recordingLookupUrl, songSearchUrl } from "@/domain/musicbrainz/query";
import { rankMatches } from "@/domain/musicbrainz/rank-matches";
import type { MbRecording, MbSearchResponse } from "@/domain/musicbrainz/types";
import { MusicBrainzHttpError, fetchMusicBrainz } from "@/lib/musicbrainz-client";
import { normalizeIsrc } from "@/utils/isrc";

// -- Constants ----------------------------------------------------------------

const NOT_FOUND_STATUS = 404;
const TITLE_DELIMITER_PATTERN = /\s+[-–—/|]\s+/;
const TITLE_BRACKETS_PATTERN =
  /\s*[\(\[][^\)\]]*(?:official|video|mv|audio|version|size|lyrics?|theme|ed|op)[^\)\]]*[\)\]]/gi;
const QUOTE_WRAP_PATTERN = /^["']|["']$/g;

// -- Types --------------------------------------------------------------------

interface LookupIsrcParams {
  title: string;
  artist?: string;
  durationSec?: number;
}

// -- Helpers ------------------------------------------------------------------

function candidateTitles(rawTitle: string): string[] {
  const clean = rawTitle.trim().replace(QUOTE_WRAP_PATTERN, "");
  const titles = new Set<string>();
  if (clean) titles.add(clean);

  const parts = clean.split(TITLE_DELIMITER_PATTERN);
  if (parts.length > 1) {
    for (const part of parts) {
      const p = part.trim();
      if (p) titles.add(p);
    }
  }

  const stripped = clean.replace(TITLE_BRACKETS_PATTERN, "").trim();
  if (stripped && stripped !== clean) {
    titles.add(stripped);
    const subParts = stripped.split(TITLE_DELIMITER_PATTERN);
    if (subParts.length > 1) {
      for (const part of subParts) {
        const p = part.trim();
        if (p) titles.add(p);
      }
    }
  }

  return [...titles];
}

// -- Search -------------------------------------------------------------------

const isNotFound = (error: unknown): boolean =>
  error instanceof MusicBrainzHttpError && error.status === NOT_FOUND_STATUS;

async function searchRecordings(query: SongQuery, signal?: AbortSignal): Promise<MbSearchResponse> {
  if (query.isrc) {
    try {
      return await fetchMusicBrainz<MbSearchResponse>(songSearchUrl(query), signal);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }
  return fetchMusicBrainz<MbSearchResponse>(songSearchUrl({ ...query, isrc: null }), signal);
}

async function findIsrcInRecordings(
  recordings: readonly MbRecording[],
  durationSec?: number,
  signal?: AbortSignal,
): Promise<string | null> {
  const ranked = rankMatches(recordings, durationSec ?? null);
  for (const match of ranked) {
    if (match.recording.isrcs && match.recording.isrcs.length > 0) {
      const normalized = normalizeIsrc(match.recording.isrcs[0]);
      if (normalized) return normalized;
    }
  }

  // If the search index omitted the isrcs array, check the top candidates directly
  for (const match of ranked.slice(0, 3)) {
    if (!match.recording.id) continue;
    try {
      const details = await fetchMusicBrainz<MbRecording>(recordingLookupUrl(match.recording.id), signal);
      if (details.isrcs && details.isrcs.length > 0) {
        const normalized = normalizeIsrc(details.isrcs[0]);
        if (normalized) return normalized;
      }
    } catch {
      // Detail lookup optional; fall through
    }
  }

  return null;
}

async function lookupRecordingIsrc(params: LookupIsrcParams, signal?: AbortSignal): Promise<string | null> {
  const titles = candidateTitles(params.title);
  if (titles.length === 0) return null;
  const artist = params.artist?.trim() ?? "";

  for (const title of titles) {
    if (artist) {
      try {
        const res = await searchRecordings({ title, artist, isrc: null }, signal);
        const isrc = await findIsrcInRecordings(res.recordings, params.durationSec, signal);
        if (isrc) return isrc;
      } catch {
        if (signal?.aborted) return null;
      }
    }

    try {
      const res = await searchRecordings({ title, artist: "", isrc: null }, signal);
      const isrc = await findIsrcInRecordings(res.recordings, params.durationSec, signal);
      if (isrc) return isrc;
    } catch {
      if (signal?.aborted) return null;
    }
  }

  return null;
}

// -- Exports ------------------------------------------------------------------

export { lookupRecordingIsrc, searchRecordings };

import { lookupRecordingIsrc } from "@/lib/musicbrainz-search";
import { useCallback, useEffect, useRef, useState } from "react";

// -- Types --------------------------------------------------------------------

interface UseIsrcLookupOptions {
  track: string;
  artist: string;
  durationSec?: number;
  onFound: (isrc: string) => void;
}

interface UseIsrcLookupResult {
  isLookingUp: boolean;
  lookupStatus: string | null;
  handleLookupIsrc: () => Promise<void>;
}

// -- Constants ----------------------------------------------------------------

const STATUS_RESET_DELAY_MS = 2500;

// -- Hook ---------------------------------------------------------------------

function useIsrcLookup({ track, artist, durationSec, onFound }: UseIsrcLookupOptions): UseIsrcLookupResult {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleLookupIsrc = useCallback(async () => {
    if (!track.trim() || isLookingUp) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (timerRef.current) clearTimeout(timerRef.current);
    setIsLookingUp(true);
    setLookupStatus(null);

    try {
      const isrc = await lookupRecordingIsrc({ title: track, artist, durationSec }, controller.signal);

      if (controller.signal.aborted) return;

      if (isrc) {
        onFound(isrc);
        setLookupStatus("Found");
      } else {
        setLookupStatus("Not found");
      }
    } catch {
      if (!controller.signal.aborted) {
        setLookupStatus("Error");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLookingUp(false);
        timerRef.current = setTimeout(() => {
          setLookupStatus(null);
        }, STATUS_RESET_DELAY_MS);
      }
    }
  }, [track, artist, durationSec, isLookingUp, onFound]);

  return { isLookingUp, lookupStatus, handleLookupIsrc };
}

// -- Exports ------------------------------------------------------------------

export { useIsrcLookup };

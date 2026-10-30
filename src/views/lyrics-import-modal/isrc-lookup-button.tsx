import { useIsrcLookup } from "@/views/lyrics-import-modal/use-isrc-lookup";
import { IconCheck, IconLoader2, IconSparkles } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface IsrcLookupButtonProps {
  track: string;
  artist: string;
  durationSec?: number;
  onFound: (isrc: string) => void;
}

// -- Component ----------------------------------------------------------------

const IsrcLookupButton: React.FC<IsrcLookupButtonProps> = ({ track, artist, durationSec, onFound }) => {
  const { isLookingUp, lookupStatus, handleLookupIsrc } = useIsrcLookup({
    track,
    artist,
    durationSec,
    onFound,
  });

  const hasTrack = Boolean(track.trim());

  if (isLookingUp) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-composer-text-muted font-normal select-none">
        <IconLoader2 className="size-3 opacity-70 motion-safe:animate-spin" />
        Finding...
      </span>
    );
  }

  if (lookupStatus === "Found") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium select-none">
        <IconCheck className="size-3" />
        Found
      </span>
    );
  }

  if (lookupStatus === "Not found") {
    return <span className="text-[11px] text-amber-400/90 font-normal select-none">Not found on MusicBrainz</span>;
  }

  if (lookupStatus === "Error") {
    return <span className="text-[11px] text-composer-negative/90 font-normal select-none">Network error</span>;
  }

  return (
    <button
      type="button"
      disabled={!hasTrack}
      onClick={handleLookupIsrc}
      className="flex items-center gap-1 text-[11px] text-composer-accent-text hover:underline disabled:opacity-35 disabled:no-underline disabled:cursor-not-allowed cursor-pointer transition-opacity"
      title={hasTrack ? "Look up ISRC from MusicBrainz" : "Enter a track name to find ISRC"}
    >
      <IconSparkles className="size-3 opacity-80" />
      Find ISRC
    </button>
  );
};

// -- Exports ------------------------------------------------------------------

export { IsrcLookupButton };

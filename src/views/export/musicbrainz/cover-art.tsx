import { cn } from "@/utils/cn";
import { releaseGroupCoverUrl } from "@/views/export/musicbrainz/musicbrainz-links";
import { IconMusic } from "@tabler/icons-react";
import { useState } from "react";

// -- Interfaces ---------------------------------------------------------------

interface CoverArtProps {
  releaseGroupId: string | null;
  className?: string;
}

// -- Component ----------------------------------------------------------------

const CoverArt: React.FC<CoverArtProps> = ({ releaseGroupId, className }) => {
  const [failed, setFailed] = useState(false);
  const [prevId, setPrevId] = useState(releaseGroupId);

  if (prevId !== releaseGroupId) {
    setPrevId(releaseGroupId);
    setFailed(false);
  }

  if (!releaseGroupId || failed) {
    return (
      <span
        aria-hidden="true"
        className={cn("grid place-items-center size-full text-composer-text opacity-40 select-none", className)}
      >
        <IconMusic className="size-1/2" stroke={1.75} />
      </span>
    );
  }

  return (
    <span className={cn("relative grid place-items-center size-full overflow-hidden", className)}>
      <IconMusic aria-hidden="true" className="size-1/2 text-composer-text opacity-40 select-none" stroke={1.75} />
      <img
        src={releaseGroupCoverUrl(releaseGroupId)}
        alt=""
        loading="lazy"
        crossOrigin="anonymous"
        onError={() => setFailed(true)}
        className="absolute inset-0 size-full rounded-[inherit] object-cover outline outline-1 -outline-offset-1 outline-white/10 select-none"
      />
    </span>
  );
};

// -- Exports ------------------------------------------------------------------

export { CoverArt };

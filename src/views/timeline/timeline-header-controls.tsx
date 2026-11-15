import { IconButton } from "@/ui/icon-button";
import { INPUT_STYLES } from "@/ui/input-styles";
import { KEEPS_POPOVERS_OPEN_PROPS } from "@/ui/keeps-popovers-open";
import { nextFrame } from "@/lib/frame-loop";
import { cn } from "@/utils/cn";
import { MAX_ZOOM, MIN_ZOOM, useTimelineStore } from "@/views/timeline/timeline-store";
import { useTimelineZoom } from "@/views/timeline/use-timeline-zoom";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

// The old zoom cap stays 100%, so the label keeps its meaning past it.
const ZOOM_AT_100_PERCENT = 500;

const TimelineZoomControls: React.FC<{ scrollContainerRef?: React.RefObject<HTMLDivElement | null> }> = ({
  scrollContainerRef,
}) => {
  const zoom = useTimelineStore((s) => s.zoom);
  const storeZoomIn = useTimelineStore((s) => s.zoomIn);
  const storeZoomOut = useTimelineStore((s) => s.zoomOut);
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const anchoredZoom = useTimelineZoom(scrollContainerRef ?? fallbackRef);
  const zoomIn = scrollContainerRef ? anchoredZoom.zoomIn : storeZoomIn;
  const zoomOut = scrollContainerRef ? anchoredZoom.zoomOut : storeZoomOut;
  const applyZoom = scrollContainerRef ? anchoredZoom.applyZoom : useTimelineStore.getState().setZoom;

  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const zoomPercent = Math.round(((zoom - MIN_ZOOM) / (ZOOM_AT_100_PERCENT - MIN_ZOOM)) * 100);

  useEffect(() => {
    if (isEditing) {
      setInputValue(String(zoomPercent));
      nextFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing, zoomPercent]);

  const commit = () => {
    setIsEditing(false);
    const parsed = Number.parseInt(inputValue.replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(parsed)) return;
    const clampedPct = Math.max(0, parsed);
    const targetZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.round(MIN_ZOOM + (clampedPct / 100) * (ZOOM_AT_100_PERCENT - MIN_ZOOM))),
    );
    applyZoom(targetZoom);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsEditing(false);
    }
  };

  return (
    <div className="tray" data-guide-spot="zoom" {...KEEPS_POPOVERS_OPEN_PROPS}>
      <IconButton
        label="Zoom out"
        icon={<IconMinus size={18} />}
        variant="ghost"
        onClick={zoomOut}
        disabled={zoom <= MIN_ZOOM}
        className="size-7 hover:bg-(--layer-2) hover:text-composer-text"
      />

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={cn(
            INPUT_STYLES,
            "w-12 h-6 px-1 py-0 text-center font-mono text-xs text-composer-accent-text tabular-nums",
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          title="Click to edit zoom percentage"
          className="min-w-11 h-6 px-1 rounded flex items-center justify-center font-mono text-xs text-composer-accent-text select-none tabular-nums hover:bg-(--layer-2) hover:text-composer-text cursor-pointer transition-colors"
        >
          {zoomPercent}%
        </button>
      )}

      <IconButton
        label="Zoom in"
        icon={<IconPlus size={18} />}
        variant="ghost"
        onClick={zoomIn}
        disabled={zoom >= MAX_ZOOM}
        className="size-7 hover:bg-(--layer-2) hover:text-composer-text"
      />
    </div>
  );
};

export { TimelineZoomControls };

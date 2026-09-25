import { GUTTER_WIDTH, timeToX } from "@/views/timeline/coords";
import { useTimelineStore } from "@/views/timeline/timeline-store";
import { useEffect, useRef } from "react";

// -- Types --------------------------------------------------------------------

interface SnapGuidelineProps {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

// -- Component ----------------------------------------------------------------

const SnapGuideline: React.FC<SnapGuidelineProps> = ({ scrollContainerRef }) => {
  const snappedAnchorTime = useTimelineStore((s) => s.snappedAnchorTime);
  const zoom = useTimelineStore((s) => s.zoom);
  const lineRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const line = lineRef.current;
      if (line && snappedAnchorTime !== null) {
        const scrollLeft = scrollContainerRef.current?.scrollLeft ?? useTimelineStore.getState().scrollLeft;
        line.style.left = `${timeToX(snappedAnchorTime, zoom, scrollLeft)}px`;
      }
      rafRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [snappedAnchorTime, zoom, scrollContainerRef]);

  if (snappedAnchorTime === null) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden z-40"
      style={{ clipPath: `inset(0 0 0 ${GUTTER_WIDTH}px)` }}
    >
      <div
        ref={lineRef}
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          width: 0,
          borderLeft: "1px dashed color-mix(in srgb, var(--color-composer-snap) 70%, transparent)",
        }}
      />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { SnapGuideline };

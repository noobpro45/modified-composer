import type { LinkGroup } from "@/stores/project";
import { cn } from "@/utils/cn";
import { useTimelineStore } from "@/views/timeline/timeline-store";
import { IconChevronDown, IconChevronRight, IconLink } from "@tabler/icons-react";
import { memo } from "react";

// -- Types ---------------------------------------------------------------------

interface GroupBannerProps {
  group: LinkGroup;
  instanceIdx: number;
  totalInstances: number;
  instanceStart: number;
  instanceEnd: number;
  isCollapsed: boolean;
  zoom: number;
  scrollLeft: number;
}

// -- Constants -----------------------------------------------------------------

const BANNER_VERTICAL_INSET = 4;
const BANNER_MIN_WIDTH = 80;

// -- Component -----------------------------------------------------------------

const GroupBannerComponent: React.FC<GroupBannerProps> = ({
  group,
  instanceIdx,
  totalInstances,
  instanceStart,
  instanceEnd,
  isCollapsed,
  zoom,
  scrollLeft,
}) => {
  const pingingGroupId = useTimelineStore((s) => s.pingingGroupId);
  const isPinging = pingingGroupId === group.id;

  const left = Math.max(0, instanceStart * zoom - scrollLeft);
  const width = Math.max(BANNER_MIN_WIDTH, (instanceEnd - instanceStart) * zoom);

  return (
    <div
      data-banner-progress=""
      data-instance-key={`${group.id}:${instanceIdx}`}
      data-instance-start={instanceStart}
      data-instance-end={instanceEnd}
      className={cn(
        "absolute flex items-center gap-2 rounded-[9px] cursor-grab select-none px-2.5",
        "border text-[10px] font-medium text-composer-text z-[45]",
        "transition-[box-shadow,background] duration-150",
        isPinging && "ring-2 ring-offset-0",
      )}
      style={{
        left,
        width,
        top: BANNER_VERTICAL_INSET,
        bottom: BANNER_VERTICAL_INSET,
        background: `color-mix(in srgb, ${group.color} 18%, transparent)`,
        borderColor: `color-mix(in srgb, ${group.color} 60%, transparent)`,
        ["--ring-color" as string]: group.color,
      }}
    >
      {isCollapsed ? (
        <IconChevronRight className="w-3 h-3 shrink-0 opacity-70" />
      ) : (
        <IconChevronDown className="w-3 h-3 shrink-0 opacity-70" />
      )}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: group.color }}
        aria-hidden
      />
      <span className="font-semibold whitespace-nowrap">{group.label}</span>
      <span className="flex items-center gap-1 text-composer-text-muted tabular-nums whitespace-nowrap ml-auto">
        <IconLink className="w-2.5 h-2.5" />
        {instanceIdx + 1} of {totalInstances}
      </span>
      {isCollapsed && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-[9px] pointer-events-none overflow-hidden"
          style={{
            background: `linear-gradient(to right, color-mix(in srgb, ${group.color} 35%, transparent) var(--progress-fill, 0%), transparent var(--progress-fill, 0%))`,
          }}
        />
      )}
    </div>
  );
};

const GroupBanner = memo(GroupBannerComponent);

// -- Exports -------------------------------------------------------------------

export { GroupBanner };
export type { GroupBannerProps };

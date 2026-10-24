import { useSeparationStore } from "@/stores/separation";
import { useSettingsStore } from "@/stores/settings";
import { Button } from "@/ui/button";
import { Popover } from "@/ui/popover";
import { SegmentedControl } from "@/ui/segmented-control";
import { Slider } from "@/ui/slider";
import { STEMS, STEM_ICONS, STEM_LABELS } from "@/ui/stem-labels";
import { ToggleButton } from "@/ui/toggle-button";
import { cn } from "@/utils/cn";
import { normalizeWheelDelta } from "@/views/timeline/timeline-wheel";
import { IconChartHistogram, IconRotate2, IconWaveSine } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// -- Constants -----------------------------------------------------------------

const MIN_GAIN = 0.5;
const MAX_GAIN = 8.0;
const STEP_GAIN = 0.25;
const WHEEL_THRESHOLD_PX = 80;
const WHEEL_IDLE_TIMEOUT_MS = 200;

const VISUALIZATION_OPTIONS = [
  { value: "waveform" as const, label: "Wave", icon: IconWaveSine },
  { value: "spectrogram" as const, label: "Spectrogram", icon: IconChartHistogram },
];

// -- Helpers -------------------------------------------------------------------

function clampGain(value: number): number {
  return Math.max(MIN_GAIN, Math.min(MAX_GAIN, Math.round(value / STEP_GAIN) * STEP_GAIN));
}

// -- Component -----------------------------------------------------------------

const TimelineVisualizationCorner: React.FC = () => {
  const visualization = useSettingsStore((s) => s.timelineVisualization);
  const gain = useSettingsStore((s) => s.spectrogramGain);
  const setSetting = useSettingsStore((s) => s.set);

  const availableStems = useSeparationStore((s) => s.availableStems);
  const currentStem = useSeparationStore((s) => s.currentStem);
  const visualizationStem = useSeparationStore((s) => s.visualizationStem);
  const selectVisualizationStem = useSeparationStore((s) => s.selectVisualizationStem);
  const effectiveStem = visualizationStem ?? currentStem;

  const containerRef = useRef<HTMLDivElement>(null);
  const accumulatedWheelRef = useRef(0);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const isSpectrogram = visualization === "spectrogram";

  const stemOptions = useMemo(
    () =>
      STEMS.map((stem) => ({
        value: stem,
        label: STEM_LABELS[stem],
        icon: STEM_ICONS[stem],
        disabled: !availableStems.includes(stem),
      })),
    [availableStems],
  );

  const handleGainChange = useCallback(
    (nextGain: number) => {
      setSetting("spectrogramGain", clampGain(nextGain));
    },
    [setSetting],
  );

  const handleToggleVisualization = useCallback(
    (mode: "waveform" | "spectrogram") => {
      setSetting("timelineVisualization", mode);
    },
    [setSetting],
  );

  // Wheel listener for scrolling over the corner box
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!isSpectrogram) return;
      e.preventDefault();
      e.stopPropagation();

      const delta = normalizeWheelDelta(e.deltaY, e.deltaMode);
      accumulatedWheelRef.current += delta;

      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        accumulatedWheelRef.current = 0;
      }, WHEEL_IDLE_TIMEOUT_MS);

      if (Math.abs(accumulatedWheelRef.current) >= WHEEL_THRESHOLD_PX) {
        const direction = accumulatedWheelRef.current < 0 ? 1 : -1;
        accumulatedWheelRef.current = 0;
        const currentGain = useSettingsStore.getState().spectrogramGain;
        handleGainChange(currentGain + direction * STEP_GAIN);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
    };
  }, [isSpectrogram, handleGainChange]);

  const triggerTitle = isSpectrogram
    ? `Spectrogram (Gain: ${gain.toFixed(2)}x, ${STEM_LABELS[effectiveStem]}). Scroll wheel to adjust, click for menu.`
    : `Waveform (${STEM_LABELS[effectiveStem]}). Click to configure.`;

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 z-100 w-12 h-20 border-b border-r-2 border-(--divider) bg-(--gutter-bg) grid place-items-center select-none"
    >
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-start"
        offsetPx={6}
        trigger={
          <button
            type="button"
            title={triggerTitle}
            aria-label={triggerTitle}
            className={cn(
              "w-full h-full flex flex-col items-center justify-center gap-1 transition-colors outline-none cursor-pointer",
              "hover:bg-(--overlay-hover) focus-visible:ring-1 focus-visible:ring-(--accent)",
              isSpectrogram ? "text-composer-accent" : "text-composer-text-faint hover:text-composer-text",
            )}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (isSpectrogram) handleGainChange(1.0);
            }}
          >
            {isSpectrogram ? (
              <>
                <IconChartHistogram aria-hidden="true" className="size-4.5" />
                <span className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-(--well) text-composer-accent leading-none border border-(--divider)">
                  {gain.toFixed(1)}x
                </span>
              </>
            ) : (
              <IconWaveSine aria-hidden="true" className="size-4" />
            )}
          </button>
        }
      >
        <div className="w-80 p-3 bg-(--elevated) border border-(--divider) rounded-xl shadow-xl flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-composer-text-muted">Audio Display</span>
            <SegmentedControl
              aria-label="Audio display mode"
              value={visualization}
              options={VISUALIZATION_OPTIONS}
              onChange={handleToggleVisualization}
              className="flex w-full [&>button]:flex-1"
            />
          </div>

          <div className="flex flex-col gap-1.5 pt-2 border-t border-(--divider)">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-composer-text-muted">Display Source</span>
              {visualizationStem !== null && (
                <button
                  type="button"
                  onClick={() => selectVisualizationStem(null)}
                  className="text-[10px] text-composer-accent hover:underline cursor-pointer flex items-center gap-1"
                  title="Match playback source"
                >
                  <IconRotate2 className="size-3" />
                  Follow playback
                </button>
              )}
            </div>
            <SegmentedControl
              size="sm"
              aria-label="Display audio source"
              value={effectiveStem}
              options={stemOptions}
              onChange={selectVisualizationStem}
              className="flex w-full [&>button]:flex-1"
            />
          </div>

          {isSpectrogram && (
            <div className="flex flex-col gap-2 pt-2 border-t border-(--divider)">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-composer-text-muted">Spectrogram Gain</span>
                <span className="font-mono font-semibold text-composer-accent">{gain.toFixed(2)}x</span>
              </div>

              <Slider
                min={MIN_GAIN}
                max={MAX_GAIN}
                step={STEP_GAIN}
                value={gain}
                onChange={handleGainChange}
                aria-label="Spectrogram Gain"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-1">
                  {[0.5, 1.0, 2.0, 4.0].map((preset) => (
                    <ToggleButton
                      key={preset}
                      pressed={gain === preset}
                      size="sm"
                      className="px-1.5 py-0.5 h-6 text-[10px] font-mono"
                      onClick={() => handleGainChange(preset)}
                    >
                      {preset}x
                    </ToggleButton>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-[11px] text-composer-text-muted flex items-center gap-1"
                  title="Reset to 1.0x"
                  onClick={() => handleGainChange(1.0)}
                >
                  <IconRotate2 className="size-3" />
                  Reset
                </Button>
              </div>

              <span className="text-[10px] text-composer-text-faint text-center pt-0.5">
                Tip: Scroll over corner box to adjust
              </span>
            </div>
          )}
        </div>
      </Popover>
    </div>
  );
};

// -- Exports -------------------------------------------------------------------

export { TimelineVisualizationCorner };

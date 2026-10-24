import { useFrameLoop } from "@/hooks/use-frame-loop";
import { useAudioStore } from "@/stores/audio";
import { useSeparationStore } from "@/stores/separation";
import { useSettingsStore } from "@/stores/settings";
import { useThemeStore } from "@/stores/theme";
import { cn } from "@/utils/cn";
import { readToken } from "@/utils/theme/read-token";
import { startLoopRegionDrag } from "@/views/timeline/loop-region-drag";
import { LoopRegionEdges } from "@/views/timeline/loop-region-edges";
import { placeSnapPoint } from "@/views/timeline/place-snap-point";
import { snapPlayheadTime } from "@/views/timeline/playhead-snap";
import { clearLoopRegion } from "@/views/timeline/selection-playback";
import { SpectrogramUnplayedOverlay } from "@/views/timeline/spectrogram-unplayed-overlay";
import { WAVEFORM_HEIGHT, useTimelineStore } from "@/views/timeline/timeline-store";
import { useTimelineSpectrogram } from "@/views/timeline/use-timeline-spectrogram";
import { WaveformFocusShade } from "@/views/timeline/waveform-focus-shade";
import WavesurferPlayer from "@wavesurfer/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";

// -- Constants -----------------------------------------------------------------

const FADE_SETTLE_MS = 260;
// The bars sit in a 13px margin inside the 80px band.
const WAVEFORM_BARS_HEIGHT = 54;

// -- Component -----------------------------------------------------------------

const TimelineWaveform: React.FC = () => {
  const source = useAudioStore((s) => s.source);
  const duration = useAudioStore((s) => s.duration);
  const audioElement = useAudioStore((s) => s.audioElement);
  const seekTo = useAudioStore((s) => s.seekTo);

  const zoom = useTimelineStore((s) => s.zoom);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const markerMode = useTimelineStore((s) => s.markerMode);
  const visualization = useSettingsStore((s) => s.timelineVisualization);

  const currentStem = useSeparationStore((s) => s.currentStem);
  const visualizationStem = useSeparationStore((s) => s.visualizationStem);
  const effectiveStem = visualizationStem ?? currentStem;
  const stemUrls = useSeparationStore((s) => s.stemUrls);
  const originalUrlRef = useRef<string | null>(null);

  if (effectiveStem === "original" && audioElement?.src) {
    originalUrlRef.current = audioElement.src;
  }

  const activeStemUrl = effectiveStem !== "original" ? (stemUrls[effectiveStem] ?? null) : null;
  const activeAudioSrc = activeStemUrl ?? originalUrlRef.current ?? audioElement?.src ?? "";

  const isSpectrogram = visualization === "spectrogram";
  const trackHeight = isSpectrogram ? WAVEFORM_HEIGHT - 1 : WAVEFORM_BARS_HEIGHT;
  const [ws, setWs] = useState<WaveSurfer | null>(null);
  const [settledFor, setSettledFor] = useState<WaveSurfer | null>(null);
  const [altHeld, setAltHeld] = useState(false);
  const progressWrapperRef = useRef<HTMLElement | null>(null);

  const { gainComputing } = useTimelineSpectrogram({ ws, isSpectrogram, trackHeight });

  // Never move this into an effect: opacity and the sweep gate must land in the same commit.
  const sweeping = ws === null || settledFor !== ws || gainComputing;
  const totalWidth = duration > 0 ? duration * zoom : 0;
  const waveformKey = `${effectiveStem}-${activeAudioSrc || "no-audio"}-${visualization}`;

  const [initialColors] = useState(() => ({ wave: readToken("wave"), progress: readToken("wave-progress") }));
  const [initialZoom] = useState(() => useTimelineStore.getState().zoom);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeThemeId re-applies DOM-resolved colors on theme change
  useEffect(() => {
    if (!ws || isSpectrogram) return;
    ws.setOptions({ waveColor: readToken("wave"), progressColor: readToken("wave-progress") });
  }, [ws, activeThemeId, isSpectrogram]);

  useFrameLoop(() => {
    if (isSpectrogram || !progressWrapperRef.current || duration <= 0) return;
    const audio = useAudioStore.getState().audioElement;
    if (!audio) return;
    const pct = Math.max(0, Math.min(100, (audio.currentTime / duration) * 100));
    progressWrapperRef.current.style.width = `${pct}%`;
  }, "timeline-waveform-progress");

  useEffect(() => {
    if (!audioElement) return;
    const sync = () => {
      if (isSpectrogram || !progressWrapperRef.current || duration <= 0) return;
      const pct = Math.max(0, Math.min(100, (audioElement.currentTime / duration) * 100));
      progressWrapperRef.current.style.width = `${pct}%`;
    };
    audioElement.addEventListener("seeking", sync);
    audioElement.addEventListener("seeked", sync);
    return () => {
      audioElement.removeEventListener("seeking", sync);
      audioElement.removeEventListener("seeked", sync);
    };
  }, [audioElement, isSpectrogram, duration]);

  useEffect(() => {
    if (!ws) return;
    ws.setOptions({ minPxPerSec: zoom });
  }, [ws, zoom]);

  useEffect(() => {
    if (!ws) return;
    const timer = setTimeout(() => setSettledFor(ws), FADE_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ws]);

  const timeFromClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) =>
      ((e.clientX - e.currentTarget.getBoundingClientRect().left) / totalWidth) * duration,
    [duration, totalWidth],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!duration || totalWidth <= 0) return;
      const time = timeFromClick(e);
      if (useTimelineStore.getState().markerMode) {
        if (e.detail <= 1) placeSnapPoint(time);
      } else if (e.altKey) {
        placeSnapPoint(time);
      } else {
        clearLoopRegion();
        seekTo(snapPlayheadTime(time, e.metaKey));
      }
    },
    [duration, totalWidth, timeFromClick, seekTo],
  );

  const onDestroy = useCallback(() => {
    setWs(null);
    progressWrapperRef.current = null;
    setSettledFor(null);
  }, []);

  const onReady = useCallback(
    (wavesurfer: WaveSurfer) => {
      setWs(wavesurfer);
      const el = wavesurfer.getWrapper()?.querySelector<HTMLElement>(".progress") ?? null;
      progressWrapperRef.current = el;
      const audio = useAudioStore.getState().audioElement;
      if (audio && audio.currentTime > 0 && duration > 0) {
        if (el) el.style.width = `${Math.min(100, Math.max(0, (audio.currentTime / duration) * 100))}%`;
      }
    },
    [duration],
  );

  if (!source) return null;

  return (
    <div className="sticky ml-12 top-0 z-40 bg-(--well) w-max" style={{ minHeight: WAVEFORM_HEIGHT }}>
      <div
        data-waveform-redraw-bg
        className="absolute top-0 left-0 bg-(--well) border-b border-(--divider) pointer-events-none"
        style={{ width: totalWidth, height: WAVEFORM_HEIGHT }}
      />
      <div
        data-waveform-loading-dots
        data-sweeping={sweeping ? "" : undefined}
        aria-hidden="true"
        className="absolute top-0 left-0 waveform-loading-dots pointer-events-none transition-opacity duration-200 ease-out"
        style={{ width: totalWidth, height: WAVEFORM_HEIGHT - 1, opacity: sweeping ? 1 : 0 }}
      />
      {audioElement && (
        <div
          data-waveform-fade
          className={cn(isSpectrogram ? "pt-0" : "pt-[13px]", "transition-opacity duration-150 ease-in")}
          style={{ opacity: ws ? (gainComputing ? 0.45 : 1) : 0 }}
        >
          <WavesurferPlayer
            key={waveformKey}
            url={activeAudioSrc || undefined}
            height={trackHeight}
            sampleRate={isSpectrogram ? 44100 : 8000}
            waveColor={isSpectrogram ? "transparent" : initialColors.wave}
            progressColor={isSpectrogram ? "transparent" : initialColors.progress}
            cursorColor="transparent"
            barWidth={isSpectrogram ? undefined : 2}
            barGap={isSpectrogram ? undefined : 1}
            barRadius={isSpectrogram ? undefined : 12}
            interact={false}
            hideScrollbar={true}
            fillParent={false}
            minPxPerSec={initialZoom}
            autoScroll={false}
            autoCenter={false}
            onDestroy={onDestroy}
            onReady={onReady}
          />
        </div>
      )}
      {isSpectrogram && ws && (
        <SpectrogramUnplayedOverlay
          totalWidth={totalWidth}
          height={WAVEFORM_HEIGHT - 1}
          zoom={zoom}
          hidden={gainComputing}
        />
      )}
      <WaveformFocusShade />
      <div
        role="button"
        tabIndex={-1}
        aria-label={markerMode ? "Place snap point" : "Seek to position"}
        className={cn(
          "absolute top-0 left-0 z-10",
          markerMode ? "waveform-armed" : altHeld ? "cursor-crosshair" : "cursor-pointer",
        )}
        key="waveform-click-layer"
        style={{ width: totalWidth, height: WAVEFORM_HEIGHT - 1 }}
        onMouseDown={(e) => {
          if (useTimelineStore.getState().pasteMode.status === "preview") return;
          const container = e.currentTarget.closest<HTMLElement>("[data-scroll-container]");
          if (container) startLoopRegionDrag(e, container, null);
        }}
        onClick={handleClick}
        onPointerMove={(e) => setAltHeld(e.altKey)}
        onKeyDown={() => {}}
      />
      <LoopRegionEdges />
    </div>
  );
};

// -- Exports -------------------------------------------------------------------

export { FADE_SETTLE_MS, TimelineWaveform };

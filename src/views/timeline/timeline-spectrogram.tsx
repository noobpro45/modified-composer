import { useAudioStore } from "@/stores/audio";
import { useTimelineStore } from "@/views/timeline/timeline-store";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useThemeStore } from "@/stores/theme";
import { readToken } from "@/utils/theme/read-token";
import { useSpectrogramWorker } from "@/lib/spectrogram/hooks/useSpectrogramWorker";
import { cn } from "@/utils/cn";
import { snapPlayheadTime } from "@/views/timeline/playhead-snap";
import { snapTimeToOnset } from "@/views/timeline/snap-marker-math";
import { useSettingsStore } from "@/stores/settings";
import { useProjectStore } from "@/stores/project";

const TILE_DURATION_S = 5;
const LOD_WIDTHS = [512, 1024, 2048, 4096, 8192];

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: Number.parseInt(result[1], 16),
        g: Number.parseInt(result[2], 16),
        b: Number.parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function interpolateRgb(color1: {r: number, g: number, b: number}, color2: {r: number, g: number, b: number}, factor: number) {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * factor),
    g: Math.round(color1.g + (color2.g - color1.g) * factor),
    b: Math.round(color1.b + (color2.b - color1.b) * factor),
  };
}

function generateThemePalette(bgHex: string, waveHex: string, accentHex: string) {
  const palette = new Uint8Array(256 * 4);
  const bg = hexToRgb(bgHex);
  const wave = hexToRgb(waveHex);
  const accent = hexToRgb(accentHex);

  for (let i = 0; i < 256; i++) {
    // Apply a gamma curve (exponent 1.5) to crush the noise floor,
    // resulting in a much cleaner looking spectrogram
    const normalized = i / 255;
    const curved = Math.pow(normalized, 1.5);
    const mapped = curved * 255;

    let color;
    if (mapped < 128) {
      color = interpolateRgb(bg, wave, mapped / 127);
    } else {
      color = interpolateRgb(wave, accent, (mapped - 128) / 127);
    }
    
    palette[i * 4] = color.r;
    palette[i * 4 + 1] = color.g;
    palette[i * 4 + 2] = color.b;
    palette[i * 4 + 3] = 255; // solid
  }
  return palette;
}

const TimelineSpectrogram: React.FC = () => {
  const source = useAudioStore((s) => s.source);
  const duration = useAudioStore((s) => s.duration);
  const audioElement = useAudioStore((s) => s.audioElement);
  const seekTo = useAudioStore((s) => s.seekTo);

  const zoom = useTimelineStore((s) => s.zoom);
  const scrollLeft = useTimelineStore((s) => s.scrollLeft);
  const markerMode = useTimelineStore((s) => s.markerMode);
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const spectrogramHeight = useSettingsStore((s) => s.spectrogramHeight);
  const spectrogramGain = useSettingsStore((s) => s.spectrogramGain);

  const containerRef = useRef<HTMLDivElement>(null);
  const [altHeld, setAltHeld] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  const totalWidth = duration > 0 ? duration * zoom : 0;

  useEffect(() => {
    if (!audioElement) return;

    const handleSrcChange = () => {
      setCurrentSrc(audioElement.currentSrc || audioElement.src || null);
    };

    // Initial setting
    handleSrcChange();

    const observer = new MutationObserver(() => {
      handleSrcChange();
    });
    observer.observe(audioElement, { attributes: true, attributeFilter: ["src"] });

    audioElement.addEventListener("loadstart", handleSrcChange);
    audioElement.addEventListener("emptied", handleSrcChange);

    return () => {
      observer.disconnect();
      audioElement.removeEventListener("loadstart", handleSrcChange);
      audioElement.removeEventListener("emptied", handleSrcChange);
    };
  }, [audioElement]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAudio() {
      if (!currentSrc || currentSrc === window.location.href) {
        setAudioBuffer(null);
        return;
      }
      try {
        const response = await fetch(currentSrc);
        const arrayBuffer = await response.arrayBuffer();
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        if (!isCancelled) {
          setAudioBuffer(decoded);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to decode audio for spectrogram:", err);
        }
      }
    }

    loadAudio();

    return () => {
      isCancelled = true;
    };
  }, [currentSrc]);

  const palette = useMemo(() => {
    const bgHex = readToken("bg-dark") || "#000000";
    const waveHex = readToken("wave") || "#1DB954";
    const accentHex = readToken("accent") || "#ffffff";
    return generateThemePalette(bgHex, waveHex, accentHex);
  }, [activeThemeId]);

  const { tileCache, requestTileIfNeeded } = useSpectrogramWorker(audioBuffer, palette);

  const [visibleTiles, setVisibleTiles] = useState<number[]>([]);

  useEffect(() => {
    if (!containerRef.current || duration <= 0) return;
    
    const pixelsPerSecond = zoom;
    const tileDisplayWidthPx = TILE_DURATION_S * pixelsPerSecond;
    const totalTiles = Math.ceil((duration || 0) / TILE_DURATION_S);

    const startX = Math.max(0, scrollLeft - tileDisplayWidthPx * 2);
    const endX = scrollLeft + window.innerWidth + tileDisplayWidthPx * 2;
    const startTile = Math.max(0, Math.floor(startX / tileDisplayWidthPx));
    const endTile = Math.min(totalTiles - 1, Math.floor(endX / tileDisplayWidthPx));

    const tilesToRender = [];
    for (let i = startTile; i <= endTile; i++) {
      tilesToRender.push(i);
      const targetLodWidth = LOD_WIDTHS.find((w) => w >= tileDisplayWidthPx) || LOD_WIDTHS[LOD_WIDTHS.length - 1];
      
      requestTileIfNeeded({
        tileIndex: i,
        startTime: i * TILE_DURATION_S,
        endTime: (i + 1) * TILE_DURATION_S,
        tileWidthPx: targetLodWidth,
        height: spectrogramHeight,
        gain: spectrogramGain,
        paletteId: activeThemeId || "default",
      });
    }
    setVisibleTiles(tilesToRender);
  }, [duration, zoom, totalWidth, requestTileIfNeeded, activeThemeId, audioBuffer, scrollLeft, spectrogramHeight, spectrogramGain]);

  // -- Interaction (copy from TimelineWaveform) ----------------------------
  const timeFromClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      return (x / totalWidth) * duration;
    },
    [duration, totalWidth],
  );

  const addSnappedPoint = useCallback((time: number) => {
    const { zoom: currentZoom, vocalOnsetSnapPoints } = useTimelineStore.getState();
    const { vocalOnsetSnap, timelineSnapThreshold } = useSettingsStore.getState();
    const onsets = vocalOnsetSnap ? vocalOnsetSnapPoints : [];
    useProjectStore.getState().addCustomSnapPoint(snapTimeToOnset(time, onsets, currentZoom, timelineSnapThreshold));
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!duration || totalWidth <= 0) return;
      const time = timeFromClick(e);
      if (useTimelineStore.getState().markerMode) {
        if (e.detail <= 1) addSnappedPoint(time);
        return;
      }
      if (e.altKey) {
        addSnappedPoint(time);
        return;
      }
      seekTo(snapPlayheadTime(time, e.metaKey));
    },
    [duration, totalWidth, timeFromClick, addSnappedPoint, seekTo],
  );

  if (!source) return null;

  return (
    <div 
      className="sticky ml-12 top-0 z-40 bg-composer-bg w-max group" 
      ref={containerRef}
      style={{ height: spectrogramHeight }}
    >
      <div
        data-waveform-redraw-bg
        className="absolute top-0 left-0 bg-composer-bg border-b border-composer-border shadow-lg pointer-events-none"
        style={{ width: totalWidth, height: spectrogramHeight }}
      />
      <div
        data-waveform-loading-dots
        aria-hidden="true"
        className="absolute top-0 left-0 waveform-loading-dots pointer-events-none transition-opacity duration-200 ease-out"
        style={{ width: totalWidth, height: spectrogramHeight - 1, opacity: audioBuffer ? 0 : 1 }}
      />
      
      {/* The Spectrogram Canvas Layer */}
      <div 
        className="absolute top-0 left-0 overflow-hidden pointer-events-none"
        style={{ width: totalWidth, height: spectrogramHeight - 1 }}
      >
        {visibleTiles.map((tileIndex) => {
          const cacheKey = `tile-${tileIndex}`;
          const entry = tileCache.current.get(cacheKey);
          if (!entry) return null;

          return (
            <SpectrogramTile
              key={cacheKey} // Remove lastTileTimestamp so it doesn't unmount and remount!
              bitmap={entry.bitmap}
              left={entry.startTime * zoom}
              width={(entry.endTime - entry.startTime) * zoom}
            />
          );
        })}
      </div>

      <div
        role="button"
        tabIndex={-1}
        aria-label={markerMode ? "Place snap point" : "Seek to position"}
        className={cn(
          "absolute top-0 left-0 z-10 transition-shadow duration-200 ease-out",
          markerMode ? "waveform-armed" : altHeld ? "cursor-crosshair" : "cursor-pointer",
        )}
        key="waveform-click-layer"
        style={{
          width: totalWidth,
          height: spectrogramHeight - 1,
        }}
        onClick={handleClick}
        onPointerMove={(e) => setAltHeld(e.altKey)}
        onKeyDown={() => {}}
      />
    </div>
  );
};

// We use a small sub-component to draw the ImageBitmap on a canvas
const SpectrogramTile: React.FC<{ bitmap: ImageBitmap; left: number; width: number }> = ({ bitmap, left, width }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, bitmap.width, bitmap.height);
    try {
      ctx.drawImage(bitmap, 0, 0);
    } catch (e) {
      if (e instanceof DOMException && e.name === "InvalidStateError") {
        // Bitmap was closed (likely due to cache eviction or source change), safely ignore
      } else {
        throw e;
      }
    }
  }, [bitmap]);

  return (
    <canvas
      ref={canvasRef}
      width={bitmap.width}
      height={bitmap.height}
      className="absolute top-0 origin-top-left"
      style={{ left, width, height: "100%" }}
    />
  );
};

export { TimelineSpectrogram };

import { useSettingsStore } from "@/stores/settings";
import { useThemeStore } from "@/stores/theme";
import { deriveSpectrogramColorMap } from "@/views/timeline/spectrogram-palette";
import { useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";
import SpectrogramPlugin from "wavesurfer.js/dist/plugins/spectrogram.js";

// -- Types ---------------------------------------------------------------------

interface UseTimelineSpectrogramOptions {
  ws: WaveSurfer | null;
  isSpectrogram: boolean;
  trackHeight: number;
}

interface SpectrogramHost {
  gainDB: number;
  isRendering: boolean;
  clearCache: () => void;
  render: () => Promise<void>;
}

// -- Helpers -------------------------------------------------------------------

function toggleWaveformVisibility(wrapper: HTMLElement | null | undefined, hide: boolean, height: number): void {
  if (!wrapper) return;
  const canvases = wrapper.querySelector<HTMLElement>(".canvases");
  const progress = wrapper.querySelector<HTMLElement>(".progress");
  if (canvases) Object.assign(canvases.style, { opacity: hide ? "0" : "", pointerEvents: hide ? "none" : "" });
  if (progress) Object.assign(progress.style, { opacity: hide ? "0" : "", pointerEvents: hide ? "none" : "" });
  wrapper.style.height = hide ? `${height}px` : "";
  if (wrapper.parentElement) wrapper.parentElement.style.height = hide ? `${height}px` : "";
}

// -- Hook ----------------------------------------------------------------------

function useTimelineSpectrogram({ ws, isSpectrogram, trackHeight }: UseTimelineSpectrogramOptions): {
  gainComputing: boolean;
} {
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  const spectrogramGain = useSettingsStore((s) => s.spectrogramGain);
  const pluginRef = useRef<SpectrogramPlugin | null>(null);
  const [gainComputing, setGainComputing] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: activeThemeId re-computes colormap on theme change
  useEffect(() => {
    if (!ws || !isSpectrogram) return;
    const sampleRate = ws.getDecodedData()?.sampleRate ?? 44100;
    const initialGain = useSettingsStore.getState().spectrogramGain;
    const gainDB = Math.round(20 * Math.log10(Math.max(0.1, initialGain)));
    const colorMap = deriveSpectrogramColorMap();
    const plugin = SpectrogramPlugin.create({
      height: trackHeight,
      scale: "mel",
      labels: false,
      frequencyMin: 60,
      frequencyMax: 0,
      sampleRate,
      preEmphasis: 4,
      rangeDB: 70,
      gainDB,
      colorMap,
      useWebWorker: true,
    });
    pluginRef.current = plugin;
    const pw = (plugin as unknown as { wrapper?: HTMLElement }).wrapper;
    if (pw)
      Object.assign(pw.style, { position: "absolute", top: "0", left: "0", width: "100%", height: `${trackHeight}px` });
    const existing = ws.getActivePlugins().find((p) => p instanceof SpectrogramPlugin);
    if (existing) ws.unregisterPlugin(existing);
    ws.registerPlugin(plugin);
    toggleWaveformVisibility(ws.getWrapper(), true, trackHeight);

    return () => {
      pluginRef.current = null;
      ws.unregisterPlugin(plugin);
      toggleWaveformVisibility(ws.getWrapper(), false, trackHeight);
    };
  }, [ws, isSpectrogram, activeThemeId, trackHeight]);

  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin || !isSpectrogram) return;
    const gainDB = Math.round(20 * Math.log10(Math.max(0.1, spectrogramGain)));
    const host = plugin as unknown as SpectrogramHost;
    host.gainDB = gainDB;
    let cancelled = false;
    setGainComputing(true);

    const timer = setTimeout(async () => {
      if (cancelled) return;
      host.clearCache();
      while (!cancelled) {
        if (!host.isRendering) {
          await host.render();
          break;
        }
        await new Promise((r) => setTimeout(r, 40));
      }
      if (!cancelled) setGainComputing(false);
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [spectrogramGain, isSpectrogram]);

  return { gainComputing };
}

// -- Exports -------------------------------------------------------------------

export { useTimelineSpectrogram };

import { useFrameLoop } from "@/hooks/use-frame-loop";
import { livePlaybackTime, useAudioStore } from "@/stores/audio";
import { useEffect, useRef } from "react";

// -- Types ---------------------------------------------------------------------

interface SpectrogramUnplayedOverlayProps {
  totalWidth: number;
  height: number;
  zoom: number;
  hidden?: boolean;
}

// -- Component -----------------------------------------------------------------

const SpectrogramUnplayedOverlay: React.FC<SpectrogramUnplayedOverlayProps> = ({
  totalWidth,
  height,
  zoom,
  hidden = false,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const audioElement = useAudioStore((s) => s.audioElement);

  useFrameLoop(() => {
    const audio = useAudioStore.getState().audioElement;
    if (!audio || !overlayRef.current) return;
    const playedX = Math.max(0, Math.min(totalWidth, audio.currentTime * zoom));
    overlayRef.current.style.clipPath = `inset(0 0 0 ${playedX}px)`;
  }, "spectrogram-unplayed-overlay");

  useEffect(() => {
    if (!audioElement) return;
    const sync = () => {
      if (!overlayRef.current) return;
      const playedX = Math.max(0, Math.min(totalWidth, audioElement.currentTime * zoom));
      overlayRef.current.style.clipPath = `inset(0 0 0 ${playedX}px)`;
    };
    sync();
    audioElement.addEventListener("seeking", sync);
    audioElement.addEventListener("seeked", sync);
    return () => {
      audioElement.removeEventListener("seeking", sync);
      audioElement.removeEventListener("seeked", sync);
    };
  }, [audioElement, totalWidth, zoom]);

  const initialPlayedX = livePlaybackTime() * zoom;

  return (
    <div
      ref={overlayRef}
      data-spectrogram-unplayed
      aria-hidden="true"
      className="absolute top-0 left-0 pointer-events-none z-10 transition-opacity duration-150 ease-out"
      style={{
        width: totalWidth,
        height,
        backdropFilter: "grayscale(100%)",
        WebkitBackdropFilter: "grayscale(100%)",
        clipPath: `inset(0 0 0 ${initialPlayedX}px)`,
        opacity: hidden ? 0 : 1,
      }}
    />
  );
};

// -- Exports -------------------------------------------------------------------

export { SpectrogramUnplayedOverlay };

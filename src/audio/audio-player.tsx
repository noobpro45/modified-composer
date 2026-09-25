import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { Button } from "@/ui/button";
import { Popover } from "@/ui/popover";
import { Slider } from "@/ui/slider";
import { VocalSeparationDropdown } from "@/ui/vocal-separation-dropdown";
import { formatTime } from "@/utils/format-time";
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconVolume, IconVolume2, IconVolume3 } from "@tabler/icons-react";
import { useCallback } from "react";

// -- Components ---------------------------------------------------------------

const PlayButton: React.FC<{ isPlaying: boolean; onClick: () => void }> = ({ isPlaying, onClick }) => (
  <Button onClick={onClick} className="size-10 rounded-full" aria-label={isPlaying ? "Pause" : "Play"}>
    {isPlaying ? <IconPlayerPauseFilled className="size-5" /> : <IconPlayerPlayFilled className="size-5" />}
  </Button>
);

const TimeDisplay: React.FC<{ current: number; duration: number }> = ({ current, duration }) => (
  <span className="font-mono text-sm select-text text-composer-text-secondary tabular-nums">
    {formatTime(current, 0)} / {formatTime(duration, 0)}
  </span>
);

const RATE_PRESETS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const RATE_MIN = 0.25;
const RATE_MAX = 2;
const RATE_STEP = 0.05;

const PlaybackRateControl: React.FC<{
  rate: number;
  onChangeRate: (rate: number) => void;
}> = ({ rate, onChangeRate }) => {
  const handleSliderChange = useCallback(
    (value: number) => {
      onChangeRate(Math.round(value * 100) / 100);
    },
    [onChangeRate],
  );

  const displayRate = rate.toFixed(2);

  return (
    <Popover
      placement="top-end"
      trigger={
        <Button variant="ghost" className="font-mono tabular-nums min-w-12">
          {displayRate}x
        </Button>
      }
    >
      <div className="p-3">
        <div className="flex gap-1 mb-3">
          {RATE_PRESETS.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant={rate === preset ? "primary" : "secondary"}
              onClick={() => onChangeRate(preset)}
              className="font-mono"
            >
              {preset}x
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-composer-text-muted">{RATE_MIN}x</span>
          <Slider
            value={rate}
            min={RATE_MIN}
            max={RATE_MAX}
            step={RATE_STEP}
            onChange={handleSliderChange}
            aria-label="Playback rate"
            className="w-full"
          />
          <span className="font-mono text-xs text-composer-text-muted">{RATE_MAX}x</span>
        </div>
      </div>
    </Popover>
  );
};

const VolumeControl: React.FC<{
  volume: number;
  isMuted: boolean;
  onChangeVolume: (volume: number) => void;
  onToggleMute: () => void;
}> = ({ volume, isMuted, onChangeVolume, onToggleMute }) => {
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return IconVolume3;
    if (volume < 0.5) return IconVolume2;
    return IconVolume;
  };

  const VolumeIcon = getVolumeIcon();
  const displayVolume = Math.round((isMuted ? 0 : volume) * 100);

  return (
    <Popover
      placement="top-end"
      trigger={
        <Button variant="ghost" size="icon" className="size-8" aria-label="Volume">
          <VolumeIcon className="size-4" />
        </Button>
      }
    >
      <div className="p-3 w-40">
        <div className="flex items-center gap-2 mb-2 justify-between pr-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={onToggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            <VolumeIcon className="size-4" />
          </Button>
          <span className="text-xs text-composer-text-muted tabular-nums w-8 text-right">{displayVolume}%</span>
        </div>
        <Slider
          value={isMuted ? 0 : volume}
          min={0}
          max={1}
          step={0.01}
          onChange={onChangeVolume}
          aria-label="Volume"
          className="w-full"
        />
      </div>
    </Popover>
  );
};

const AudioPlayer: React.FC = () => {
  const source = useAudioStore((s) => s.source);
  const seekTo = useAudioStore((s) => s.seekTo);
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const currentTime = useAudioStore((s) => s.currentTime);
  const duration = useAudioStore((s) => s.duration);
  const playbackRate = useAudioStore((s) => s.playbackRate);
  const volume = useAudioStore((s) => s.volume);
  const isMuted = useAudioStore((s) => s.isMuted);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);
  const setPlaybackRate = useAudioStore((s) => s.setPlaybackRate);
  const setVolume = useAudioStore((s) => s.setVolume);
  const toggleMute = useAudioStore((s) => s.toggleMute);
  const metadata = useProjectStore((s) => s.metadata);

  if (!source) return null;

  const displayTitle = metadata?.title || (source.type === "file" ? source.file.name : "Unknown Track");
  const displayArtist = metadata?.artist || "Unknown Artist";
  
  const thumbnailUrl = source.type === "youtube" 
    ? `https://img.youtube.com/vi/${source.videoId}/mqdefault.jpg`
    : null;

  return (
    <div className="flex items-center gap-4 p-2 pr-4 w-full select-none bg-composer-bg-dark/80 backdrop-blur-xl border-t border-white/10 z-50">
      {/* Metadata Section */}
      <div className="flex items-center gap-3 w-48 overflow-hidden shrink-0">
        <div className="size-10 rounded-sm bg-composer-bg overflow-hidden flex items-center justify-center shrink-0 border border-white/5">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-composer-accent/20 to-composer-accent/5" />
          )}
        </div>
        <div className="flex flex-col min-w-0 pr-2">
          <span className="text-sm font-medium text-composer-text truncate">{displayTitle}</span>
          <span className="text-xs text-composer-text-muted truncate">{displayArtist}</span>
        </div>
      </div>

      <div className="w-px h-8 bg-composer-border/50 shrink-0 mx-1" />

      {/* Controls Section */}
      <PlayButton isPlaying={isPlaying} onClick={() => setIsPlaying(!isPlaying)} />
      
      <TimeDisplay current={currentTime} duration={duration} />
      
      <div className="flex-1 px-2">
        <Slider
          value={currentTime}
          min={0}
          max={duration}
          onChange={seekTo}
          aria-label="Audio progress"
          className="w-full"
        />
      </div>

      <VolumeControl volume={volume} isMuted={isMuted} onChangeVolume={setVolume} onToggleMute={toggleMute} />
      <PlaybackRateControl rate={playbackRate} onChangeRate={setPlaybackRate} />
      <VocalSeparationDropdown />
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { AudioPlayer };

const ECHO_GRACE_MS = 400;

function bindAudioStateEvents(
  audio: HTMLAudioElement,
  getIsPlaying: () => boolean,
  setIsPlaying: (isPlaying: boolean) => void,
  getLastCommandTime: () => number = () => 0,
): () => void {
  const handlePlay = () => {
    if (getIsPlaying()) return;
    if (Date.now() - getLastCommandTime() < ECHO_GRACE_MS) return;
    setIsPlaying(true);
  };
  const handlePause = () => {
    if (!getIsPlaying()) return;
    if (Date.now() - getLastCommandTime() < ECHO_GRACE_MS) return;
    setIsPlaying(false);
  };
  audio.addEventListener("play", handlePlay);
  audio.addEventListener("pause", handlePause);
  return () => {
    audio.removeEventListener("play", handlePlay);
    audio.removeEventListener("pause", handlePause);
  };
}

export { bindAudioStateEvents, ECHO_GRACE_MS };


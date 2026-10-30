import { sharedAudioContext } from "@/audio/shared-audio-context";
import { useAudioStore } from "@/stores/audio";

const SNIPPET_S = 0.12;
const CROSSFADE_S = 0.008;

type ActiveSnippet = { time: number; rate: number };

let buffer: AudioBuffer | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;
let activeSnippet: ActiveSnippet | null = null;

function getContext(): AudioContext {
  const ctx = sharedAudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function fadeOutAndStop(source: AudioBufferSourceNode, gain: GainNode): void {
  const ctx = getContext();
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_S);
  source.stop(now + CROSSFADE_S);
}

function setClassicBuffer(next: AudioBuffer | null): void {
  stopClassic();
  buffer = next;
}

function playClassic(time: number, velocity: number): void {
  if (!buffer) return;

  const ctx = getContext();
  const maxStartTime = Math.max(0, buffer.duration - SNIPPET_S);
  const clampedTime = Math.max(0, Math.min(time, maxStartTime));

  if (currentSource && currentGain) {
    fadeOutAndStop(currentSource, currentGain);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  const now = ctx.currentTime;
  const audioState = useAudioStore.getState();
  const targetVolume = audioState.isMuted ? 0 : audioState.volume;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(targetVolume, now + CROSSFADE_S);

  source.connect(gain);
  gain.connect(ctx.destination);

  source.start(now, clampedTime, SNIPPET_S);

  currentSource = source;
  currentGain = gain;
  activeSnippet = { time: clampedTime, rate: velocity };

  source.onended = () => {
    if (currentSource === source) {
      currentSource = null;
      currentGain = null;
      activeSnippet = null;
    }
  };
}

function stopClassic(): void {
  if (currentSource && currentGain) {
    fadeOutAndStop(currentSource, currentGain);
  }
  currentSource = null;
  currentGain = null;
  activeSnippet = null;
}

function getClassicActiveSnippet(): ActiveSnippet | null {
  return activeSnippet;
}

export { getClassicActiveSnippet, playClassic, setClassicBuffer, stopClassic };

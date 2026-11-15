/// <reference lib="webworker" />

import { DspEngine, type PreparedChunk } from "@/audio/separation/roformer/dsp-engine";
import type { Spectrogram } from "@/audio/separation/stft";
import { describeError } from "@/audio/separation/worker-log";

declare const self: DedicatedWorkerGlobalScope;

// -- Types --------------------------------------------------------------------

type DspRequest =
  | { type: "load-song"; channels: Float32Array[]; frames: number }
  | { type: "prepare"; index: number }
  | { type: "begin-mix"; frames: number; channelCount: number }
  | { type: "mix"; index: number; length: number; specs: Spectrogram[]; masks: Float32Array }
  | { type: "end-mix" };

type DspReply = { id: number; ok: true; result?: unknown } | { id: number; ok: false; message: string };

// -- State --------------------------------------------------------------------

const engine = new DspEngine();

// -- Handlers -----------------------------------------------------------------

function handle(request: DspRequest): [unknown, Transferable[]] {
  switch (request.type) {
    case "load-song":
      engine.loadSong(request.channels, request.frames);
      return [undefined, []];
    case "prepare": {
      const chunk = engine.prepare(request.index);
      const buffers = chunk.specs.flatMap((s) => [s.real.buffer, s.imag.buffer]);
      return [chunk, [chunk.features.buffer, ...buffers]];
    }
    case "begin-mix":
      engine.beginMix(request.frames, request.channelCount);
      return [undefined, []];
    case "mix":
      engine.mix(request.index, request.length, request.specs, request.masks);
      return [undefined, []];
    case "end-mix": {
      const vocals = engine.endMix();
      return [vocals, vocals.map((c) => c.buffer)];
    }
  }
}

self.addEventListener("message", (ev: MessageEvent<DspRequest & { id: number }>) => {
  const { id, ...request } = ev.data;
  try {
    const [result, transfer] = handle(request);
    self.postMessage({ id, ok: true, result } satisfies DspReply, { transfer });
  } catch (err) {
    self.postMessage({ id, ok: false, message: describeError(err) } satisfies DspReply);
  }
});

// -- Exports ------------------------------------------------------------------

export type { DspReply, DspRequest, PreparedChunk };

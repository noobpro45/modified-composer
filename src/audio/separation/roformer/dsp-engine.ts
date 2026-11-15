import {
  addChunk,
  chunkAt,
  type DemixPlan,
  type DemixSum,
  demixPlan,
  demixSum,
  finishDemix,
  padSong,
} from "@/audio/separation/roformer/demix";
import { bandLayout } from "@/audio/separation/roformer/spec";
import { bandFeatures, chunkSpectrogram, maskedChannels } from "@/audio/separation/roformer/spectral";
import type { Spectrogram } from "@/audio/separation/stft";

// -- Types --------------------------------------------------------------------

interface PreparedChunk {
  specs: Spectrogram[];
  features: Float32Array;
  /** Song samples in the chunk; the rest is padding. */
  length: number;
}

// -- Engine -------------------------------------------------------------------

class DspEngine {
  private readonly layout = bandLayout();
  private song: { padded: Float32Array[]; starts: number[] } | null = null;
  private mixing: { plan: DemixPlan; acc: DemixSum; frames: number; next: number } | null = null;

  loadSong(channels: Float32Array[], frames: number): void {
    const plan = demixPlan(frames);
    this.song = { padded: padSong(channels, plan.pad), starts: plan.starts };
  }

  prepare(index: number): PreparedChunk {
    if (!this.song) throw new Error("No song is loaded.");
    const chunk = chunkAt(this.song.padded, this.song.starts[index]);
    const specs = chunk.channels.map(chunkSpectrogram);
    const features = bandFeatures(specs, this.layout);
    return { specs, features, length: chunk.length };
  }

  beginMix(frames: number, channelCount: number): void {
    const plan = demixPlan(frames);
    const acc = demixSum(frames + 2 * plan.pad, channelCount);
    this.mixing = { plan, acc, frames, next: 0 };
  }

  mix(index: number, length: number, specs: Spectrogram[], masks: Float32Array): void {
    if (!this.mixing) throw new Error("No mix is open.");
    if (index !== this.mixing.next)
      throw new Error(`Chunk ${index} arrived out of order (expected ${this.mixing.next}).`);
    if (masks.some((v) => !Number.isFinite(v))) throw new Error("The vocal model returned invalid values.");
    const { plan, acc } = this.mixing;
    addChunk(acc, maskedChannels(specs, masks, this.layout), plan.starts[index], length, plan.windows[index]);
    this.mixing.next += 1;
  }

  endMix(): Float32Array[] {
    if (!this.mixing) throw new Error("No mix is open.");
    const vocals = finishDemix(this.mixing.acc, this.mixing.plan.pad, this.mixing.frames);
    this.mixing = null;
    return vocals;
  }
}

// -- Exports ------------------------------------------------------------------

export type { PreparedChunk };
export { DspEngine };

import { DspEngine, type PreparedChunk } from "@/audio/separation/roformer/dsp-engine";
import type { DspReply, DspRequest } from "@/audio/separation/roformer/dsp-worker";
import type { Spectrogram } from "@/audio/separation/stft";

// -- Types --------------------------------------------------------------------

interface Pending {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
}

// -- Helpers ------------------------------------------------------------------

function shouldUseDirectDsp(): boolean {
  if (typeof Worker === "undefined") return true;
  if (typeof self !== "undefined" && self.location?.origin?.includes("wails.localhost")) return true;
  return false;
}

// -- Lane ---------------------------------------------------------------------

/** One DSP processor. Uses worker when supported, falls back to in-thread engine in Wails/desktop. */
class DspLane {
  private worker: Worker | null = null;
  private engine: DspEngine | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 0;
  private failure: Error | null = null;

  constructor(name: string) {
    if (shouldUseDirectDsp()) {
      this.engine = new DspEngine();
      return;
    }
    try {
      this.worker = new Worker(new URL("./dsp-worker.ts", import.meta.url), { type: "module", name });
      this.worker.addEventListener("message", (ev: MessageEvent<DspReply>) => this.onReply(ev.data));
      this.worker.addEventListener("error", (ev) => {
        ev.preventDefault();
        this.fail(new Error(`The audio worker crashed: ${ev.message || "it didn't start"}`));
      });
      this.worker.addEventListener("messageerror", () =>
        this.fail(new Error("The audio worker sent an unreadable message.")),
      );
    } catch {
      this.engine = new DspEngine();
    }
  }

  /** The first failure, if any. */
  get error(): Error | null {
    return this.failure;
  }

  loadSong(channels: Float32Array[], frames: number): Promise<void> {
    if (this.engine) {
      this.engine.loadSong(channels, frames);
      return Promise.resolve();
    }
    return this.call(
      { type: "load-song", channels, frames },
      channels.map((c) => c.buffer),
    ) as Promise<void>;
  }

  prepare(index: number): Promise<PreparedChunk> {
    if (this.engine) {
      try {
        return Promise.resolve(this.engine.prepare(index));
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return this.call({ type: "prepare", index }) as Promise<PreparedChunk>;
  }

  beginMix(frames: number, channelCount: number): Promise<void> {
    if (this.engine) {
      this.engine.beginMix(frames, channelCount);
      return Promise.resolve();
    }
    return this.call({ type: "begin-mix", frames, channelCount }) as Promise<void>;
  }

  mix(index: number, length: number, specs: Spectrogram[], masks: Float32Array): Promise<void> {
    if (this.engine) {
      try {
        this.engine.mix(index, length, specs, masks);
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    const transfer = [masks.buffer, ...specs.flatMap((spec) => [spec.real.buffer, spec.imag.buffer])];
    return this.call({ type: "mix", index, length, specs, masks }, transfer) as Promise<void>;
  }

  endMix(): Promise<Float32Array[]> {
    if (this.engine) {
      try {
        return Promise.resolve(this.engine.endMix());
      } catch (err) {
        return Promise.reject(err);
      }
    }
    return this.call({ type: "end-mix" }) as Promise<Float32Array[]>;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
    }
    this.fail(new Error("The audio worker was stopped."));
  }

  private call(request: DspRequest, transfer: Transferable[] = []): Promise<unknown> {
    if (this.failure) return Promise.reject(this.failure);
    if (!this.worker) return Promise.reject(new Error("No worker available"));
    const id = ++this.nextId;
    const result = new Promise<unknown>((resolve, reject) => this.pending.set(id, { resolve, reject }));
    try {
      this.worker.postMessage({ ...request, id }, transfer);
    } catch (err) {
      this.fail(err instanceof Error ? err : new Error(String(err)));
    }
    return result;
  }

  private onReply(reply: DspReply) {
    const pending = this.pending.get(reply.id);
    if (!pending) return;
    this.pending.delete(reply.id);
    if (reply.ok) pending.resolve(reply.result);
    else {
      const err = new Error(reply.message);
      this.failure ??= err;
      pending.reject(err);
    }
  }

  private fail(err: Error) {
    this.failure ??= err;
    const pending = [...this.pending.values()];
    this.pending.clear();
    for (const p of pending) p.reject(this.failure);
  }
}

// -- Exports ------------------------------------------------------------------

export { DspLane };

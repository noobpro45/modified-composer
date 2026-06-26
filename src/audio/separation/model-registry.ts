import type { VocalModelVariant } from "@/stores/settings";

interface ModelDescriptor {
  variant: VocalModelVariant;
  url: string;
  filename: string;
  approxBytes: number;
  approxMb: number;
}

const MODEL_FILENAMES: Record<VocalModelVariant, string> = {
  fp16: "htdemucs.onnx", // Ghilda only hosts fp32 under this name
  fp32: "htdemucs.onnx",
};

const MODEL_APPROX_BYTES: Record<VocalModelVariant, number> = {
  fp16: 85 * 1024 * 1024,
  fp32: 171 * 1024 * 1024,
};

function getBaseUrl(): string | null {
  const raw = import.meta.env.VITE_VOCAL_MODEL_BASE_URL;
  if (raw && typeof raw === "string") {
    const trimmed = raw.trim().replace(/\/$/, "");
    if (trimmed.length > 0) return trimmed;
  }
  return "https://huggingface.co/Ghilda/htdemucs-onnx/resolve/main";
}

function getModelDescriptor(variant: VocalModelVariant): ModelDescriptor | null {
  const base = getBaseUrl();
  if (!base) return null;
  const filename = MODEL_FILENAMES[variant];
  const approxBytes = MODEL_APPROX_BYTES[variant];
  return {
    variant,
    url: `${base}/${filename}`,
    filename,
    approxBytes,
    approxMb: Math.round(approxBytes / (1024 * 1024)),
  };
}

function isModelHostingConfigured(): boolean {
  return getBaseUrl() !== null;
}

export { getModelDescriptor, isModelHostingConfigured };
export type { ModelDescriptor };

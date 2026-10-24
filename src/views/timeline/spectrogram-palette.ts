import { readToken } from "@/utils/theme/read-token";

type RgbaFloat = [number, number, number, number];

// -- Color Parsing -------------------------------------------------------------

function parseCssColor(cssColor: string, fallback: [number, number, number]): [number, number, number] {
  if (cssColor.startsWith("#")) {
    const hex = cssColor.replace("#", "");
    if (hex.length === 3 || hex.length === 6) {
      const fullHex =
        hex.length === 3
          ? hex
              .split("")
              .map((c) => c + c)
              .join("")
          : hex;
      const r = Number.parseInt(fullHex.slice(0, 2), 16) / 255;
      const g = Number.parseInt(fullHex.slice(2, 4), 16) / 255;
      const b = Number.parseInt(fullHex.slice(4, 6), 16) / 255;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return [r, g, b];
      }
    }
  }
  if (cssColor.startsWith("rgb")) {
    const raw = cssColor.replace(/rgba?\(/, "").replace(/\)/, "");
    const parts = raw.split(",");
    if (parts.length >= 3) {
      const r = Number.parseFloat(parts[0]) / 255;
      const g = Number.parseFloat(parts[1]) / 255;
      const b = Number.parseFloat(parts[2]) / 255;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return [r, g, b];
      }
    }
  }
  if (typeof document === "undefined") return fallback;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.fillStyle = cssColor;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    return [data[0] / 255, data[1] / 255, data[2] / 255];
  } catch {
    return fallback;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: [number, number, number], c2: [number, number, number], t: number): [number, number, number] {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// -- Palette Generator ---------------------------------------------------------

function deriveSpectrogramColorMap(): RgbaFloat[] {
  const bgRaw = readToken("bg-dark") || readToken("bg") || "#1a1a1c";
  const accentRaw = readToken("accent") || readToken("wave-progress") || "#818cf8";
  const highlightRaw = readToken("accent-warm") || "#ffffff";

  const bg = parseCssColor(bgRaw, [0.07, 0.075, 0.086]);
  const accent = parseCssColor(accentRaw, [0.506, 0.549, 0.973]);
  const highlight = parseCssColor(highlightRaw, [1, 1, 1]);

  // Deep shadow tone derived from the theme accent for low-energy formant ambience
  const deepAccent: [number, number, number] = [
    bg[0] * 0.6 + accent[0] * 0.4 * 0.6,
    bg[1] * 0.6 + accent[1] * 0.4 * 0.6,
    bg[2] * 0.6 + accent[2] * 0.4 * 0.7,
  ];
  // Bright luminous tint for vocal formant cores
  const luminousAccent: [number, number, number] = lerpColor(accent, highlight, 0.7);

  const map: RgbaFloat[] = new Array(256);

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    if (t < 0.15) {
      // Noise floor: blend smoothly from dark theme background to subtle ambient formant tint
      const localT = t / 0.15;
      const rgb = lerpColor(bg, deepAccent, localT * localT);
      map[i] = [rgb[0], rgb[1], rgb[2], 1.0];
    } else if (t < 0.45) {
      // Low energy / breaths: fade into rich theme accent
      const localT = (t - 0.15) / 0.3;
      const rgb = lerpColor(deepAccent, accent, localT ** 1.2);
      map[i] = [rgb[0], rgb[1], rgb[2], 1.0];
    } else if (t < 0.8) {
      // Main musical & vocal body: vibrant glowing theme color
      const localT = (t - 0.45) / 0.35;
      const rgb = lerpColor(accent, luminousAccent, localT);
      map[i] = [rgb[0], rgb[1], rgb[2], 1.0];
    } else {
      // Vocal power & transient attack peaks: brilliant white-hot highlight
      const localT = (t - 0.8) / 0.2;
      const rgb = lerpColor(luminousAccent, [1, 1, 1], localT ** 0.8);
      map[i] = [rgb[0], rgb[1], rgb[2], 1.0];
    }
  }

  return map;
}

// -- Exports -------------------------------------------------------------------

export { deriveSpectrogramColorMap };

import { type Icon, IconMicrophone, IconMusic, IconWaveSine } from "@tabler/icons-react";
import type { Stem } from "@/audio/separation/types";

// -- Constants ----------------------------------------------------------------

const STEMS: readonly Stem[] = ["original", "vocals", "instrumental"] as const;

const STEM_LABELS: Record<Stem, string> = {
  original: "Original",
  vocals: "Vocals",
  instrumental: "Instrumental",
};

const STEM_ICONS: Record<Stem, Icon> = {
  original: IconWaveSine,
  vocals: IconMicrophone,
  instrumental: IconMusic,
};

// -- Exports ------------------------------------------------------------------

export { STEMS, STEM_ICONS, STEM_LABELS };

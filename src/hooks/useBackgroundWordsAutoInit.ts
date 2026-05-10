import { useProjectStore } from "@/stores/project";
import { createBgWordsFromLine } from "@/utils/sync-helpers";
import { useEffect } from "react";

function useBackgroundWordsAutoInit(): void {
  const lines = useProjectStore((s) => s.lines);
  const updateLine = useProjectStore((s) => s.updateLine);

  useEffect(() => {
    for (const line of lines) {
      if (line.backgroundText && !line.backgroundWords?.length) {
        const bgWords = createBgWordsFromLine(line);
        if (bgWords) {
          updateLine(line.id, { backgroundWords: bgWords });
        }
      }
    }
  }, [lines, updateLine]);
}

export { useBackgroundWordsAutoInit };

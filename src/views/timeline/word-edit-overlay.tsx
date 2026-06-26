import { useProjectStore } from "@/stores/project";
import { useTimelineStore } from "@/views/timeline/timeline-store";
import { manualBackgroundWordEdit } from "@/domain/line/background";
import { getEffectiveLines } from "@/domain/line/effective-words";
import { FloatingPortal } from "@floating-ui/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

// -- Types --------------------------------------------------------------------

interface WordEditOverlayProps {
  lineId: string;
  wordIndex: number;
  type: "word" | "bg";
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

// -- Component ----------------------------------------------------------------

const WordEditOverlay: React.FC<WordEditOverlayProps> = ({ lineId, wordIndex, type, scrollContainerRef }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const rawLines = useProjectStore((s) => s.lines);
  const updateLineWithHistory = useProjectStore((s) => s.updateLineWithHistory);
  const clearEditingWord = useTimelineStore((s) => s.clearEditingWord);
  const showRomaji = useTimelineStore((s) => s.showRomaji);

  const effectiveLines = useMemo(() => getEffectiveLines(rawLines), [rawLines]);
  const line = effectiveLines.find((l) => l.id === lineId);
  const wordsArray = type === "word" ? line?.words : line?.backgroundWords;
  const word = wordsArray?.[wordIndex];

  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !word) return;

    const key = `${lineId}-${type}-${wordIndex}`;

    const zoom = useTimelineStore.getState().zoom;
    const expectedLeft = word.begin * zoom;

    const findAndPosition = () => {
      const wordEl = container.querySelector(`[data-word-block][id="${CSS.escape(key)}"]`) as HTMLElement | null;
      if (!wordEl) return false;
      const elLeft = Number.parseFloat(wordEl.style.left || "0");
      if (Math.abs(elLeft - expectedLeft) > 1) return false;
      const rect = wordEl.getBoundingClientRect();
      const topOffset = showRomaji ? 60 : 32;
      setPos({ top: rect.top - topOffset, left: rect.left, width: Math.max(rect.width, 80) });
      return true;
    };

    if (findAndPosition()) return;

    const raf = requestAnimationFrame(() => {
      if (!findAndPosition()) clearEditingWord();
    });
    return () => cancelAnimationFrame(raf);
  }, [lineId, wordIndex, type, word, scrollContainerRef, clearEditingWord]);

  useEffect(() => {
    if (!pos) return;
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(raf);
  }, [pos]);

  const handleCommit = useCallback(
    (textValue: string, romajiValue?: string) => {
      if (!line || !wordsArray || !word) return;
      const trimmed = textValue.trim();
      const rawRomaji = romajiValue || "";
      
      const hasTextChanged = trimmed && trimmed !== word.text.trimEnd();
      const hasRomajiChanged = showRomaji && rawRomaji !== (word.romaji || "");

      if (hasTextChanged || hasRomajiChanged) {
        const updatedWords = [...wordsArray];
        const hadTrailingSpace = word.text.endsWith(" ");
        updatedWords[wordIndex] = {
          ...word,
          text: hasTextChanged ? (hadTrailingSpace ? `${trimmed} ` : trimmed) : word.text,
          romaji: showRomaji ? (rawRomaji || undefined) : word.romaji,
        };
        updateLineWithHistory(
          lineId,
          type === "word" ? { words: updatedWords } : manualBackgroundWordEdit(updatedWords),
        );
      }
      clearEditingWord();
    },
    [line, wordsArray, word, wordIndex, type, lineId, updateLineWithHistory, clearEditingWord, showRomaji],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const wrapper = (e.target as HTMLElement).closest("[data-word-edit-wrapper]");
        const textInput = wrapper?.querySelector<HTMLInputElement>("input[name='text']");
        const romajiInput = wrapper?.querySelector<HTMLInputElement>("input[name='romaji']");
        handleCommit(textInput?.value || "", romajiInput?.value);
      } else if (e.key === "Escape") {
        clearEditingWord();
      }
    },
    [handleCommit, clearEditingWord],
  );

  const commitWordEdit = useCallback(
    () => {
      // Delay to see if we're just shifting focus between the two inputs
      setTimeout(() => {
        const wrapper = document.querySelector("[data-word-edit-wrapper]");
        if (!wrapper || !wrapper.contains(document.activeElement)) {
          const textInput = wrapper?.querySelector<HTMLInputElement>("input[name='text']");
          const romajiInput = wrapper?.querySelector<HTMLInputElement>("input[name='romaji']");
          if (textInput) {
            handleCommit(textInput.value, romajiInput?.value);
          }
        }
      }, 0);
    },
    [handleCommit],
  );

  if (!word || !pos) return null;

  return (
    <FloatingPortal>
      <div
        data-word-edit-wrapper
        className="fixed z-100 flex flex-col gap-1"
        style={{ top: pos.top, left: pos.left, width: pos.width }}
        onBlurCapture={commitWordEdit}
      >
        {showRomaji && (
          <input
            name="romaji"
            type="text"
            aria-label="Edit romaji"
            defaultValue={word.romaji || ""}
            onKeyDown={handleKeyDown}
            placeholder="Romaji"
            className="px-2 py-1 text-xs text-composer-text bg-composer-bg border border-composer-border rounded cursor-text focus:outline-none focus:border-composer-accent"
          />
        )}
        <input
          ref={inputRef}
          name="text"
          type="text"
          aria-label="Edit word"
          defaultValue={word.text.trimEnd()}
          onKeyDown={handleKeyDown}
          placeholder="Word"
          className="px-2 py-1.5 text-sm text-composer-text bg-composer-bg border border-composer-border rounded-lg cursor-text focus:outline-none focus:border-composer-accent"
        />
      </div>
    </FloatingPortal>
  );
};

// -- Exports ------------------------------------------------------------------

export { WordEditOverlay };

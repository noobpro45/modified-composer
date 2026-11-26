import { withAlignedTransliteration } from "@/domain/language/align";
import { wordTransliterationEdit } from "@/domain/language/word-transliteration-edit";
import { manualBackgroundWordEdit } from "@/domain/line/background";
import { effectiveWordTextEdit, getEffectiveLine } from "@/domain/line/effective-words";
import { reconcileLine } from "@/domain/line/model";
import { trackWords } from "@/domain/line/tracks";
import { cancelNextFrame, nextFrame } from "@/lib/frame-loop";
import { noteGuideSignal } from "@/lib/guide-signals";
import { useProjectStore } from "@/stores/project";
import { useTimelineStore } from "@/views/timeline/timeline-store";
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
  const transliterationInputRef = useRef<HTMLInputElement>(null);
  const rawLines = useProjectStore((s) => s.lines);
  const sourceLanguage = useProjectStore((s) => s.metadata.language);
  const updateLineWithHistory = useProjectStore((s) => s.updateLineWithHistory);
  const textVariant = useTimelineStore((s) => s.textVariant);
  const clearEditingWord = useTimelineStore((s) => s.clearEditingWord);

  const rawLine = rawLines.find((l) => l.id === lineId);
  const line = rawLine ? getEffectiveLine(rawLine) : undefined;
  const wordsArray = line ? trackWords(line, type) : undefined;
  const word = wordsArray?.[wordIndex];
  const initialTransliteration = useMemo(() => {
    if (!rawLine?.transliteration) return "";
    if (type === "word" && !rawLine.words?.length) return rawLine.transliteration.text;
    const alignedWord = trackWords(withAlignedTransliteration(rawLine), type)?.[wordIndex];
    return alignedWord?.transliteration ?? word?.transliteration ?? "";
  }, [rawLine, type, wordIndex, word]);

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
      setPos({ top: rect.top - 32, left: rect.left, width: Math.max(rect.width, 80) });
      return true;
    };

    const followScroll = () => {
      findAndPosition();
    };
    container.addEventListener("scroll", followScroll, { passive: true });
    const frame = findAndPosition()
      ? null
      : nextFrame(() => {
          if (!findAndPosition()) clearEditingWord();
        });
    return () => {
      container.removeEventListener("scroll", followScroll);
      if (frame !== null) cancelNextFrame(frame);
    };
  }, [lineId, wordIndex, type, word, scrollContainerRef, clearEditingWord]);

  const isPlaced = pos !== null;
  useEffect(() => {
    if (!isPlaced) return;
    const frame = nextFrame(() => {
      const target = textVariant === "transliteration" ? transliterationInputRef.current : inputRef.current;
      target?.focus();
      target?.select();
    });
    return () => cancelNextFrame(frame);
  }, [isPlaced, textVariant]);

  const handleCommit = useCallback(() => {
    if (!rawLine || !line || !wordsArray || !word) return;
    const wordValue = inputRef.current?.value.trim() ?? word.text.trimEnd();
    const transValue = transliterationInputRef.current?.value.trim() ?? initialTransliteration;

    const wordChanged = textVariant !== "transliteration" && wordValue.length > 0 && wordValue !== word.text.trimEnd();
    const transChanged =
      textVariant !== "original" && transValue.length > 0 && transValue !== initialTransliteration.trim();

    if (wordChanged || transChanged) {
      if (wordChanged) {
        const updatedWords = [...wordsArray];
        const hadTrailingSpace = word.text.endsWith(" ");
        updatedWords[wordIndex] = { ...word, text: hadTrailingSpace ? `${wordValue} ` : wordValue };
        const wordPatch =
          type === "word" ? effectiveWordTextEdit(line, updatedWords) : manualBackgroundWordEdit(updatedWords);
        if (!transChanged) {
          updateLineWithHistory(lineId, wordPatch);
        } else {
          const targetLine = reconcileLine({ ...rawLine, ...wordPatch });
          const transPatch = wordTransliterationEdit(targetLine, wordIndex, type, transValue, sourceLanguage);
          updateLineWithHistory(
            lineId,
            type === "word" && !targetLine.words?.length
              ? { text: wordValue, transliteration: transPatch.transliteration }
              : transPatch,
          );
        }
      } else {
        updateLineWithHistory(lineId, wordTransliterationEdit(rawLine, wordIndex, type, transValue, sourceLanguage));
      }
      noteGuideSignal("timeline.editText");
    }
    clearEditingWord();
  }, [
    rawLine,
    line,
    wordsArray,
    word,
    wordIndex,
    type,
    lineId,
    textVariant,
    initialTransliteration,
    sourceLanguage,
    updateLineWithHistory,
    clearEditingWord,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        handleCommit();
      } else if (e.key === "Escape") {
        clearEditingWord();
      }
    },
    [handleCommit, clearEditingWord],
  );

  const handleContainerBlur = useCallback(
    (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.contains(e.relatedTarget)) return;
      handleCommit();
    },
    [handleCommit],
  );

  if (!word || !pos) return null;

  const inputClass =
    "w-full px-2 py-1.5 text-sm text-composer-text bg-composer-bg border border-composer-border rounded-lg cursor-text focus:outline-none focus:border-composer-accent";

  return (
    <FloatingPortal>
      <div
        onBlur={handleContainerBlur}
        className="fixed layer-floating flex flex-col gap-1"
        style={{
          top: textVariant === "both" ? Math.max(8, pos.top - 36) : pos.top,
          left: pos.left,
          width: Math.max(pos.width, textVariant === "both" ? 120 : 80),
        }}
      >
        {textVariant !== "transliteration" && (
          <input
            ref={inputRef}
            type="text"
            aria-label="Edit word"
            defaultValue={word.text.trimEnd()}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />
        )}
        {textVariant !== "original" && (
          <input
            ref={transliterationInputRef}
            type="text"
            aria-label="Edit transliteration"
            placeholder="Transliteration"
            defaultValue={initialTransliteration}
            onKeyDown={handleKeyDown}
            className={inputClass}
          />
        )}
      </div>
    </FloatingPortal>
  );
};

// -- Exports ------------------------------------------------------------------

export { WordEditOverlay };

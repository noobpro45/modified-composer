import type { WordTiming } from "@/domain/word/timing";
import { Tooltip } from "@/ui/tooltip";
import { SyllableSplitter } from "@/views/sync/syllable-splitter";
import { TimeNudgeInput } from "@/views/sync/time-nudge-input";
import { IconAlertTriangle, IconArrowRight } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface WordHandlers {
  onNudge?: (idx: number, delta: number) => void;
  onSetTime?: (idx: number, newBegin: number) => void;
  onNudgeEnd?: (idx: number, delta: number) => void;
  onSetEndTime?: (idx: number, newEnd: number) => void;
  onSplit?: (idx: number, newWords: WordTiming[]) => void;
  onClickWord?: (idx: number) => void;
}

interface WordRendererProps {
  lineId: string;
  word: string;
  transliteration?: string;
  showBoth?: boolean;
  idx: number;
  timing: WordTiming | undefined;
  allWords: WordTiming[] | undefined;
  handlers: WordHandlers;
  isBackground?: boolean;
  editMode: boolean;
  currentTime?: number;
}

// -- Helper -------------------------------------------------------------------

function renderWordContent(
  word: string,
  timing: WordTiming | undefined,
  isBackground: boolean,
  editMode: boolean,
  showBoth?: boolean,
  transliteration?: string,
) {
  const isSynced = !!timing;
  const baseClass = isBackground ? "italic" : "";
  const syncedClass = isBackground ? "text-composer-text-muted/70" : "text-composer-text-muted";
  const unsyncedClass = isBackground ? "text-composer-text-muted/50" : "text-composer-text";
  const activeClass = isBackground ? "text-composer-accent-text/80" : "text-composer-accent-text";

  if (editMode && isSynced) {
    if (showBoth && transliteration) {
      return (
        <span className={`relative inline-block whitespace-pre ${baseClass}`}>
          <span className={`inline-flex flex-col items-center leading-tight ${syncedClass}`}>
            <span>{word}</span>
            <span className="text-[11px] text-composer-accent font-mono opacity-90">{transliteration}</span>
          </span>
          <span
            className={`absolute inset-0 overflow-hidden ${activeClass}`}
            data-word-begin={timing.begin}
            data-word-end={timing.end}
            style={{ width: "0%" }}
          >
            <span className="inline-flex flex-col items-center leading-tight">
              <span>{word}</span>
              <span className="text-[11px] text-composer-accent font-mono opacity-90">{transliteration}</span>
            </span>
          </span>
        </span>
      );
    }
    return (
      <span className={`relative inline-block whitespace-pre ${baseClass}`}>
        <span className={syncedClass}>{word}</span>
        <span
          className={`absolute inset-0 overflow-hidden ${activeClass}`}
          data-word-begin={timing.begin}
          data-word-end={timing.end}
          style={{ width: "0%" }}
        >
          {word}
        </span>
      </span>
    );
  }

  if (showBoth && transliteration) {
    return (
      <span
        className={`inline-flex flex-col items-center leading-tight whitespace-pre ${baseClass} ${
          isSynced ? syncedClass : unsyncedClass
        }`}
      >
        <span>{word}</span>
        <span className="text-[11px] text-composer-accent font-mono opacity-90">{transliteration}</span>
      </span>
    );
  }

  return <span className={`whitespace-pre ${baseClass} ${isSynced ? syncedClass : unsyncedClass}`}>{word}</span>;
}

// -- Component ----------------------------------------------------------------

const WordRenderer: React.FC<WordRendererProps> = ({
  lineId,
  word,
  transliteration,
  showBoth,
  idx,
  timing,
  allWords,
  handlers,
  isBackground = false,
  editMode,
  currentTime = 0,
}) => {
  const isSynced = !!timing;

  const prevWord = allWords?.[idx - 1];
  const nextWord = allWords?.[idx + 1];
  const minBegin = prevWord?.end ?? 0;
  const maxBegin = timing?.end ?? 0;
  const minEnd = timing?.begin ?? 0;
  const maxEnd = nextWord?.begin ?? Number.POSITIVE_INFINITY;

  return (
    <span className={`inline-flex flex-col items-start ${isBackground ? "italic" : ""}`}>
      <span className="flex items-center gap-1 group/word">
        {handlers.onClickWord && timing ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onClickWord?.(idx);
            }}
            title={isBackground ? "Jump to this word" : "Re-record from this word"}
            className="appearance-none border-0 bg-transparent p-0 text-left cursor-pointer"
          >
            {renderWordContent(word, timing, isBackground, editMode, showBoth, transliteration)}
          </button>
        ) : (
          renderWordContent(word, timing, isBackground, editMode, showBoth, transliteration)
        )}
        {isSynced && timing && timing.end === timing.begin && (
          <Tooltip content="No duration - sync the next word to close this one or increase the end time">
            <span className="text-composer-warning">
              <IconAlertTriangle className="size-3.5" />
            </span>
          </Tooltip>
        )}
        {isSynced && timing && !isBackground && (
          <span className="transition-opacity opacity-0 group-hover/word:opacity-100">
            <SyllableSplitter
              lineId={lineId}
              type={isBackground ? "bg" : "word"}
              word={timing}
              wordIndex={idx}
              onSplit={handlers.onSplit ?? (() => {})}
            />
          </span>
        )}
      </span>
      {isSynced && timing && (
        <span className="flex items-center gap-1">
          <TimeNudgeInput
            value={timing.begin}
            currentTime={currentTime}
            canDecrease={timing.begin > minBegin}
            canIncrease={timing.begin < maxBegin}
            onNudge={(delta) => handlers.onNudge?.(idx, delta)}
            onSetTime={(newBegin) => handlers.onSetTime?.(idx, newBegin)}
          />
          <IconArrowRight className="size-2.5 text-composer-text opacity-25 mx-0.5" />
          <TimeNudgeInput
            value={timing.end}
            currentTime={currentTime}
            canDecrease={timing.end > minEnd}
            canIncrease={timing.end < maxEnd}
            onNudge={(delta) => handlers.onNudgeEnd?.(idx, delta)}
            onSetTime={(newEnd) => handlers.onSetEndTime?.(idx, newEnd)}
          />
        </span>
      )}
    </span>
  );
};

// -- Exports ------------------------------------------------------------------

export { WordRenderer };
export type { WordHandlers };

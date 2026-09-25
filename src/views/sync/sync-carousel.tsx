import type { WordTiming } from "@/domain/word/timing";
import { useThemeStore } from "@/stores/theme";
import { syncCarouselTransition } from "@/utils/animationVariants";
import { stripSplitCharacter } from "@/utils/split-character";
import { splitIntoWords } from "@/utils/sync-helpers";
import { readToken } from "@/utils/theme/read-token";
import { useTimelineStore } from "@/views/timeline/timeline-store";
import { AnimatePresence, m } from "motion/react";
import { useMemo } from "react";

// -- Hooks --------------------------------------------------------------------

function useCarouselColors(): { accentColor: string; secondaryColor: string; disabledColor: string } {
  const activeThemeId = useThemeStore((s) => s.activeThemeId);
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeThemeId re-reads the DOM-resolved colors when the theme changes
  return useMemo(
    () => ({
      accentColor: readToken("accent"),
      secondaryColor: readToken("text-secondary"),
      disabledColor: readToken("text-disabled"),
    }),
    // react-doctor-disable-next-line react-doctor/exhaustive-deps -- activeThemeId is the intended cache key: readToken reads DOM CSS vars non-reactively, so the memo must recompute when the theme changes
    [activeThemeId],
  );
}

// -- Constants ----------------------------------------------------------------

const LINE_HEIGHT = 100;

// -- Interfaces ---------------------------------------------------------------

interface RippleTarget {
  lineId: string;
  wordIndex: number;
  nonce: number;
}

interface SyncCarouselProps {
  lines: Array<{
    id: string;
    text: string;
    romaji?: string;
    words?: WordTiming[];
    begin?: number;
  }>;
  lineIndex: number;
  wordIndex: number;
  granularity: "line" | "word";
  isHolding?: boolean;
  rippleTarget?: RippleTarget | null;
  onRippleComplete?: () => void;
}

// -- Components ---------------------------------------------------------------

const RippleRing: React.FC<{ onComplete: () => void }> = ({ onComplete }) => (
  <m.span
    className="absolute inset-0 rounded-[50%] border border-composer-accent/20 bg-composer-accent/20 pointer-events-none blur-sm"
    initial={{ scale: 0.8, opacity: 0.5 }}
    animate={{ scale: 2.2, opacity: 0 }}
    transition={{ duration: 0.33, ease: "easeOut" }}
    onAnimationComplete={onComplete}
  />
);

interface WordGranularityLineProps {
  line: SyncCarouselProps["lines"][number];
  idx: number;
  lineIndex: number;
  wordIndex: number;
  isHolding: boolean;
  isCurrent: boolean;
  rippleTarget: RippleTarget | null;
  onRippleComplete: () => void;
}

const WordGranularityLine: React.FC<WordGranularityLineProps> = ({
  line,
  idx,
  lineIndex,
  wordIndex,
  isHolding,
  isCurrent,
  rippleTarget,
  onRippleComplete,
}) => {
  const { accentColor, secondaryColor, disabledColor } = useCarouselColors();
  const lineWords = splitIntoWords(line.text);
  const showRomaji = useTimelineStore((s) => s.showRomaji);
  return lineWords.map((word, widx) => {
    const isPrevLine = idx === lineIndex - 1;
    const holdActive = isHolding;
    const isCurrentHeld = holdActive && isCurrent && widx === wordIndex;
    const isLastSyncedOnCurrent = !holdActive && isCurrent && wordIndex > 0 && widx === wordIndex - 1;
    const isLastWordOfPrevLine = !holdActive && isPrevLine && wordIndex === 0 && widx === lineWords.length - 1;
    const isLastSynced = isLastSyncedOnCurrent || isLastWordOfPrevLine;

    const color = isCurrentHeld ? accentColor : isLastSynced ? accentColor : isCurrent ? secondaryColor : disabledColor;

    const hasRipple = rippleTarget !== null && rippleTarget.lineId === line.id && rippleTarget.wordIndex === widx;
    const romaji =
      lineWords.length === 1 && line.romaji
        ? line.romaji
        : line.words?.[widx]?.romaji ??
          (line.romaji && splitIntoWords(line.romaji).length === lineWords.length
            ? splitIntoWords(line.romaji)[widx]
            : undefined);

    return (
      <span key={`${line.id}-${widx}`} className="inline-flex flex-col items-center gap-1 mx-1">
        {showRomaji && (
          <div className={`text-sm leading-none text-center truncate rounded px-1.5 py-0.5 ${romaji?.trim() ? "bg-composer-button text-composer-text-muted" : "text-transparent"}`}>
            {romaji?.trim() ? stripSplitCharacter(romaji) : "\u00A0"}
          </div>
        )}
        <m.span
          animate={{
            color,
            scale: isCurrentHeld ? 0.95 : 1,
            textShadow: isCurrentHeld ? `0 0 24px ${accentColor}` : "0 0 0px transparent",
          }}
          transition={syncCarouselTransition}
          className="relative inline-flex items-center justify-center origin-center whitespace-pre"
        >
          {stripSplitCharacter(word)}
          <AnimatePresence>
            {hasRipple && rippleTarget && <RippleRing key={rippleTarget.nonce} onComplete={onRippleComplete} />}
          </AnimatePresence>
        </m.span>
      </span>
    );
  });
};

const SyncCarousel: React.FC<SyncCarouselProps> = ({
  lines,
  lineIndex,
  wordIndex,
  granularity,
  isHolding = false,
  rippleTarget = null,
  onRippleComplete,
}) => {
  const { accentColor, secondaryColor, disabledColor } = useCarouselColors();
  const showRomaji = useTimelineStore((s) => s.showRomaji);

  const containerHeight = LINE_HEIGHT * 3;
  const translateY = LINE_HEIGHT - lineIndex * LINE_HEIGHT;

  const handleRippleComplete = onRippleComplete ?? noop;

  return (
    <div className="relative overflow-hidden" style={{ height: containerHeight }}>
      <m.div
        initial={{ y: translateY }}
        animate={{ y: translateY }}
        transition={syncCarouselTransition}
        className="flex flex-col items-center"
      >
        {lines.map((line, idx) => {
          const isCurrent = idx === lineIndex;
          const distance = Math.abs(idx - lineIndex);
          const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0;
          const scale = distance === 0 ? 1 : 0.65;

          return (
            <m.div
              key={line.id}
              initial={{ opacity, scale }}
              animate={{ opacity, scale }}
              transition={syncCarouselTransition}
              style={{ height: LINE_HEIGHT }}
              className="flex items-center justify-center w-full shrink-0"
            >
              <div className="flex flex-wrap items-center justify-center text-4xl font-medium gap-x-4 gap-y-3">
                {granularity === "line" ? (
                  <span className="relative inline-flex flex-col items-center gap-2">
                    {showRomaji && line.romaji?.trim() && (
                      <div className="text-xl leading-none text-composer-text-muted bg-composer-button px-3 py-1.5 rounded">
                        {stripSplitCharacter(line.romaji.trim())}
                      </div>
                    )}
                    <m.span
                      animate={{
                        color: isHolding && isCurrent ? accentColor : idx === lineIndex - 1 ? accentColor : isCurrent ? secondaryColor : disabledColor,
                        scale: isHolding && isCurrent ? 0.95 : 1,
                        textShadow: isHolding && isCurrent ? `0 0 24px ${accentColor}` : "0 0 0px transparent",
                      }}
                      transition={syncCarouselTransition}
                    >
                      {stripSplitCharacter(line.text)}
                    </m.span>
                  </span>
                ) : (
                  <WordGranularityLine
                    line={line}
                    idx={idx}
                    lineIndex={lineIndex}
                    wordIndex={wordIndex}
                    isHolding={isHolding}
                    isCurrent={isCurrent}
                    rippleTarget={rippleTarget}
                    onRippleComplete={handleRippleComplete}
                  />
                )}
              </div>
            </m.div>
          );
        })}
      </m.div>
    </div>
  );
};

const noop = () => {};

// -- Exports ------------------------------------------------------------------

export { SyncCarousel };
export type { RippleTarget };

import type { Bounds } from "@/domain/word/bounds";
import { useFrameLoop } from "@/hooks/use-frame-loop";
import { useOpenProjectId } from "@/hooks/useOpenProjectId";
import { wake } from "@/lib/frame-loop";
import { Button } from "@/ui/button";
import { IconButton } from "@/ui/icon-button";
import { centeredFadeVariants, centeredSlideUpVariants, springSnappy } from "@/utils/animationVariants";
import { cn } from "@/utils/cn";
import { decorateAlternateTracks, ensureBraccatoRegistered, timedLines } from "@/views/preview/braccato-helpers";
import braccatoTheme from "@/views/preview/braccato-theme.css?raw";
import { type AppliedTick, tickBraccato } from "@/views/preview/braccato-tick";
import { markLinesOutsideFocus, useFocusFade } from "@/views/preview/focus-fade";
import { LYRICS_ELEMENT_CLASS, type LyricsLayout } from "@/views/preview/lyrics-layout";
import { PreviewLoadFailed } from "@/views/preview/preview-load-failed";
import { AUDIO_STORE_PLAYBACK, type RendererPlayback } from "@/views/preview/renderer-playback";
import type { Lyric } from "@braccato/core";
import type { BraccatoLyricsElement, LineClickDetail } from "@braccato/core/element";
import { TTMLParser, parseTTMLContent } from "@braccato/parsers";
import { IconArrowDown } from "@tabler/icons-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// -- Interfaces ---------------------------------------------------------------

interface BraccatoRendererProps {
  ttmlString: string;
  layout?: LyricsLayout;
  focusRange?: Bounds | null;
  playback?: RendererPlayback;
}

// -- Constants -----------------------------------------------------------------

// Mirrors braccato's unexported USER_SCROLL_RESUME_DELAY_MS (25000); the margin lands the wake
// on the far side of its deadline instead of racing it.
const RESUME_AFFORDANCE_WAKE_MS = 25_500;

// A project not yet saved has no id, but its edits are still one song to swap in place.
const UNSAVED_SONG_KEY = "unsaved";

function skipWritePhase(): void {}

// -- Component ----------------------------------------------------------------

const BraccatoRenderer: React.FC<BraccatoRendererProps> = ({
  ttmlString,
  layout = "page",
  focusRange = null,
  playback = AUDIO_STORE_PLAYBACK,
}) => {
  const elementRef = useRef<BraccatoLyricsElement>(null);
  const { lyrics, language } = useMemo(() => parseTTMLContent(ttmlString), [ttmlString]);
  const songwriters = useMemo(() => TTMLParser.metadata(ttmlString).songwriters, [ttmlString]);
  const songKey = useOpenProjectId() ?? UNSAVED_SONG_KEY;
  const latestLyricsRef = useRef(lyrics);
  const latestLanguageRef = useRef(language);
  const latestSongwritersRef = useRef(songwriters);
  const latestSongKeyRef = useRef(songKey);
  const latestFocusRangeRef = useRef(focusRange);
  useFocusFade(focusRange, latestFocusRangeRef, (range) => {
    if (elementRef.current) markLinesOutsideFocus(timedLines(elementRef.current), range);
  });
  const initializedElementRef = useRef<BraccatoLyricsElement | null>(null);
  const appliedLyricsRef = useRef<Lyric[] | null>(null);
  const appliedSongKeyRef = useRef<string | null>(null);
  const rebuildScrollTopRef = useRef<number | null>(null);
  const appliedTickRef = useRef<AppliedTick | null>(null);
  const [isAutoscrollPaused, setIsAutoscrollPaused] = useState(false);
  const [isElementUnavailable, setIsElementUnavailable] = useState(false);
  const resumeWakeRef = useRef<number | null>(null);
  const reducedMotion = useReducedMotion();

  const clearResumeWake = useCallback(() => {
    if (resumeWakeRef.current === null) return;
    window.clearTimeout(resumeWakeRef.current);
    resumeWakeRef.current = null;
  }, []);

  const handleScroll = useCallback(
    (e: Event) => {
      const el = e.currentTarget as BraccatoLyricsElement;
      const fromRebuild = rebuildScrollTopRef.current === el.scrollTop;
      rebuildScrollTopRef.current = null;
      if (fromRebuild) return;
      el.renderer?.noteUserScroll();
      clearResumeWake();
      resumeWakeRef.current = window.setTimeout(() => {
        resumeWakeRef.current = null;
        wake();
      }, RESUME_AFFORDANCE_WAKE_MS);
    },
    [clearResumeWake],
  );

  const resumeAutoscroll = useCallback(() => {
    clearResumeWake();
    elementRef.current?.renderer?.resumeAutoscroll();
    playback.play();
    // Braccato clears the affordance and scrolls back on its next tick, which this
    // component drives, so a paused reader would otherwise see nothing happen.
    wake();
  }, [clearResumeWake, playback]);

  const handleLineClick = useCallback(
    (e: Event) => {
      const detail = (e as CustomEvent<LineClickDetail>).detail;
      if (detail?.timeS == null) return;
      playback.seekTo(detail.timeS);
      resumeAutoscroll();
    },
    [resumeAutoscroll, playback],
  );

  const handleLyricsLoaded = useCallback((event: Event) => {
    const el = event.currentTarget as BraccatoLyricsElement;
    decorateAlternateTracks(el, latestLyricsRef.current);
    markLinesOutsideFocus(timedLines(el), latestFocusRangeRef.current);
  }, []);

  const applyLyrics = useCallback(
    (
      el: BraccatoLyricsElement,
      next: Lyric[],
      songwriters: readonly string[],
      songKey: string,
      sourceLanguage: string | undefined,
    ) => {
      if (appliedLyricsRef.current === next && appliedSongKeyRef.current === songKey) return;
      const scrollTopBefore = el.scrollTop;
      appliedLyricsRef.current = next;
      appliedSongKeyRef.current = songKey;
      // The same songKey swaps edits into the lines on screen; another project's key builds anew.
      el.lyricsOptions = { songwriters, songKey, language: sourceLanguage };
      el.lyrics = next;
      // A rebuild or swap that moves the scroll position fires one scroll the reader never made.
      rebuildScrollTopRef.current = el.scrollTop === scrollTopBefore ? null : el.scrollTop;
      decorateAlternateTracks(el, next);
      markLinesOutsideFocus(timedLines(el), latestFocusRangeRef.current);
    },
    [],
  );

  // Activity re-attaches this ref on every reveal; re-initializing the same element rebuilds its lines.
  const setElement = useCallback(
    (el: BraccatoLyricsElement | null) => {
      elementRef.current = el;
      if (!el || initializedElementRef.current === el) return;
      initializedElementRef.current = el;
      appliedLyricsRef.current = null;
      appliedSongKeyRef.current = null;
      el.host = { setResumeAffordanceVisible: setIsAutoscrollPaused };
      applyLyrics(
        el,
        latestLyricsRef.current,
        latestSongwritersRef.current,
        latestSongKeyRef.current,
        latestLanguageRef.current,
      );
    },
    [applyLyrics],
  );

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;
    el.addEventListener("braccato:line-click", handleLineClick);
    el.addEventListener("braccato:lyrics-loaded", handleLyricsLoaded);
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("braccato:line-click", handleLineClick);
      el.removeEventListener("braccato:lyrics-loaded", handleLyricsLoaded);
      el.removeEventListener("scroll", handleScroll);
      clearResumeWake();
    };
  }, [handleLineClick, handleLyricsLoaded, handleScroll, clearResumeWake]);

  useEffect(() => {
    // The element upgrades once the registration import resolves, long after the mount
    // wake expired, so the first frame that can address its accessors has to be asked for.
    void ensureBraccatoRegistered().then((registered) => {
      setIsElementUnavailable(!registered);
      if (registered) wake();
    });
  }, []);

  useEffect(() => {
    latestLyricsRef.current = lyrics;
    latestLanguageRef.current = language;
    latestSongwritersRef.current = songwriters;
    latestSongKeyRef.current = songKey;
    const element = elementRef.current;
    if (element) applyLyrics(element, lyrics, songwriters, songKey, language);
  }, [lyrics, language, songwriters, songKey, applyLyrics]);

  // Binding `source` would make braccato own the clock, and it only polls during
  // playback, freezing the preview whenever the timeline is scrubbed paused.
  // The tick reads the scroller before it writes, so it runs in the read phase, ahead of every frame-loop write.
  useFrameLoop(
    {
      read: () => {
        const el = elementRef.current;
        const audio = playback.sample();
        if (!el || !audio) return;
        appliedTickRef.current = tickBraccato(el, audio, appliedTickRef.current);
      },
      write: skipWritePhase,
    },
    "braccato-renderer",
  );

  return (
    <div data-lyrics-layout={layout} className="relative flex flex-col flex-1 min-h-0">
      {isElementUnavailable ? (
        <PreviewLoadFailed />
      ) : (
        <braccato-lyrics ref={setElement} theme={braccatoTheme} className={LYRICS_ELEMENT_CLASS[layout]} />
      )}
      <AnimatePresence>
        {isAutoscrollPaused ? (
          <m.div
            key="resume-autoscroll"
            variants={reducedMotion ? centeredFadeVariants : centeredSlideUpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={springSnappy}
            className={cn("absolute left-1/2 z-10", layout === "sidebar" ? "bottom-3" : "bottom-6")}
          >
            {layout === "sidebar" ? (
              <IconButton
                variant="secondary"
                label="Resume autoscroll"
                icon={<IconArrowDown className="size-4" />}
                onClick={resumeAutoscroll}
                className="shadow-2xl backdrop-blur-md"
              />
            ) : (
              <Button variant="secondary" hasIcon onClick={resumeAutoscroll} className="shadow-2xl backdrop-blur-md">
                <IconArrowDown className="size-4" />
                Resume autoscroll
              </Button>
            )}
          </m.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

// -- Exports ------------------------------------------------------------------

export { BraccatoRenderer };

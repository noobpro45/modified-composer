import { alternateMatchesMainText } from "@/domain/language/alternate-visibility";
import type { TimedLineElement } from "@/views/preview/focus-fade";
import { type Lyric, injectRomanization, injectTranslation } from "@braccato/core";
import type { BraccatoLyricsElement } from "@braccato/core/element";

// -- Constants -----------------------------------------------------------------

const LOG_PREFIX = "[BraccatoRenderer]";

// -- Helpers -------------------------------------------------------------------

// Must stay dynamic: registering evaluates `class ... extends HTMLElement`, which
// has no HTMLElement during the vite-react-ssg prerender and fails the build.
let registerPromise: Promise<boolean> | null = null;
function ensureBraccatoRegistered(): Promise<boolean> {
  registerPromise ??= import("@braccato/core/element").then(
    () => true,
    (error: unknown) => {
      registerPromise = null;
      console.error(LOG_PREFIX, "failed to register <braccato-lyrics>", error);
      return false;
    },
  );
  return registerPromise;
}

function skipMutations(): void {}

function decorateAlternateTracks(el: BraccatoLyricsElement, lyrics: Lyric[]): void {
  const renderer = el.renderer;
  if (!renderer) return;

  // Lines already carrying the same decoration are left untouched, and only a changed line needs a relayout.
  const decorations = new MutationObserver(skipMutations);
  decorations.observe(el, { childList: true, subtree: true });
  for (let index = 0; index < lyrics.length; index++) {
    const lyric = lyrics[index];
    const line = renderer.lines[index];
    if (!line || lyric.isInstrumental) continue;

    if (lyric.romanization && !alternateMatchesMainText(lyric.romanization, lyric.words)) {
      injectRomanization(el.ownerDocument, line.lyricElement, line, lyric.romanization, lyric.timedRomanization);
    }

    const translation = lyric.translation?.text ?? Object.values(lyric.translations ?? {})[0];
    if (translation && !alternateMatchesMainText(translation, lyric.words)) {
      injectTranslation(el.ownerDocument, line.lyricElement, translation);
    }
  }

  const changed = decorations.takeRecords().length > 0;
  decorations.disconnect();
  if (changed) renderer.relayout();
}

function timedLines(el: BraccatoLyricsElement): TimedLineElement[] {
  return (el.renderer?.lines ?? []).map((line) => ({ element: line.lyricElement, startSeconds: line.time }));
}

// -- Exports -------------------------------------------------------------------

export { decorateAlternateTracks, ensureBraccatoRegistered, timedLines };

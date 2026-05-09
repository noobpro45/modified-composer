import { useProjectStore } from "@/stores/project";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { Scroll } from "@/ui/scroll";
import { findRepeatingStandaloneSections, type RepeatingSection } from "@/views/timeline/repeating-sections";
import { IconBulb, IconLink, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";

const INLINE_LINE_MAX = 32;
const MODAL_LINE_MAX = 80;
const MODAL_LINE_LIMIT = 6;

const GroupingSuggestionsBanner: React.FC = () => {
  const lines = useProjectStore((s) => s.lines);
  const groupRepeatingSections = useProjectStore((s) => s.groupRepeatingSections);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);

  const suggestions = useMemo(() => findRepeatingStandaloneSections(lines), [lines]);
  const visible = useMemo(
    () => suggestions.filter((s) => !dismissedKeys.has(suggestionKey(s))),
    [suggestions, dismissedKeys],
  );

  if (visible.length === 0) return null;

  const dismissOne = (s: RepeatingSection) => setDismissedKeys((prev) => new Set(prev).add(suggestionKey(s)));

  const dismissAll = () =>
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      for (const s of visible) next.add(suggestionKey(s));
      return next;
    });

  const acceptOne = (s: RepeatingSection) => {
    groupRepeatingSections(s.starts, s.length);
  };

  if (visible.length === 1) {
    const only = visible[0];
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-composer-border bg-composer-accent/8 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <IconBulb className="w-4 h-4 shrink-0 text-composer-accent" />
          <span className="text-composer-text truncate">{summarizeInline(only)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="primary" hasIcon onClick={() => acceptOne(only)}>
            <IconLink className="w-3.5 h-3.5" />
            Group them
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => dismissOne(only)}
            className="h-7 w-7"
            aria-label="Dismiss suggestion"
          >
            <IconX className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-composer-border bg-composer-accent/8 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <IconBulb className="w-4 h-4 shrink-0 text-composer-accent" />
          <span className="text-composer-text truncate">
            Found {visible.length} grouping suggestions across your lyrics
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
            Review {visible.length}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={dismissAll}
            className="h-7 w-7"
            aria-label="Dismiss all suggestions"
          >
            <IconX className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <SuggestionsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        suggestions={visible}
        onAccept={acceptOne}
        onDismiss={dismissOne}
      />
    </>
  );
};

interface SuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: RepeatingSection[];
  onAccept: (s: RepeatingSection) => void;
  onDismiss: (s: RepeatingSection) => void;
}

const SuggestionsModal: React.FC<SuggestionsModalProps> = ({ isOpen, onClose, suggestions, onAccept, onDismiss }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Grouping suggestions" className="max-w-xl" bodyClassName="p-0">
      <div className="px-5 py-3 border-b border-composer-border flex items-center gap-2 text-sm text-composer-text-muted">
        <IconBulb className="w-4 h-4 text-composer-accent" />
        <span>
          {suggestions.length} repeating section{suggestions.length === 1 ? "" : "s"} detected. Group them to keep edits
          in sync.
        </span>
      </div>
      <Scroll className="max-h-[60vh]">
        <ul className="divide-y divide-composer-border">
          {suggestions.map((s) => (
            <li key={suggestionKey(s)} className="flex flex-col gap-2 px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex flex-col gap-0.5">
                  <span className="text-sm text-composer-text">
                    {s.starts.length} runs · {s.length} line{s.length === 1 ? "" : "s"} each
                  </span>
                  <span className="text-xs text-composer-text-muted">
                    At lines {s.starts.map((start) => `${start + 1} to ${start + s.length}`).join(", ")}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="primary" hasIcon onClick={() => onAccept(s)}>
                    <IconLink className="w-3.5 h-3.5" />
                    Group
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDismiss(s)}
                    className="h-7 w-7"
                    aria-label="Dismiss suggestion"
                  >
                    <IconX className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <BlockPreview lines={s.previewLines} />
            </li>
          ))}
        </ul>
      </Scroll>
    </Modal>
  );
};

const BlockPreview: React.FC<{ lines: string[] }> = ({ lines }) => {
  const display = collapseLines(lines, MODAL_LINE_LIMIT);
  return (
    <div className="rounded-md border border-composer-border bg-composer-bg-elevated/60 px-3 py-2 text-xs text-composer-text-secondary whitespace-pre-wrap break-words">
      {display.map((entry, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable order from collapseLines
        <div key={idx} className={entry.kind === "ellipsis" ? "text-composer-text-muted" : undefined}>
          {entry.kind === "line" ? truncate(entry.text.trim() || "(empty line)", MODAL_LINE_MAX) : "…"}
        </div>
      ))}
    </div>
  );
};

function suggestionKey(s: RepeatingSection): string {
  return `${s.starts.join(",")}:${s.length}`;
}

function summarizeInline(s: RepeatingSection): React.ReactNode {
  const trimmedLines = s.previewLines.map((t) => t.trim() || "(empty line)");
  const lengthSuffix = ` (${s.length} line${s.length === 1 ? "" : "s"} each)`;

  if (trimmedLines.length === 1) {
    return (
      <>
        {s.starts.length} runs of{" "}
        <span className="text-composer-text-secondary">"{truncate(trimmedLines[0], INLINE_LINE_MAX)}"</span>
      </>
    );
  }

  if (trimmedLines.length === 2) {
    return (
      <>
        {s.starts.length} runs of{" "}
        <span className="text-composer-text-secondary">"{truncate(trimmedLines[0], INLINE_LINE_MAX)}"</span> /{" "}
        <span className="text-composer-text-secondary">"{truncate(trimmedLines[1], INLINE_LINE_MAX)}"</span>
        {lengthSuffix}
      </>
    );
  }

  const first = truncate(trimmedLines[0], INLINE_LINE_MAX);
  const last = truncate(trimmedLines[trimmedLines.length - 1], INLINE_LINE_MAX);
  return (
    <>
      {s.starts.length} runs of <span className="text-composer-text-secondary">"{first}"</span> ...{" "}
      <span className="text-composer-text-secondary">"{last}"</span>
      {lengthSuffix}
    </>
  );
}

type CollapsedEntry = { kind: "line"; text: string } | { kind: "ellipsis" };

function collapseLines(lines: string[], limit: number): CollapsedEntry[] {
  if (lines.length <= limit) return lines.map((text) => ({ kind: "line", text }));
  const head = Math.ceil((limit - 1) / 2);
  const tail = Math.floor((limit - 1) / 2);
  const out: CollapsedEntry[] = [];
  for (let i = 0; i < head; i++) out.push({ kind: "line", text: lines[i] });
  out.push({ kind: "ellipsis" });
  for (let i = lines.length - tail; i < lines.length; i++) out.push({ kind: "line", text: lines[i] });
  return out;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trim()}…`;
}

export { GroupingSuggestionsBanner };

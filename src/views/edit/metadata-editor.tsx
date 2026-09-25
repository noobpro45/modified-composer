import { useProjectStore } from "@/stores/project";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushPendingSave } from "@/lib/persistence-debounce";
import { autoUpdate, flip, FloatingPortal, offset, shift, useFloating } from "@floating-ui/react";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";
import { Scroll } from "@/ui/scroll";
import { cn } from "@/utils/cn";

const LANGUAGE_PRESETS = [
  { code: "en", name: "English" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "id", name: "Indonesian" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "tr", name: "Turkish" },
  { code: "ms", name: "Malay" },
  { code: "tl", name: "Tagalog" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "sv", name: "Swedish" },
];

const MetadataEditor: React.FC = () => {
  const metadata = useProjectStore((s) => s.metadata);
  const setMetadata = useProjectStore((s) => s.setMetadata);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "bottom-end",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMetadata({ title: e.target.value });
      flushPendingSave();
    },
    [setMetadata],
  );

  const handleArtistChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMetadata({ artist: e.target.value });
      flushPendingSave();
    },
    [setMetadata],
  );

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMetadata({ language: e.target.value });
      flushPendingSave();
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [setMetadata],
  );

  const handleSelectPreset = useCallback(
    (code: string) => {
      setMetadata({ language: code });
      flushPendingSave();
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [setMetadata],
  );

  const query = (metadata.language || "").trim().toLowerCase();
  const filteredPresets = useMemo(() => {
    if (!query) return LANGUAGE_PRESETS;
    return LANGUAGE_PRESETS.filter(
      (p) => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query),
    );
  }, [query]);

  // Keep highlighted item in view when navigating with keyboard
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (filteredPresets.length > 0 ? (prev + 1) % filteredPresets.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        filteredPresets.length > 0 ? (prev <= 0 ? filteredPresets.length - 1 : prev - 1) : -1,
      );
    } else if (e.key === "Enter" && filteredPresets.length > 0 && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelectPreset(filteredPresets[highlightedIndex].code);
    }
  };

  return (
    <div className="flex gap-4 p-4 border rounded-lg border-composer-border bg-composer-bg-dark mb-4">
      <div className="flex-1">
        <label htmlFor="metadata-title" className="block text-xs font-medium text-composer-text-secondary mb-1">
          Title
        </label>
        <input
          id="metadata-title"
          type="text"
          value={metadata.title || ""}
          onChange={handleTitleChange}
          placeholder="Song Title"
          autoComplete="off"
          spellCheck={false}
          className="w-full h-8 px-2 text-sm rounded bg-composer-input border border-composer-border focus:outline-none focus:border-composer-accent"
        />
      </div>
      <div className="flex-1">
        <label htmlFor="metadata-artist" className="block text-xs font-medium text-composer-text-secondary mb-1">
          Artist
        </label>
        <input
          id="metadata-artist"
          type="text"
          value={metadata.artist || ""}
          onChange={handleArtistChange}
          placeholder="Artist Name"
          autoComplete="off"
          spellCheck={false}
          className="w-full h-8 px-2 text-sm rounded bg-composer-input border border-composer-border focus:outline-none focus:border-composer-accent"
        />
      </div>
      <div className="w-32 shrink-0">
        <label htmlFor="metadata-language" className="block text-xs font-medium text-composer-text-secondary mb-1">
          Language
        </label>
        <div ref={containerRef} className="relative flex items-center">
          <input
            id="metadata-language"
            ref={(node) => {
              inputRef.current = node;
              refs.setReference(node);
            }}
            type="text"
            value={metadata.language || ""}
            onChange={handleLanguageChange}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. en"
            autoComplete="off"
            spellCheck={false}
            className="w-full h-8 pl-2.5 pr-7 text-sm rounded bg-composer-input border border-composer-border focus:outline-none focus:border-composer-accent font-mono transition-colors"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Show presets"
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen) {
                inputRef.current?.focus();
              }
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-composer-text-muted hover:text-composer-text transition-colors cursor-pointer rounded flex items-center justify-center"
          >
            <IconChevronDown className={cn("size-3.5 transition-transform duration-150", isOpen && "rotate-180")} />
          </button>
        </div>

        {isOpen && (
          <FloatingPortal>
            <div
              ref={(node) => {
                refs.setFloating(node);
                menuRef.current = node;
              }}
              style={floatingStyles}
              className="z-100 w-56 border select-none shadow-2xl rounded-xl bg-composer-bg border-composer-border overflow-hidden"
            >
              <Scroll className="max-h-60 composer-scrollbar" autoHide="leave">
                <div className="flex flex-col gap-0.5 p-1">
                  {filteredPresets.length > 0 ? (
                    filteredPresets.map((opt, index) => {
                      const isSelected = metadata.language?.toLowerCase() === opt.code.toLowerCase();
                      const isHighlighted = highlightedIndex === index;
                      return (
                        <button
                          key={opt.code}
                          ref={(node) => {
                            itemRefs.current[index] = node;
                          }}
                          type="button"
                          className={cn(
                            "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer text-left",
                            isHighlighted && !isSelected && "bg-composer-button",
                            isSelected
                              ? "bg-composer-accent/15 text-composer-accent font-medium"
                              : "text-composer-text hover:bg-composer-button",
                          )}
                          onMouseEnter={() => setHighlightedIndex(index)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onClick={() => handleSelectPreset(opt.code)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-composer-input border border-composer-border text-composer-text shrink-0">
                              {opt.code}
                            </span>
                            <span className="truncate text-xs text-composer-text-secondary">{opt.name}</span>
                          </div>
                          {isSelected && <IconCheck className="size-3.5 shrink-0 text-composer-accent" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-xs text-composer-text-muted text-center">
                      Custom code:{" "}
                      <span className="font-mono text-composer-text font-semibold">{metadata.language}</span>
                    </div>
                  )}
                </div>
              </Scroll>
            </div>
          </FloatingPortal>
        )}
      </div>
    </div>
  );
};

export { MetadataEditor };

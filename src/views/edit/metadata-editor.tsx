import { useProjectStore } from "@/stores/project";
import { useCallback } from "react";
import { flushPendingSave } from "@/lib/persistence-debounce";

const MetadataEditor: React.FC = () => {
  const metadata = useProjectStore((s) => s.metadata);
  const setMetadata = useProjectStore((s) => s.setMetadata);

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
    },
    [setMetadata],
  );

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
      <div className="w-48">
        <label htmlFor="metadata-language" className="block text-xs font-medium text-composer-text-secondary mb-1">
          Language
        </label>
        <input
          id="metadata-language"
          type="text"
          list="metadata-language-presets"
          value={metadata.language || ""}
          onChange={handleLanguageChange}
          placeholder="e.g. en, ja, ko"
          autoComplete="off"
          spellCheck={false}
          className="w-full h-8 px-2 text-sm rounded bg-composer-input border border-composer-border focus:outline-none focus:border-composer-accent font-mono"
        />
        <datalist id="metadata-language-presets">
          <option value="en">English (en)</option>
          <option value="ja">Japanese (ja)</option>
          <option value="ko">Korean (ko)</option>
          <option value="es">Spanish (es)</option>
          <option value="zh">Chinese (zh)</option>
          <option value="fr">French (fr)</option>
          <option value="de">German (de)</option>
          <option value="id">Indonesian (id)</option>
          <option value="it">Italian (it)</option>
          <option value="pt">Portuguese (pt)</option>
          <option value="ru">Russian (ru)</option>
          <option value="th">Thai (th)</option>
          <option value="vi">Vietnamese (vi)</option>
        </datalist>
      </div>
    </div>
  );
};

export { MetadataEditor };

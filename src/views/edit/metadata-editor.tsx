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
          className="w-full h-8 px-2 text-sm rounded bg-composer-input border border-composer-border focus:outline-none focus:border-composer-accent"
        />
      </div>
    </div>
  );
};

export { MetadataEditor };

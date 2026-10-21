import { IconButton } from "@/ui/icon-button";
import { ProjectBreadcrumb } from "@/ui/projects/project-breadcrumb";
import { type AppScreen, LIBRARY_PATH } from "@/utils/app-routes";
import { IconHelp, IconMinus, IconRoute, IconSettings, IconSquare, IconX } from "@tabler/icons-react";
import { Link } from "react-router-dom";

// -- Types --------------------------------------------------------------------

interface AppHeaderActions {
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
  onTourStart: () => void;
}

interface AppHeaderProps extends AppHeaderActions {
  screen: AppScreen;
}

// -- Sub-components -------------------------------------------------------------

const EditorBrand: React.FC = () => (
  <div className="flex items-center gap-2 min-w-0">
    <h1 className="shrink-0">
      <img src="/logo.svg" alt="Composer Logo" className="block size-6" />
      <span className="sr-only">Composer</span>
    </h1>
    <ProjectBreadcrumb />
  </div>
);

const LibraryBrand: React.FC = () => (
  <Link
    to={LIBRARY_PATH}
    aria-label="Composer, Projects"
    className="inline-flex items-center gap-2 text-xl font-bold text-composer-text cursor-pointer"
  >
    <img src="/logo.svg" alt="" className="block size-6" />
    Composer
  </Link>
);

// -- Component ----------------------------------------------------------------

const AppHeader: React.FC<AppHeaderProps> = ({ screen, onSettingsOpen, onHelpOpen, onTourStart }) => {
  const isWails = typeof window !== "undefined" && typeof window.runtime !== "undefined";

  return (
    <header
      className="flex items-center justify-between gap-4 p-4 border-b select-none border-composer-border"
      style={isWails ? ({ "--wails-draggable": "drag" } as React.CSSProperties) : undefined}
    >
      <div style={isWails ? ({ "--wails-draggable": "no-drag" } as React.CSSProperties) : undefined}>
        {screen === "editor" ? <EditorBrand /> : <LibraryBrand />}
      </div>
      <div
        className="flex items-center gap-1 shrink-0"
        style={isWails ? ({ "--wails-draggable": "no-drag" } as React.CSSProperties) : undefined}
      >
        <IconButton
          label="Settings"
          icon={<IconSettings className="size-5" />}
          variant="ghost"
          onClick={onSettingsOpen}
        />
        <IconButton
          label="Product tour"
          icon={<IconRoute className="size-5" />}
          variant="ghost"
          onClick={onTourStart}
        />
        <IconButton
          label="Keyboard shortcuts (?)"
          icon={<IconHelp className="size-5" />}
          variant="ghost"
          onClick={onHelpOpen}
        />
        {isWails && (
          <>
            <div className="w-px h-5 bg-composer-border mx-1" />
            <IconButton
              label="Minimize"
              icon={<IconMinus className="size-4" />}
              variant="ghost"
              onClick={() => window.runtime?.WindowMinimise()}
            />
            <IconButton
              label="Maximize"
              icon={<IconSquare className="size-3.5" />}
              variant="ghost"
              onClick={() => window.runtime?.WindowToggleMaximise()}
            />
            <IconButton
              label="Close"
              icon={<IconX className="size-4" />}
              variant="ghost"
              className="hover:bg-red-500 hover:text-white"
              onClick={() => window.runtime?.Quit()}
            />
          </>
        )}
      </div>
    </header>
  );
};

// -- Exports ------------------------------------------------------------------

export { AppHeader };

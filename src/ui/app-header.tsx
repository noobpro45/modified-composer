import { IconButton } from "@/ui/icon-button";
import { ProjectBreadcrumb } from "@/ui/projects/project-breadcrumb";
import { TabBar } from "@/ui/tab-bar";
import { ThemeMenu } from "@/ui/theme-menu";
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
  <div className="flex items-center gap-3 min-w-0">
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
    className="inline-flex items-center gap-3 text-[19px] font-bold tracking-[-0.01em] text-composer-text cursor-pointer"
  >
    <img src="/logo.svg" alt="" className="block size-6" />
    Composer
  </Link>
);

// -- Component ----------------------------------------------------------------

const HEADER_ICON_STYLES = "size-9 rounded-[10px] text-(--muted) hover:text-composer-text hover:bg-(--layer-2)";

const AppHeader: React.FC<AppHeaderProps> = ({ screen, onSettingsOpen, onHelpOpen, onTourStart }) => {
  const isWails = typeof window !== "undefined" && typeof window.runtime !== "undefined";

  return (
    <header
      className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 h-14 shrink-0 pl-4 pr-3 select-none"
      style={isWails ? ({ "--wails-draggable": "drag" } as React.CSSProperties) : undefined}
    >
      <div style={isWails ? ({ "--wails-draggable": "no-drag" } as React.CSSProperties) : undefined}>
        {screen === "editor" ? <EditorBrand /> : <LibraryBrand />}
      </div>
      <div style={isWails ? ({ "--wails-draggable": "no-drag" } as React.CSSProperties) : undefined}>
        {screen === "editor" ? <TabBar /> : <span />}
      </div>
      <div
        className="flex items-center justify-end gap-1 min-w-0"
        style={isWails ? ({ "--wails-draggable": "no-drag" } as React.CSSProperties) : undefined}
      >
        <ThemeMenu />
        <IconButton
          label="Settings"
          icon={<IconSettings className="size-[18px]" />}
          variant="ghost"
          onClick={onSettingsOpen}
          className={HEADER_ICON_STYLES}
        />
        <IconButton
          label="Product tour"
          icon={<IconRoute className="size-[18px]" />}
          variant="ghost"
          onClick={onTourStart}
          className={HEADER_ICON_STYLES}
        />
        <IconButton
          label="Keyboard shortcuts (?)"
          icon={<IconHelp className="size-[18px]" />}
          variant="ghost"
          onClick={onHelpOpen}
          className={HEADER_ICON_STYLES}
        />
        {isWails && (
          <>
            <div className="w-px h-5 bg-composer-border mx-1" />
            <IconButton
              label="Minimize"
              icon={<IconMinus className="size-4" />}
              variant="ghost"
              className={HEADER_ICON_STYLES}
              onClick={() => window.runtime?.WindowMinimise()}
            />
            <IconButton
              label="Maximize"
              icon={<IconSquare className="size-3.5" />}
              variant="ghost"
              className={HEADER_ICON_STYLES}
              onClick={() => window.runtime?.WindowToggleMaximise()}
            />
            <IconButton
              label="Close"
              icon={<IconX className="size-4" />}
              variant="ghost"
              className={`${HEADER_ICON_STYLES} hover:bg-red-500 hover:text-white`}
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

import { Button } from "@/ui/button";
import { IconHome, IconHelp, IconMinus, IconSettings, IconSquare, IconX } from "@tabler/icons-react";
import { useProjectStore } from "@/stores/project";
import { useAudioStore } from "@/stores/audio";
import { Quit, WindowMinimise, WindowToggleMaximise } from "@/wailsjs/runtime/runtime";

interface AppHeaderProps {
  onSettingsOpen: () => void;
  onHelpOpen: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onSettingsOpen, onHelpOpen }) => {
  const handleGoHome = () => {
    useAudioStore.getState().setIsPlaying(false);
    useProjectStore.getState().setActiveTab("home");
  };

  return (
    <header
      className="flex items-center justify-between p-4 border-b select-none border-composer-border"
      style={{ "--wails-draggable": "drag" } as React.CSSProperties}
    >
      <h1 
        className="text-xl font-semibold flex items-center gap-2 cursor-pointer hover:text-composer-accent transition-colors"
        style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}
        onClick={handleGoHome}
        title="Return to Home"
      >
        <img src="/logo.svg" alt="Composer Logo" className="size-6" />
        Composer
      </h1>
      <div className="flex items-center gap-1" style={{ "--wails-draggable": "no-drag" } as React.CSSProperties}>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={handleGoHome} 
          title="Home"
        >
          <IconHome className="size-5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onSettingsOpen} title="Settings">
          <IconSettings className="size-5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onHelpOpen} title="Keyboard shortcuts (?)">
          <IconHelp className="size-5" />
        </Button>
      
      {/* Window Controls */}
      {(window as any).runtime && (
        <>
          <div className="w-px h-6 bg-composer-border mx-1" />
          <Button size="icon" variant="ghost" onClick={WindowMinimise} title="Minimize">
            <IconMinus className="size-5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={WindowToggleMaximise} title="Maximize">
            <IconSquare className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" className="hover:bg-red-500 hover:text-white" onClick={Quit} title="Close">
            <IconX className="size-5" />
          </Button>
        </>
      )}
    </div>
  </header>
  );
};

export { AppHeader };

import { useProjectStore, loadSavedProjectToStore } from "@/stores/project";
import { useAudioStore } from "@/stores/audio";
import { useRecentProjectsStore } from "@/stores/recent-projects";
import { importProjectFromText } from "@/lib/persistence";
import { useConfirm } from "@/stores/confirm-store";
import { Button } from "@/ui/button";
import { IconFilePlus, IconFolderOpen, IconHistory, IconPlayerPlayFilled } from "@tabler/icons-react";

const HomePanel: React.FC = () => {
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const resetProject = useProjectStore((s) => s.reset);
  const resetAudio = useAudioStore((s) => s.reset);
  const recentProjects = useRecentProjectsStore((s) => s.projects);
  const addProject = useRecentProjectsStore((s) => s.addProject);
  const removeProject = useRecentProjectsStore((s) => s.removeProject);
  const clearAll = useRecentProjectsStore((s) => s.clearAll);
  
  const hasActiveProject = useProjectStore((s) => s.lines.length > 0 || !!s.metadata.title);
  const confirm = useConfirm();

  const handleOpenProject = async () => {
    try {
      const path = await window.go.app.App.ShowOpenFileDialog();
      if (path) {
        const content = await window.go.app.App.ReadProjectFile(path);
        const project = importProjectFromText(content);
        
        loadSavedProjectToStore(project, path);
        if (project.audioSource?.kind === "youtube") {
          useAudioStore.getState().setYouTubeSource(project.audioSource.videoId);
        } else {
          useAudioStore.getState().setSource(null);
        }
        
        addProject(path, project.metadata.title || path.split(/[\/\\]/).pop() || path);
        setActiveTab("edit");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenRecentProject = async (projPath: string) => {
    try {
      const content = await window.go.app.App.ReadProjectFile(projPath);
      const project = importProjectFromText(content);
      
      loadSavedProjectToStore(project, projPath);
      if (project.audioSource?.kind === "youtube") {
        useAudioStore.getState().setYouTubeSource(project.audioSource.videoId);
      } else {
        useAudioStore.getState().setSource(null);
      }
      
      addProject(projPath, project.metadata.title || projPath.split(/[\/\\]/).pop() || projPath);
      setActiveTab("edit");
    } catch (e) {
      console.error(e);
      // If it fails, maybe the file was deleted or moved.
    }
  };

  const handleNewProject = async () => {
    if (hasActiveProject) {
      const ok = await confirm({
        title: "Discard Active Project?",
        description: "You have an active project loaded. Creating a new project will wipe your current session. Are you sure you want to discard it?",
        confirmLabel: "Start Fresh",
        cancelLabel: "Cancel",
        variant: "destructive",
      });
      if (!ok) return;
    }
    resetProject();
    resetAudio();
    setActiveTab("import");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-2xl w-full flex flex-col gap-12">
        <div className="flex flex-col items-center text-center gap-4">
          <img src="/logo.svg" alt="Composer Logo" className="size-24 opacity-80" />
          <h1 className="text-4xl font-semibold text-composer-text">Composer</h1>
          <p className="text-composer-text-muted">The native visual editor for synchronized lyrics.</p>
        </div>

        <div className="flex gap-4 justify-center">
          {hasActiveProject && (
            <Button className="gap-2 px-8 py-3 h-auto bg-composer-accent hover:bg-composer-accent-hover text-white" onClick={() => setActiveTab("edit")}>
              <IconPlayerPlayFilled className="size-5" />
              Resume Active Project
            </Button>
          )}
          <Button variant={hasActiveProject ? "secondary" : "primary"} className="gap-2 px-8 py-3 h-auto" onClick={handleNewProject}>
            <IconFilePlus className="size-5" />
            New Project
          </Button>
          <Button variant="secondary" className="gap-2 px-8 py-3 h-auto" onClick={handleOpenProject}>
            <IconFolderOpen className="size-5" />
            Open Project
          </Button>
        </div>

        {recentProjects.length > 0 && (
          <div className="flex flex-col gap-4 mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <IconHistory className="size-5 text-composer-text-muted" />
                Recent Projects
              </h2>
              <Button variant="ghost" size="sm" onClick={clearAll}>Clear All</Button>
            </div>
            <div className="flex flex-col gap-2">
              {recentProjects.map((proj) => (
                <div
                  key={proj.path}
                  onClick={() => handleOpenRecentProject(proj.path)}
                  className="flex items-center justify-between p-3 rounded-xl bg-composer-input border border-composer-border hover:border-composer-accent transition-colors cursor-pointer group"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate">{proj.title}</span>
                    <span className="text-xs text-composer-text-muted truncate">{proj.path}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProject(proj.path);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { HomePanel };

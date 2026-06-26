import { AudioEngine } from "@/audio/audio-engine";
import { AudioPlayer } from "@/audio/audio-player";
import { useAutoSeparate } from "@/hooks/useAutoSeparate";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useImportFromHash } from "@/hooks/useImportFromHash";
import { useImportFromQuery } from "@/hooks/useImportFromQuery";
import { useImportFromYouTube } from "@/hooks/useImportFromYouTube";
import { usePanicRecovery } from "@/hooks/usePanicRecovery";
import { usePersistence } from "@/hooks/usePersistence";
import { useResolveYouTubeTunnel } from "@/hooks/useResolveYouTubeTunnel";
import { useVocalOnsetSnapPoints } from "@/hooks/useVocalOnsetSnapPoints";
import { useAudioStore } from "@/stores/audio";
import { useProjectStore } from "@/stores/project";
import { useUIStore } from "@/stores/ui";
import { GuideCard } from "@/tour/guide-card";
import { useTour } from "@/tour/use-tour";
import "@/tour/tour-theme.css";
import { AppHeader } from "@/ui/app-header";
import { ConfirmModalHost } from "@/ui/confirm-modal";
import { DivergenceModalHost } from "@/ui/divergence-modal";
import { LyricsImportModalHost } from "@/views/lyrics-import-modal/lyrics-import-modal-host";
import { HelpModal } from "@/ui/help-modal";
import { SettingsModal } from "@/ui/settings-modal";
import { TabBar } from "@/ui/tab-bar";
import { EditPanel } from "@/views/edit";
import { ExportPanel } from "@/views/export";
import { HomePanel } from "@/views/home/home-panel";
import { ImportPanel } from "@/views/import";
import { PreviewPanel } from "@/views/preview";
import { SyncPanel } from "@/views/sync/sync-panel";
import { TimelinePanel } from "@/views/timeline/timeline-panel";
import { importProjectFromText } from "@/lib/persistence";
import { loadSavedProjectToStore } from "@/stores/project";
import { useRecentProjectsStore } from "@/stores/recent-projects";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, domAnimation } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Toaster } from "sonner";

const TABS_WITH_PLAYER = ["import", "edit", "sync", "timeline", "preview"];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

const AppContent: React.FC = () => {
  const activeTab = useProjectStore((s) => s.activeTab);
  const setActiveTab = useProjectStore((s) => s.setActiveTab);
  const source = useAudioStore((s) => s.source);
  const [helpOpen, setHelpOpen] = useState(false);
  const settingsOpen = useUIStore((s) => s.settingsOpen);
  const openSettings = useUIStore((s) => s.openSettings);
  const closeSettings = useUIStore((s) => s.closeSettings);
  const { startTour, shouldShowTour, guideCard, skipGuideCard } = useTour();
  const startTourRef = useRef(startTour);
  startTourRef.current = startTour;

  const showPlayer = source && TABS_WITH_PLAYER.includes(activeTab);

  const isDirty = useProjectStore((s) => s.isDirty);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Wait for Wails bindings to attach, or fallback after 2.5 seconds (for web dev mode)
    const startTime = Date.now();
    const checkWails = () => {
      const isWailsReady = typeof (window as any).go !== "undefined" && typeof (window as any).runtime !== "undefined";
      if (isWailsReady || Date.now() - startTime > 2500) {
        // Add a tiny final delay for React hydration to settle
        setTimeout(() => setIsMounted(true), 150);
      } else {
        setTimeout(checkWails, 50);
      }
    };
    checkWails();
  }, []);

  // Auto-start quick tour on first visit
  useEffect(() => {
    if (!shouldShowTour) return;
    const timer = setTimeout(() => startTourRef.current(), 500);
    return () => clearTimeout(timer);
  }, [shouldShowTour]);

  // Sync unsaved changes state to Wails backend for close prompt
  useEffect(() => {
    if (typeof (window as any).go !== "undefined" && (window as any).go.app?.App?.SetHasUnsavedChanges) {
      (window as any).go.app.App.SetHasUnsavedChanges(isDirty);
    }
  }, [isDirty]);

  // Handle double-clicked .composer files on startup
  useEffect(() => {
    if (typeof (window as any).go === "undefined" || !(window as any).go.app?.App) return;
    
    (window as any).go.app.App.GetStartupProjectFilePath().then(async (path: string) => {
      if (path) {
        try {
          const content = await (window as any).go.app.App.ReadProjectFile(path);
          const project = importProjectFromText(content);
          loadSavedProjectToStore(project, path);
          useRecentProjectsStore.getState().addProject(
            path, 
            project.metadata.title || path.split(/[\/\\]/).pop() || path
          );
          setActiveTab("edit");
        } catch (e) {
          console.error("Failed to load startup project:", e);
        }
      }
    });
  }, [setActiveTab]);

  usePersistence();
  useImportFromHash();
  useResolveYouTubeTunnel();
  useImportFromQuery();
  useImportFromYouTube();
  usePanicRecovery();
  useAutoSeparate();
  useDocumentTitle();
  useVocalOnsetSnapPoints();

  const setHelpOpenCb = useCallback((open: boolean) => setHelpOpen(open), []);
  const setSettingsOpenCb = useCallback(
    (open: boolean) => (open ? openSettings() : closeSettings()),
    [openSettings, closeSettings],
  );

  useGlobalShortcuts({
    setActiveTab,
    setHelpOpen: setHelpOpenCb,
    setSettingsOpen: setSettingsOpenCb,
  });

  return (
    <div className="flex flex-col h-screen bg-composer-bg text-composer-text">
      <AppHeader
        onSettingsOpen={() => openSettings()}
        onHelpOpen={() => setHelpOpen(true)}
      />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
      <SettingsModal
        key={settingsOpen ? "settings-open" : "settings-closed"}
        isOpen={settingsOpen}
        onClose={closeSettings}
        onResetTour={() => {
          localStorage.removeItem("composer-tour-seen");
          localStorage.removeItem("composer-tour-resume");
        }}
      />
      {activeTab !== "home" && <TabBar />}
      <main className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 flex flex-col" style={{ display: activeTab === "home" ? undefined : "none" }}>
          <HomePanel />
        </div>
        <div className="absolute inset-0 flex flex-col" style={{ display: activeTab === "import" ? undefined : "none" }}>
          <ImportPanel />
        </div>
        <div className="absolute inset-0 flex flex-col" style={{ display: activeTab === "edit" ? undefined : "none" }}>
          <EditPanel />
        </div>
        <div className="absolute inset-0 flex flex-col" style={{ display: activeTab === "sync" ? undefined : "none" }}>
          <SyncPanel />
        </div>
        <div className="absolute inset-0 flex flex-col" style={{ display: activeTab === "timeline" ? undefined : "none" }}>
          <TimelinePanel />
        </div>
        <div 
          className="absolute inset-0 flex flex-col" 
          style={{ 
            opacity: activeTab === "preview" ? 1 : 0,
            pointerEvents: activeTab === "preview" ? "auto" : "none",
            zIndex: activeTab === "preview" ? 10 : -1
          }}
        >
          <PreviewPanel />
        </div>
        <div className="absolute inset-0 flex flex-col" style={{ display: activeTab === "export" ? undefined : "none" }}>
          <ExportPanel />
        </div>
      </main>
      {source && <AudioEngine />}
      {showPlayer && <AudioPlayer />}
      <GuideCard state={guideCard} onSkip={skipGuideCard} />

      {!isMounted && (
        <div className="absolute inset-0 z-[9999] bg-composer-bg flex flex-col items-center justify-center">
          <img src="/logo.svg" alt="Composer Logo" className="size-24 opacity-80 animate-pulse" />
          <div className="mt-8 text-lg font-medium text-composer-text animate-pulse">Loading Composer...</div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation} strict>
        <AppContent />
        <ConfirmModalHost />
        <DivergenceModalHost />
        <LyricsImportModalHost />
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: "var(--color-composer-bg-elevated)",
              border: "1px solid var(--color-composer-border)",
              color: "var(--color-composer-text)",
            },
          }}
        />
      </LazyMotion>
    </QueryClientProvider>
  );
};

export { App };

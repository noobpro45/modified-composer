import {
  BridgeStatus,
  CookiesState,
  ForceYtdlpUpdate,
  GetConfig,
  OpenLogFile,
  RemoveCookies,
  SaveConfig,
  ShowDirectoryDialog,
  StartServer,
  StopServer,
  UploadCookies,
} from "@/wailsjs/go/app/App";
import type { app, config } from "@/wailsjs/go/models";
import { BrowserOpenURL } from "@/wailsjs/runtime/runtime";
import { isDesktop } from "@/utils/platform";
import { useCallback, useEffect, useRef, useState } from "react";

const SAVE_DEBOUNCE_MS = 300;

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseBridgeConfigResult {
  config: config.Config | null;
  loaded: boolean;
  saveStatus: SaveStatus;
  serverStatus: string;
  cookiesStatus: app.CookiesStatus | null;
  update<K extends keyof config.Config>(key: K, value: config.Config[K]): void;
  toggleServer(): Promise<void>;
  chooseDownloadDir(): Promise<void>;
  uploadCookies(content: string): Promise<void>;
  removeCookies(): Promise<void>;
  openLogFile(): Promise<void>;
  forceUpdateYtdlp(): Promise<string>;
}

export function useBridgeConfig(): UseBridgeConfigResult {
  const [cfg, setCfg] = useState<config.Config | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [serverStatus, setServerStatus] = useState<string>("unknown");
  const [cookiesStatus, setCookiesStatus] = useState<app.CookiesStatus | null>(null);

  const cfgRef = useRef<config.Config | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const saveSeqRef = useRef(0);

  const isDesktopApp = isDesktop();

  const refreshStatus = useCallback(() => {
    if (!isDesktopApp || !window.go?.app?.App) return;
    BridgeStatus()
      .then((state) => setServerStatus(state.server))
      .catch(() => setServerStatus("unknown"));
    CookiesState()
      .then((status) => setCookiesStatus(status))
      .catch(() => setCookiesStatus(null));
  }, [isDesktopApp]);

  useEffect(() => {
    if (!isDesktopApp) return;

    let cancelled = false;
    let timerId: number | null = null;

    const init = () => {
      if (cancelled) return;
      if (!window.go?.app?.App) {
        timerId = window.setTimeout(init, 50);
        return;
      }

      GetConfig()
        .then((loaded) => {
          if (cancelled) return;
          setCfg(loaded);
          cfgRef.current = loaded;
        })
        .catch((err) => {
          if (!cancelled) console.error("GetConfig failed", err);
        });

      refreshStatus();

      // Listen for live status events emitted from Wails backend
      const events = window.runtime?.EventsOn;
      if (events) {
        events("bridge:status", () => {
          if (!cancelled) refreshStatus();
        });
      }
    };

    init();

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [isDesktopApp, refreshStatus]);

  const persist = useCallback((next: config.Config) => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setSaveStatus("saving");
      const seq = ++saveSeqRef.current;
      SaveConfig(next)
        .then(() => {
          if (seq === saveSeqRef.current) setSaveStatus("saved");
        })
        .catch((err) => {
          console.error("SaveConfig failed", err);
          if (seq === saveSeqRef.current) setSaveStatus("error");
        });
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const update = useCallback(
    <K extends keyof config.Config>(key: K, value: config.Config[K]) => {
      if (!cfgRef.current) return;
      const next = { ...cfgRef.current, [key]: value } as config.Config;
      cfgRef.current = next;
      setCfg(next);
      persist(next);
    },
    [persist],
  );

  const toggleServer = useCallback(async () => {
    if (!isDesktopApp || !window.go?.app?.App) return;
    try {
      if (serverStatus === "running") {
        await StopServer();
      } else {
        await StartServer();
      }
      refreshStatus();
    } catch (err) {
      console.error("Failed to toggle bridge server:", err);
    }
  }, [isDesktopApp, serverStatus, refreshStatus]);

  const chooseDownloadDir = useCallback(async () => {
    if (!isDesktopApp || !window.go?.app?.App) return;
    try {
      const selected = await ShowDirectoryDialog(cfgRef.current?.download_dir || "");
      if (selected) {
        update("download_dir", selected);
      }
    } catch (err) {
      console.error("Failed to choose directory:", err);
    }
  }, [isDesktopApp, update]);

  const uploadCookies = useCallback(
    async (content: string) => {
      if (!isDesktopApp || !window.go?.app?.App) return;
      await UploadCookies(content);
      refreshStatus();
    },
    [isDesktopApp, refreshStatus],
  );

  const removeCookies = useCallback(async () => {
    if (!isDesktopApp || !window.go?.app?.App) return;
    await RemoveCookies();
    refreshStatus();
  }, [isDesktopApp, refreshStatus]);

  const openLogFile = useCallback(async () => {
    if (!isDesktopApp || !window.go?.app?.App) return;
    try {
      const url = await OpenLogFile();
      if (url) {
        if (typeof window !== "undefined" && window.runtime?.BrowserOpenURL) {
          window.runtime.BrowserOpenURL(url);
        } else {
          BrowserOpenURL(url);
        }
      }
    } catch (err) {
      console.error("Failed to open log file:", err);
    }
  }, [isDesktopApp]);

  const forceUpdateYtdlp = useCallback(async () => {
    if (!isDesktopApp || !window.go?.app?.App) return "";
    return ForceYtdlpUpdate();
  }, [isDesktopApp]);

  return {
    config: cfg,
    loaded: cfg !== null,
    saveStatus,
    serverStatus,
    cookiesStatus,
    update,
    toggleServer,
    chooseDownloadDir,
    uploadCookies,
    removeCookies,
    openLogFile,
    forceUpdateYtdlp,
  };
}

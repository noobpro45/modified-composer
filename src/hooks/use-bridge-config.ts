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

  const isDesktop = typeof window !== "undefined" && Boolean(window.go?.app?.App);

  const refreshStatus = useCallback(() => {
    if (!isDesktop) return;
    BridgeStatus()
      .then((state) => setServerStatus(state.server))
      .catch(() => setServerStatus("unknown"));
    CookiesState()
      .then((status) => setCookiesStatus(status))
      .catch(() => setCookiesStatus(null));
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;

    let cancelled = false;
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

    return () => {
      cancelled = true;
    };
  }, [isDesktop, refreshStatus]);

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
    if (!isDesktop) return;
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
  }, [isDesktop, serverStatus, refreshStatus]);

  const chooseDownloadDir = useCallback(async () => {
    if (!isDesktop) return;
    try {
      const selected = await ShowDirectoryDialog(cfgRef.current?.download_dir || "");
      if (selected) {
        update("download_dir", selected);
      }
    } catch (err) {
      console.error("Failed to choose directory:", err);
    }
  }, [isDesktop, update]);

  const uploadCookies = useCallback(
    async (content: string) => {
      if (!isDesktop) return;
      await UploadCookies(content);
      refreshStatus();
    },
    [isDesktop, refreshStatus],
  );

  const removeCookies = useCallback(async () => {
    if (!isDesktop) return;
    await RemoveCookies();
    refreshStatus();
  }, [isDesktop, refreshStatus]);

  const openLogFile = useCallback(async () => {
    if (!isDesktop) return;
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
  }, [isDesktop]);

  const forceUpdateYtdlp = useCallback(async () => {
    if (!isDesktop) return "";
    return ForceYtdlpUpdate();
  }, [isDesktop]);

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

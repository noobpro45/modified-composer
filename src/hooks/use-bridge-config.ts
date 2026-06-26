import { useCallback, useEffect, useRef, useState } from "react";
import { GetConfig, SaveConfig } from "@/wailsjs/go/app/App";
import type { config } from "@/wailsjs/go/models";

const SAVE_DEBOUNCE_MS = 300;

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseBridgeConfigResult {
  config: config.Config | null;
  loaded: boolean;
  saveStatus: SaveStatus;
  update<K extends keyof config.Config>(key: K, value: config.Config[K]): void;
}

export function useBridgeConfig(): UseBridgeConfigResult {
  const [cfg, setCfg] = useState<config.Config | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const cfgRef = useRef<config.Config | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Only fetch config if running inside Wails
    if (typeof (window as any).go === "undefined" || !(window as any).go.app?.App) {
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
    return () => {
      cancelled = true;
    };
  }, []);

  const saveSeqRef = useRef(0);
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

  return { config: cfg, loaded: cfg !== null, saveStatus, update };
}

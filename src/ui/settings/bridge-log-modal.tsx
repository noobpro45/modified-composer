import { BuildDiagnosticReport, OpenLogFile, OpenLogFolder, ReadLogFile } from "@/wailsjs/go/app/App";
import { Button } from "@/ui/button";
import { Modal } from "@/ui/modal";
import { Scroll } from "@/ui/scroll";
import { Select } from "@/ui/select";
import { LEVEL_STYLES, LOG_LEVELS, parseLogLine } from "@/ui/settings/bridge-log-helpers";
import { cn } from "@/utils/cn";
import {
  IconCheck,
  IconCopy,
  IconFileText,
  IconFolder,
  IconLoader2,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface BridgeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logLevel?: string;
  onLogLevelChange?: (level: string) => void;
}

export const BridgeLogModal: React.FC<BridgeLogModalProps> = ({ isOpen, onClose, logLevel, onLogLevelChange }) => {
  const [tab, setTab] = useState<"logs" | "diagnostics">("logs");
  const [loading, setLoading] = useState(false);
  const [rawLogs, setRawLogs] = useState("");
  const [diagnostics, setDiagnostics] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsText, diagText] = await Promise.all([
        ReadLogFile().catch(() => ""),
        BuildDiagnosticReport().catch(() => ""),
      ]);
      setRawLogs(logsText || "");
      setDiagnostics(diagText || "");
    } catch {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void loadData();
  }, [isOpen, loadData]);

  const parsedEntries = useMemo(() => {
    return rawLogs
      ? rawLogs
          .split("\n")
          .map(parseLogLine)
          .filter((e) => e.raw.length > 0)
      : [];
  }, [rawLogs]);

  const filteredEntries = useMemo(() => {
    return parsedEntries.filter((entry) => {
      if (filterLevel !== "ALL" && entry.level !== filterLevel) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        if (!entry.msg?.toLowerCase().includes(query) && !entry.raw.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [parsedEntries, filterLevel, searchQuery]);

  const handleCopy = async () => {
    const textToCopy = tab === "logs" ? rawLogs : diagnostics;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success(tab === "logs" ? "Logs copied" : "Diagnostics copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpenInEditor = async () => {
    try {
      await OpenLogFile();
      toast.success("Opened bridge.log in default editor");
    } catch {
      toast.error("Failed to open editor");
    }
  };

  const handleOpenFolder = async () => {
    try {
      await OpenLogFolder();
    } catch {
      toast.error("Failed to open folder");
    }
  };

  const headerAccessory = (
    <div className="flex items-center gap-1 ml-4 bg-composer-bg p-0.5 rounded-lg border border-composer-border/50 text-xs select-none">
      <button
        type="button"
        onClick={() => setTab("logs")}
        className={cn(
          "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
          tab === "logs"
            ? "bg-composer-button text-composer-text shadow-sm"
            : "text-composer-text-muted hover:text-composer-text",
        )}
      >
        Logs ({parsedEntries.length})
      </button>
      <button
        type="button"
        onClick={() => setTab("diagnostics")}
        className={cn(
          "px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer",
          tab === "diagnostics"
            ? "bg-composer-button text-composer-text shadow-sm"
            : "text-composer-text-muted hover:text-composer-text",
        )}
      >
        Diagnostics
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Composer Bridge"
      headerAccessory={headerAccessory}
      className="max-w-4xl h-[75%] flex flex-col"
      bodyClassName="p-0 flex-1 min-h-0 flex flex-col"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-composer-border bg-composer-bg shrink-0 text-xs">
        {tab === "logs" ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-composer-input border border-composer-border flex-1 max-w-xs focus-within:border-composer-border-hover">
              <IconSearch size={13} className="text-composer-text-muted shrink-0" />
              <input
                type="text"
                placeholder="Search logs…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-composer-text placeholder:text-composer-text-muted text-xs font-sans"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(["ALL", "INFO", "WARN", "ERROR", "DEBUG"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilterLevel(lvl)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer",
                    filterLevel === lvl
                      ? "bg-composer-button text-composer-text font-bold"
                      : "text-composer-text-muted hover:text-composer-text hover:bg-composer-button/40",
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-composer-text-secondary">System environment and recent activity snapshot</div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {tab === "logs" && onLogLevelChange && (
            <Select value={logLevel || "info"} onChange={onLogLevelChange} options={LOG_LEVELS} className="text-xs" />
          )}
          <Button size="sm" variant="ghost" onClick={loadData} disabled={loading} title="Refresh logs">
            <IconRefresh size={14} className={cn("mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCopy} title="Copy to clipboard">
            {copied ? (
              <IconCheck size={14} className="mr-1 text-composer-onset" />
            ) : (
              <IconCopy size={14} className="mr-1" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <Scroll className="flex-1 min-h-0 bg-composer-bg-dark font-mono text-xs select-text">
        {loading && parsedEntries.length === 0 ? (
          <div className="h-full flex items-center justify-center gap-2 py-16 text-composer-text-muted">
            <IconLoader2 size={16} className="animate-spin text-composer-accent" />
            Loading bridge logs…
          </div>
        ) : tab === "logs" ? (
          filteredEntries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-composer-text-muted text-center py-20">
              <IconFileText size={32} className="mb-2 opacity-25" />
              <span>{rawLogs ? "No matching log entries found." : "Log file is currently empty."}</span>
            </div>
          ) : (
            <div className="divide-y divide-composer-border/20 py-1">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2.5 px-4 py-1.5 hover:bg-composer-button/40 transition-colors text-[12px] leading-relaxed group"
                >
                  {entry.timeFormatted && (
                    <span className="text-composer-text-faint shrink-0 tabular-nums text-[11px] select-none pt-0.5">
                      {entry.timeFormatted}
                    </span>
                  )}
                  {entry.level && (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 tracking-wide uppercase select-none",
                        LEVEL_STYLES[entry.level] || "bg-composer-button text-composer-text",
                      )}
                    >
                      {entry.level}
                    </span>
                  )}
                  <div className="flex-1 min-w-0 break-words select-text">
                    <span className="text-composer-text">{entry.msg || entry.raw}</span>
                    {entry.extra && (
                      <pre className="mt-1 text-[11px] text-composer-text-muted bg-composer-bg p-2 rounded-md border border-composer-border/20 overflow-x-auto">
                        {JSON.stringify(entry.extra, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <pre className="p-4 whitespace-pre-wrap leading-relaxed select-text font-mono text-xs text-composer-text">
            {diagnostics || "No diagnostic report generated."}
          </pre>
        )}
      </Scroll>

      <div className="px-5 py-2.5 border-t border-composer-border bg-composer-bg-dark text-xs text-composer-text-muted flex items-center justify-between shrink-0 select-none">
        <span className="truncate mr-4">Log file: ~/.composer-bridge/bridge.log</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" onClick={handleOpenInEditor} title="Open bridge.log in Notepad">
            <IconFileText size={14} className="mr-1" />
            Notepad
          </Button>
          <Button size="sm" variant="ghost" onClick={handleOpenFolder} title="Open bridge folder in File Explorer">
            <IconFolder size={14} className="mr-1" />
            Folder
          </Button>
        </div>
      </div>
    </Modal>
  );
};

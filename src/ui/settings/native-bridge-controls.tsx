import { useBridgeConfig } from "@/hooks/use-bridge-config";
import { Button } from "@/ui/button";
import { Select } from "@/ui/select";
import { SettingRow, ToggleSwitch } from "@/ui/settings/native-bridge-row";
import { cn } from "@/utils/cn";
import {
  IconCheck,
  IconFolder,
  IconLoader2,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconFileText,
} from "@tabler/icons-react";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const NativeBridgeControls: React.FC = () => {
  const {
    config,
    loaded,
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
  } = useBridgeConfig();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [updatingYtdlp, setUpdatingYtdlp] = useState(false);

  if (!loaded || !config) {
    return (
      <div className="py-4 text-xs text-composer-text-muted flex items-center gap-2">
        <IconLoader2 size={14} className="animate-spin" />
        Connecting to Composer Bridge backend…
      </div>
    );
  }

  const isServerRunning = serverStatus === "running";

  const handleCookieFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await uploadCookies(text);
      toast.success("YouTube cookies uploaded successfully");
    } catch (err) {
      toast.error(`Failed to upload cookies: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleForceUpdateYtdlp = async () => {
    setUpdatingYtdlp(true);
    try {
      const version = await forceUpdateYtdlp();
      toast.success(version ? `yt-dlp updated to ${version}` : "yt-dlp is up to date");
    } catch (err) {
      toast.error(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setUpdatingYtdlp(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 text-composer-text">
      <SettingRow
        title="Bridge Server"
        description={isServerRunning ? "Server is listening on localhost" : "Server is currently stopped"}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded font-mono",
              isServerRunning
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-composer-bg text-composer-text-muted",
            )}
          >
            {isServerRunning ? `port ${config.listen_port}` : "stopped"}
          </span>
          <ToggleSwitch checked={isServerRunning} onChange={toggleServer} label="Toggle bridge server" />
        </div>
      </SettingRow>

      <SettingRow
        title="Listen Port"
        description="Port for external tools and browser extensions to connect to the Bridge."
      >
        <input
          type="number"
          min={1}
          max={65535}
          value={config.listen_port}
          onChange={(e) => update("listen_port", Number(e.target.value))}
          className="h-7 w-20 px-2 text-xs rounded bg-composer-bg border border-composer-border text-composer-text text-right"
        />
      </SettingRow>

      <SettingRow
        title="Use random port if busy"
        description="Avoid startup failures if another program occupies the preferred port."
      >
        <ToggleSwitch
          checked={config.use_random_if_busy}
          onChange={() => update("use_random_if_busy", !config.use_random_if_busy)}
          label="Random port fallback"
        />
      </SettingRow>

      <SettingRow
        title="yt-dlp update channel"
        description="Which release track to track for automated yt-dlp binary updates."
      >
        <div className="flex items-center gap-2">
          <Select
            value={config.ytdlp_channel || "stable"}
            onChange={(val) => update("ytdlp_channel", val)}
            options={[
              { value: "stable", label: "Stable" },
              { value: "nightly", label: "Nightly" },
              { value: "off", label: "Disabled" },
            ]}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleForceUpdateYtdlp}
            disabled={updatingYtdlp}
            title="Check for yt-dlp update now"
          >
            <IconRefresh size={14} className={updatingYtdlp ? "animate-spin" : ""} />
          </Button>
        </div>
      </SettingRow>

      <SettingRow
        title="Custom yt-dlp binary path"
        description="Override with your own yt-dlp executable path. Leave empty to use the managed binary."
      >
        <input
          type="text"
          value={config.ytdlp_binary_path || ""}
          onChange={(e) => update("ytdlp_binary_path", e.target.value)}
          placeholder="Managed yt-dlp"
          className="h-7 w-48 px-2 text-xs rounded bg-composer-bg border border-composer-border text-composer-text placeholder:text-composer-text-muted"
        />
      </SettingRow>

      <SettingRow
        title="Default Save Directory"
        description="Folder for downloaded YouTube audio files and project exports."
      >
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-mono text-composer-text-muted truncate max-w-[180px]"
            title={config.download_dir || "Default (library cache)"}
          >
            {config.download_dir || "Default"}
          </span>
          <Button size="sm" variant="ghost" onClick={chooseDownloadDir}>
            <IconFolder size={14} className="mr-1.5" />
            Browse…
          </Button>
        </div>
      </SettingRow>

      <SettingRow
        title="Cache streams for offline replay"
        description="Automatically store streamed tracks to local library cache for instant replay."
      >
        <ToggleSwitch
          checked={config.auto_download_to_library}
          onChange={() => update("auto_download_to_library", !config.auto_download_to_library)}
          label="Auto download to library"
        />
      </SettingRow>

      <SettingRow
        title="YouTube Cookies (cookies.txt)"
        description="Upload cookies from your browser to bypass YouTube age gates and bot verification."
      >
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".txt" onChange={handleCookieFileChange} className="hidden" />
          {cookiesStatus?.present ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <IconCheck size={12} />
                Loaded
              </span>
              <Button size="sm" variant="ghost" onClick={removeCookies} title="Remove cookies">
                <IconTrash size={14} />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
              <IconUpload size={14} className="mr-1.5" />
              Upload…
            </Button>
          )}
        </div>
      </SettingRow>

      <SettingRow
        title="Prefer Premium Audio"
        description="Request higher quality audio streams from YouTube Music (requires active YouTube cookies)."
      >
        <ToggleSwitch
          checked={config.prefer_premium_audio}
          onChange={() => update("prefer_premium_audio", !config.prefer_premium_audio)}
          label="Prefer premium audio"
        />
      </SettingRow>

      <SettingRow
        title="Log Level & Diagnostics"
        description="How much diagnostic detail to record in bridge.log for troubleshooting."
      >
        <div className="flex items-center gap-2">
          <Select
            value={config.log_level || "info"}
            onChange={(val) => update("log_level", val)}
            options={[
              { value: "error", label: "Errors only" },
              { value: "warn", label: "Warnings" },
              { value: "info", label: "Info" },
              { value: "debug", label: "Debug" },
            ]}
          />
          <Button size="sm" variant="ghost" onClick={openLogFile} title="Open bridge.log in default text editor">
            <IconFileText size={14} className="mr-1.5" />
            View log
          </Button>
        </div>
      </SettingRow>

      {saveStatus === "saving" && (
        <div className="pt-2 text-right text-xs text-composer-text-muted">Saving changes…</div>
      )}
    </div>
  );
};

import { useBridgeConfig } from "@/hooks/use-bridge-config";
import { Button } from "@/ui/button";
import { IconButton } from "@/ui/icon-button";
import { Select } from "@/ui/select";
import { BridgeLogModal } from "@/ui/settings/bridge-log-modal";
import { SettingRow, ToggleSwitch } from "@/ui/settings/native-bridge-row";
import { SettingsGroup } from "@/ui/settings/setting-controls";
import { cn } from "@/utils/cn";
import {
  IconCheck,
  IconFileText,
  IconFolder,
  IconLoader2,
  IconRefresh,
  IconTrash,
  IconUpload,
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
    forceUpdateYtdlp,
  } = useBridgeConfig();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [updatingYtdlp, setUpdatingYtdlp] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

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
    <div className="flex flex-col text-composer-text">
      <SettingsGroup title="Bridge Service">
        <SettingRow
          title="Bridge Server"
          description={
            isServerRunning
              ? "Background service is active and listening on localhost."
              : "Background service is currently stopped."
          }
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-md font-mono transition-colors",
                isServerRunning
                  ? "bg-composer-positive/15 text-composer-positive border border-composer-positive/30"
                  : "bg-composer-input text-composer-text-muted border border-composer-border",
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
            className="h-7.5 w-20 px-2.5 text-xs font-mono rounded-lg bg-composer-input border border-composer-border text-composer-text text-right focus:outline-none focus:border-composer-border-hover transition-colors"
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
      </SettingsGroup>

      <SettingsGroup title="YouTube & Audio Downloads">
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
            <IconButton
              label="Check for yt-dlp update now"
              icon={<IconRefresh size={14} className={updatingYtdlp ? "animate-spin" : ""} />}
              variant="secondary"
              onClick={handleForceUpdateYtdlp}
              disabled={updatingYtdlp}
            />
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
            className="h-7.5 w-56 px-2.5 text-xs rounded-lg bg-composer-input border border-composer-border text-composer-text placeholder:text-composer-text-muted focus:outline-none focus:border-composer-border-hover transition-colors"
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
            <Button size="sm" variant="secondary" hasIcon onClick={chooseDownloadDir}>
              <IconFolder size={14} />
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
                <span className="text-xs text-composer-positive flex items-center gap-1 font-medium">
                  <IconCheck size={14} />
                  Loaded
                </span>
                <Button
                  size="sm"
                  variant="danger"
                  hasIcon
                  onClick={removeCookies}
                  title="Remove cookies"
                  className="bg-composer-negative/10"
                >
                  <IconTrash size={14} />
                  Remove
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" hasIcon onClick={() => fileInputRef.current?.click()}>
                <IconUpload size={14} />
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
      </SettingsGroup>

      <SettingsGroup title="Diagnostics & Maintenance">
        <SettingRow
          title="Diagnostics & Logs"
          description="Inspect bridge activity, copy system diagnostics, and configure recording verbosity."
        >
          <Button
            size="sm"
            variant="secondary"
            hasIcon
            onClick={() => setIsLogModalOpen(true)}
            title="Open bridge diagnostics and logs"
          >
            <IconFileText size={14} />
            View logs
          </Button>
        </SettingRow>
      </SettingsGroup>

      {saveStatus === "saving" && (
        <div className="pt-2 text-right text-xs text-composer-text-muted">Saving changes…</div>
      )}

      <BridgeLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        logLevel={config.log_level}
        onLogLevelChange={(val) => update("log_level", val)}
      />
    </div>
  );
};

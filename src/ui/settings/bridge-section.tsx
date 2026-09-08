import { useBridgeConfig } from "@/hooks/use-bridge-config";
import { BridgeStatus, StartServer, StopServer, UploadCookies, ShowDirectoryDialog } from "@/wailsjs/go/app/App";
import { cn } from "@/utils/cn";
import { Select } from "@/ui/select";
import { useEffect, useState } from "react";

const BridgeToggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
  <button
    type="button"
    role="switch"
    aria-checked={enabled}
    aria-label="Use Composer Bridge for YouTube"
    onClick={onToggle}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
      enabled ? "bg-composer-accent" : "bg-composer-button",
    )}
  >
    <span
      className={cn(
        "pointer-events-none inline-block size-4 rounded-full bg-white shadow transform transition-transform mt-0.5",
        enabled ? "translate-x-4.5" : "translate-x-0.5",
      )}
    />
  </button>
);

const BridgeToggleConfig: React.FC<{ enabled: boolean; onToggle: () => void; label: string; description?: string }> = ({ enabled, onToggle, label, description }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex flex-col gap-0.5 pr-4">
      <span className="text-sm font-medium text-composer-text">{label}</span>
      {description && <span className="text-xs text-composer-text-muted">{description}</span>}
    </div>
    <BridgeToggle enabled={enabled} onToggle={onToggle} />
  </div>
);

export const BridgeSelectConfig: React.FC<{
  label: string;
  description?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}> = ({ label, description, value, onChange, options }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex flex-col gap-0.5 pr-4">
      <span className="text-sm font-medium text-composer-text">{label}</span>
      {description && <span className="text-xs text-composer-text-muted">{description}</span>}
    </div>
    <Select
      value={value}
      onChange={onChange}
      options={options}
    />
  </div>
);

// -- Sub-sections -------------------------------------------------------------

const BridgeSection: React.FC = () => {
  const isNative = typeof window.go !== "undefined" && !!window.go.app?.App;
  const { config: backendConfig, update: updateBackendConfig, saveStatus } = useBridgeConfig();
  const [serverStatus, setServerStatus] = useState("unknown");

  const refreshServerStatus = () => {
    if (!isNative) return;
    void BridgeStatus().then((state) => setServerStatus(state.server)).catch(() => setServerStatus("unknown"));
  };

  useEffect(() => {
    refreshServerStatus();
  }, [isNative]);

  const toggleServer = async () => {
    try {
      if (serverStatus === "running") {
        await StopServer();
      } else {
        await StartServer();
      }
      refreshServerStatus();
    } catch (err) {
      console.error("Failed to change bridge server state:", err);
    }
  };

  const handleUploadCookies = async () => {
    if (!isNative) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const content = await file.text();
        await UploadCookies(content);
        alert("Cookies uploaded successfully!");
      } catch (err) {
        console.error("Failed to upload cookies:", err);
        alert(`Failed to upload cookies: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
  };

  if (!isNative || !backendConfig) return null;

  return (
    <>
      <div className="flex items-center justify-between py-3">
        <div className="flex flex-col gap-0.5 pr-4">
          <span className="text-sm font-medium text-composer-text">Bridge server</span>
          <span className="text-xs text-composer-text-muted">{serverStatus === "running" ? "Running" : serverStatus}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={serverStatus === "running"}
          aria-label="Run Composer Bridge server"
          onClick={toggleServer}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
            serverStatus === "running" ? "bg-composer-accent" : "bg-composer-button",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-4 rounded-full bg-white shadow transform transition-transform mt-0.5",
              serverStatus === "running" ? "translate-x-4.5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      <div className="flex items-center justify-between py-3">
        <div className="flex flex-col gap-0.5 pr-4">
          <span className="text-sm font-medium text-composer-text">Listen port</span>
          <span className="text-xs text-composer-text-muted">Applied the next time the bridge server starts.</span>
        </div>
        <input
          type="number"
          min={1}
          max={65535}
          className="h-7 w-24 px-2 text-xs rounded bg-composer-bg text-composer-text border border-composer-border"
          value={backendConfig.listen_port}
          onChange={(e) => updateBackendConfig("listen_port", Number(e.target.value))}
        />
      </div>

      <BridgeToggleConfig
        label="Use a random port if busy"
        description="Keep the bridge available when the configured port is already in use."
        enabled={backendConfig.use_random_if_busy}
        onToggle={() => updateBackendConfig("use_random_if_busy", !backendConfig.use_random_if_busy)}
      />

      <BridgeToggleConfig
        label="Open at login"
        description="Start Composer Bridge when you sign in to your computer."
        enabled={backendConfig.open_at_login}
        onToggle={() => updateBackendConfig("open_at_login", !backendConfig.open_at_login)}
      />

      <BridgeSelectConfig
        label="Log level"
        description="How much diagnostic detail to write to the bridge log."
        value={backendConfig.log_level}
        onChange={(v) => updateBackendConfig("log_level", v)}
        options={[
          { value: "error", label: "Errors" },
          { value: "warn", label: "Warnings" },
          { value: "info", label: "Info" },
          { value: "debug", label: "Debug" },
        ]}
      />

      <div className="flex items-center justify-between py-3">
        <div className="flex flex-col gap-0.5 pr-4 flex-1">
          <span className="text-sm font-medium text-composer-text">yt-dlp binary path</span>
          <span className="text-xs text-composer-text-muted">Leave empty to use the managed binary.</span>
        </div>
        <input
          type="text"
          className="h-7 px-2 text-xs rounded bg-composer-bg text-composer-text border border-composer-border min-w-0 w-1/2"
          value={backendConfig.ytdlp_binary_path || ""}
          onChange={(e) => updateBackendConfig("ytdlp_binary_path", e.target.value)}
          placeholder="Managed yt-dlp"
        />
      </div>

      <div className="flex items-center justify-between py-3">
        <div className="flex flex-col gap-0.5 pr-4 flex-1">
          <span className="text-sm font-medium text-composer-text">Default Save Directory</span>
          <span className="text-xs text-composer-text-muted">Where to save exported projects, TTML lyrics, and downloaded YouTube audio. Leave empty for default.</span>
        </div>
        <div className="flex items-center gap-2 max-w-xs w-full">
          <input
            type="text"
            className="flex-1 h-7 px-2 text-xs rounded bg-composer-bg text-composer-text border border-composer-border min-w-0"
            value={backendConfig.download_dir || ""}
            onChange={(e) => updateBackendConfig("download_dir", e.target.value)}
            placeholder="Default (library cache)"
          />
          <button
            type="button"
            onClick={async () => {
              const dir = await ShowDirectoryDialog(backendConfig.download_dir || "");
              if (dir) updateBackendConfig("download_dir", dir);
            }}
            className="shrink-0 h-7 px-3 text-xs font-medium rounded bg-composer-button hover:bg-composer-button-hover text-composer-text transition-colors"
          >
            Browse...
          </button>
        </div>
      </div>

      <BridgeToggleConfig
        label="Cache Streams for Offline Playback"
        description="Automatically save streamed songs to an internal cache so you can replay them instantly offline."
        enabled={backendConfig.auto_download_to_library}
        onToggle={() => updateBackendConfig("auto_download_to_library", !backendConfig.auto_download_to_library)}
      />

      <BridgeToggleConfig
        label="Prefer premium audio"
        description="Download higher quality streams (requires YouTube Premium cookies)"
        enabled={backendConfig.prefer_premium_audio}
        onToggle={() => updateBackendConfig("prefer_premium_audio", !backendConfig.prefer_premium_audio)}
      />
      <BridgeSelectConfig
        label="yt-dlp update channel"
        description="Which release stream to follow"
        value={backendConfig.ytdlp_channel}
        onChange={(v) => updateBackendConfig("ytdlp_channel", v)}
        options={[
          { value: "stable", label: "Stable" },
          { value: "nightly", label: "Nightly" },
          { value: "off", label: "Off" },
        ]}
      />
      <div className="flex items-center justify-between py-3">
        <div className="flex flex-col gap-0.5 pr-4">
          <span className="text-sm font-medium text-composer-text">YouTube Cookies</span>
          <span className="text-xs text-composer-text-muted">Upload your cookies.txt to bypass age-restrictions and unlock premium audio</span>
        </div>
        <button
          type="button"
          onClick={handleUploadCookies}
          className="h-7 px-3 text-xs font-medium rounded-lg bg-composer-button hover:bg-composer-button-hover text-composer-text transition-colors"
        >
          Upload…
        </button>
      </div>
      {saveStatus === "saving" && <div className="py-2"><span className="text-xs text-composer-text-muted text-right block">Saving...</span></div>}
    </>
  );
};

// -- Exports ------------------------------------------------------------------

export { BridgeSection };

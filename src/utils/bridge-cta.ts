import { useSettingsStore } from "@/stores/settings";
import { BridgeError } from "@/utils/composer-bridge-api";

// -- Helpers ------------------------------------------------------------------

function shouldShowBridgeCta(cause: unknown): boolean {
  const isDesktop = typeof window !== "undefined" && Boolean(window.go?.app?.App);
  if (isDesktop || useSettingsStore.getState().experiments.youtubeBridge) return false;
  if (cause instanceof BridgeError) return false;
  return true;
}

// -- Exports ------------------------------------------------------------------

export { shouldShowBridgeCta };

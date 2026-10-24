import { useSettingsStore } from "@/stores/settings";
import { BridgeError } from "@/utils/composer-bridge-api";
import { isDesktop } from "@/utils/platform";

// -- Helpers ------------------------------------------------------------------

function shouldShowBridgeCta(cause: unknown): boolean {
  if (isDesktop() || useSettingsStore.getState().experiments.youtubeBridge) return false;
  if (cause instanceof BridgeError) return false;
  return true;
}

// -- Exports ------------------------------------------------------------------

export { shouldShowBridgeCta };

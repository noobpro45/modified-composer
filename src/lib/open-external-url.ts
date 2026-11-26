import { isDesktop } from "@/utils/platform";
import { BrowserOpenURL } from "@/wailsjs/runtime/runtime";

// -- Functions ----------------------------------------------------------------

function isExternalHttpUrl(href: string): boolean {
  try {
    const parsed = new URL(href, window.location.href);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin !== window.location.origin;
  } catch (error) {
    console.warn("[ExternalLink] invalid url", href, error);
    return false;
  }
}

function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  if (typeof window.runtime?.BrowserOpenURL === "function") {
    window.runtime.BrowserOpenURL(url);
    return;
  }
  if (isDesktop()) {
    BrowserOpenURL(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

// -- Exports ------------------------------------------------------------------

export { isExternalHttpUrl, openExternalUrl };

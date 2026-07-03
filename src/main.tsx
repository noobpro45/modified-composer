import { routes } from "@/router";
import { initTheme } from "@/stores/theme";
import { ViteReactSSG } from "vite-react-ssg";
import "@/index.css";

if (typeof document !== "undefined") initTheme();

// Prevent standard web view zoom shortcuts (Ctrl+Scroll)
if (typeof document !== "undefined") {
  document.addEventListener("wheel", (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  // Hide the default browser context menu unless right-clicking an input
  document.addEventListener("contextmenu", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    // Allow context menu if the shift key is held down (useful for debugging)
    if (e.shiftKey) {
      return;
    }
    e.preventDefault();
  });
}

export const createRoot = ViteReactSSG({ routes });

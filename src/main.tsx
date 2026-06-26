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
}

export const createRoot = ViteReactSSG({ routes });

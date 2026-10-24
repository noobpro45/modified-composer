import type * as wailsApp from "../wailsjs/go/app/App";
import type * as wailsRuntime from "../wailsjs/runtime/runtime";

declare global {
  interface Window {
    __platform?: string;
    go?: {
      app?: {
        App?: typeof wailsApp;
      };
    };
    runtime?: typeof wailsRuntime;
  }
}

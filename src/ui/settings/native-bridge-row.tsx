import { cn } from "@/utils/cn";
import type React from "react";

export const SettingRow: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="flex items-center justify-between py-3 border-b border-composer-border/40 last:border-b-0">
    <div className="flex flex-col gap-0.5 pr-4 flex-1">
      <span className="text-sm font-medium text-composer-text">{title}</span>
      <span className="text-xs text-composer-text-muted">{description}</span>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: () => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors",
      checked ? "bg-composer-accent" : "bg-composer-button",
    )}
  >
    <span
      className={cn(
        "pointer-events-none inline-block size-4 rounded-full bg-white shadow transform transition-transform mt-0.5",
        checked ? "translate-x-4.5" : "translate-x-0.5",
      )}
    />
  </button>
);

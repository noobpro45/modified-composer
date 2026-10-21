import { SettingRowLayout } from "@/ui/settings/setting-row-layout";
import { cn } from "@/utils/cn";
import type React from "react";

export const SettingRow: React.FC<{
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ title, description, children, badge }) => (
  <SettingRowLayout>
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="flex items-center gap-2 text-sm font-medium text-composer-text">
        <span>{title}</span>
        {badge}
      </span>
      <span className="text-xs text-composer-text-muted text-pretty">{description}</span>
    </div>
    {children}
  </SettingRowLayout>
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

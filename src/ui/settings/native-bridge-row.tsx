import { SettingRowLayout } from "@/ui/settings/setting-row-layout";
import type React from "react";

export const SettingRow: React.FC<{
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ title, description, children, badge }) => (
  <div>
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
  </div>
);

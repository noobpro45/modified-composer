export interface ParsedLogEntry {
  id: number;
  raw: string;
  timeFormatted?: string;
  level?: string;
  msg?: string;
  extra?: Record<string, unknown>;
}

export const LEVEL_STYLES: Record<string, string> = {
  ERROR: "bg-composer-error/15 text-composer-error border border-composer-error/30",
  WARN: "bg-composer-snap/15 text-composer-snap border border-composer-snap/30",
  INFO: "bg-composer-onset/15 text-composer-onset border border-composer-onset/30",
  DEBUG: "bg-composer-accent/15 text-composer-accent border border-composer-accent/30",
};

export const LOG_LEVELS = [
  { value: "error", label: "Record: Errors" },
  { value: "warn", label: "Record: Warnings" },
  { value: "info", label: "Record: Info" },
  { value: "debug", label: "Record: Debug" },
];

export function parseLogLine(line: string, index: number): ParsedLogEntry {
  const trimmed = line.trim();
  if (!trimmed) return { id: index, raw: "" };
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const { time, level, msg, ...rest } = JSON.parse(trimmed);
      const timeFormatted = time
        ? new Date(time).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
          })
        : undefined;
      return {
        id: index,
        raw: trimmed,
        timeFormatted,
        level: level ? String(level).toUpperCase() : undefined,
        msg,
        extra: Object.keys(rest).length > 0 ? rest : undefined,
      };
    } catch {
      // Plain text fallback
    }
  }
  return { id: index, raw: trimmed, msg: trimmed };
}

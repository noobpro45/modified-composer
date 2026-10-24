import { cn } from "@/utils/cn";
import type { Icon } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: Icon;
  count?: number;
  iconOnly?: boolean;
  disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
  size?: "sm" | "md";
}

// -- Helpers ------------------------------------------------------------------

function optionName<T extends string>(option: SegmentedOption<T>): string | undefined {
  if (option.count !== undefined) return `${option.label} ${option.count}`;
  return option.iconOnly ? option.label : undefined;
}

// -- Component ----------------------------------------------------------------

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  className,
  size = "md",
}: SegmentedControlProps<T>) {
  const isSm = size === "sm";
  return (
    <div role="group" aria-label={ariaLabel} className={cn("tray select-none", className)}>
      {options.map((option) => {
        const isSelected = option.value === value;
        const OptionIcon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={optionName(option)}
            title={option.iconOnly ? option.label : undefined}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center font-medium rounded-lg whitespace-nowrap transition-[color,background-color,box-shadow] cursor-pointer",
              isSm ? "h-6.5 px-2 text-[11.5px] gap-1" : "h-7 px-3 text-[13px] gap-1.5",
              option.iconOnly && (isSm ? "w-6.5 px-0" : "w-7 px-0"),
              "disabled:cursor-not-allowed disabled:text-composer-text-faint disabled:line-through",
              isSelected
                ? "latch-on [&_svg]:text-composer-accent-text"
                : "text-[var(--muted)] hover:text-[var(--label)] hover:bg-[var(--layer-1)]",
            )}
          >
            {OptionIcon && <OptionIcon aria-hidden="true" className={cn("shrink-0", isSm ? "size-3.5" : "size-4")} />}
            {!option.iconOnly && <span className="truncate">{option.label}</span>}
            {option.count !== undefined && (
              <span
                className={cn(
                  "text-xs tabular-nums",
                  isSelected ? "text-composer-accent-text" : "text-composer-text-faint",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// -- Exports ------------------------------------------------------------------

export { SegmentedControl };
export type { SegmentedOption };

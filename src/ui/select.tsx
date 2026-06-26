import { Popover } from "@/ui/popover";
import { cn } from "@/utils/cn";
import { IconCheck, IconChevronDown } from "@tabler/icons-react";

// -- Types --------------------------------------------------------------------

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  popoverWidth?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

// -- Component ----------------------------------------------------------------

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  className,
  popoverWidth = "w-48",
  onMouseDown,
  style,
}) => {
  return (
    <Popover
      placement="bottom-end"
      offsetPx={4}
      trigger={
        <button
          type="button"
          onMouseDown={onMouseDown}
          style={style}
          className={cn(
            "flex items-center justify-between min-w-32 h-8 px-3 text-sm rounded-lg bg-composer-input text-composer-text border border-composer-border hover:border-composer-accent focus:outline-none transition-colors cursor-pointer gap-2",
            className,
          )}
        >
          <span className="truncate">{options.find((o) => o.value === value)?.label ?? value}</span>
          <IconChevronDown className="size-4 opacity-50 shrink-0" />
        </button>
      }
    >
      {(close) => (
        <div className={cn("flex flex-col p-1", popoverWidth)}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "flex items-center justify-between px-2.5 py-2 text-sm rounded-md transition-colors cursor-pointer text-left",
                  isSelected ? "bg-composer-accent/10 text-composer-accent" : "text-composer-text hover:bg-composer-button",
                )}
                onClick={() => {
                  onChange(opt.value);
                  close();
                }}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <IconCheck className="size-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
};

// -- Exports ------------------------------------------------------------------

export { Select };

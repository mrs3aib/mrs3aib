import { forwardRef, useImperativeHandle, useRef, type InputHTMLAttributes } from "react";
import { CalendarIcon } from "./icons";

type FancyDatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
};

export const FancyDatePicker = forwardRef<HTMLInputElement, FancyDatePickerProps>(
  function FancyDatePicker({ label, error, id, className = "", ...props }, ref) {
    const inputId = id ?? props.name;
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const openPicker = () => {
      const input = inputRef.current;
      if (!input || props.disabled || props.readOnly) return;

      input.focus();
      try {
        input.showPicker?.();
      } catch {
        // Some browsers only allow showPicker from direct user gestures.
      }
    };

    return (
      <div className={className}>
        {label ? (
          <label
            htmlFor={inputId}
            onClick={openPicker}
            className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
          >
            {label}
          </label>
        ) : null}

        <div
          onClick={openPicker}
          className={`group flex h-12 items-center gap-3 rounded-xl border bg-card px-3.5 text-sm text-primary shadow-[0_12px_34px_rgba(25,25,25,0.04)] transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 ${
            error ? "border-danger" : "border-line"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eee9e2] text-primary transition-colors group-focus-within:bg-accent group-focus-within:text-white">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="date"
            className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none [color-scheme:light]"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

type FancyDateRangePickerProps = {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel: string;
  toLabel: string;
  className?: string;
};

export function FancyDateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel,
  toLabel,
  className = ""
}: FancyDateRangePickerProps) {
  const fromRef = useRef<HTMLInputElement>(null);
  const toRef = useRef<HTMLInputElement>(null);

  const openPicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      // Some browsers only allow showPicker from direct user gestures.
    }
  };

  return (
    <div
      className={`flex min-h-12 shrink-0 flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm text-secondary shadow-[0_12px_34px_rgba(25,25,25,0.04)] transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 ${className}`}
    >
      <button
        type="button"
        onClick={() => openPicker(fromRef.current)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eee9e2] text-primary transition-colors hover:bg-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <CalendarIcon className="h-4 w-4" />
      </button>
      <DateRangeInput
        ref={fromRef}
        value={from}
        max={to || undefined}
        onChange={onFromChange}
        ariaLabel={fromLabel}
      />
      <span className="text-secondary/50">—</span>
      <DateRangeInput
        ref={toRef}
        value={to}
        min={from || undefined}
        onChange={onToChange}
        ariaLabel={toLabel}
      />
    </div>
  );
}

const DateRangeInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    min?: string;
    max?: string;
    onChange: (value: string) => void;
    ariaLabel: string;
  }
>(function DateRangeInput({ value, min, max, onChange, ariaLabel }, ref) {
  return (
    <input
      ref={ref}
      type="date"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="min-w-36 bg-transparent text-primary outline-none [color-scheme:light]"
    />
  );
});

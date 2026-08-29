type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false
}: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div>
        <p className="text-sm font-medium text-primary">{label}</p>
        {description ? (
          <p className="mt-1 text-xs text-secondary">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-accent" : "bg-line"
        }`}
      >
        <span
          className={`absolute inset-0.5 top-0.5 h-5 w-5 rounded-full bg-card shadow-sm transition-transform ${
            checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

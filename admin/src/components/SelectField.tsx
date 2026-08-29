import { forwardRef, type SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ label, error, id, children, ...props }, ref) {
    const inputId = id ?? props.name;

    return (
      <div>
        <label
          htmlFor={inputId}
          className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
        >
          {label}
        </label>
        <select
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border bg-base px-3.5 py-2.5 text-sm text-primary outline-none transition-colors focus:border-accent ${
            error ? "border-danger" : "border-line"
          }`}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>
        {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
      </div>
    );
  }
);

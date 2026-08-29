import { forwardRef, type InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Guidance shown under the input. Hidden while an error is displayed. */
  hint?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, hint, id, ...props }, ref) {
    const inputId = id ?? props.name;
    // The error replaces the hint rather than stacking with it, so the field
    // never shows two competing lines of small print.
    const describedBy = error
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined;

    return (
      <div>
        <label
          htmlFor={inputId}
          className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border bg-base px-3.5 py-2.5 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent ${
            error ? "border-danger" : "border-line"
          }`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-secondary">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);

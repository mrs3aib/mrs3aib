import { forwardRef, type TextareaHTMLAttributes } from "react";

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, error, id, ...props }, ref) {
    const inputId = id ?? props.name;

    return (
      <div>
        <label
          htmlFor={inputId}
          className="tracking-nav mb-2 block text-xs font-medium uppercase text-secondary"
        >
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={`w-full resize-none rounded-md border bg-base px-3.5 py-2.5 text-sm text-primary outline-none transition-colors placeholder:text-secondary/60 focus:border-accent ${
            error ? "border-danger" : "border-line"
          }`}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/languageContext";

/**
 * Copies text and confirms it did.
 *
 * A copy leaves no trace on screen, so without feedback the only way to know it
 * worked is to paste somewhere — which is why the button reports success itself
 * and reverts a few seconds later.
 *
 * `navigator.clipboard` is unavailable on insecure origins and can be refused
 * by permissions, and it returns a promise that was previously ignored: a
 * failed copy looked exactly like a successful one. Failures now say so.
 */

/** How long the confirmation shows before the button returns to normal. */
const FEEDBACK_MS = 3000;

type State = "idle" | "copied" | "error";

export function CopyButton({
  value,
  label,
  copiedLabel,
  title,
  className = ""
}: {
  /** Text placed on the clipboard. */
  value: string;
  label: string;
  /** Defaults to "Copied". */
  copiedLabel?: string;
  title?: string;
  /** Layout and sizing from the caller; colours are owned by this component. */
  className?: string;
}) {
  const { t } = useLanguage();
  const [state, setState] = useState<State>("idle");
  const timerRef = useRef<number | undefined>(undefined);

  // Cleared on unmount so a row removed while confirming cannot set state on a
  // component that is gone.
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const flash = (next: State) => {
    setState(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("idle"), FEEDBACK_MS);
  };

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      flash("copied");
    } catch {
      flash("error");
    }
  };

  const tone =
    state === "copied"
      ? "border-success bg-success/10 text-success"
      : state === "error"
        ? "border-danger bg-danger/10 text-danger"
        : "border-line text-secondary hover:border-accent hover:text-accent";

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={title ?? value}
      // Announced to screen readers, which cannot see the colour change.
      aria-live="polite"
      className={`shrink-0 rounded border transition-colors ${tone} ${className}`}
    >
      {state === "copied"
        ? (copiedLabel ?? t("Copied", "تم النسخ"))
        : state === "error"
          ? t("Copy failed", "فشل النسخ")
          : label}
    </button>
  );
}

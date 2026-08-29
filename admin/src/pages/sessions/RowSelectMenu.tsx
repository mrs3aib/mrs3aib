import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@/components/icons";

/**
 * A small select rendered as a table-cell chip plus a floating menu.
 *
 * The menu is portalled to `document.body` and positioned against the trigger,
 * the same approach the row's action menu uses: a menu nested inside the table
 * is clipped by the scroll container and by `overflow-hidden` on the card.
 */
export function RowSelectMenu<T extends string>({
  value,
  options,
  disabled = false,
  title,
  triggerClassName,
  onChange,
  children
}: {
  value: T;
  options: { value: T; label: string; description?: string }[];
  disabled?: boolean;
  title?: string;
  /** Styles the chip, so each column keeps its own colour language. */
  triggerClassName: string;
  onChange: (value: T) => void;
  /** Chip contents — the label, usually with an icon. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null
  );

  const menuWidth = 248;
  const menuGap = 4;

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = triggerRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight ?? options.length * 56;
      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - menuWidth - 8)
      );
      // Flip above the trigger when the menu would overflow the viewport,
      // rather than letting the last row's menu open off-screen.
      const hasRoomBelow = rect.bottom + menuHeight + menuGap <= window.innerHeight;
      const top = hasRoomBelow
        ? rect.bottom + menuGap
        : Math.max(8, rect.top - menuHeight - menuGap);

      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  // Dismiss on an outside click or Escape. The trigger counts as inside, so a
  // click on it toggles rather than racing this handler and reopening.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !menuRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={triggerClassName}
      >
        {children}
      </button>

      {open && position
        ? createPortal(
            <div
              ref={menuRef}
              role="listbox"
              className="fixed z-[1000] overflow-hidden rounded-lg border border-line bg-card py-1 shadow-xl"
              style={{ left: position.left, top: position.top, width: menuWidth }}
              onClick={(event) => event.stopPropagation()}
            >
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      setOpen(false);
                      // Re-picking the current value is a no-op, not a save.
                      if (!selected) onChange(option.value);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-start transition-colors hover:bg-base"
                  >
                    <CheckIcon
                      className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                        selected ? "text-accent" : "opacity-0"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-primary">
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="mt-0.5 block text-xs text-secondary">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

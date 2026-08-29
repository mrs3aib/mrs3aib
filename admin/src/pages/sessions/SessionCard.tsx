import type { ReactNode } from "react";

export function SessionCard({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-card shadow-[0_18px_60px_rgba(25,25,25,0.04)] ${className}`}>
      {children}
    </section>
  );
}

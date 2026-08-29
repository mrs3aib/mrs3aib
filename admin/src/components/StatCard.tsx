import type { ComponentType } from "react";

type StatCardProps = {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
};

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/15 text-accent">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <p className="tracking-nav text-xs font-medium uppercase text-secondary">
          {label}
        </p>
      </div>
      <p className="font-display mt-4 text-3xl font-semibold text-primary">{value}</p>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-center gap-3">
        <span className="h-9 w-9 animate-pulse rounded-md bg-line" />
        <span className="h-3 w-20 animate-pulse rounded-full bg-line" />
      </div>
      <span className="mt-4 block h-8 w-16 animate-pulse rounded-md bg-line" />
    </div>
  );
}

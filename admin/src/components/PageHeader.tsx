export function PageHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-8">
      <p className="tracking-nav text-xs font-medium uppercase text-accent">{label}</p>
      <h1 className="tracking-title font-display mt-2 text-2xl font-semibold text-primary">
        {title}
      </h1>
    </div>
  );
}

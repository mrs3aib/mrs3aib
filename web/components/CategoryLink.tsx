import { Link } from "@/i18n/navigation";
import { CameraIcon, categoryIcons } from "./icons";

export default function CategoryLink({
  id,
  label,
  className
}: {
  id: string;
  label: string;
  className?: string;
}) {
  const Icon = categoryIcons[id as keyof typeof categoryIcons] ?? CameraIcon;

  return (
    <Link
      href={`/category/${id}`}
      className={`group flex flex-col items-center justify-center gap-3 px-2 text-center transition-colors hover:bg-white/[0.03] active:bg-white/[0.05] focus-visible:bg-white/[0.05] focus-visible:outline-none ${className ?? ""}`}
    >
      <Icon className="h-8 w-8 shrink-0 text-accent transition-transform duration-500 group-hover:scale-110 group-active:scale-110 group-focus-visible:scale-110" />
      <span className="tracking-nav text-[11px] font-medium uppercase leading-snug text-secondary transition-colors group-hover:text-primary group-active:text-primary group-focus-visible:text-primary">
        {label}
      </span>
    </Link>
  );
}

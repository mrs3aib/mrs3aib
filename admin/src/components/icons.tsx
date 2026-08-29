type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true
};

export function GridIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M6 9.5 12 15.5 18 9.5" />
    </svg>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M3.5 6.5a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11Z" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.2 3.2 0 0 1 0 6.4M21 20c0-2.8-2-5.1-4.6-5.8" />
    </svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M12 15V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M12 3v12" />
      <path d="m7 10.5 5 5 5-5" />
      <path d="M4.5 19.5h15" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9c.1.36.35.67.68.87.32.2.7.29 1.08.24H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1 1.55Z" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.3-7 9-4.2-1.7-7-4.8-7-9V6l7-2.5Z" />
      <path d="m8.8 12 2.1 2.1 4.3-4.5" />
    </svg>
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M3.5 9h17" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="m3.5 11 8.5-7 8.5 7" />
      <path d="M5.5 10v9.5h5v-5h3v5h5V10" />
    </svg>
  );
}

export function BoxIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="M4 7.5v9L12 21l8-4.5v-9" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M8.5 6.5 10 4.5h4l1.5 2H19a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h3.5Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M8 16v-4" />
      <path d="M12 16V8" />
      <path d="M16 16v-6" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"} strokeWidth={3}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.2 2.2 4.8-5" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function ClipboardIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M9 4.5h6v2H9z" />
      <path d="M9 5.5H6.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-13a1 1 0 0 0-1-1H15" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </svg>
  );
}

export function MonitorIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
      <path d="M9 20.5h6M12 16.5v4" />
    </svg>
  );
}

export function DragHandleIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"} strokeWidth={2}>
      <circle cx="9" cy="6" r=".6" />
      <circle cx="15" cy="6" r=".6" />
      <circle cx="9" cy="12" r=".6" />
      <circle cx="15" cy="12" r=".6" />
      <circle cx="9" cy="18" r=".6" />
      <circle cx="15" cy="18" r=".6" />
    </svg>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M20.5 3.5 11 13" />
      <path d="M20.5 3.5 14.5 20.5 11 13 3.5 9.5Z" />
    </svg>
  );
}

export function SaveIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M4.5 5.5a1 1 0 0 1 1-1h10L19.5 8.5v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-13Z" />
      <path d="M8 4.5v5h7v-5" />
      <path d="M8 19.5v-5h8v5" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M19 10.5c0 5-7 10.5-7 10.5s-7-5.5-7-10.5a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10.5" r="2.5" />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M8 13h8" />
      <path d="M8 16h5" />
    </svg>
  );
}

export function MoreHorizontalIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function ImageIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5.5 17 4.5-5 3 3.2 2-2.3 3.5 4.1" />
    </svg>
  );
}

export function VideoIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="2.5" y="6.5" width="13" height="11" rx="1.5" />
      <path d="m15.5 10.5 6-3.2v9.4l-6-3.2" />
    </svg>
  );
}

export function DatabaseIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3V6" />
      <path d="M4.5 12c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3" />
    </svg>
  );
}

export function PagesIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="5" y="3.5" width="12" height="15" rx="1.5" />
      <path d="M8 7h6" />
      <path d="M8 10.5h6" />
      <path d="M8 14h4" />
      <path d="M8 20.5h10a1 1 0 0 0 1-1v-13" />
    </svg>
  );
}

/** Marks the media chosen as a session's cover. `filled` shows the active pick. */
export function StarIcon({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base} fill={filled ? "currentColor" : "none"} className={className ?? "h-5 w-5"}>
      <path d="m12 3.6 2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.9l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85Z" />
    </svg>
  );
}

export function UtensilsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <path d="M7 3.5v7M4.5 3.5v4a2.5 2.5 0 0 0 5 0v-4M7 10.5v10" />
      <path d="M16.5 3.5v17M16.5 3.5c2.1 1.8 3 4.1 3 6.8h-3" />
    </svg>
  );
}

export function DroneIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className ?? "h-5 w-5"}>
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
      <path d="m9 9-3-3m9 3 3-3m-9 9-3 3m9-3 3 3M4 4h4v4H4zM16 4h4v4h-4zM4 16h4v4H4zM16 16h4v4h-4z" />
    </svg>
  );
}

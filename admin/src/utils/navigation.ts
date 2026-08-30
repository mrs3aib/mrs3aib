import type { ComponentType } from "react";
import {
  CalendarIcon,
  DownloadIcon,
  FolderIcon,
  HomeIcon,
  ImageIcon,
  PagesIcon,
  SettingsIcon,
  UploadIcon,
  UsersIcon
} from "@/components/icons";
import { CATEGORY_LABELS, SESSION_CATEGORIES } from "@/types/category";
import { CATEGORY_ICONS } from "./categoryIcons";

export type NavChild = {
  labelEn: string;
  labelAr: string;
  to: string;
  /**
   * Shown beside the label, and on its own when the sidebar is collapsed to a
   * rail — where a child list has no room for text and an icon is all that
   * identifies the link.
   */
  icon: ComponentType<{ className?: string }>;
};

export type NavItem = {
  labelEn: string;
  labelAr: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  /** Rendered as an expandable group when present. */
  children?: NavChild[];
};

export const navItems: NavItem[] = [
  { labelEn: "Dashboard", labelAr: "لوحة التحكم", to: "/", icon: HomeIcon },
  {
    labelEn: "Pages",
    labelAr: "الصفحات",
    to: "/cms",
    icon: PagesIcon,
    children: [
      { labelEn: "Home", labelAr: "الصفحة الرئيسية", to: "/cms/home", icon: HomeIcon },
      // Annotated so the spread stays checked against NavChild. Without it the
      // mapped type widens the surrounding array and TypeScript stops
      // verifying the sibling literals — a child could then lose its icon and
      // still compile.
      ...SESSION_CATEGORIES.map<NavChild>((category) => ({
        labelEn: CATEGORY_LABELS[category].en,
        labelAr: CATEGORY_LABELS[category].ar,
        to: `/cms/categories/${category}`,
        icon: CATEGORY_ICONS[category]
      })),
      { labelEn: "Footer", labelAr: "تذييل الصفحة", to: "/cms/footer", icon: PagesIcon }
    ]
  },
  {
    labelEn: "General",
    labelAr: "عام",
    to: "/general",
    icon: FolderIcon,
    children: [
      { labelEn: "Sessions", labelAr: "الجلسات", to: "/sessions", icon: CalendarIcon },
      { labelEn: "Uploads", labelAr: "الرفع", to: "/uploads", icon: UploadIcon }
    ]
  },
  { labelEn: "Clients", labelAr: "العملاء", to: "/clients", icon: UsersIcon },
  { labelEn: "Bookings", labelAr: "الحجوزات", to: "/bookings", icon: CalendarIcon },
  { labelEn: "Downloads", labelAr: "التحميلات", to: "/downloads", icon: DownloadIcon },
  { labelEn: "Studio", labelAr: "الاستوديو", to: "/studio", icon:ImageIcon },
  // Finance and Reports are hidden until those pages exist.
  { labelEn: "Settings", labelAr: "الإعدادات", to: "/settings", icon: SettingsIcon }
];

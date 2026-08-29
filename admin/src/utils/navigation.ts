import type { ComponentType } from "react";
import {
  CalendarIcon,
  DownloadIcon,
  FolderIcon,
  HomeIcon,
  ImageIcon,
  PagesIcon,
  SettingsIcon,
  UsersIcon
} from "@/components/icons";
import { CATEGORY_LABELS, SESSION_CATEGORIES } from "@/types/category";

export type NavChild = {
  labelEn: string;
  labelAr: string;
  to: string;
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
      { labelEn: "Home", labelAr: "الصفحة الرئيسية", to: "/cms/home" },
      ...SESSION_CATEGORIES.map((category) => ({
        labelEn: CATEGORY_LABELS[category].en,
        labelAr: CATEGORY_LABELS[category].ar,
        to: `/cms/categories/${category}`
      })),
      { labelEn: "Footer", labelAr: "تذييل الصفحة", to: "/cms/footer" }
    ]
  },
  {
    labelEn: "General",
    labelAr: "عام",
    to: "/general",
    icon: FolderIcon,
    children: [
      { labelEn: "Sessions", labelAr: "الجلسات", to: "/sessions" },
      { labelEn: "Uploads", labelAr: "الرفع", to: "/uploads" }
    ]
  },
  { labelEn: "Clients", labelAr: "العملاء", to: "/clients", icon: UsersIcon },
  { labelEn: "Bookings", labelAr: "الحجوزات", to: "/bookings", icon: CalendarIcon },
  { labelEn: "Downloads", labelAr: "التحميلات", to: "/downloads", icon: DownloadIcon },
  { labelEn: "Studio", labelAr: "الاستوديو", to: "/studio", icon:ImageIcon },
  // Finance and Reports are hidden until those pages exist.
  { labelEn: "Settings", labelAr: "الإعدادات", to: "/settings", icon: SettingsIcon }
];

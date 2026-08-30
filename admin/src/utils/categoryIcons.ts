import type { ComponentType } from "react";
import {
  BoxIcon,
  CalendarIcon,
  CameraIcon,
  DroneIcon,
  HomeIcon,
  UsersIcon,
  UtensilsIcon,
  VideoIcon
} from "@/components/icons";
import type { SessionCategory } from "@/types/category";

/**
 * Icon per photo category.
 *
 * Shared so the sidebar and the dashboard's category picker cannot drift into
 * showing different icons for the same category.
 */
export const CATEGORY_ICONS: Record<
  SessionCategory,
  ComponentType<{ className?: string }>
> = {
  weddings: CameraIcon,
  companies: UsersIcon,
  restaurants: UtensilsIcon,
  events: CalendarIcon,
  products: BoxIcon,
  realEstate: HomeIcon,
  drone: DroneIcon,
  cinematicVideo: VideoIcon
};

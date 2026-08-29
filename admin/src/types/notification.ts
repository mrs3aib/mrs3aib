export type NotificationKind =
  | "download"
  | "mediaAdded"
  | "mediaFailed"
  | "clientAdded";

export type AdminNotification = {
  id: string;
  kind: NotificationKind;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
  /** Route to open when the item is clicked. */
  href: string;
  createdAt: string;
};

export type NotificationFeed = {
  items: AdminNotification[];
  total: number;
};

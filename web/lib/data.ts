export const processSteps = [
  "discovery",
  "planning",
  "photoshoot",
  "editing",
  "delivery"
] as const;

export const testimonialIds = ["t1", "t2", "t3"] as const;

export const clients = [
  { name: "AURA HOTELS", logo: "/logos/aura-hotels.svg" },
  { name: "MAISON NOOR", logo: "/logos/maison-noor.svg" },
  { name: "KAYAN", logo: "/logos/kayan.svg" },
  { name: "ATLAS AIR", logo: "/logos/atlas-air.svg" },
  { name: "LE SALON", logo: "/logos/le-salon.svg" },
  { name: "NOMAD & CO", logo: "/logos/nomad-co.svg" }
];

export const BOOKING_WHATSAPP_URL = "https://wa.me/966545546448";

export const categories = [
  "weddings",
  "companies",
  "restaurants",
  "events",
  "products",
  "realEstate",
  "drone",
  "cinematicVideo"
] as const;

export const navLinks = [
  { key: "portfolio", href: "#gallery" },
  { key: "about", href: "#about" }
] as const;

/**
 * The studio's non-photography services, shared by the desktop nav dropdown
 * and the mobile tab bar's sheet. Each is an enquiry rather than a page, so
 * they all lead to the contact section.
 */
export const extraServiceKeys = [
  "graphicDesign",
  "motionGraphics",
  "videoEditing",
  "voiceover",
  "presentation"
] as const;

export type ExtraServiceKey = (typeof extraServiceKeys)[number];

export type CategoryId = (typeof categories)[number];

export type Album = {
  id: string;
  coverSeed: string;
  date: string;
  location: string;
  videoCount: number;
  photoSeeds: string[];
};

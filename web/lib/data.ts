export type ProjectId = "atlas" | "concrete" | "marrakech";
export type ServiceId =
  | "wedding"
  | "portrait"
  | "fashion"
  | "commercial"
  | "architecture"
  | "travel"
  | "events";

// Verified, real Unsplash photos (free license) — CDN asset ids, not page slugs.
const UNSPLASH_IDS = {
  weddingCouple: "1583939003579-730e3918a45a",
  weddingRings: "1607861884586-c7cfaed16290",
  portraitOne: "1606122017369-d782bbb78f32",
  portraitTwo: "1544005313-94ddf0286df2",
  fashionOne: "1465495976277-4387d4b0b4c6",
  fashionTwo: "1487219116710-23ffcb172b2b",
  commercialOne: "1563170351-be82bc888aa4",
  commercialTwo: "1554866585-cd94860890b7",
  architectureOne: "1486406146926-c627a92ad1ab",
  architectureTwo: "1488972685288-c3fd157d7c7a",
  architectureThree: "1479839672679-a46483c0e7c8",
  travelOne: "1501785888041-af3ef285b470",
  travelTwo: "1433838552652-f9a46b332c40",
  travelThree: "1469474968028-56623f02e42e",
  eventsOne: "1492684223066-81342ee5ff30",
  eventsTwo: "1527269534026-c86f4009eace"
} as const;

export const unsplashUrl = (id: string, width: number, height: number) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&crop=faces,edges&q=80&auto=format`;

export const HERO_IMAGE = unsplashUrl(UNSPLASH_IDS.weddingCouple, 2400, 1500);

export const ABOUT_IMAGE = unsplashUrl(UNSPLASH_IDS.portraitTwo, 1200, 1500);

export const featuredProjects: {
  id: ProjectId;
  image: string;
  width: number;
  height: number;
}[] = [
  {
    id: "atlas",
    image: unsplashUrl(UNSPLASH_IDS.weddingCouple, 1600, 1100),
    width: 1600,
    height: 1100
  },
  {
    id: "concrete",
    image: unsplashUrl(UNSPLASH_IDS.architectureOne, 1600, 1100),
    width: 1600,
    height: 1100
  },
  {
    id: "marrakech",
    image: unsplashUrl(UNSPLASH_IDS.fashionOne, 1600, 1100),
    width: 1600,
    height: 1100
  }
];

export const services: { id: ServiceId; image: string }[] = [
  { id: "wedding", image: unsplashUrl(UNSPLASH_IDS.weddingCouple, 900, 1200) },
  { id: "portrait", image: unsplashUrl(UNSPLASH_IDS.portraitTwo, 900, 1200) },
  { id: "fashion", image: unsplashUrl(UNSPLASH_IDS.fashionTwo, 900, 1200) },
  { id: "commercial", image: unsplashUrl(UNSPLASH_IDS.commercialOne, 900, 1200) },
  { id: "architecture", image: unsplashUrl(UNSPLASH_IDS.architectureTwo, 900, 1200) },
  { id: "travel", image: unsplashUrl(UNSPLASH_IDS.travelOne, 900, 1200) },
  { id: "events", image: unsplashUrl(UNSPLASH_IDS.eventsOne, 900, 1200) }
];

export type GalleryItem = {
  photoId: string;
  width: number;
  height: number;
  projectId: ProjectId;
};

export const galleryItems: GalleryItem[] = [
  { photoId: UNSPLASH_IDS.weddingRings, width: 1200, height: 1600, projectId: "atlas" },
  { photoId: UNSPLASH_IDS.architectureOne, width: 1200, height: 900, projectId: "concrete" },
  { photoId: UNSPLASH_IDS.fashionOne, width: 1200, height: 1400, projectId: "marrakech" },
  { photoId: UNSPLASH_IDS.travelOne, width: 1200, height: 1000, projectId: "atlas" },
  { photoId: UNSPLASH_IDS.architectureTwo, width: 1200, height: 1700, projectId: "concrete" },
  { photoId: UNSPLASH_IDS.fashionTwo, width: 1200, height: 1100, projectId: "marrakech" },
  { photoId: UNSPLASH_IDS.travelTwo, width: 1200, height: 1500, projectId: "atlas" },
  { photoId: UNSPLASH_IDS.eventsOne, width: 1200, height: 950, projectId: "marrakech" },
  { photoId: UNSPLASH_IDS.architectureThree, width: 1200, height: 1300, projectId: "concrete" }
];

export const galleryUrl = (item: GalleryItem) =>
  unsplashUrl(item.photoId, item.width, item.height);

export const storyImages = [
  "https://fastly.picsum.photos/id/12/3888/2592.jpg?hmac=z5QnvAxvFWTEDcrH9g34B5whrOlRpoyRMaX-wJpT9h0",
  "https://fastly.picsum.photos/id/122/3888/2592.jpg?hmac=xkROmdWG_MzDmpTM2MTawXrpURb60jcTqzkxatKBbOk",
  "https://fastly.picsum.photos/id/11/3888/2592.jpg?hmac=dkM-BSWi2m7YAH3n-fvvXSzUS4k668DYPBZ6UVoJN10"
];

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

export const instagramImages = [
  "https://picsum.photos/seed/badri-ig1/800/800",
  "https://picsum.photos/seed/badri-ig2/800/800",
  "https://picsum.photos/seed/badri-ig3/800/800",
  "https://picsum.photos/seed/badri-ig4/800/800",
  "https://picsum.photos/seed/badri-ig5/800/800",
  "https://picsum.photos/seed/badri-ig6/800/800",
  "https://picsum.photos/seed/badri-ig7/800/800",
  "https://picsum.photos/seed/badri-ig8/800/800"
];

/**
 * Where every "Book" call-to-action sends the visitor.
 *
 * Kept here rather than in the CMS because it is the studio's own booking
 * channel, not per-page content — the Contact section's separate `whatsappUrl`
 * still overrides its own row.
 */
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

export type CategoryId = (typeof categories)[number];

export const categoryPages: Record<CategoryId, { heroImage: string }> = {
  weddings: { heroImage: "/images/category-weddings-hero.png" },
  companies: { heroImage: "https://picsum.photos/seed/badri-cat-companies-hero/2000/1300" },
  restaurants: { heroImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8Y2FmZXxlbnwwfDB8MHx8fDA%3D" },
  events: { heroImage: "https://picsum.photos/seed/badri-cat-events-hero/2000/1300" },
  products: { heroImage: "https://picsum.photos/seed/badri-cat-products-hero/2000/1300" },
  realEstate: { heroImage: "https://picsum.photos/seed/badri-cat-realestate-hero/2000/1300" },
  drone: { heroImage: "https://picsum.photos/seed/badri-cat-drone-hero/2000/1300" },
  cinematicVideo: { heroImage: "https://picsum.photos/seed/badri-cat-cinematic-hero/2000/1300" }
};

export type Album = {
  id: string;
  coverSeed: string;
  date: string;
  location: string;
  videoCount: number;
  photoSeeds: string[];
};

function buildAlbum(
  category: CategoryId,
  index: number,
  date: string,
  location: string,
  photoCount: number
): Album {
  const id = `${category}-${index + 1}`;
  return {
    id,
    coverSeed: `badri-album-${id}-cover`,
    date,
    location,
    videoCount: 1,
    photoSeeds: Array.from(
      { length: photoCount },
      (_, i) => `badri-album-${id}-${i + 1}`
    )
  };
}

export const categoryAlbums: Record<CategoryId, Album[]> = {
  weddings: [
    buildAlbum("weddings", 0, "2026-01-12", "Al-Khair, Riyadh", 12),
    buildAlbum("weddings", 1, "2025-11-03", "Aura Hotel, Jeddah", 10),
    buildAlbum("weddings", 2, "2025-09-21", "Le Salon, Casablanca", 9)
  ],
  companies: [
    buildAlbum("companies", 0, "2026-02-18", "Kayan HQ, Dubai", 8),
    buildAlbum("companies", 1, "2025-12-05", "Nomad & Co, Amman", 9),
    buildAlbum("companies", 2, "2025-10-14", "Atlas Air, Casablanca", 7)
  ],
  restaurants: [
    buildAlbum("restaurants", 0, "2026-03-02", "Maison Noor, Marrakech", 11),
    buildAlbum("restaurants", 1, "2025-12-20", "Le Salon Cafe, Cairo", 9),
    buildAlbum("restaurants", 2, "2025-10-08", "Nomad & Co, Amman", 8)
  ],
  events: [
    buildAlbum("events", 0, "2026-01-12", "Al-Khair, Riyadh", 12),
    buildAlbum("events", 1, "2025-11-27", "Aura Hotel, Jeddah", 10),
    buildAlbum("events", 2, "2025-09-15", "Kayan HQ, Dubai", 8)
  ],
  products: [
    buildAlbum("products", 0, "2026-02-09", "Studio, Casablanca", 10),
    buildAlbum("products", 1, "2025-12-11", "Maison Noor, Marrakech", 8),
    buildAlbum("products", 2, "2025-10-30", "Studio, Cairo", 9)
  ],
  realEstate: [
    buildAlbum("realEstate", 0, "2026-01-25", "Palm Estates, Dubai", 11),
    buildAlbum("realEstate", 1, "2025-11-14", "Atlas Residences, Marrakech", 9),
    buildAlbum("realEstate", 2, "2025-09-02", "Le Salon Villas, Casablanca", 10)
  ],
  drone: [
    buildAlbum("drone", 0, "2026-02-27", "Atlas Coastline, Agadir", 9),
    buildAlbum("drone", 1, "2025-12-16", "Palm Estates, Dubai", 8),
    buildAlbum("drone", 2, "2025-10-19", "Al-Khair, Riyadh", 10)
  ],
  cinematicVideo: [
    buildAlbum("cinematicVideo", 0, "2026-01-12", "Al-Khair, Riyadh", 12),
    buildAlbum("cinematicVideo", 1, "2025-11-30", "Marrakech Medina", 9),
    buildAlbum("cinematicVideo", 2, "2025-09-25", "Amalfi Coast", 8)
  ]
};

export const albumPhotoUrl = (seed: string, width = 1200, height = 900) =>
  `https://picsum.photos/seed/${seed}/${width}/${height}`;

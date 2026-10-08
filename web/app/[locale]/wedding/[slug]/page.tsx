import AlbumPage, { generateMetadata as albumMetadata } from "@/components/AlbumPage";

type Props = { params: Promise<{ locale: string; slug: string }> };

async function albumParams(params: Props["params"]) {
  const { locale, slug } = await params;
  return { locale, id: "weddings", albumId: slug };
}

export async function generateMetadata({ params }: Props) {
  return albumMetadata({ params: albumParams(params) });
}

export default function WeddingPage({ params }: Props) {
  return AlbumPage({ params: albumParams(params), weddingRoute: true });
}

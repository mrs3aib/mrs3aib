import AlbumPage from "@/components/AlbumPage";
export { generateMetadata } from "@/components/AlbumPage";

type Props = { params: Promise<{ locale: string; id: string; albumId: string }> };

export default function CategoryAlbumPage({ params }: Props) {
  return AlbumPage({ params });
}

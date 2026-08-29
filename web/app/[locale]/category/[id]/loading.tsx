import LogoLoader from "@/components/LogoLoader";

export default function CategoryLoading() {
  return (
    <div className="flex h-[80vh] min-h-[560px] items-center justify-center bg-base">
      <LogoLoader className="h-16 w-24 text-accent md:h-20 md:w-32" />
    </div>
  );
}

import logoUrl from "@/assets/logo2.svg";

type LogoLoaderProps = {
  className?: string;
};

export function LogoLoader({ className = "h-16 w-24 md:h-20 md:w-32" }: LogoLoaderProps) {
  return (
    <span
      className={`relative block overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <img
        src={logoUrl}
        alt=""
        className="h-full w-full object-contain opacity-15 brightness-0"
        draggable={false}
      />
      <span className="absolute left-0 top-0 h-0 w-full overflow-hidden animate-[logo-emblem-wipe_2.2s_var(--ease-luxe)_infinite]">
        <img
          src={logoUrl}
          alt=""
          className={`max-w-none object-contain brightness-0 ${className}`}
          draggable={false}
        />
      </span>
    </span>
  );
}

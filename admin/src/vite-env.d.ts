/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Optional: a missing .env leaves these undefined at runtime, so every read
  // must guard. Declaring them as plain `string` hides that from the compiler.
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

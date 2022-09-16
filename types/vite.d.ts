/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GOOGLE_MAPS_API_KEY: string;
  readonly VITE_TAG_MANAGER_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

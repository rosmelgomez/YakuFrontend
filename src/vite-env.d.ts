/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FASTAPI_URL?: string;
  readonly VITE_FASTAPI_WS_URL?: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

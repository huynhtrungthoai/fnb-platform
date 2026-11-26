interface ImportMetaEnv {
  /** Base URL of the API, for example http://localhost:4000. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

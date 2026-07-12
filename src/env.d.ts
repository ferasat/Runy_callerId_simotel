/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'development' | 'testing' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

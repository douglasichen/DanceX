/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  // Add more environment variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module "*.mp4" {
  const src: string;
  export default src;
}

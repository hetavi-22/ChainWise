/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  /** Optional XYZ template for Earth Engine NO₂ tiles, e.g. `https://.../{z}/{x}/{y}` */
  readonly VITE_EE_NO2_TILE_TEMPLATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

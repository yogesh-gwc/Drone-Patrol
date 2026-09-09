/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SOCKET_URL?: string
  /** MapTiler API key. Required for the map, style and terrain sources. */
  readonly VITE_MAPTILER_API_KEY?: string
  /** Optional MapTiler style id override, e.g. `dataviz-dark`. */
  readonly VITE_MAP_STYLE?: string
}

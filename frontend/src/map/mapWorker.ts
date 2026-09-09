import { setWorkerUrl } from 'maplibre-gl'
// `?url` makes Vite emit the worker as a build asset and hand back its final
// hashed URL, in both dev and production.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

/**
 * Pins MapLibre's web worker URL.
 *
 * MapLibre locates its worker with `new URL(`./${name}`, import.meta.url)`.
 * That template is dynamic, so neither Vite's dependency pre-bundler nor
 * Rollup can resolve it:
 *
 *   - in dev, pre-bundling rewrites `import.meta.url` to `.vite/deps/`, where
 *     the worker file does not exist;
 *   - in a production build, the reference is not statically analysable, so no
 *     worker asset is emitted at all.
 *
 * Either way the request 404s, no workers start, and the style never finishes
 * loading - the map sits on "loading" forever with no error. Setting the URL
 * explicitly removes the guesswork from both paths.
 *
 * Must run before the first Map is constructed; `MapScene` imports it for that
 * side effect.
 */
setWorkerUrl(workerUrl)

// MapLibre v6 ships an ES-module worker; let Vite bundle it and tell MapLibre where it lives.
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
setWorkerUrl(workerUrl);

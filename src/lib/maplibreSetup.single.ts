import { setWorkerUrl } from 'maplibre-gl';
import workerSrc from 'maplibre-gl/dist/maplibre-gl-worker.mjs?raw';
setWorkerUrl(URL.createObjectURL(new Blob([workerSrc], { type: 'text/javascript' })));

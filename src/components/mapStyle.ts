import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';

export const baseStyle = (globe: boolean): StyleSpecification => ({
  version: 8,
  projection: { type: globe ? 'globe' : 'mercator' },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    carto: {
      type: 'raster', tileSize: 256,
      tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors', maxzoom: 16,
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto', paint: { 'raster-saturation': -0.3, 'raster-brightness-max': 0.9 } }],
});

export const whirlColor: ExpressionSpecification = ['interpolate', ['linear'], ['get', 'score'], 0.5, '#f7c948', 1, '#ff9a1a', 3, '#ff2d6f', 6, '#d61aff'];

export const nwsColor: ExpressionSpecification = ['match', ['get', 'event'],
  'Tornado Warning', '#ff1f3d', 'Severe Thunderstorm Warning', '#ffb000', 'Tornado Watch', '#ffff55',
  'Severe Thunderstorm Watch', '#db7093', 'Flash Flood Warning', '#2ee86b', '#7fd6ff'];

export const isCig: ExpressionSpecification = ['==', ['slice', ['to-string', ['get', 'LABEL']], 0, 3], 'CIG'];

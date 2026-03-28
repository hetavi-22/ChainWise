const TILE_SIZE = 256

/**
 * Builds a 256×256 XYZ ImageMapType for Sentinel-5P / Earth Engine tile endpoints.
 *
 * XYZ injection: Google calls getTileUrl(coord, zoom) per tile. `coord.x` / `coord.y`
 * are tile column/row indices at that zoom; we substitute them (and zoom) into the
 * backend template so each tile request hits the correct EE tile URL.
 */
export function createNo2ImageMapType(
  eeTileUrlTemplate: string,
): google.maps.ImageMapType {
  return new google.maps.ImageMapType({
    name: 'NO₂ (Sentinel-5P)',
    alt: 'Nitrogen dioxide satellite overlay',
    opacity: 0.6,
    maxZoom: 12,
    tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
    getTileUrl: (coord, zoom) =>
      eeTileUrlTemplate
        .replaceAll('{z}', String(zoom))
        .replaceAll('{x}', String(coord.x))
        .replaceAll('{y}', String(coord.y)),
  })
}

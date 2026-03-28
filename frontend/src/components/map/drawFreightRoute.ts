export type FreightLatLng = google.maps.LatLngLiteral

/**
 * Renders or updates the geodesic freight path. Returns the new Polyline (or null if cleared).
 */
export function drawRoute(
  map: google.maps.Map,
  coordinates: FreightLatLng[],
  existingPolyline: google.maps.Polyline | null,
): google.maps.Polyline | null {
  existingPolyline?.setMap(null)

  if (coordinates.length < 2) {
    return null
  }

  return new google.maps.Polyline({
    path: coordinates,
    map,
    geodesic: true,
    strokeColor: '#00FF00',
    strokeOpacity: 1.0,
    strokeWeight: 4,
  })
}

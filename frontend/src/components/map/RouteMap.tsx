import { MapContainer, TileLayer } from 'react-leaflet'

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export function RouteMap() {
  return (
    <MapContainer
      center={[25, 10]}
      zoom={2}
      className="z-0 h-full w-full"
      scrollWheelZoom
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={OSM_ATTRIBUTION} />
    </MapContainer>
  )
}

import { GREEN_FREIGHT_DARK_MAP_STYLE } from './googleMapDarkStyle'

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 28.7041, lng: 77.1025 }

export type InitDarkMapOptions = {
  center?: google.maps.LatLngLiteral
  zoom?: number
}

/**
 * Single responsibility: construct the base Map with dark styling and sane controls.
 */
export function initDarkFreightMap(
  el: HTMLElement,
  options: InitDarkMapOptions = {},
): google.maps.Map {
  return new google.maps.Map(el, {
    center: options.center ?? DEFAULT_CENTER,
    zoom: options.zoom ?? 5,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    disableDefaultUI: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    styles: GREEN_FREIGHT_DARK_MAP_STYLE,
    backgroundColor: '#060a12',
  })
}

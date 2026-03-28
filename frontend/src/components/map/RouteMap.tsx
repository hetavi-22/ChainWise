/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { RouteCandidate, RouteLeg } from '../../lib/demoPlanner'
import { createNo2ImageMapType } from './no2ImageMapType'
import { GREEN_FREIGHT_DARK_MAP_STYLE } from './googleMapDarkStyle'

type Props = {
  routes?: RouteCandidate[]
  selectedRouteId?: string | null
  onSelectRoute?: (routeId: string) => void
  showNo2Overlay?: boolean
}

type GoogleMapsWindow = Window & {
  google?: any
}

let googleMapsScriptPromise: Promise<any> | null = null

export function RouteMap({ routes = [], selectedRouteId, onSelectRoute, showNo2Overlay = false }: Props) {
  const selectedRoute = useMemo(() => {
    if (!routes || routes.length === 0) return null
    return routes.find((route) => route.routeId === selectedRouteId) ?? routes[0]
  }, [routes, selectedRouteId])

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const overlayRef = useRef<any[]>([])
  const infoWindowRef = useRef<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing-key'>(
    apiKey ? 'loading' : 'missing-key',
  )

  const mapCenter = useMemo(() => {
    if (!selectedRoute) return { lat: 20, lng: 0 } // Global view for "plain" start
    return {
      lat: (selectedRoute.origin.lat + selectedRoute.destination.lat) / 2,
      lng: (selectedRoute.origin.lng + selectedRoute.destination.lng) / 2,
    }
  }, [selectedRoute])

  useEffect(() => {
    if (!apiKey) return

    let cancelled = false

    loadGoogleMapsApi(apiKey)
      .then(() => {
        if (!cancelled) setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [apiKey])

  useEffect(() => {
    if (status !== 'ready' || !mapElementRef.current) return

    const googleMaps = getGoogleMaps()
    if (!googleMaps) return

    if (!mapRef.current) {
      mapRef.current = new googleMaps.maps.Map(mapElementRef.current, {
        center: mapCenter,
        zoom: 4,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        backgroundColor: '#07131a',
        styles: GREEN_FREIGHT_DARK_MAP_STYLE,
      })
      infoWindowRef.current = new googleMaps.maps.InfoWindow()
    } else {
      mapRef.current.setCenter(mapCenter)
    }
  }, [mapCenter, status])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return

    const googleMaps = getGoogleMaps()
    if (!googleMaps) return

    clearOverlays(overlayRef.current)
    overlayRef.current = []

    if (!selectedRoute) return // Plain map mode: just show the base map at default center

    routes.forEach((route) => {
      const isSelected = route.routeId === selectedRoute.routeId

      route.legs.forEach((leg) => {
        const polyline = new googleMaps.maps.Polyline({
          path: leg.geometry.map(([lat, lng]) => ({ lat, lng })),
          geodesic: true,
          clickable: true,
          ...getLegStyle(leg, isSelected),
        })

        polyline.addListener('click', (event: any) => {
          if (onSelectRoute) onSelectRoute(route.routeId)
          openLegInfoWindow(
            googleMaps,
            mapRef.current,
            infoWindowRef.current,
            event?.latLng,
            route,
            leg,
          )
        })

        polyline.setMap(mapRef.current)
        overlayRef.current.push(polyline)
      })
    })

    buildRouteNodes(selectedRoute).forEach((markerConfig) => {
      const marker = createMapMarker(googleMaps, mapRef.current, markerConfig)
      if (!marker) return

      marker.addListener('click', () => {
        infoWindowRef.current?.setContent(markerConfig.content)
        infoWindowRef.current?.open({
          map: mapRef.current,
          anchor: marker,
        })
      })

      overlayRef.current.push(marker)
    })

    const bounds = new googleMaps.maps.LatLngBounds()
    collectRouteBounds(selectedRoute).forEach(([lat, lng]) => bounds.extend({ lat, lng }))
    mapRef.current.fitBounds(bounds, 80)
  }, [onSelectRoute, routes, selectedRoute, status])

  useEffect(() => {
    return () => {
      clearOverlays(overlayRef.current)
      overlayRef.current = []
    }
  }, [])

  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return
    const map = mapRef.current
    
    // Clear existing NO2 layer if present
    const len = map.overlayMapTypes.getLength()
    for (let i = len - 1; i >= 0; i--) {
      if (map.overlayMapTypes.getAt(i)?.name === 'NO₂ (Sentinel-5P)') {
        map.overlayMapTypes.removeAt(i)
      }
    }

    if (showNo2Overlay) {
      const template = import.meta.env.VITE_EE_NO2_TILE_TEMPLATE || 'https://earthengine.googleapis.com/v1/projects/earthengine-public/maps/a8e01083-a91d-4034-ba8f-c0202970a256-427c3ea4559a4bb80ea21051512db207/tiles/{z}/{x}/{y}'
      if (template) {
        const layer = createNo2ImageMapType(template)
        map.overlayMapTypes.push(layer)
      }
    }
  }, [showNo2Overlay, status])

  return (
    <div className="google-map-shell">
      <div ref={mapElementRef} className="google-map-canvas" />
      {status !== 'ready' ? (
        <div className="map-status-overlay">
          <div className="map-status-card">
            <strong>
              {status === 'missing-key'
                ? 'Google Maps API key required'
                : status === 'loading'
                  ? 'Loading Google Maps'
                  : 'Google Maps failed to load'}
            </strong>
            <p>
              {status === 'missing-key'
                ? 'Add VITE_GOOGLE_MAPS_API_KEY to the frontend environment so this map can render on Google Maps.'
                : status === 'loading'
                  ? 'Booting the Google map surface for the corridor view.'
                  : 'Check the API key, Maps JavaScript API enablement, and billing configuration.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function loadGoogleMapsApi(apiKey: string) {
  const googleMapsWindow = window as GoogleMapsWindow
  if (typeof googleMapsWindow.google?.maps?.Map === 'function') {
    return Promise.resolve(googleMapsWindow.google)
  }

  if (googleMapsScriptPromise) return googleMapsScriptPromise

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&loading=async&libraries=marker`
    script.async = true
    script.defer = true
    script.onload = async () => {
      try {
        const loadedGoogle = await waitForMapsReady()
        resolve(loadedGoogle)
      } catch (error) {
        reject(error)
      }
    }
    script.onerror = () => reject(new Error('Google Maps script failed to load.'))
    document.head.appendChild(script)
  })

  return googleMapsScriptPromise
}

function getGoogleMaps() {
  return (window as GoogleMapsWindow).google
}

async function waitForMapsReady(timeoutMs = 8000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const loadedGoogle = getGoogleMaps()
    if (typeof loadedGoogle?.maps?.Map === 'function') {
      return loadedGoogle
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  throw new Error('Google Maps API did not initialize map constructors in time.')
}

function clearOverlays(overlays: any[]) {
  overlays.forEach((overlay) => {
    if (typeof overlay?.setMap === 'function') {
      overlay.setMap(null)
      return
    }
    if ('map' in (overlay ?? {})) {
      overlay.map = null
    }
  })
}

function createMapMarker(
  googleMaps: any,
  map: any,
  markerConfig: {
    position: { lat: number; lng: number }
    title: string
    color: string
    scale: number
    showLabel?: boolean
    isChokepoint?: boolean
  },
) {
  const AdvancedMarkerElement = googleMaps?.marker?.AdvancedMarkerElement
  if (AdvancedMarkerElement) {
    const pin = document.createElement('div')
    const size = Math.max(markerConfig.scale * 2, 10)
    pin.style.width = `${size}px`
    pin.style.height = `${size}px`
    pin.style.borderRadius = '50%'
    pin.style.background = markerConfig.color
    pin.style.border = '2px solid #07131a'
    pin.style.boxShadow = markerConfig.isChokepoint ? '0 0 10px rgba(255, 75, 43, 0.6)' : '0 0 0 2px rgba(7, 19, 26, 0.25)'
    pin.style.position = 'relative'

    if (markerConfig.showLabel) {
      const label = document.createElement('div')
      label.textContent = markerConfig.title
      label.style.position = 'absolute'
      label.style.top = `${size + 6}px`
      label.style.left = '50%'
      label.style.transform = 'translateX(-50%)'
      label.style.whiteSpace = 'nowrap'
      label.style.background = 'rgba(7, 19, 26, 0.88)'
      label.style.color = '#fff'
      label.style.padding = '2px 8px'
      label.style.borderRadius = '4px'
      label.style.fontSize = '10px'
      label.style.fontWeight = 'bold'
      label.style.border = '1px solid rgba(255, 255, 255, 0.15)'
      label.style.pointerEvents = 'none'
      label.style.zIndex = '10'
      pin.appendChild(label)
    }

    return new AdvancedMarkerElement({
      position: markerConfig.position,
      map,
      title: markerConfig.title,
      content: pin,
    })
  }

  return new googleMaps.maps.Marker({
    position: markerConfig.position,
    map,
    title: markerConfig.title,
    icon: {
      path: googleMaps.maps.SymbolPath.CIRCLE,
      scale: markerConfig.scale,
      fillColor: markerConfig.color,
      fillOpacity: 1,
      strokeColor: '#07131a',
      strokeWeight: 2,
    },
  })
}

function buildRouteNodes(route: RouteCandidate) {
  const nodes: {
    title: string
    type: string
    position: { lat: number; lng: number }
    color: string
    scale: number
    showLabel?: boolean
    isChokepoint?: boolean
  }[] = [
    {
      title: route.origin.label,
      type: route.origin.type,
      position: { lat: route.origin.lat, lng: route.origin.lng },
      color: '#f3cb72',
      scale: 8,
      showLabel: true,
    },
    {
      title: route.destination.label,
      type: route.destination.type,
      position: { lat: route.destination.lat, lng: route.destination.lng },
      color: '#f6947e',
      scale: 8,
      showLabel: true,
    },
  ]

  route.legs.forEach((leg) => {
    // Add hub nodes
    if (leg.originIsChokepoint || leg.mode === 'ship') {
      const isChoke = !!leg.originIsChokepoint
      nodes.push({
        title: leg.fromLabel,
        type: isChoke ? 'Maritime Hub' : 'Maritime Node',
        position: { lat: leg.geometry[0][0], lng: leg.geometry[0][1] },
        color: '#ff4b2b',
        scale: isChoke ? 10 : 7,
        showLabel: isChoke,
        isChokepoint: isChoke,
      })
    }

    if (leg.destIsChokepoint) {
      const last = leg.geometry[leg.geometry.length - 1]
      nodes.push({
        title: leg.toLabel,
        type: 'Maritime Hub',
        position: { lat: last[0], lng: last[1] },
        color: '#ff4b2b',
        scale: 10,
        showLabel: true,
        isChokepoint: true,
      })
    }
  })

  // Deduplicate by position
  const seen = new Set<string>()
  const uniqueNodes = nodes.filter((n) => {
    const key = `${n.position.lat},${n.position.lng}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return uniqueNodes.map((node) => ({
    ...node,
    content: `
      <div class="map-tooltip">
        <strong>${escapeHtml(node.type)}</strong>
        <div>${escapeHtml(node.title)}</div>
      </div>
    `,
  }))
}
function collectRouteBounds(route: RouteCandidate) {
  return route.legs.flatMap((leg) => leg.geometry)
}

function openLegInfoWindow(
  googleMaps: any,
  map: any,
  infoWindow: any,
  latLng: any,
  route: RouteCandidate,
  leg: RouteLeg,
) {
  const anchorPosition =
    latLng ??
    new googleMaps.maps.LatLng(leg.geometry[0][0], leg.geometry[0][1])

  infoWindow?.setContent(`
    <div class="map-tooltip">
      <strong>#${route.rank} · ${escapeHtml(formatModeLabel(leg.mode))}</strong>
      <div>${escapeHtml(leg.fromLabel)} → ${escapeHtml(leg.toLabel)}</div>
      <div>${formatNumber(leg.distanceKm)} km · ${formatNumber(leg.emissionsKg)} kg CO2e</div>
      <div>${escapeHtml(leg.strategy)}</div>
      ${leg.trafficLevel ? `<div>Traffic: ${escapeHtml(leg.trafficLevel)}</div>` : ''}
    </div>
  `)
  infoWindow?.setPosition(anchorPosition)
  infoWindow?.open({
    map,
  })
}

function getLegStyle(leg: RouteLeg, isSelected: boolean) {
  const strokeColor =
    leg.mode === 'truck'
      ? '#f43f5e'
      : leg.mode === 'rail'
        ? '#f59e0b'
        : leg.mode === 'air'
          ? '#8b5cf6'
          : '#3b82f6'

  if (leg.mode === 'ship') {
    return {
      strokeColor,
      strokeOpacity: isSelected ? 0.18 : 0.08,
      strokeWeight: isSelected ? 4 : 3,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: isSelected ? 0.95 : 0.42,
            strokeColor,
            scale: isSelected ? 4 : 3,
          },
          offset: '0',
          repeat: '18px',
        },
      ],
    }
  }

  if (leg.mode === 'rail') {
    return {
      strokeColor,
      strokeOpacity: isSelected ? 0.92 : 0.34,
      strokeWeight: isSelected ? 5 : 3,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: isSelected ? 0.92 : 0.34,
            strokeColor,
            scale: 4,
          },
          offset: '0',
          repeat: '20px',
        },
      ],
    }
  }

  if (leg.mode === 'air') {
    return {
      strokeColor,
      strokeOpacity: isSelected ? 0.88 : 0.3,
      strokeWeight: isSelected ? 4 : 2,
      icons: [
        {
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: isSelected ? 0.88 : 0.3,
            strokeColor,
            scale: 3,
          },
          offset: '0',
          repeat: '14px',
        },
      ],
    }
  }

  return {
    strokeColor,
    strokeOpacity: isSelected ? 0.96 : 0.32,
    strokeWeight: isSelected ? 6 : 3,
  }
}

function formatModeLabel(mode: RouteLeg['mode']) {
  if (mode === 'truck') return 'Truck'
  if (mode === 'rail') return 'Rail'
  if (mode === 'air') return 'Air'
  return 'Ship'
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}



/** Shared palette for map, globe, and legends (presentation-friendly, slightly brighter). */
export const MODE_COLOR_HEX: Record<string, string> = {
  truck: '#f43f5e',
  ship: '#3b82f6',
  air: '#8b5cf6',
  rail: '#f59e0b',
}

export const MODE_LEGEND_ROWS = [
  { mode: 'truck', label: 'Road / truck', color: MODE_COLOR_HEX.truck },
  { mode: 'rail', label: 'Rail', color: MODE_COLOR_HEX.rail },
  { mode: 'ship', label: 'Sea / ship', color: MODE_COLOR_HEX.ship },
  { mode: 'air', label: 'Air', color: MODE_COLOR_HEX.air },
] as const

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Gradient strings for react-globe.gl arcs (start → end of dash animation). */
export function modeArcGradient(mode: string): [string, string] {
  const hex = MODE_COLOR_HEX[mode] ?? '#94a3b8'
  return [hexToRgba(hex, 0.98), hexToRgba(hex, 0.4)]
}

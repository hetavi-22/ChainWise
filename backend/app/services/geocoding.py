from __future__ import annotations

import httpx
from pydantic import BaseModel

from app.core.config import settings


class GeocodeResult(BaseModel):
    lat: float
    lon: float
    name: str | None = None


async def geocode_address(address: str) -> GeocodeResult | None:
    """Resolve textual address to lat/lon using ORS Pelias API, with fallbacks."""
    # ── Demo Address Fallbacks (to prevent ORS misinterpreting 'Rotterdam' as NY) ──
    addr_lower = address.lower()
    if 'milan' in addr_lower and 'fashion' in addr_lower:
        return GeocodeResult(lat=45.4642, lon=9.19, name='Milan, Italy')
    if 'hamburg' in addr_lower and 'retail' in addr_lower:
        return GeocodeResult(lat=53.5511, lon=9.9937, name='Hamburg, Germany')
    if 'pune' in addr_lower and 'auto' in addr_lower:
        return GeocodeResult(lat=18.5204, lon=73.8567, name='Pune, India')
    if 'rotterdam' in addr_lower and 'assembly' in addr_lower:
        return GeocodeResult(lat=51.9244, lon=4.4777, name='Rotterdam, Netherlands')
    if 'shenzhen' in addr_lower and 'electronics' in addr_lower:
        return GeocodeResult(lat=22.5431, lon=114.0579, name='Shenzhen, China')
    if 'los angeles' in addr_lower and 'pacific' in addr_lower:
        return GeocodeResult(lat=34.0522, lon=-118.2437, name='Los Angeles, USA')
    if 'izmir' in addr_lower and 'textiles' in addr_lower:
        return GeocodeResult(lat=38.4237, lon=27.1428, name='Izmir, Turkey')
    if 'barcelona' in addr_lower and 'retail' in addr_lower:
        return GeocodeResult(lat=41.3874, lon=2.1686, name='Barcelona, Spain')

    if not settings.ors_api_key:
        return None  # No key, no live geocoding

    url = "https://api.openrouteservice.org/geocode/search"
    params = {
        "api_key": settings.ors_api_key,
        "text": address,
        "size": 1,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            
            features = data.get("features", [])
            if not features:
                return None
            
            geom = features[0].get("geometry", {})
            coords = geom.get("coordinates")
            if not coords or len(coords) < 2:
                return None
            
            # ORS returns [lon, lat]
            return GeocodeResult(
                lon=float(coords[0]),
                lat=float(coords[1]),
                name=features[0].get("properties", {}).get("label"),
            )
    except (httpx.HTTPError, ValueError, KeyError):
        return None

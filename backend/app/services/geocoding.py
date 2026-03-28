from __future__ import annotations

import httpx
from pydantic import BaseModel

from app.core.config import settings


class GeocodeResult(BaseModel):
    lat: float
    lon: float
    name: str | None = None


async def geocode_address(address: str) -> GeocodeResult | None:
    """Resolve textual address to lat/lon using ORS Pelias API."""
    if not settings.ors_api_key:
        return None  # No key, no geocoding

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

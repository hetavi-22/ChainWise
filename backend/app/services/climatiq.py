from __future__ import annotations

import httpx
from app.core.config import settings
from app.schemas.planning import RouteLeg, TransportMode


async def calculate_climatiq_emissions(
    legs: list[RouteLeg],
    weight_kg: float
) -> float | None:
    """
    Call Climatiq /freight/v3/intermodal endpoint to get authoritative emissions.
    """
    if not settings.climatiq_api_key:
        return None

    url = "https://api.climatiq.io/freight/v3/intermodal"
    
    # Map our modes to Climatiq freight modes
    mode_map = {
        TransportMode.TRUCK: "road",
        TransportMode.RAIL: "rail",
        TransportMode.SHIP: "sea",
        TransportMode.AIR: "air"
    }

    # Build the route payload
    climatiq_route = []
    for leg in legs:
        climatiq_route.append({
            "transport_mode": mode_map.get(leg.mode, "road"),
            "leg_details": {
                "distance": leg.distance_km,
                "distance_unit": "km"
            }
        })

    payload = {
        "route": climatiq_route,
        "cargo": {
            "weight": weight_kg,
            "weight_unit": "kg"
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                url, 
                json=payload, 
                headers={"Authorization": f"Bearer {settings.climatiq_api_key}"}
            )
            r.raise_for_status()
            data = r.json()
            
            # Climatiq returns co2e in kg by default
            return float(data.get("co2e", 0))
    except (httpx.HTTPError, ValueError, KeyError):
        return None

from __future__ import annotations

import math
from pydantic import BaseModel

from app.schemas.planning import RouteLeg, TransportMode
from app.services.dataset_loader import load_airports_dataset, load_ports_dataset


class Hub(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    type: str  # 'port' or 'airport'


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance between two points in KM."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))



# ── Curated major container port hubs (guaranteed ocean-adjacent) ─────────────
# These supplement/override any DB data to ensure only real maritime ports used.
_MAJOR_PORTS: list[tuple[str, str, float, float]] = [
    # (id, name, lat, lon)
    # South Asia
    ("INJNP", "Nhava Sheva (JNPT), Mumbai",   18.950,  72.950),
    ("INMUN", "Mundra Port, Gujarat",           22.840,  69.700),
    ("INCHP", "Chennai Port",                   13.088,  80.298),
    ("INCCU", "Kolkata Port",                   22.553,  88.323),
    ("LKCMB", "Colombo Port, Sri Lanka",         6.943,  79.850),
    # Southeast Asia
    ("SGSIN", "Port of Singapore",               1.264, 103.820),
    ("MYPKG", "Port Klang, Malaysia",            2.997, 101.377),
    ("THBKK", "Laem Chabang Port, Thailand",    13.075, 100.883),
    ("VNHPH", "Hai Phong Port, Vietnam",        20.867, 106.678),
    ("IDTPP", "Tanjung Priok, Jakarta",         -6.107, 106.883),
    # East Asia
    ("CNSHA", "Shanghai Port (Yangshan)",        30.617, 121.967),
    ("CNNGB", "Ningbo-Zhoushan Port",            29.867, 121.583),
    ("CNSZX", "Shenzhen (Yantian) Port",         22.567, 114.267),
    ("CNTXG", "Tianjin Xingang Port",            38.983, 117.750),
    ("KRPUS", "Busan Port, South Korea",         35.100, 129.044),
    ("JPTYO", "Tokyo/Yokohama Port",             35.450, 139.650),
    ("JPOSA", "Osaka/Kobe Port",                 34.680, 135.190),
    # Middle East / Arabian Gulf
    ("AEJEA", "Jebel Ali, Dubai",                24.993,  55.066),
    ("OMMCT", "Port Sultan Qaboos, Muscat",      23.600,  58.567),
    # East Africa
    ("KEMBA", "Port of Mombasa",                 -4.067,  39.667),
    # West Africa
    ("NGAPP", "Apapa Port, Lagos",                6.450,   3.367),
    # Europe Mediterranean
    ("NLRTM", "Port of Rotterdam",               51.900,   4.150),
    ("DEHAM", "Port of Hamburg",                 53.533,   9.980),
    ("GBFXT", "Felixstowe Port, UK",             51.950,   1.300),
    ("ESBCN", "Port of Barcelona",               41.350,   2.183),
    ("ITGOA", "Port of Genoa",                   44.400,   8.917),
    ("GRPIR", "Piraeus Port, Athens",            37.950,  23.617),
    # Americas — West Coast
    ("USLAX", "Port of Los Angeles / Long Beach", 33.720, -118.270),
    ("USOAK", "Port of Oakland",                 37.795, -122.280),
    ("USSEA", "Port of Seattle/Tacoma",          47.580, -122.380),
    ("CAVAN", "Port of Vancouver",               49.283, -123.117),
    ("MXMZT", "Port of Manzanillo, Mexico",      19.050, -104.317),
    # Americas — East Coast / Gulf
    ("USNWK", "Port of New York/Newark",         40.660,  -74.150),
    ("USSAV", "Port of Savannah",                32.083,  -81.083),
    ("USHOU", "Port of Houston",                 29.733,  -95.300),
    ("USMIA", "Port of Miami",                   25.767,  -80.183),
    ("COBUN", "Port of Buenaventura, Colombia",   3.883,  -77.100),
    ("PECLL", "Port of Callao, Peru",            -12.050,  -77.133),
    ("BRSSZ", "Port of Santos, Brazil",          -23.950,  -46.317),
    # South Africa
    ("ZACPT", "Cape Town Port",                  -33.900,   18.433),
    ("ZADUR", "Port of Durban",                  -29.867,   31.017),
    # Australia
    ("AUSYD", "Port Botany (Sydney)",            -33.967, 151.200),
    ("AUMEL", "Port of Melbourne",               -37.850, 144.933),
]

_MAJOR_AIRPORTS: list[tuple[str, str, float, float]] = [
    ("INBOM", "Mumbai (BOM)",         19.089,  72.868),
    ("INDEL", "Delhi (DEL)",          28.556,  77.100),
    ("INCCU", "Kolkata (CCU)",        22.654,  88.447),
    ("SGSIN", "Singapore Changi (SIN)", 1.350, 103.994),
    ("AEDUBAERO", "Dubai (DXB)",      25.253,  55.365),
    ("CNPVG", "Shanghai Pudong (PVG)", 31.143, 121.805),
    ("HKHKG", "Hong Kong (HKG)",      22.308, 113.918),
    ("KRSEL", "Seoul Incheon (ICN)",  37.469, 126.451),
    ("JPNRT", "Tokyo Narita (NRT)",   35.765, 140.386),
    ("GBLON", "London Heathrow (LHR)", 51.477,  -0.461),
    ("DEFRK", "Frankfurt (FRA)",      50.026,   8.543),
    ("NLAMS", "Amsterdam (AMS)",      52.309,   4.764),
    ("FRACDG", "Paris CDG (CDG)",     49.009,   2.547),
    ("USORD", "Chicago O'Hare (ORD)", 41.978,  -87.905),
    ("USLAX", "Los Angeles (LAX)",    33.943, -118.408),
    ("USATL", "Atlanta (ATL)",         33.637,  -84.428),
    ("USNYC", "New York JFK (JFK)",    40.640,  -73.778),
    ("USMIA", "Miami (MIA)",          25.796,  -80.287),
    ("BRGRU", "Guarulhos, Sao Paulo (GRU)", -23.432, -46.469),
    ("ZARJB", "Johannesburg (JNB)",  -26.133,   28.242),
    ("AUMEL", "Melbourne (MEL)",     -37.673,  144.843),
    ("AUSYD", "Sydney (SYD)",        -33.946,  151.177),
]


def find_nearest_hubs(lat: float, lon: float, mode: TransportMode, k: int = 2) -> list[Hub]:
    """Find K nearest maritime or air hubs using curated major hubs list."""
    candidates: list[Hub] = []

    if mode == TransportMode.SHIP:
        candidates = [
            Hub(id=pid, name=name, lat=hlat, lon=hlon, type='port')
            for pid, name, hlat, hlon in _MAJOR_PORTS
        ]
    elif mode == TransportMode.AIR:
        candidates = [
            Hub(id=aid, name=name, lat=hlat, lon=hlon, type='airport')
            for aid, name, hlat, hlon in _MAJOR_AIRPORTS
        ]

    if not candidates:
        return []

    with_dist = [(h, haversine(lat, lon, h.lat, h.lon)) for h in candidates]
    with_dist.sort(key=lambda x: x[1])
    return [x[0] for x in with_dist[:k]]



import httpx
from app.core.config import settings


async def get_ors_route(
    start_lat: float, 
    start_lon: float, 
    end_lat: float, 
    end_lon: float,
    profile: str = "driving-hgv"
) -> tuple[float, float, dict | None] | None:
    """
    Return (distance_km, duration_hours, geometry_geojson) from ORS.
    """
    if not settings.ors_api_key:
        return None

    # Requesting geojson format for the geometry
    url = f"https://api.openrouteservice.org/v2/directions/{profile}/geojson"
    payload = {
        "coordinates": [[start_lon, start_lat], [end_lon, end_lat]]
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Directions V2 POST endpoint is cleaner for geojson
            r = await client.post(
                url, 
                json=payload, 
                headers={"Authorization": settings.ors_api_key}
            )
            r.raise_for_status()
            data = r.json()
            
            feature = data.get("features", [{}])[0]
            summary = feature.get("properties", {}).get("summary", {})
            distance_m = summary.get("distance", 0)
            duration_s = summary.get("duration", 0)
            
            if distance_m <= 0:
                return None
            
            # Extract the actual geometry from the feature
            geometry = feature.get("geometry")
                
            return (distance_m / 1000.0, duration_s / 3600.0, geometry)
    except Exception:
        return None


from app.services.emissions import emissions_for_leg
from app.services.transport_time import leg_duration_hours


import math

# ── Major Sea Lane Waypoints ──────────────────────────────────────────────
# Ships never go over the poles. They transit through these chokepoints.
_SUEZ_ENTRY    = (29.9, 32.6)   # Port Said, Egypt
# ── Major maritime chokepoints and coastal corridor waypoints ─────────────────
# Each cluster is ordered as the ship would actually traverse them
_SUEZ_ENTRY    = (29.9,  32.6)   # Port Said, Egypt (Mediterranean entry)
_SUEZ_EXIT     = (12.6,  43.5)   # Bab-el-Mandeb, Gulf of Aden
_MALACCA_NW    = (5.5,   98.5)   # NW approach to Strait of Malacca
_MALACCA       = (1.3,  103.8)   # Singapore / Strait of Malacca
_PANAMA_ATL    = (9.4,  -79.9)   # Panama Canal Atlantic side
_PANAMA_PAC    = (8.9,  -79.5)   # Panama Canal Pacific side
_CAPE_HOPE     = (-34.4, 18.5)   # Cape of Good Hope
_N_PACIFIC     = (40.0, 175.0)   # North Pacific midpoint (antimeridian split)

# India-specific coastal corridor
_INDIA_W_MID   = (12.0,  73.5)   # West India coast mid (Goa area)
_INDIA_TIP     = (6.0,   80.5)   # Sri Lanka / Cape Comorin area (south of India)
_BAY_BENGAL    = (8.0,   88.0)   # Open Bay of Bengal (avoids coastlines)
_ANDAMAN       = (10.0,  94.0)   # Andaman Sea approach

# Arabian Sea / Middle East corridor
_OMAN_GULF     = (22.0,  60.0)   # Gulf of Oman exit
_ARABIAN_MID   = (15.0,  55.0)   # Mid-Arabian Sea / Gulf of Aden transit
_HORN_AFRICA   = (11.5,  51.0)   # Horn of Africa / Guardafui
_RED_SEA_S     = (13.5,  43.0)   # South Red Sea

# South China Sea
_SCS_N         = (15.0, 115.0)   # South China Sea northern sector
_SCS_MID       = (10.0, 113.0)   # South China Sea mid


def _slerp_segment(lat1: float, lon1: float, lat2: float, lon2: float, n: int = 30) -> list[list[float]]:
    """Spherical linear interpolation between two points — returns n+1 [lon, lat] coords."""
    phi1, lam1 = math.radians(lat1), math.radians(lon1)
    phi2, lam2 = math.radians(lat2), math.radians(lon2)
    d = 2 * math.asin(math.sqrt(
        math.sin((phi1 - phi2) / 2)**2 +
        math.cos(phi1) * math.cos(phi2) * math.sin((lam1 - lam2) / 2)**2
    ))
    if d < 1e-6:
        return [[lon1, lat1], [lon2, lat2]]
    pts = []
    for i in range(n + 1):
        f = i / n
        a = math.sin((1 - f) * d) / math.sin(d)
        b = math.sin(f * d) / math.sin(d)
        x = a * math.cos(phi1) * math.cos(lam1) + b * math.cos(phi2) * math.cos(lam2)
        y = a * math.cos(phi1) * math.sin(lam1) + b * math.cos(phi2) * math.sin(lam2)
        z = a * math.sin(phi1) + b * math.sin(phi2)
        phi_i = math.atan2(z, math.sqrt(x**2 + y**2))
        lam_i = math.atan2(y, x)
        pts.append([math.degrees(lam_i), math.degrees(phi_i)])
    return pts


def _choose_sea_lane_waypoints(lat1: float, lon1: float, lat2: float, lon2: float) -> list[tuple[float, float]]:
    """
    Choose intermediate maritime waypoints so the drawn route follows real sea lanes.
    Uses dense sub-regional waypoints to prevent SLERP segments from crossing land.
    """
    origin_w_india   = 60 < lon1 < 78  and  8 < lat1 < 24
    origin_in_asia   = lon1 > 60  and lat1 > -10
    origin_se_asia   = 95 < lon1 < 135 and lat1 < 25
    origin_americas  = lon1 < -50
    origin_europe    = -10 < lon1 < 45 and lat1 > 30

    dest_in_asia     = lon2 > 60  and lat2 > -10          # ← was missing, caused NameError
    dest_w_india     = 60 < lon2 < 78  and  8 < lat2 < 24
    dest_se_asia     = 95 < lon2 < 135 and lat2 < 25
    dest_americas    = lon2 < -50
    dest_in_europe   = -10 < lon2 < 45 and lat2 > 30

    # ── Intra-Europe (North Sea / Mediterranean coastal routing) ─────────────
    if origin_europe and dest_in_europe:
        _ENGLISH_CHANNEL = (50.5, 0.5)
        _NORTH_SEA       = (56.0, 3.5)
        _BISCAY          = (45.5, -5.0)
        _STRAIT_GIB      = (35.9, -5.6)
        _WESTERN_MED     = (39.0, 5.0)
        # Northern Europe ports use North Sea
        if lat1 > 48 and lat2 > 48:
            return [_ENGLISH_CHANNEL, _NORTH_SEA] if lon1 < 5 or lon2 < 5 else [_NORTH_SEA]
        # Mediterranean ports
        if lat1 < 48 and lat2 < 48:
            return [_WESTERN_MED]
        # Mixed: channel connects Med and North Sea
        return [_WESTERN_MED, _STRAIT_GIB, _BISCAY, _ENGLISH_CHANNEL, _NORTH_SEA]

    # ── India west coast → SE Asia ────────────────────────────────────────────
    if origin_w_india and dest_se_asia:
        return [_INDIA_W_MID, _INDIA_TIP, _BAY_BENGAL, _ANDAMAN, _MALACCA_NW, _MALACCA]

    # ── SE Asia → India west coast ────────────────────────────────────────────
    if origin_se_asia and dest_w_india:
        return [_MALACCA, _MALACCA_NW, _ANDAMAN, _BAY_BENGAL, _INDIA_TIP, _INDIA_W_MID]

    # ── India / Asia → Americas (via Pacific or Atlantic) ────────────────────
    if origin_in_asia and dest_americas:
        if lon2 < -100:  # US West Coast → Pacific
            if origin_w_india:
                return [_INDIA_W_MID, _INDIA_TIP, _BAY_BENGAL, _ANDAMAN, _MALACCA_NW, _MALACCA, _SCS_N, _N_PACIFIC]
            return [_MALACCA, _SCS_N, _N_PACIFIC]
        else:            # US East Coast / Latin America → Suez + Panama
            if origin_w_india:
                return [_OMAN_GULF, _ARABIAN_MID, _HORN_AFRICA, _RED_SEA_S, _SUEZ_EXIT, _SUEZ_ENTRY, _PANAMA_ATL, _PANAMA_PAC]
            return [_INDIA_TIP, _ARABIAN_MID, _HORN_AFRICA, _RED_SEA_S, _SUEZ_EXIT, _SUEZ_ENTRY, _PANAMA_ATL, _PANAMA_PAC]

    # ── Americas → Asia ───────────────────────────────────────────────────────
    if origin_americas and dest_in_asia:
        if lon1 < -100:  # US West Coast → Pacific
            if dest_w_india:
                return [_N_PACIFIC, _SCS_N, _MALACCA, _MALACCA_NW, _ANDAMAN, _BAY_BENGAL, _INDIA_TIP, _INDIA_W_MID]
            return [_N_PACIFIC, _SCS_N, _MALACCA]
        else:            # US East Coast / Latin America → Panama + Suez
            return [_PANAMA_PAC, _PANAMA_ATL, _SUEZ_ENTRY, _SUEZ_EXIT, _RED_SEA_S, _HORN_AFRICA, _ARABIAN_MID, _OMAN_GULF]

    # ── Asia → Europe (via Suez) ──────────────────────────────────────────────
    if origin_in_asia and dest_in_europe:
        if origin_w_india:
            return [_OMAN_GULF, _ARABIAN_MID, _HORN_AFRICA, _RED_SEA_S, _SUEZ_EXIT, _SUEZ_ENTRY]
        if origin_se_asia:
            return [_MALACCA, _MALACCA_NW, _ANDAMAN, _BAY_BENGAL, _INDIA_TIP, _ARABIAN_MID, _HORN_AFRICA, _RED_SEA_S, _SUEZ_EXIT, _SUEZ_ENTRY]
        return [_INDIA_TIP, _ARABIAN_MID, _RED_SEA_S, _SUEZ_EXIT, _SUEZ_ENTRY]

    # ── Europe → Asia (via Suez) ──────────────────────────────────────────────
    if origin_europe and dest_in_asia:
        if dest_w_india:
            return [_SUEZ_ENTRY, _SUEZ_EXIT, _RED_SEA_S, _HORN_AFRICA, _ARABIAN_MID, _OMAN_GULF]
        if dest_se_asia:
            return [_SUEZ_ENTRY, _SUEZ_EXIT, _RED_SEA_S, _HORN_AFRICA, _ARABIAN_MID, _INDIA_TIP, _BAY_BENGAL, _ANDAMAN, _MALACCA_NW, _MALACCA]
        return [_SUEZ_ENTRY, _SUEZ_EXIT, _RED_SEA_S, _HORN_AFRICA, _ARABIAN_MID, _INDIA_TIP]

    return []  # Fallback: straight SLERP (short intra-regional route)



def generate_maritime_path(lat1: float, lon1: float, lat2: float, lon2: float) -> dict:
    """Build a realistic sea lane route using chokepoint waypoints + SLERP segments."""
    waypoints = _choose_sea_lane_waypoints(lat1, lon1, lat2, lon2)
    all_pts: list[tuple[float, float]] = [(lat1, lon1)] + waypoints + [(lat2, lon2)]

    coordinates: list[list[float]] = []
    for i in range(len(all_pts) - 1):
        a_lat, a_lon = all_pts[i]
        b_lat, b_lon = all_pts[i + 1]
        seg = _slerp_segment(a_lat, a_lon, b_lat, b_lon, n=30)
        # Avoid duplicating connection point between segments
        if coordinates:
            seg = seg[1:]
        coordinates.extend(seg)

    return {"type": "LineString", "coordinates": coordinates}


def generate_great_circle_path(lat1: float, lon1: float, lat2: float, lon2: float, segments: int = 60) -> dict:
    """Air-route great circle, clamped to max ±80° latitude."""
    coords = _slerp_segment(lat1, lon1, lat2, lon2, n=segments)
    # Clamp extreme latitudes (air routes still go somewhat north, but not 85°)
    clamped = [[c[0], max(-80.0, min(80.0, c[1]))] for c in coords]
    return {"type": "LineString", "coordinates": clamped}


async def assemble_multimodal_chain(
    origin_lat: float, 
    origin_lon: float, 
    dest_lat: float, 
    dest_lon: float, 
    longhaul_mode: TransportMode,
    weight_kg: float = 1000,
    first_last_mile_mode: TransportMode = TransportMode.TRUCK
) -> list[list[RouteLeg]]:
    """
    Generate candidate route chains (Truck -> Ship -> Truck, etc.)
    using a smart pre-filter to minimize ORS API calls.
    """
    # Road/rail direct corridor: a single real end-to-end leg.
    if longhaul_mode in (TransportMode.TRUCK, TransportMode.RAIL):
        return [
            [
                await build_direct_surface_leg(
                    origin_lat=origin_lat,
                    origin_lon=origin_lon,
                    dest_lat=dest_lat,
                    dest_lon=dest_lon,
                    mode=longhaul_mode,
                )
            ]
        ]

    # 1. Broad Discovery: Find more candidate hubs (K=5 instead of 2)
    origin_hubs = find_nearest_hubs(origin_lat, origin_lon, longhaul_mode, k=5)
    dest_hubs = find_nearest_hubs(dest_lat, dest_lon, longhaul_mode, k=5)
    
    # 2. Build fast candidates using Haversine (Local only)
    pre_candidates: list[list[RouteLeg]] = []
    for start_hub in origin_hubs:
        for end_hub in dest_hubs:
            legs = [
                RouteLeg(
                    mode=first_last_mile_mode,
                    distance_km=haversine(origin_lat, origin_lon, start_hub.lat, start_hub.lon)
                ),
                RouteLeg(
                    mode=longhaul_mode,
                    distance_km=haversine(start_hub.lat, start_hub.lon, end_hub.lat, end_hub.lon)
                ),
                RouteLeg(
                    mode=first_last_mile_mode,
                    distance_km=haversine(end_hub.lat, end_hub.lon, dest_lat, dest_lon)
                )
            ]
            pre_candidates.append(legs)

    # 3. Score and Rank: Identify Top Hub Pairs using local math
    hub_pairs = []
    for s in origin_hubs:
        for e in dest_hubs:
            # Estimate total distance for ranking
            d_total = haversine(origin_lat, origin_lon, s.lat, s.lon) + \
                      haversine(s.lat, s.lon, e.lat, e.lon) + \
                      haversine(e.lat, e.lon, dest_lat, dest_lon)
            hub_pairs.append((s, e, d_total))
    
    # Sort by total estimated distance/efficiency
    hub_pairs.sort(key=lambda x: x[2])
    selected_pairs = hub_pairs[:5]  # Only verify the TOP 5
    
    final_candidates = []
    for s, e, _ in selected_pairs:
        fm_dist, fm_dur, fm_geom = (None, None, None)
        lm_dist, lm_dur, lm_geom = (None, None, None)
        
        # 4. Verified Routing: Only call ORS for road segments of our top selection
        if first_last_mile_mode == TransportMode.TRUCK:
            # First Mile
            fm = await get_ors_route(origin_lat, origin_lon, s.lat, s.lon)
            if fm: fm_dist, fm_dur, fm_geom = fm
            
            # Last Mile
            lm = await get_ors_route(e.lat, e.lon, dest_lat, dest_lon)
            if lm: lm_dist, lm_dur, lm_geom = lm
            
        # Fallback to local math
        if fm_dist is None: fm_dist = haversine(origin_lat, origin_lon, s.lat, s.lon)
        if lm_dist is None: lm_dist = haversine(e.lat, e.lon, dest_lat, dest_lon)
        
        # Geometry fallbacks (Straight lines for first-mile truck)
        if fm_geom is None:
            fm_geom = {"type": "LineString", "coordinates": [[origin_lon, origin_lat], [s.lon, s.lat]]}
        if lm_geom is None:
            lm_geom = {"type": "LineString", "coordinates": [[e.lon, e.lat], [dest_lon, dest_lat]]}
            
        # Professional routing for the main long-haul segment
        if longhaul_mode == TransportMode.SHIP:
            longhaul_geom = generate_maritime_path(s.lat, s.lon, e.lat, e.lon)
        else:
            # Air routes: use SLERP great circle (clamped, arcs look natural for flights)
            longhaul_geom = generate_great_circle_path(s.lat, s.lon, e.lat, e.lon)

        final_candidates.append([
            RouteLeg(
                mode=TransportMode.TRUCK,
                distance_km=fm_dist,
                duration_hours=fm_dur,
                geometry_geojson=fm_geom,
                origin_hub_name="Origin Factory",
                dest_hub_name=f"{s.name} ({s.unlocode})" if hasattr(s, 'unlocode') else s.name,
                dest_hub_lat=s.lat,
                dest_hub_lon=s.lon
            ),
            RouteLeg(
                mode=longhaul_mode,
                distance_km=haversine(s.lat, s.lon, e.lat, e.lon),
                duration_hours=None,  # Local math fallback
                geometry_geojson=longhaul_geom,
                origin_hub_name=f"{s.name} ({s.unlocode})" if hasattr(s, 'unlocode') else s.name,
                origin_hub_lat=s.lat,
                origin_hub_lon=s.lon,
                dest_hub_name=f"{e.name} ({e.unlocode})" if hasattr(e, 'unlocode') else e.name,
                dest_hub_lat=e.lat,
                dest_hub_lon=e.lon
            ),
            RouteLeg(
                mode=TransportMode.TRUCK,
                distance_km=lm_dist,
                duration_hours=lm_dur,
                geometry_geojson=lm_geom,
                origin_hub_name=f"{e.name} ({e.unlocode})" if hasattr(e, 'unlocode') else e.name,
                origin_hub_lat=e.lat,
                origin_hub_lon=e.lon,
                dest_hub_name="Destination Warehouse"
            )
        ])

    return final_candidates


async def build_direct_surface_leg(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    mode: TransportMode,
) -> RouteLeg:
    """
    Build one direct end-to-end surface leg.
    - truck: ORS driving-hgv (fallback haversine line)
    - rail: ORS-based corridor proxy + rail mode for emissions/time policy
    """
    profile = "driving-hgv"
    routed = await get_ors_route(origin_lat, origin_lon, dest_lat, dest_lon, profile=profile)

    distance_km: float
    duration_hours: float | None
    geometry: dict

    if routed is None:
        distance_km = haversine(origin_lat, origin_lon, dest_lat, dest_lon)
        duration_hours = None
        geometry = {
            "type": "LineString",
            "coordinates": [[origin_lon, origin_lat], [dest_lon, dest_lat]],
        }
    else:
        distance_km, duration_hours, geom = routed
        geometry = geom or {
            "type": "LineString",
            "coordinates": [[origin_lon, origin_lat], [dest_lon, dest_lat]],
        }

    # Rail corridor proxy: keep geometry but apply slower implied movement.
    if mode == TransportMode.RAIL and duration_hours is not None:
        duration_hours = duration_hours * 1.25

    return RouteLeg(
        mode=mode,
        distance_km=distance_km,
        duration_hours=duration_hours,
        geometry_geojson=geometry,
        origin_hub_name="Origin",
        origin_hub_lat=origin_lat,
        origin_hub_lon=origin_lon,
        dest_hub_name="Destination",
        dest_hub_lat=dest_lat,
        dest_hub_lon=dest_lon,
    )

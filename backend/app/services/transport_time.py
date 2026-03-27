"""Door-to-door time from segment durations (ORS when present, else implied speeds)."""

from app.schemas.planning import RouteLeg, TransportMode

# Average speeds (km/h) when no router duration is supplied — v1 approximations.
_IMPLIED_SPEED_KMH: dict[TransportMode, float] = {
    TransportMode.TRUCK: 55.0,
    TransportMode.RAIL: 40.0,
    TransportMode.SHIP: 18.0,
    TransportMode.AIR: 650.0,
}


def leg_duration_hours(leg: RouteLeg) -> float:
    if leg.duration_hours is not None and leg.duration_hours >= 0:
        return leg.duration_hours
    speed = _IMPLIED_SPEED_KMH[leg.mode]
    if speed <= 0:
        return 0.0
    return leg.distance_km / speed


def total_transit_hours(legs: list[RouteLeg]) -> float:
    return sum(leg_duration_hours(leg) for leg in legs)

"""Segment emissions (simplified factors from project spec) + carbon tax."""

from app.schemas.planning import TransportMode

# kg CO2e per (km × tonne cargo) — Default GLEC-aligned factors (Well-to-Wheel)
# Reference: GLEC Framework for Logistics Emissions Methodologies
_EMISSION_FACTOR: dict[TransportMode, float] = {
    TransportMode.RAIL: 0.035,   # Avg rail freight
    TransportMode.SHIP: 0.015,   # Avg container ship (main haul)
    TransportMode.TRUCK: 0.085,  # Avg heavy articulated truck (50-75% load)
    TransportMode.AIR: 0.850,    # Avg belly cargo (long haul)
}


def emissions_for_leg(mode: TransportMode, distance_km: float, weight_kg: float) -> float:
    """Return kg CO2e for one leg: factor * distance * mass_in_tonnes."""
    tonnes = weight_kg / 1000.0
    return _EMISSION_FACTOR[mode] * distance_km * tonnes


def linehaul_tax_cost(total_emissions_kg_co2e: float, carbon_tax_per_tonne_co2e: float) -> float:
    """Currency cost from tonnes emitted × price per tonne CO2e."""
    if carbon_tax_per_tonne_co2e <= 0:
        return 0.0
    tonnes_co2e = total_emissions_kg_co2e / 1000.0
    return tonnes_co2e * carbon_tax_per_tonne_co2e


def emission_factor_for_mode(mode: TransportMode) -> float:
    return _EMISSION_FACTOR[mode]

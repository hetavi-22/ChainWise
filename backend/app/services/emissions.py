"""Segment emissions (simplified factors from project spec) + carbon tax."""

from app.schemas.planning import TransportMode

# kg CO2e per (km × tonne cargo) — matches example table in chain_wise_project_specification.md
_EMISSION_FACTOR: dict[TransportMode, float] = {
    TransportMode.RAIL: 0.5,
    TransportMode.SHIP: 1.0,
    TransportMode.TRUCK: 2.5,
    TransportMode.AIR: 6.0,
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

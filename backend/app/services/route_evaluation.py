from app.schemas.planning import (
    PlanConstraints,
    PlanEconomicInputs,
    RouteEvaluation,
    RouteLeg,
)
from app.services.climatiq import calculate_climatiq_emissions
from app.services.emissions import emissions_for_leg, linehaul_tax_cost
from app.services.transport_time import leg_duration_hours, total_transit_hours


async def evaluate_route(
    legs: list[RouteLeg],
    weight_kg: float,
    constraints: PlanConstraints,
    economics: PlanEconomicInputs,
) -> RouteEvaluation:
    total_e = 0.0
    
    # Attempt Climatiq for the whole chain if enabled
    climatiq_total = await calculate_climatiq_emissions(legs, weight_kg)
    
    resolved_legs: list[RouteLeg] = []
    for leg in legs:
        if climatiq_total is None:
            # Fallback to local math
            total_e += emissions_for_leg(leg.mode, leg.distance_km, weight_kg)
            
        dur = leg_duration_hours(leg)
        resolved_legs.append(
            RouteLeg(
                mode=leg.mode,
                distance_km=leg.distance_km,
                duration_hours=dur,
                geometry_geojson=leg.geometry_geojson,
                origin_hub_name=leg.origin_hub_name,
                dest_hub_name=leg.dest_hub_name,
                origin_hub_lat=leg.origin_hub_lat,
                origin_hub_lon=leg.origin_hub_lon,
                dest_hub_lat=leg.dest_hub_lat,
                dest_hub_lon=leg.dest_hub_lon,
            )
        )

    if climatiq_total is not None:
        total_e = climatiq_total

    total_hours = total_transit_hours(resolved_legs)
    tax = linehaul_tax_cost(total_e, economics.carbon_tax_per_tonne_co2e)

    within_budget = None
    if constraints.carbon_budget_kg_co2e is not None:
        within_budget = total_e <= constraints.carbon_budget_kg_co2e

    within_time = None
    if constraints.max_transit_time_hours is not None:
        within_time = total_hours <= constraints.max_transit_time_hours

    return RouteEvaluation(
        legs=resolved_legs,
        total_emissions_kg_co2e=total_e,
        total_duration_hours=total_hours,
        carbon_tax_cost=tax,
        within_carbon_budget=within_budget,
        within_time_policy=within_time,
    )

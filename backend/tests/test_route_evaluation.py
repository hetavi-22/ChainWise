import pytest

from app.schemas.planning import PlanConstraints, PlanEconomicInputs, RouteLeg, TransportMode
from app.services.emissions import linehaul_tax_cost
from app.services.route_evaluation import evaluate_route


def test_carbon_tax_scales_with_emissions():
    assert linehaul_tax_cost(1000.0, 50.0) == pytest.approx(50.0)
    assert linehaul_tax_cost(2000.0, 50.0) == pytest.approx(100.0)
    assert linehaul_tax_cost(1000.0, 0.0) == 0.0


def test_evaluate_route_time_and_feasibility():
    legs = [
        RouteLeg(mode=TransportMode.TRUCK, distance_km=100),
        RouteLeg(mode=TransportMode.SHIP, distance_km=4000),
        RouteLeg(mode=TransportMode.TRUCK, distance_km=80),
    ]
    out = evaluate_route(
        legs,
        weight_kg=10_000,
        constraints=PlanConstraints(
            carbon_budget_kg_co2e=500_000,
            max_transit_time_hours=500,
        ),
        economics=PlanEconomicInputs(carbon_tax_per_tonne_co2e=80),
    )
    assert out.total_emissions_kg_co2e > 0
    assert out.total_duration_hours > 0
    assert out.carbon_tax_cost == pytest.approx(out.total_emissions_kg_co2e / 1000 * 80)
    assert out.within_carbon_budget is True
    assert out.within_time_policy is True


def test_duration_override_from_router():
    legs = [RouteLeg(mode=TransportMode.TRUCK, distance_km=100, duration_hours=3.5)]
    out = evaluate_route(
        legs,
        weight_kg=1000,
        constraints=PlanConstraints(),
        economics=PlanEconomicInputs(),
    )
    assert out.legs[0].duration_hours == pytest.approx(3.5)

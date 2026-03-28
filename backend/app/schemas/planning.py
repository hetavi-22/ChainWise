from enum import StrEnum

from pydantic import BaseModel, Field


class TransportMode(StrEnum):
    TRUCK = "truck"
    RAIL = "rail"
    SHIP = "ship"
    AIR = "air"


class RouteLeg(BaseModel):
    mode: TransportMode
    distance_km: float = Field(ge=0)
    """Road/rail/sea/air path distance in km."""

    duration_hours: float | None = Field(
        default=None,
    )
    geometry_geojson: dict | None = Field(
        default=None,
    )
    notes: str | None = None
    
    # New: Metadata for markers
    origin_hub_name: str | None = None
    dest_hub_name: str | None = None
    origin_hub_lat: float | None = None
    origin_hub_lon: float | None = None
    dest_hub_lat: float | None = None
    dest_hub_lon: float | None = None
    origin_is_chokepoint: bool = False
    dest_is_chokepoint: bool = False


class PlanConstraints(BaseModel):
    carbon_budget_kg_co2e: float | None = Field(default=None, ge=0)
    max_transit_time_hours: float | None = Field(
        default=None,
        ge=0,
        description="Optional upper bound on total door-to-door time; routes exceeding it are infeasible.",
    )


class PlanEconomicInputs(BaseModel):
    carbon_tax_per_tonne_co2e: float = Field(
        default=0,
        ge=0,
        description="Carbon price in major currency units per metric tonne CO₂e (0 = omit tax from outputs).",
    )


class PlanRequest(BaseModel):
    origin_label: str = ""
    destination_label: str = ""
    weight_kg: float = Field(default=1000, gt=0)
    constraints: PlanConstraints = Field(default_factory=PlanConstraints)
    economics: PlanEconomicInputs = Field(default_factory=PlanEconomicInputs)


class RouteEvaluateRequest(PlanRequest):
    legs: list[RouteLeg] = Field(min_length=1)


class RouteEvaluation(BaseModel):
    id: str | None = None
    legs: list[RouteLeg]
    total_emissions_kg_co2e: float
    total_duration_hours: float
    carbon_tax_cost: float
    within_carbon_budget: bool | None = None
    within_time_policy: bool | None = None


class MultimodalPlanRequest(PlanRequest):
    origin_address: str
    destination_address: str
    longhaul_modes: list[TransportMode] = Field(default_factory=lambda: [TransportMode.SHIP])


class MultimodalPlanResponse(BaseModel):
    origin: dict | None = None  # {lat, lon, name}
    destination: dict | None = None
    options: list[RouteEvaluation]
    recommendation_id: str | None = None

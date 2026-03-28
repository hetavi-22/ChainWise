from fastapi import APIRouter

from app.schemas.planning import (
    MultimodalPlanRequest,
    MultimodalPlanResponse,
    RouteEvaluation,
    RouteEvaluateRequest,
)
from app.services.dataset_loader import load_airports_dataset, load_ports_dataset
from app.services.geocoding import geocode_address
from app.services.route_evaluation import evaluate_route
from app.services.routing import assemble_multimodal_chain

api_router = APIRouter()


@api_router.get("/routes/ping")
def routes_ping():
    return {"message": "route planning module — stub"}


@api_router.post("/routes/evaluate")
async def post_evaluate_route(body: RouteEvaluateRequest):
    """Compute emissions, implied transit time, and carbon-tax liability for supplied legs."""
    return await evaluate_route(
        body.legs,
        body.weight_kg,
        body.constraints,
        body.economics,
    )


@api_router.post("/routes/plan/multimodal", response_model=MultimodalPlanResponse)
async def post_plan_multimodal(body: MultimodalPlanRequest):
    """
    1. Geocode origin/destination.
    2. Generate candidates (Truck -> Port -> Ship -> Port -> Truck).
    3. Evaluate each one and return ranked results.
    """
    origin = await geocode_address(body.origin_address)
    dest = await geocode_address(body.destination_address)
    
    if not origin or not dest:
        return MultimodalPlanResponse(options=[], origin=None, destination=None)
        
    all_options: list[RouteEvaluation] = []
    
    for mode in body.longhaul_modes:
        chains = await assemble_multimodal_chain(
            origin.lat, origin.lon, dest.lat, dest.lon, longhaul_mode=mode, 
            weight_kg=body.weight_kg
        )
        for i, legs in enumerate(chains):
            eval_res = await evaluate_route(
                legs, body.weight_kg, body.constraints, body.economics
            )
            eval_res.id = f"{mode}-{i}"
            all_options.append(eval_res)
            
    # Sort: Within budget/time first, then by emissions
    all_options.sort(key=lambda x: (
        0 if (x.within_carbon_budget != False and x.within_time_policy != False) else 1,
        x.total_emissions_kg_co2e
    ))
    
    top_options = all_options[:5]
    rec_id = top_options[0].id if top_options else None
    
    return MultimodalPlanResponse(
        origin={"lat": origin.lat, "lon": origin.lon, "name": origin.name},
        destination={"lat": dest.lat, "lon": dest.lon, "name": dest.name},
        options=top_options,
        recommendation_id=rec_id
    )


@api_router.get("/data/status")
def data_status():
    """Report whether processed `airports.json` / `ports.json` are loaded (for dev)."""
    ap = load_airports_dataset()
    pp = load_ports_dataset()
    return {
        "airports": (
            None
            if ap is None
            else {
                "count": len(ap.airports),
                "generated_at": ap.meta.generated_at,
                "source": ap.meta.source,
            }
        ),
        "ports": (
            None
            if pp is None
            else {
                "count": len(pp.ports),
                "generated_at": pp.meta.generated_at,
                "source": pp.meta.source,
            }
        ),
    }

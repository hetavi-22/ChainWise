from fastapi import APIRouter

from app.schemas.planning import RouteEvaluateRequest
from app.services.route_evaluation import evaluate_route

api_router = APIRouter()


@api_router.get("/routes/ping")
def routes_ping():
    return {"message": "route planning module — stub"}


@api_router.post("/routes/evaluate")
def post_evaluate_route(body: RouteEvaluateRequest):
    """Compute emissions, implied transit time, and carbon-tax liability for supplied legs."""
    return evaluate_route(
        body.legs,
        body.weight_kg,
        body.constraints,
        body.economics,
    )

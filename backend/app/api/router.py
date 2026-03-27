from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/routes/ping")
def routes_ping():
    return {"message": "route planning module — stub"}

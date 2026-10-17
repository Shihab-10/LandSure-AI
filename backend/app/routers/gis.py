from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import current_user
from app.services.gis_service import (
    get_all_divisions,
    get_all_districts,
    search_locations,
    resolve_parcel_gis,
)

router = APIRouter(
    prefix="/api/v1/gis",
    tags=["Bangladesh GIS & Geospatial"],
)

@router.get("/divisions")
def list_divisions():
    """
    Returns 8 administrative divisions of Bangladesh.
    """
    return {
        "divisions": get_all_divisions(),
        "total": len(get_all_divisions()),
        "country": "Bangladesh"
    }

@router.get("/districts")
def list_districts(
    division: Optional[str] = Query(default=None, description="Filter by division name")
):
    """
    Returns all 64 districts of Bangladesh with genuine centroids and classification.
    """
    districts = get_all_districts()
    if division:
        districts = [d for d in districts if d["division"].casefold() == division.casefold()]

    return {
        "districts": districts,
        "total": len(districts),
        "country": "Bangladesh"
    }

@router.get("/search")
def search_places(
    q: str = Query(min_length=1, max_length=100, description="District, Upazila or Mouza search query")
):
    """
    Search districts, upazilas, or mouzas by English or Bangla name.
    """
    results = search_locations(q)
    return {
        "query": q,
        "matches_count": len(results),
        "results": results
    }

@router.get("/parcels/{parcel_id}")
def get_parcel_geography(parcel_id: str):
    """
    Resolves synthetic parcel ID to genuine administrative geography and cadastral polygon metadata.
    """
    try:
        return resolve_parcel_gis(parcel_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

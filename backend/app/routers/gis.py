from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel, Field

from app.dependencies import current_user
from app.services.gis_service import (
    get_all_divisions,
    get_all_districts,
    search_locations,
    resolve_parcel_gis,
)
from app.services.location_service import (
    get_upazilas_for_district,
    get_mouzas_for_upazila,
    search_parcels_filtered,
    get_nearby_alternatives,
    compare_parcels,
    request_seller_contact,
    report_listing,
)

router = APIRouter(
    prefix="/api/v1/gis",
    tags=["Bangladesh GIS & Geospatial"],
)

class CompareParcelsRequest(BaseModel):
    parcel_ids: List[str] = Field(min_length=1, max_length=3)

class ContactSellerRequest(BaseModel):
    listing_id: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=500)

class ReportListingRequest(BaseModel):
    listing_id: Optional[str] = None
    reason: str = Field(min_length=1, max_length=500)


@router.get("/divisions")
def list_divisions():
    """
    Returns 8 administrative divisions of Bangladesh.
    """
    divisions = get_all_divisions()
    return {
        "divisions": divisions,
        "total": len(divisions),
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


@router.get("/upazilas")
def list_upazilas(
    district: str = Query(min_length=1, max_length=100, description="District name in English or Bengali")
):
    """
    Returns authoritative upazilas and thanas for a given district.
    """
    upazilas = get_upazilas_for_district(district)
    return {
        "district": district,
        "total": len(upazilas),
        "upazilas": upazilas
    }


@router.get("/mouzas")
def list_mouzas(
    upazila: str = Query(min_length=1, max_length=100, description="Upazila name"),
    district: Optional[str] = Query(default=None, description="Optional district name")
):
    """
    Returns cadastral mouzas for an upazila, or an honest missing-data response if uncatalogued.
    """
    return get_mouzas_for_upazila(upazila, district)


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


@router.get("/parcels/search")
def search_parcels(
    division: Optional[str] = Query(default=None),
    district: Optional[str] = Query(default=None),
    upazila: Optional[str] = Query(default=None),
    mouza: Optional[str] = Query(default=None),
    dag_no: Optional[str] = Query(default=None),
    khatian_no: Optional[str] = Query(default=None),
    parcel_id: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """
    Filter and search cadastral parcels by administrative hierarchy, dag, khatian, or parcel ID.
    """
    return search_parcels_filtered(
        division=division,
        district=district,
        upazila=upazila,
        mouza=mouza,
        dag_no=dag_no,
        khatian_no=khatian_no,
        parcel_id=parcel_id,
        query_text=q,
        limit=limit,
        offset=offset
    )


@router.get("/parcels/{parcel_id}")
def get_parcel_geography(parcel_id: str):
    """
    Resolves synthetic parcel ID to genuine administrative geography and cadastral polygon metadata.
    """
    try:
        return resolve_parcel_gis(parcel_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/parcels/{parcel_id}/nearby")
def get_nearby_parcel_alternatives(
    parcel_id: str,
    radius_km: float = Query(default=5.0, ge=0.5, le=50.0, description="Search radius in kilometers (e.g. 1, 3, 5, 10)"),
    sort_by: str = Query(default="distance", pattern="^(distance|price_asc|completeness)$"),
    limit: int = Query(default=10, ge=1, le=50),
    min_area: Optional[float] = Query(default=None, ge=0.0),
    max_price: Optional[int] = Query(default=None, ge=0)
):
    """
    Evidence-based discovery of nearby alternative parcels using Geodesic (Haversine) distance.
    """
    try:
        return get_nearby_alternatives(
            parcel_id=parcel_id,
            radius_km=radius_km,
            sort_by=sort_by,
            limit=limit,
            min_area=min_area,
            max_price=max_price
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/parcels/compare")
def compare_parcels_endpoint(payload: CompareParcelsRequest):
    """
    Side-by-side comparison of up to 3 parcels (area, price, survey continuity, mutation, risk).
    """
    try:
        return compare_parcels(payload.parcel_ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/listings/{parcel_id}/contact-request", status_code=201)
def contact_seller_endpoint(
    parcel_id: str,
    payload: ContactSellerRequest = Body(...),
    user=Depends(current_user)
):
    """
    Records a demonstration seller contact request without exposing private document phone numbers.
    """
    requester = "demo-visitor"
    if isinstance(user, dict):
        requester = user.get("username") or user.get("sub") or "demo-visitor"
    
    try:
        return request_seller_contact(
            listing_id=payload.listing_id or f"LS-LIST-{parcel_id.replace('LS-PARCEL-', '')}",
            parcel_id=parcel_id,
            requester=requester,
            note=payload.note
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/listings/{parcel_id}/report", status_code=201)
def report_listing_endpoint(
    parcel_id: str,
    payload: ReportListingRequest = Body(...),
    user=Depends(current_user)
):
    """
    Records a report against a suspicious or fraudulent demonstration listing.
    """
    reporter = "demo-visitor"
    if isinstance(user, dict):
        reporter = user.get("username") or user.get("sub") or "demo-visitor"

    return report_listing(
        listing_id=payload.listing_id or f"LS-LIST-{parcel_id.replace('LS-PARCEL-', '')}",
        parcel_id=parcel_id,
        reporter=reporter,
        reason=payload.reason
    )

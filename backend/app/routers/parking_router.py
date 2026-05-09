"""
=======================================================================
parking_router.py - HTTP Endpoints Θέσεων Στάθμευσης
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Ορίζει τα HTTP endpoints για θέσεις στάθμευσης.

ΤΕΛΙΚΑ URLs (με prefix /api):
    GET    /api/parking/spots/in_viewport → Θέσεις στο ορατό τμήμα χάρτη
    GET    /api/parking/spots             → Όλες οι θέσεις (admin)
    GET    /api/parking/spots/{id}        → Συγκεκριμένη θέση
    POST   /api/parking/spots             → Νέα θέση (admin only)
    PUT    /api/parking/spots/{id}        → Ενημέρωση θέσης (admin only)
    DELETE /api/parking/spots/{id}        → Διαγραφή θέσης (admin only)
    GET    /api/parking/locations         → Πόλεις και περιοχές για search
    GET    /api/parking/search            → Αναζήτηση διαθέσιμης θέσης

ΣΗΜΑΝΤΙΚΟ:
    Το endpoint in_viewport χρησιμοποιείται πολύ συχνά (κάθε κίνηση χάρτη).
    Γι' αυτό υλοποιεί cache με Redis για γρήγορη απόκριση.

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Οργάνωση: όλα τα parking endpoints σε ένα αρχείο.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    parking_service.py, deps.py, parking_dto.py
=======================================================================
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.repositories.parking_repository import ParkingRepository
from app.services.parking_service import ParkingService
from app.dtos.parking_dto import (
    ParkingSpotCreate,
    ParkingSpotUpdate,
    ParkingSpotResponse,
    ViewportResponse,
    LocationsResponse,
    SearchResult,
)
from app.core.deps import get_current_user, get_current_admin_user, get_optional_current_user
from app.models import User

logger = logging.getLogger(__name__)

# Prefix /parking: όλα τα URLs ξεκινούν με /parking
router = APIRouter(prefix="/parking", tags=["parking"])


def get_parking_service(db: AsyncSession = Depends(get_db)) -> ParkingService:
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί ParkingService για κάθε request.
    Dependency injection - δίνεται αυτόματα μέσω Depends().
    """
    return ParkingService(ParkingRepository(db))


# =======================================================================
# ENDPOINT: Θέσεις στο Ορατό Τμήμα Χάρτη (Viewport)
# =======================================================================
@router.get("/spots/in_viewport", response_model=ViewportResponse)
async def get_spots_viewport(
    # Query parameters - περνιούνται στο URL:
    # π.χ. /spots/in_viewport?swLat=37.9&swLng=23.6&neLat=38.1&neLng=23.9
    sw_lat: float = Query(..., alias="swLat", description="Southwest latitude"),
    sw_lng: float = Query(..., alias="swLng", description="Southwest longitude"),
    ne_lat: float = Query(..., alias="neLat", description="Northeast latitude"),
    ne_lng: float = Query(..., alias="neLng", description="Northeast longitude"),
    zoom: Optional[int] = Query(None, description="Map zoom level"),
    status: Optional[str] = Query(None, description="Optional status filter"),
    limit: int = Query(100, gt=0, le=500),  # gt=0: >0, le=500: <=500
    service: ParkingService = Depends(get_parking_service),
    current_user: Optional[User] = Depends(get_optional_current_user)  # Δεν απαιτεί login
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει θέσεις που βρίσκονται στο ορατό τμήμα του χάρτη.

    ΠOΤΕ ΚΑΛΕΙΤΑΙ: Κάθε φορά που ο χρήστης κουνάει ή κάνει zoom τον χάρτη.
                   Χρησιμοποιεί Redis cache για γρήγορη απόκριση.

    ΠΑΡΑΜΕΤΡΟΙ (Query):
        swLat, swLng: νοτιοδυτική γωνία (κάτω-αριστερά)
        neLat, neLng: βορειοανατολική γωνία (πάνω-δεξιά)
        status: φίλτρο (π.χ. "Available")
        limit: μέγιστος αριθμός αποτελεσμάτων

    ΕΠΙΣΤΡΕΦΕΙ: { "spots": [...], "total": N }
    """
    logger.info(f"Getting spots in viewport: {sw_lat}, {sw_lng}, {ne_lat}, {ne_lng}")

    # Ζητάμε θέσεις (πρώτα Redis, αν όχι τότε PostgreSQL)
    spots = await service.get_spots_in_viewport(sw_lat, sw_lng, ne_lat, ne_lng, status, limit)

    # Μετατρέπουμε τα SQLAlchemy objects σε Pydantic DTOs για το response
    dtos = [ParkingSpotResponse(
        id=s.id,
        latitude=s.latitude,
        longitude=s.longitude,
        location=s.location,
        status=s.status,
        price_per_hour=s.price_per_hour,
        city=s.city,
        area=s.area,
        last_updated=s.last_updated.isoformat() if s.last_updated else None
    ) for s in spots]

    return ViewportResponse(spots=dtos, total=len(dtos))


# =======================================================================
# ENDPOINT: Όλες οι Θέσεις (Admin)
# =======================================================================
@router.get("/spots", response_model=list[ParkingSpotResponse])
async def get_all_spots(
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)  # Απαιτεί login
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει ΟΛΑ τα spots (χωρίς γεωγραφικό φίλτρο).
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Από admin dashboard για πλήρη λίστα.
    ΠΡΟΣΤΑΤΕΥΜΕΝΟ: Απαιτεί authentication.
    """
    spots = await service.get_all_spots()
    return [ParkingSpotResponse(
        id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
        status=s.status, last_updated=s.last_updated.isoformat() if s.last_updated else None
    ) for s in spots]


# =======================================================================
# ENDPOINT: Συγκεκριμένη Θέση
# =======================================================================
@router.get("/spots/{spot_id}", response_model=ParkingSpotResponse)
async def get_spot(
    spot_id: int,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει μια συγκεκριμένη θέση.
    ΠΑΡΑΜΕΤΡΟΙ: spot_id - από το URL (π.χ. /spots/5)
    ΣΦΑΛΜΑ 404: Αν δεν βρεθεί.
    """
    try:
        s = await service.get_spot_by_id(spot_id)
        return ParkingSpotResponse(
            id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
            status=s.status, last_updated=s.last_updated.isoformat() if s.last_updated else None
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Δημιουργία Νέας Θέσης (Admin Only)
# =======================================================================
@router.post("/spots", response_model=ParkingSpotResponse)
async def create_spot(
    spot: ParkingSpotCreate,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_admin_user)  # Απαιτεί ADMIN
):
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί νέα θέση στάθμευσης.
    ΠΡΟΣΤΑΤΕΥΜΕΝΟ: Μόνο admin (get_current_admin_user).
    ΣΦΑΛΜΑ 403: Αν ο χρήστης δεν είναι admin.
    """
    s = await service.create_spot(spot.dict())
    return ParkingSpotResponse(
        id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
        status=s.status, last_updated=s.last_updated, price_per_hour=s.price_per_hour,
        city=s.city, area=s.area
    )


# =======================================================================
# ENDPOINT: Ενημέρωση Θέσης (Admin Only)
# =======================================================================
@router.put("/spots/{spot_id}", response_model=ParkingSpotResponse)
async def update_spot(
    spot_id: int,
    updates: ParkingSpotUpdate,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_admin_user)  # Απαιτεί ADMIN
):
    """
    ΤΙ ΚΑΝΕΙ: Ενημερώνει τα πεδία μιας θέσης.
    ΠΑΡΑΜΕΤΡΟΙ: spot_id - από URL, updates - από body
    ΠΡΟΣΤΑΤΕΥΜΕΝΟ: Μόνο admin.
    ΣΦΑΛΜΑ 404: Αν δεν βρεθεί η θέση.
    """
    try:
        # exclude_unset=True: στέλνουμε μόνο τα πεδία που άλλαξαν
        s = await service.update_spot(spot_id, **updates.dict(exclude_unset=True))
        return ParkingSpotResponse(
            id=s.id, latitude=s.latitude, longitude=s.longitude, location=s.location,
            status=s.status, last_updated=s.last_updated, price_per_hour=s.price_per_hour,
            city=s.city, area=s.area
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Διαγραφή Θέσης (Admin Only)
# =======================================================================
@router.delete("/spots/{spot_id}", status_code=204)
async def delete_spot(
    spot_id: int,
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_admin_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Διαγράφει μια θέση.
    ΠΡΟΣΤΑΤΕΥΜΕΝΟ: Μόνο admin.
    ΕΠΙΣΤΡΕΦΕΙ: HTTP 204 No Content (επιτυχία χωρίς body).
    ΣΦΑΛΜΑ 404: Αν δεν βρεθεί.
    """
    try:
        await service.delete_spot(spot_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Λήψη Τοποθεσιών (Πόλεις + Περιοχές)
# =======================================================================
@router.get("/locations", response_model=LocationsResponse)
async def get_locations(
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει πόλεις και περιοχές για τα dropdowns αναζήτησης.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Από SearchModal για να γεμίσει τα select boxes.
    ΕΠΙΣΤΡΕΦΕΙ: { "cities": ["Athens", ...], "areas": { "Athens": [...] } }
    """
    try:
        cities, areas = await service.get_distinct_locations()
        return LocationsResponse(cities=cities, areas=areas)
    except Exception as e:
        logger.error(f"Failed to get locations: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# =======================================================================
# ENDPOINT: Αναζήτηση Διαθέσιμης Θέσης
# =======================================================================
@router.get("/search", response_model=SearchResult)
async def search_spots(
    city: str = Query(..., description="City to search in"),  # ... = υποχρεωτικό
    area: Optional[str] = Query(None, description="Area to search in (optional)"),
    is_free: Optional[bool] = Query(None, description="Filter for free spots"),
    service: ParkingService = Depends(get_parking_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Βρίσκει τη ΠΡΩΤΗ διαθέσιμη θέση βάσει κριτηρίων.
    ΠΑΡΑΜΕΤΡΟΙ:
        city: υποχρεωτικό (π.χ. "Athens")
        area: προαιρετικό (π.χ. "Kolonaki")
        is_free: true=μόνο δωρεάν, false=μόνο επί πληρωμή

    ΕΠΙΣΤΡΕΦΕΙ: { "id": N, "latitude": ..., "longitude": ... }
    Αυτές οι συντεταγμένες χρησιμοποιούνται για το "fly-to" του χάρτη.

    ΣΦΑΛΜΑ 404: Αν δεν βρεθεί διαθέσιμη θέση.
    """
    try:
        spot_id, lat, lng = await service.search_spots(city, area, is_free)
        return SearchResult(id=spot_id, latitude=lat, longitude=lng)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Search failed for {city}/{area}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

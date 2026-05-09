"""
=======================================================================
reservation_router.py - HTTP Endpoints Κρατήσεων
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Ορίζει τα HTTP endpoints για κρατήσεις θέσεων.

ΤΕΛΙΚΑ URLs (με prefix /api):
    GET    /api/reservations/             → Όλες οι κρατήσεις
    GET    /api/reservations/{id}         → Συγκεκριμένη κράτηση
    GET    /api/reservations/user/{id}    → Κρατήσεις χρήστη
    GET    /api/reservations/spot/{id}    → Κρατήσεις θέσης
    POST   /api/reservations/             → Νέα κράτηση
    PUT    /api/reservations/{id}         → Ενημέρωση κράτησης
    DELETE /api/reservations/{id}         → Ακύρωση κράτησης

ΟΛΑ ΤΑ ENDPOINTS ΑΠΑΙΤΟΥΝ AUTHENTICATION (σύνδεση).

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Κεντρικός χώρος για endpoints κρατήσεων.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    reservation_service.py, deps.py, reservation_dto.py
=======================================================================
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.reservation_service import ReservationService
from app.repositories.reservation_repository import ReservationRepository
from app.dtos.reservation_dto import ReservationCreate, ReservationUpdate, ReservationResponse
from app.core.deps import get_current_user
from app.models import User
from app.repositories.parking_repository import ParkingRepository

# Prefix /reservations
router = APIRouter(prefix="/reservations", tags=["reservations"])


def get_reservation_service(db: AsyncSession = Depends(get_db)) -> ReservationService:
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί ReservationService με τα απαραίτητα repositories.
    Dependency injection - αυτόματη δημιουργία σε κάθε request.
    """
    repo = ReservationRepository(db)
    parking_repo = ParkingRepository(db)  # Χρειάζεται και για αλλαγή κατάστασης θέσης
    return ReservationService(repo, parking_repo)


# =======================================================================
# ENDPOINT: Λήψη Όλων Κρατήσεων
# =======================================================================
@router.get("/", response_model=list[ReservationResponse])
async def get_all_reservations(
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει όλες τις κρατήσεις.
    ΠΡΟΣΤΑΤΕΥΜΕΝΟ: Απαιτεί σύνδεση.
    """
    return await service.get_all_reservations()


# =======================================================================
# ENDPOINT: Συγκεκριμένη Κράτηση
# =======================================================================
@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει μια συγκεκριμένη κράτηση.
    ΠΑΡΑΜΕΤΡΟΙ: reservation_id - από το URL
    ΣΦΑΛΜΑ 404: Αν δεν βρεθεί.
    """
    try:
        return await service.get_reservation_by_id(reservation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Κρατήσεις Συγκεκριμένου Χρήστη
# =======================================================================
@router.get("/user/{user_id}", response_model=list[ReservationResponse])
async def get_reservations_by_user(
    user_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει τις κρατήσεις ενός χρήστη.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για το "Οι Κρατήσεις μου" modal.
    ΚΑΝΟΝΑΣ: Μόνο ο ίδιος χρήστης μπορεί να δει τις κρατήσεις του.
    """
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return await service.get_reservations_by_user_id(user_id)


# =======================================================================
# ENDPOINT: Κρατήσεις Συγκεκριμένης Θέσης
# =======================================================================
@router.get("/spot/{spot_id}", response_model=list[ReservationResponse])
async def get_reservations_by_spot(
    spot_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Επιστρέφει τις κρατήσεις μιας θέσης.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για ιστορικό θέσης.
    """
    return await service.get_reservations_by_spot_id(spot_id)


# =======================================================================
# ENDPOINT: Δημιουργία Κράτησης
# =======================================================================
@router.post("/", response_model=ReservationResponse)
async def create_reservation(
    reservation: ReservationCreate,  # user_id + spot_id από body
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί νέα κράτηση θέσης.

    ΡΟΗΛ ΕΚΤΕΛΕΣΗΣ:
    1. Ελέγχει αν ο χρήστης κάνει κράτηση για τον ΕΑΥΤΟ ΤΟΥ
    2. Καλεί service.create_reservation()
    3. Το service ελέγχει διαθεσιμότητα και κάνει κράτηση
    4. Ξεκινά background timer για αυτόματη λήξη (30 δευτερόλεπτα)

    ΚΑΝΟΝΑΣ ΑΣΦΑΛΕΙΑΣ: Μόνο ο ίδιος χρήστης μπορεί να κάνει κράτηση γι' αυτόν.
    ΣΦΑΛΜΑ 403: Αν το user_id δεν ταιριάζει με τον συνδεδεμένο χρήστη.
    """
    # Ελέγχουμε αν ο χρήστης κάνει κράτηση για τον εαυτό του
    if current_user.id != reservation.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return await service.create_reservation(
        reservation.user_id,
        reservation.spot_id
    )


# =======================================================================
# ENDPOINT: Ενημέρωση Κράτησης
# =======================================================================
@router.put("/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(
    reservation_id: int,
    updates: ReservationUpdate,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Ενημερώνει μια κράτηση (π.χ. αλλαγή end_time).
    ΣΦΑΛΜΑ 404: Αν δεν βρεθεί.
    """
    try:
        return await service.update_reservation(reservation_id, **updates.dict(exclude_unset=True))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =======================================================================
# ENDPOINT: Ακύρωση Κράτησης
# =======================================================================
@router.delete("/{reservation_id}", response_model=ReservationResponse)
async def delete_reservation(
    reservation_id: int,
    service: ReservationService = Depends(get_reservation_service),
    current_user: User = Depends(get_current_user)
):
    """
    ΤΙ ΚΑΝΕΙ: Ακυρώνει μια κράτηση.
    ΑΠΟΤΕΛΕΣΜΑ: Η θέση επιστρέφει σε "Available" αν ήταν κρατημένη.
    ΣΦΑΛΜΑ 404: Αν δεν βρεθεί.
    """
    try:
        return await service.delete_reservation(reservation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

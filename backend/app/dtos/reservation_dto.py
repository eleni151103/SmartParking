"""
=======================================================================
reservation_dto.py - Σχήματα Δεδομένων Κρατήσεων
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Ορίζει τα "καλούπια" (schemas) για τα δεδομένα κρατήσεων.
    Ελέγχει τι δεδομένα δέχεται και τι επιστρέφει το API για κρατήσεις.

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Ο χρήστης στέλνει μόνο user_id και spot_id για κράτηση.
    Τα start_time/end_time τα υπολογίζει το backend αυτόματα.

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Στο reservation_router.py για κάθε request/response κράτησης.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    reservation_router.py, reservation_service.py
=======================================================================
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Εισάγουμε το ParkingSpotResponse για να το χρησιμοποιήσουμε
# μέσα στο ReservationResponse (η κράτηση περιέχει πληροφορίες θέσης)
from app.dtos.parking_dto import ParkingSpotResponse


# --- Βασικό Σχήμα Κράτησης ---
class ReservationBase(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Βασικό σχήμα με τα κοινά πεδία κρατήσεων.
    Άλλα schemas κληρονομούν από αυτό.
    """
    user_id: int                        # Ποιος χρήστης έκανε κράτηση
    spot_id: int                        # Ποια θέση κρατήθηκε
    start_time: datetime                # Πότε ξεκίνησε η κράτηση
    end_time: Optional[datetime] = None # Πότε τελειώνει (None = ακόμα ενεργή)


# --- Σχήμα για Δημιουργία Κράτησης ---
class ReservationCreate(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τα δεδομένα που στέλνει ο χρήστης για νέα κράτηση.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: POST /api/reservations/

    Ο χρήστης στέλνει μόνο user_id και spot_id.
    Τα χρόνια (start_time, end_time) τα υπολογίζει αυτόματα το backend.
    end_time = start_time + 30 δευτερόλεπτα (για testing).
    """
    user_id: int  # Ο χρήστης που κάνει κράτηση
    spot_id: int  # Η θέση που θέλει να κρατήσει


# --- Σχήμα για Ενημέρωση Κράτησης ---
class ReservationUpdate(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τα πεδία που μπορούν να ενημερωθούν.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: PUT /api/reservations/{id}

    Χρησιμοποιείται κυρίως για να ορίσουμε το end_time (λήξη κράτησης).
    """
    start_time: Optional[datetime] = None  # Νέος χρόνος έναρξης
    end_time: Optional[datetime] = None    # Νέος χρόνος λήξης


# --- Σχήμα για Απάντηση ---
class ReservationResponse(ReservationBase):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τι επιστρέφει το API για μια κράτηση.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Σε όλα τα GET endpoints κρατήσεων.

    ΣΗΜΑΝΤΙΚΟ: Περιέχει όχι μόνο τα IDs αλλά και πλήρεις
    πληροφορίες για τη θέση (spot). Αυτό γίνεται με joinedload
    στο repository.

    Παράδειγμα απάντησης:
    {
        "id": 1,
        "user_id": 5,
        "spot_id": 12,
        "start_time": "2024-01-15T10:30:00",
        "end_time": "2024-01-15T10:30:30",
        "spot": { "id": 12, "location": "Ερμού 15", ... }
    }
    """
    id: int                      # Μοναδικό αναγνωριστικό κράτησης
    spot: ParkingSpotResponse    # Πλήρεις πληροφορίες θέσης (όχι μόνο ID)

    class Config:
        from_attributes = True  # Επιτρέπει μετατροπή από SQLAlchemy model

"""
=======================================================================
parking_dto.py - Σχήματα Δεδομένων Θέσεων Στάθμευσης
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Ορίζει τα "καλούπια" (schemas) για τα δεδομένα θέσεων στάθμευσης.
    Κάθε request προς το API και κάθε response από αυτό πρέπει να
    ακολουθεί ένα από αυτά τα σχήματα.

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Επαλήθευση δεδομένων: αν κάποιος στείλει λάθος δεδομένα
    (π.χ. latitude = "hello" αντί για αριθμό), το FastAPI
    επιστρέφει αυτόματα σφάλμα 422 Unprocessable Entity.

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Στο parking_router.py για κάθε request/response.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    parking_router.py, reservation_dto.py (χρησιμοποιεί ParkingSpotResponse)
=======================================================================
"""

from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


# --- Σχήμα για Δημιουργία Θέσης (από Admin) ---
class ParkingSpotCreate(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τα δεδομένα για νέα θέση στάθμευσης.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: POST /api/parking/spots (μόνο admin)

    Ο admin πρέπει να δώσει τουλάχιστον: location, latitude, longitude.
    Τα υπόλοιπα είναι προαιρετικά.
    """
    location: str                           # Διεύθυνση (π.χ. "Ερμού 15")
    latitude: float                         # Γεωγραφικό πλάτος
    longitude: float                        # Γεωγραφικό μήκος
    status: Optional[str] = "Available"    # Αρχική κατάσταση (default: Ελεύθερη)
    city: Optional[str] = None             # Πόλη (προαιρετικό)
    area: Optional[str] = None             # Περιοχή (προαιρετικό)
    price_per_hour: Optional[float] = None # Τιμή/ώρα αν είναι επί πληρωμή


# --- Σχήμα για Ενημέρωση Θέσης (από Admin) ---
class ParkingSpotUpdate(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τα πεδία που μπορούν να ενημερωθούν.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: PUT /api/parking/spots/{id} (μόνο admin)

    Όλα προαιρετικά γιατί ο admin μπορεί να θέλει να αλλάξει
    μόνο ένα πεδίο (π.χ. μόνο την τιμή ή μόνο το status).
    """
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    price_per_hour: Optional[float] = None


# --- Σχήμα για Απάντηση (Response) ---
class ParkingSpotResponse(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τι πληροφορίες επιστρέφει το API για κάθε θέση.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Σε όλα τα GET endpoints για θέσεις.

    Αυτό είναι αυτό που "βλέπει" το frontend όταν ζητά θέσεις.
    """
    id: int                         # Μοναδικό αναγνωριστικό
    latitude: float                 # Γεωγραφικό πλάτος
    longitude: float                # Γεωγραφικό μήκος
    location: str                   # Διεύθυνση
    status: str                     # Τρέχουσα κατάσταση
    last_updated: datetime | None   # Πότε ενημερώθηκε τελευταία
    price_per_hour: Optional[float] = None  # Τιμή (None αν είναι δωρεάν)
    city: Optional[str] = None      # Πόλη
    area: Optional[str] = None      # Περιοχή


# --- Σχήμα για Δημιουργία Log Κατάστασης ---
class SpotStatusLogCreate(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τα δεδομένα για νέα εγγραφή ιστορικού κατάστασης.
    Χρησιμοποιείται εσωτερικά από τον MQTT consumer.
    """
    spot_id: int  # Ποια θέση άλλαξε
    status: str   # Η νέα κατάσταση


# --- Σχήμα για Απάντηση Log Κατάστασης ---
class SpotStatusLogResponse(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τι επιστρέφει το API για ένα log κατάστασης.
    """
    id: int
    spot_id: int
    status: str
    timestamp: str  # Ως string για εύκολη σειριοποίηση JSON

    class Config:
        from_attributes = True  # Επιτρέπει μετατροπή από SQLAlchemy model


# --- Σχήμα Απόκρισης για Viewport Query ---
class ViewportResponse(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει την απάντηση για θέσεις μέσα στα όρια του χάρτη.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: GET /api/parking/spots/in_viewport

    Επιστρέφει λίστα θέσεων ΚΑΙ τον αριθμό τους.
    Π.χ. { "spots": [...], "total": 42 }
    """
    spots: List[ParkingSpotResponse]  # Λίστα θέσεων
    total: int                         # Πόσες θέσεις βρέθηκαν


# --- Σχήμα Αποτελέσματος Αναζήτησης ---
class SearchResult(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει το αποτέλεσμα αναζήτησης θέσης.
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: GET /api/parking/search

    Επιστρέφει μόνο το id και τις συντεταγμένες ώστε ο χάρτης
    να "πετάξει" (fly-to) στη σωστή θέση.
    """
    id: int           # ID θέσης
    latitude: float   # Γεωγραφικό πλάτος για fly-to
    longitude: float  # Γεωγραφικό μήκος για fly-to


# --- Σχήμα Διαθέσιμων Τοποθεσιών ---
class LocationsResponse(BaseModel):
    """
    ΤΙ ΚΑΝΕΙ: Ορίζει τα διαθέσιμα φίλτρα αναζήτησης (πόλεις & περιοχές).
    ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: GET /api/parking/locations

    Το frontend χρησιμοποιεί αυτό για να γεμίσει τα dropdowns
    στην αναζήτηση.

    Παράδειγμα:
    {
        "cities": ["Athens", "Larissa"],
        "areas": {
            "Athens": ["Kolonaki", "Exarchia"],
            "Larissa": ["Kentro"]
        }
    }
    """
    cities: List[str]           # Λίστα πόλεων
    areas: Dict[str, List[str]] # Χάρτης: πόλη → λίστα περιοχών

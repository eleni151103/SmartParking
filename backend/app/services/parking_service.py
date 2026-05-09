"""
=======================================================================
parking_service.py - Επιχειρησιακή Λογική Θέσεων Στάθμευσης
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Είναι ο "μεσάζοντας" μεταξύ parking_router (HTTP endpoints) και
    parking_repository (βάση δεδομένων + Redis).

    Εδώ υλοποιείται η λογική "cache-aside":
    1. Πρώτα δοκιμάζει να φέρει δεδομένα από Redis (γρήγορα)
    2. Αν δεν βρει (cache miss), πάει στη βάση (αργά)
    3. Ρίχνει σφάλματα σε λογικές παραβάσεις (π.χ. θέση δεν βρέθηκε)

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Διαχωρισμός ευθυνών: ο router δεν πρέπει να ξέρει αν τα δεδομένα
    έρχονται από Redis ή βάση - αυτό είναι δουλειά του service.

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Καλείται από parking_router.py.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    parking_router.py (καλεί αυτό), parking_repository.py (καλεί αυτό)
=======================================================================
"""

from app.repositories.parking_repository import ParkingRepository
from app.models import ParkingSpot
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ParkingService:
    """
    Κλάση που υλοποιεί την επιχειρησιακή λογική για θέσεις στάθμευσης.
    """

    def __init__(self, repo: ParkingRepository):
        """
        ΤΙ ΚΑΝΕΙ: Αρχικοποίηση με ένα ParkingRepository.
        ΠΑΡΑΜΕΤΡΟΙ: repo - το repository για πρόσβαση στα δεδομένα
        """
        self.repo = repo

    async def get_all_spots(self):
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει όλες τις θέσεις.
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα ParkingSpot αντικειμένων.
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Από admin dashboard.
        """
        return await self.repo.get_all_spots()

    async def get_spot_by_id(self, spot_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει μια θέση με το id της.
        ΠΑΡΑΜΕΤΡΟΙ: spot_id - το id αναζήτησης
        ΕΠΙΣΤΡΕΦΕΙ: ParkingSpot αντικείμενο.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.
        """
        spot = await self.repo.get_spot_by_id(spot_id)
        if not spot:
            raise ValueError("Spot not found")
        return spot

    async def create_spot(self, spot_data: dict):
        """
        ΤΙ ΚΑΝΕΙ: Δημιουργεί νέα θέση στάθμευσης.
        ΠΑΡΑΜΕΤΡΟΙ: spot_data - dictionary με τα δεδομένα θέσης
        ΕΠΙΣΤΡΕΦΕΙ: Το νέο ParkingSpot αντικείμενο.
        """
        # Αναπτύσσουμε το dictionary ως ορίσματα (π.χ. location="Ερμού", latitude=37.98...)
        return await self.repo.create_spot(**spot_data)

    async def update_spot(self, spot_id: int, **updates):
        """
        ΤΙ ΚΑΝΕΙ: Ενημερώνει τα πεδία μιας θέσης.
        ΠΑΡΑΜΕΤΡΟΙ:
            spot_id: το id της θέσης
            **updates: τα πεδία που αλλάζουν
        ΕΠΙΣΤΡΕΦΕΙ: Την ενημερωμένη θέση.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.
        """
        spot = await self.repo.update_spot(spot_id, **updates)
        if not spot:
            raise ValueError("Spot not found")
        return spot

    async def delete_spot(self, spot_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Διαγράφει μια θέση.
        ΠΑΡΑΜΕΤΡΟΙ: spot_id - το id προς διαγραφή
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.
        """
        spot = await self.repo.delete_spot(spot_id)
        if not spot:
            raise ValueError("Spot not found")

    async def get_spots_in_viewport(self, sw_lat, sw_lng, ne_lat, ne_lng, status, limit):
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει θέσεις που είναι ορατές στον χάρτη.
        ΠΑΡΑΜΕΤΡΟΙ:
            sw_lat, sw_lng: νοτιοδυτική γωνία χάρτη
            ne_lat, ne_lng: βορειοανατολική γωνία χάρτη
            status: φίλτρο κατάστασης (προαιρετικό)
            limit: μέγιστος αριθμός αποτελεσμάτων
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα θέσεων μέσα στο ορατό τμήμα.

        ΣΤΡΑΤΗΓΙΚΗ CACHE-ASIDE:
        1. Πρώτα δοκιμάζει Redis (get_spots_in_viewport_cached)
        2. Αν επιτύχει (hit=True) → επιστρέφει από cache (γρήγορα)
        3. Αν αποτύχει (hit=False) → πηγαίνει στη βάση (αργά)
        """
        # Δοκιμάζουμε πρώτα από Redis
        spots, hit = await self.repo.get_spots_in_viewport_cached(
            sw_lat, sw_lng, ne_lat, ne_lng, status
        )

        if hit and spots:
            # Cache hit! Επιστρέφουμε γρήγορα χωρίς να πάμε στη βάση
            logger.info("Fetched from cache")
            return spots

        # Cache miss - πάμε στη βάση PostgreSQL
        spots = await self.repo.get_spots_in_viewport(sw_lat, sw_lng, ne_lat, ne_lng, status, limit)
        logger.info("Fetched from DB")
        return spots

    async def get_distinct_locations(self):
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει τις διαθέσιμες πόλεις και περιοχές.
        ΕΠΙΣΤΡΕΦΕΙ: (λίστα πόλεων, {πόλη: [περιοχές]})
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για τα dropdowns αναζήτησης.
        """
        return await self.repo.get_distinct_locations()

    async def search_spots(self, city: str, area: Optional[str], is_free: Optional[bool]):
        """
        ΤΙ ΚΑΝΕΙ: Αναζητεί διαθέσιμη θέση βάσει κριτηρίων.
        ΠΑΡΑΜΕΤΡΟΙ:
            city: η πόλη (υποχρεωτικό)
            area: η περιοχή (προαιρετικό)
            is_free: True=δωρεάν, False=επί πληρωμή, None=όλα
        ΕΠΙΣΤΡΕΦΕΙ: (spot_id, latitude, longitude) για fly-to στον χάρτη.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί διαθέσιμη θέση.
        """
        spot_data = await self.repo.search_spots(city, area, is_free)
        if not spot_data:
            raise ValueError("No available spots found for the selected criteria.")
        return spot_data

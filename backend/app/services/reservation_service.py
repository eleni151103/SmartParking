"""
=======================================================================
reservation_service.py - Επιχειρησιακή Λογική Κρατήσεων
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Διαχειρίζεται τις κρατήσεις θέσεων στάθμευσης.
    Εδώ βρίσκεται η λογική:
    - Έλεγχος διαθεσιμότητας πριν κράτηση
    - Αλλαγή κατάστασης θέσης σε "Reserved"
    - Αυτόματη λήξη κράτησης μετά από 30 δευτερόλεπτα
    - Επαναφορά θέσης σε "Available" μετά τη λήξη

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Η κράτηση αφορά ΔΥΟ entities (Reservation ΚΑΙ ParkingSpot).
    Αυτό το service συντονίζει και τα δύο repositories.

ΣΗΜΑΝΤΙΚΟ - ASYNCIO.CREATE_TASK:
    Η λήξη κράτησης γίνεται ασύγχρονα (async). Δηλαδή:
    - Το create_reservation τελειώνει ΑΜΕΣΑ και επιστρέφει
    - Ξεκινά ένα "background task" που θα τρέξει μετά από 30 δευτερόλεπτα
    - Αυτό δεν κλειδώνει τον server

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Καλείται από reservation_router.py.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    reservation_router.py, reservation_repository.py, parking_repository.py
=======================================================================
"""

from app.repositories.reservation_repository import ReservationRepository
from app.repositories.parking_repository import ParkingRepository
from datetime import datetime, timedelta
from typing import Optional
import asyncio  # Για ασύγχρονες λειτουργίες και background tasks


class ReservationService:
    """
    Κλάση που υλοποιεί τη λογική κρατήσεων.
    Χρειάζεται και τα δύο repositories γιατί η κράτηση αγγίζει και θέσεις.
    """

    def __init__(self, repo: ReservationRepository, parking_repo: ParkingRepository):
        """
        ΤΙ ΚΑΝΕΙ: Αρχικοποίηση με τα δύο απαραίτητα repositories.
        ΠΑΡΑΜΕΤΡΟΙ:
            repo: για κρατήσεις
            parking_repo: για θέσεις (αλλαγή κατάστασης)
        """
        self.repo = repo
        self.parking_repo = parking_repo

    async def get_all_reservations(self):
        """ΤΙ ΚΑΝΕΙ: Επιστρέφει όλες τις κρατήσεις."""
        return await self.repo.get_all_reservations()

    async def get_reservation_by_id(self, reservation_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει κράτηση με id.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.
        """
        reservation = await self.repo.get_reservation_by_id(reservation_id)
        if not reservation:
            raise ValueError("Reservation not found")
        return reservation

    async def get_reservations_by_user_id(self, user_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει όλες τις κρατήσεις ενός χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το id του χρήστη
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για το "Οι κρατήσεις μου" modal στο frontend.
        """
        return await self.repo.get_reservations_by_user_id(user_id)

    async def get_reservations_by_spot_id(self, spot_id: int):
        """ΤΙ ΚΑΝΕΙ: Επιστρέφει όλες τις κρατήσεις για μια θέση."""
        return await self.repo.get_reservations_by_spot_id(spot_id)

    async def create_reservation(
        self,
        user_id: int,
        spot_id: int,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ):
        """
        ΤΙ ΚΑΝΕΙ: Δημιουργεί νέα κράτηση θέσης.
        ΠΑΡΑΜΕΤΡΟΙ:
            user_id: ο χρήστης που κάνει κράτηση
            spot_id: η θέση που κρατείται
            start_time: πότε ξεκινά (default: τώρα)
            end_time: πότε τελειώνει (default: +30 δευτερόλεπτα)
        ΕΠΙΣΤΡΕΦΕΙ: Το νέο Reservation αντικείμενο.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν η θέση δεν υπάρχει ή είναι κατειλημμένη.

        ΣΕΙΡΑ ΕΝΕΡΓΕΙΩΝ:
        1. Ελέγχει αν η θέση υπάρχει
        2. Ελέγχει αν η θέση είναι "Available"
        3. Ορίζει χρόνους έναρξης/λήξης
        4. Δημιουργεί την εγγραφή κράτησης
        5. Αλλάζει κατάσταση θέσης σε "Reserved"
        6. Ξεκινά background task για αυτόματη λήξη
        """
        # Βήμα 1: Ελέγχουμε αν η θέση υπάρχει
        spot = await self.parking_repo.get_spot_by_id(spot_id)
        if not spot:
            raise ValueError("Parking spot not found")

        # Βήμα 2: Ελέγχουμε αν είναι διαθέσιμη
        if spot.status != "Available":
            raise ValueError(f"Spot is currently {spot.status}")

        # Βήμα 3: Ορίζουμε χρόνους
        now = datetime.utcnow()  # Τρέχουσα ώρα UTC
        if not start_time:
            start_time = now
        if not end_time:
            # 30 δευτερόλεπτα για testing - στην παραγωγή θα ήταν περισσότερο
            end_time = now + timedelta(seconds=30)

        # Βήμα 4: Αποθηκεύουμε την κράτηση στη βάση
        reservation = await self.repo.create_reservation(user_id, spot_id, start_time, end_time)

        # Βήμα 5: Αλλάζουμε κατάσταση θέσης → "Reserved"
        # Αυτό ενημερώνει βάση ΚΑΙ Redis (και θα φανεί αμέσως στον χάρτη)
        await self.parking_repo.update_spot_status(spot_id, "Reserved")

        # Βήμα 6: Ξεκινάμε background task για αυτόματη λήξη μετά από 30 δευτερόλεπτα.
        # asyncio.create_task: τρέχει ασύγχρονα χωρίς να κλειδώνει τον server.
        # Το request τελειώνει ΤΩΡΑ, αλλά η λήξη θα εκτελεστεί αργότερα.
        asyncio.create_task(self._expire_reservation(spot_id, 30))

        return reservation

    async def _expire_reservation(self, spot_id: int, delay_seconds: int):
        """
        ΤΙ ΚΑΝΕΙ: Background task που εκτελείται μετά τη λήξη κράτησης.
        ΠΑΡΑΜΕΤΡΟΙ:
            spot_id: η θέση που θα ελευθερωθεί
            delay_seconds: πόσα δευτερόλεπτα να περιμένει πριν εκτελεστεί

        ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ:
        1. Περιμένει delay_seconds δευτερόλεπτα (χωρίς να κλειδώνει τίποτα)
        2. Ελέγχει αν η θέση είναι ακόμα "Reserved" (μπορεί να άλλαξε εν τω μεταξύ)
        3. Αν ναι, την επαναφέρει σε "Available"

        ΣΗΜΕΙΩΣΗ: Αυτή η μέθοδος δεν καλείται άμεσα - είναι background task.
        """
        # Αναμένουμε για τον ορισμένο χρόνο
        await asyncio.sleep(delay_seconds)

        # Ελέγχουμε αν η θέση είναι ακόμα "Reserved"
        # (μπορεί ο χρήστης να έχει φύγει και ο αισθητήρας να το έχει αλλάξει)
        spot = await self.parking_repo.get_spot_by_id(spot_id)
        if spot and spot.status == "Reserved":
            # Επαναφέρουμε σε "Available" - η θέση είναι πλέον ελεύθερη
            await self.parking_repo.update_spot_status(spot_id, "Available")
            print(f"Reservation expired for spot {spot_id}, status reverted to Available")

    async def update_reservation(self, reservation_id: int, **updates):
        """
        ΤΙ ΚΑΝΕΙ: Ενημερώνει μια κράτηση.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.
        """
        reservation = await self.repo.update_reservation(reservation_id, **updates)
        if not reservation:
            raise ValueError("Reservation not found")
        return reservation

    async def delete_reservation(self, reservation_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Διαγράφει κράτηση ΚΑΙ ελευθερώνει τη θέση.
        ΠΑΡΑΜΕΤΡΟΙ: reservation_id - το id προς διαγραφή
        ΕΠΙΣΤΡΕΦΕΙ: Την κράτηση που διαγράφηκε.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.

        ΣΗΜΑΝΤΙΚΟ: Αν η κράτηση ήταν ενεργή, επαναφέρουμε τη θέση σε "Available".
        """
        reservation = await self.repo.delete_reservation(reservation_id)
        if not reservation:
            raise ValueError("Reservation not found")

        # Αν η θέση είναι ακόμα "Reserved", την ελευθερώνουμε
        if reservation.spot_id:
            spot = await self.parking_repo.get_spot_by_id(reservation.spot_id)
            if spot and spot.status == "Reserved":
                await self.parking_repo.update_spot_status(reservation.spot_id, "Available")

        return reservation

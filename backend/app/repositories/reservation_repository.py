"""
=======================================================================
reservation_repository.py - Πρόσβαση Δεδομένων Κρατήσεων
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Κάνει ΟΛΑ τα queries στη βάση δεδομένων που αφορούν κρατήσεις.
    Δηλαδή: δημιουργία, ανάγνωση, ενημέρωση και διαγραφή κρατήσεων.

ΣΗΜΑΝΤΙΚΗ ΛΕΠΤΟΜΕΡΕΙΑ:
    Χρησιμοποιεί joinedload για να φορτώνει ΜΑΖΙ τις πληροφορίες
    θέσης (spot). Αυτό αποφεύγει το "N+1 problem" (N ερωτήματα για
    N κρατήσεις + 1 για κάθε θέση = πολύ αργό).
    Αντί αυτού, ένα SQL JOIN φέρνει τα πάντα μαζί.

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Καλείται από το reservation_service.py.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    reservation_service.py, parking_repository.py (μέσω service)
=======================================================================
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Reservation
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import joinedload  # Για να φορτώνει σχέσεις μαζί (JOIN)


class ReservationRepository:
    """
    Κλάση που διαχειρίζεται όλες τις λειτουργίες κρατήσεων στη βάση.
    """

    def __init__(self, db: AsyncSession):
        """
        ΤΙ ΚΑΝΕΙ: Αρχικοποίηση με σύνδεση βάσης.
        ΠΑΡΑΜΕΤΡΟΙ: db - το session σύνδεσης
        """
        self.db = db

    async def get_all_reservations(self) -> List[Reservation]:
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει ΟΛΑ τα reservations.
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα Reservation αντικειμένων.

        joinedload(Reservation.spot): φορτώνει ΚΑΙ τις πληροφορίες
        της θέσης μαζί (μια SQL ερώτηση αντί για N+1).
        """
        result = await self.db.execute(
            select(Reservation).options(joinedload(Reservation.spot))
        )
        return result.scalars().all()

    async def get_reservation_by_id(self, reservation_id: int) -> Optional[Reservation]:
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει μια κράτηση με το id της.
        ΠΑΡΑΜΕΤΡΟΙ: reservation_id - το id της κράτησης
        ΕΠΙΣΤΡΕΦΕΙ: Reservation αντικείμενο ή None αν δεν βρεθεί.
        """
        result = await self.db.execute(
            select(Reservation)
            .where(Reservation.id == reservation_id)
            .options(joinedload(Reservation.spot))  # Φόρτωση θέσης μαζί
        )
        # scalar_one_or_none: επιστρέφει ένα αποτέλεσμα ή None
        return result.scalar_one_or_none()

    async def get_reservations_by_user_id(self, user_id: int) -> List[Reservation]:
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει όλες τις κρατήσεις ενός χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το id του χρήστη
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα κρατήσεων (μπορεί να είναι κενή).
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για το modal "Οι Κρατήσεις μου" στο frontend.
        """
        result = await self.db.execute(
            select(Reservation)
            .where(Reservation.user_id == user_id)  # Φίλτρο: μόνο αυτού του χρήστη
            .options(joinedload(Reservation.spot))
        )
        return result.scalars().all()

    async def get_reservations_by_spot_id(self, spot_id: int) -> List[Reservation]:
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει όλες τις κρατήσεις για μια θέση.
        ΠΑΡΑΜΕΤΡΟΙ: spot_id - το id της θέσης
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα κρατήσεων για αυτή τη θέση.
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Για να δούμε το ιστορικό μιας θέσης.
        """
        result = await self.db.execute(
            select(Reservation)
            .where(Reservation.spot_id == spot_id)  # Φίλτρο: μόνο αυτής της θέσης
            .options(joinedload(Reservation.spot))
        )
        return result.scalars().all()

    async def create_reservation(
        self,
        user_id: int,
        spot_id: int,
        start_time: datetime,
        end_time: Optional[datetime] = None
    ) -> Reservation:
        """
        ΤΙ ΚΑΝΕΙ: Δημιουργεί νέα κράτηση στη βάση.
        ΠΑΡΑΜΕΤΡΟΙ:
            user_id: ποιος χρήστης κάνει κράτηση
            spot_id: ποια θέση κρατείται
            start_time: πότε ξεκινά
            end_time: πότε τελειώνει (None = αόριστη)
        ΕΠΙΣΤΡΕΦΕΙ: Το νέο Reservation αντικείμενο με id.

        ΣΗΜΕΙΩΣΗ: Μετά την αποθήκευση, καλεί get_reservation_by_id
        για να επιστρέψει το αντικείμενο ΜΕ τις πληροφορίες θέσης (joinedload).
        """
        # Δημιουργούμε νέο Reservation αντικείμενο
        reservation = Reservation(
            user_id=user_id,
            spot_id=spot_id,
            start_time=start_time,
            end_time=end_time
        )

        self.db.add(reservation)       # Σημειώνουμε για αποθήκευση
        await self.db.commit()          # Αποθηκεύουμε (η βάση δίνει id)
        await self.db.refresh(reservation)  # Ανανεώνουμε για να πάρουμε το id

        # Επιστρέφουμε ΞΑΝΑ από τη βάση ΜΕ joinedload (για να έχουμε θέση)
        return await self.get_reservation_by_id(reservation.id)

    async def update_reservation(self, reservation_id: int, **updates) -> Optional[Reservation]:
        """
        ΤΙ ΚΑΝΕΙ: Ενημερώνει μια κράτηση.
        ΠΑΡΑΜΕΤΡΟΙ:
            reservation_id: το id της κράτησης
            **updates: τα πεδία που αλλάζουν (π.χ. end_time=...)
        ΕΠΙΣΤΡΕΦΕΙ: Την ενημερωμένη κράτηση ή None.
        """
        reservation = await self.db.get(Reservation, reservation_id)
        if not reservation:
            return None

        # Εφαρμόζουμε τις αλλαγές
        for key, value in updates.items():
            if value is not None:
                setattr(reservation, key, value)

        await self.db.commit()

        # Επιστρέφουμε με joinedload
        return await self.get_reservation_by_id(reservation_id)

    async def delete_reservation(self, reservation_id: int) -> Optional[Reservation]:
        """
        ΤΙ ΚΑΝΕΙ: Διαγράφει μια κράτηση.
        ΠΑΡΑΜΕΤΡΟΙ: reservation_id - το id προς διαγραφή
        ΕΠΙΣΤΡΕΦΕΙ: Την κράτηση που διαγράφηκε (ώστε να ξέρουμε ποια θέση να ελευθερώσουμε).

        ΣΗΜΕΙΩΣΗ: Πρώτα φέρνουμε το αντικείμενο (με θέση) και μετά διαγράφουμε,
        ώστε να μπορούμε να επιστρέψουμε τα στοιχεία στο service.
        """
        # Φέρνουμε πρώτα ΜΕ joinedload για να έχουμε τα στοιχεία θέσης
        reservation = await self.get_reservation_by_id(reservation_id)
        if reservation:
            await self.db.delete(reservation)
            await self.db.commit()
        return reservation

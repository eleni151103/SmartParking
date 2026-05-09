"""
=======================================================================
user_repository.py - Πρόσβαση Δεδομένων Χρηστών (Data Access Layer)
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Κάνει ΟΛΑ τα "ερωτήματα" (queries) στη βάση δεδομένων που αφορούν
    χρήστες και αγαπημένα. Είναι το μοναδικό σημείο που "αγγίζει"
    τη βάση για χρήστες.

    Repository Pattern: Κρύβει την πολυπλοκότητα της βάσης πίσω
    από απλές μεθόδους (get_user_by_id, create_user κλπ.)

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    - Διαχωρισμός ευθυνών: το service layer δεν ξέρει πώς λειτουργεί η βάση
    - Εύκολη αλλαγή: αν αλλάξουμε βάση δεδομένων, αλλάζουμε μόνο εδώ
    - Χρήση Redis cache για γρήγορη ανάγνωση αγαπημένων

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Καλείται από το user_service.py, που καλείται από το user_router.py.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    user_service.py (καλεί αυτό), database.py (σύνδεση βάσης)
=======================================================================
"""

from sqlalchemy.ext.asyncio import AsyncSession  # Ασύγχρονη σύνδεση βάσης
from sqlalchemy import select  # Για να γράψουμε SQL SELECT queries
from app.models import User, UserFavorites  # Τα μοντέλα (πίνακες) μας
from app.database import redis_client  # Client για Redis cache
from typing import List, Optional


class UserRepository:
    """
    Κλάση που συγκεντρώνει όλες τις λειτουργίες βάσης για χρήστες.
    Δέχεται ένα db session ώστε να μπορεί να επικοινωνεί με τη βάση.
    """

    def __init__(self, db: AsyncSession):
        """
        ΤΙ ΚΑΝΕΙ: Αρχικοποιεί το repository με μια σύνδεση βάσης.
        ΠΑΡΑΜΕΤΡΟΙ: db - το session σύνδεσης με τη βάση δεδομένων
        """
        self.db = db

    async def get_all_users(self) -> List[User]:
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει ΟΛΑ τα users από τη βάση.
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα με αντικείμενα User.
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Από admin για να δει όλους τους χρήστες.
        """
        # Εκτελούμε SQL: SELECT * FROM users
        result = await self.db.execute(select(User))
        # .scalars().all() μετατρέπει το αποτέλεσμα σε λίστα User αντικειμένων
        return result.scalars().all()

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει έναν χρήστη με το id του.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το μοναδικό αναγνωριστικό
        ΕΠΙΣΤΡΕΦΕΙ: Αντικείμενο User αν βρεθεί, None αν δεν υπάρχει.
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ: Κατά επαλήθευση token, κατά update/delete.
        """
        # db.get() = SELECT * FROM users WHERE id = user_id LIMIT 1
        return await self.db.get(User, user_id)

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει χρήστη με το email του.
        ΠΑΡΑΜΕΤΡΟΙ: email - η διεύθυνση email
        ΕΠΙΣΤΡΕΦΕΙ: Αντικείμενο User αν βρεθεί, None αν δεν υπάρχει.
        ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
            - Κατά login: για να βρούμε τον χρήστη και να ελέγξουμε κωδικό
            - Κατά εγγραφή: για να ελέγξουμε αν το email χρησιμοποιείται ήδη
        """
        # SQL: SELECT * FROM users WHERE email = :email LIMIT 1
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        # scalar_one_or_none: επιστρέφει τον ένα χρήστη ή None (ποτέ λίστα)
        return result.scalar_one_or_none()

    async def create_user(self, email: str, password_hash: str, full_name: str) -> User:
        """
        ΤΙ ΚΑΝΕΙ: Δημιουργεί νέο χρήστη στη βάση.
        ΠΑΡΑΜΕΤΡΟΙ:
            email: το email του νέου χρήστη
            password_hash: ο ΗΔΗ κρυπτογραφημένος κωδικός (από UserService)
            full_name: το ονοματεπώνυμο
        ΕΠΙΣΤΡΕΦΕΙ: Το νέο User αντικείμενο με το id που έδωσε η βάση.

        ΣΗΜΑΝΤΙΚΟ: Λαμβάνουμε ΗΔΗ hash κωδικό - η κρυπτογράφηση
        γίνεται στο UserService, όχι εδώ.
        """
        # Δημιουργούμε νέο User αντικείμενο (δεν έχει id ακόμα)
        new_user = User(email=email, password_hash=password_hash, full_name=full_name)

        # Προσθέτουμε το αντικείμενο στη "λίστα αλλαγών" (δεν έχει αποθηκευτεί ακόμα)
        self.db.add(new_user)

        # Αποθηκεύουμε στη βάση - η βάση δίνει αυτόματα id
        await self.db.commit()

        # Ανανεώνουμε το αντικείμενο με τα δεδομένα από τη βάση (π.χ. το id)
        await self.db.refresh(new_user)

        return new_user

    async def update_user(self, user_id: int, **updates) -> Optional[User]:
        """
        ΤΙ ΚΑΝΕΙ: Ενημερώνει τα στοιχεία ενός χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ:
            user_id: το id του χρήστη
            **updates: οποιοδήποτε πεδίο θέλουμε να αλλάξουμε
                       π.χ. update_user(5, email="new@mail.com")
        ΕΠΙΣΤΡΕΦΕΙ: Τον ενημερωμένο χρήστη ή None αν δεν βρέθηκε.
        """
        # Βρίσκουμε τον χρήστη (αν δεν βρεθεί, επιστρέφουμε None)
        user = await self.db.get(User, user_id)
        if not user:
            return None

        # Εφαρμόζουμε κάθε αλλαγή που ζητήθηκε
        # setattr(user, "email", "new@mail.com") = user.email = "new@mail.com"
        for key, value in updates.items():
            if value is not None:  # Αγνοούμε τιμές None (δεν θέλουμε να τις αλλάξουμε)
                setattr(user, key, value)

        # Αποθηκεύουμε τις αλλαγές
        await self.db.commit()

        return user

    async def delete_user(self, user_id: int) -> Optional[User]:
        """
        ΤΙ ΚΑΝΕΙ: Διαγράφει έναν χρήστη από τη βάση.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το id του χρήστη προς διαγραφή
        ΕΠΙΣΤΡΕΦΕΙ: Τον χρήστη που διαγράφηκε ή None αν δεν βρέθηκε.
        """
        user = await self.db.get(User, user_id)
        if user:
            await self.db.delete(user)  # Σημειώνουμε για διαγραφή
            await self.db.commit()      # Εκτελούμε την διαγραφή
        return user

    async def add_favorite(self, user_id: int, spot_id: int) -> None:
        """
        ΤΙ ΚΑΝΕΙ: Προσθέτει μια θέση στα αγαπημένα ενός χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ:
            user_id: ποιος χρήστης κάνει favorite
            spot_id: ποια θέση γίνεται favorite
        ΕΠΙΣΤΡΕΦΕΙ: Τίποτα (None)

        Αποθηκεύει και στη βάση ΚΑΙ στο Redis (για γρήγορη ανάγνωση).
        Πρώτα ελέγχει αν το αγαπημένο υπάρχει ήδη (αποφεύγει duplicates).
        """
        # Ελέγχουμε αν το αγαπημένο υπάρχει ήδη στη βάση
        stmt = select(UserFavorites).where(
            UserFavorites.user_id == user_id,
            UserFavorites.spot_id == spot_id
        )
        existing = await self.db.execute(stmt)

        # Αν δεν υπάρχει ήδη, το δημιουργούμε
        if not existing.scalar_one_or_none():
            fav = UserFavorites(user_id=user_id, spot_id=spot_id)
            self.db.add(fav)
            await self.db.commit()

        # Προσθέτουμε επίσης στο Redis για γρήγορη ανάγνωση.
        # f"user:{user_id}:favorites" είναι το "κλειδί" (key) στο Redis.
        # sadd = set add (προσθήκη σε set - αυτόματα αποφεύγει duplicates)
        await redis_client.sadd(f"user:{user_id}:favorites", spot_id)

    async def remove_favorite(self, user_id: int, spot_id: int) -> None:
        """
        ΤΙ ΚΑΝΕΙ: Αφαιρεί μια θέση από τα αγαπημένα.
        ΠΑΡΑΜΕΤΡΟΙ:
            user_id: ο χρήστης
            spot_id: η θέση που αφαιρείται από τα αγαπημένα
        ΕΠΙΣΤΡΕΦΕΙ: Τίποτα (None)

        Διαγράφει από τη βάση ΚΑΙ από το Redis.
        """
        # Βρίσκουμε το αγαπημένο στη βάση
        stmt = select(UserFavorites).where(
            UserFavorites.user_id == user_id,
            UserFavorites.spot_id == spot_id
        )
        result = await self.db.execute(stmt)
        fav = result.scalar_one_or_none()

        # Αν υπάρχει, το διαγράφουμε
        if fav:
            await self.db.delete(fav)
            await self.db.commit()

        # Αφαιρούμε και από το Redis
        # srem = set remove (αφαίρεση από set)
        await redis_client.srem(f"user:{user_id}:favorites", spot_id)

    async def get_favorites(self, user_id: int) -> List[int]:
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει τα IDs των αγαπημένων θέσεων ενός χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το id του χρήστη
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα με τα spot_ids (π.χ. [3, 7, 15])

        Στρατηγική cache-aside:
        1. Πρώτα ψάχνει στο Redis (γρήγορο)
        2. Αν δεν βρεθεί, ψάχνει στη βάση (αργό)
        3. Φορτώνει το Redis για επόμενες φορές
        """
        # Βήμα 1: Ψάχνουμε στο Redis (πολύ γρήγορα)
        key = f"user:{user_id}:favorites"  # Το "κλειδί" του χρήστη στο Redis
        members = await redis_client.smembers(key)  # smembers = get all members of set

        if members:
            # Βρήκαμε στο Redis! Επιστρέφουμε χωρίς να πάμε στη βάση.
            # Μετατρέπουμε από strings σε ints (το Redis αποθηκεύει strings)
            return [int(m) for m in members]

        # Βήμα 2: Δεν βρήκαμε στο Redis - πάμε στη βάση δεδομένων
        stmt = select(UserFavorites.spot_id).where(UserFavorites.user_id == user_id)
        result = await self.db.execute(stmt)
        spot_ids = result.scalars().all()

        # Βήμα 3: Φορτώνουμε το Redis για επόμενες φορές (αν υπάρχουν αγαπημένα)
        if spot_ids:
            # Προσθέτουμε όλα τα IDs στο Redis με μία κλήση
            await redis_client.sadd(key, *spot_ids)

        return list(spot_ids)

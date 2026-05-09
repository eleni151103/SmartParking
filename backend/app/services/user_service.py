"""
=======================================================================
user_service.py - Επιχειρησιακή Λογική Χρηστών (Business Logic)
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Περιέχει τους "κανόνες" της εφαρμογής για χρήστες.
    Είναι ο "μεσάζοντας" μεταξύ routers (HTTP) και repositories (βάση).

ΠΑΡΑΔΕΙΓΜΑ ΛΕΙΤΟΥΡΓΙΑΣ:
    Router λέει: "Θέλω να δημιουργήσω χρήστη με email X"
    Service ελέγχει: "Υπάρχει ήδη αυτό το email;"
    Αν όχι: κρυπτογραφεί τον κωδικό και λέει στο Repository "δημιούργησέ τον"

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Αν βάζαμε αυτή τη λογική στο router, θα ήταν ανακατεμένη με HTTP κώδικα.
    Αν τη βάζαμε στο repository, θα ήταν ανακατεμένη με SQL κώδικα.
    Το service layer κρατά τους "κανόνες" καθαρούς και ξεχωριστούς.

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Καλείται από user_router.py.

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    user_router.py (καλεί αυτό), user_repository.py (καλεί αυτό),
    security.py (για κρυπτογράφηση κωδικών)
=======================================================================
"""

from app.repositories.user_repository import UserRepository
from app.core.security import get_password_hash, verify_password


class UserService:
    """
    Κλάση που υλοποιεί την επιχειρησιακή λογική για χρήστες.
    Δέχεται ένα repository για να μπορεί να επικοινωνεί με τη βάση.
    """

    def __init__(self, user_repo: UserRepository):
        """
        ΤΙ ΚΑΝΕΙ: Αρχικοποίηση με ένα UserRepository.
        ΠΑΡΑΜΕΤΡΟΙ: user_repo - το repository που θα χρησιμοποιεί
        """
        self.user_repo = user_repo

    async def login(self, email: str, password: str):
        """
        ΤΙ ΚΑΝΕΙ: Επαληθεύει τα στοιχεία σύνδεσης ενός χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ:
            email: το email που έδωσε ο χρήστης
            password: ο κωδικός που έδωσε ο χρήστης (plain text)
        ΕΠΙΣΤΡΕΦΕΙ: Το User αντικείμενο αν η σύνδεση είναι σωστή.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν email ή κωδικός είναι λάθος.

        ΣΗΜΕΙΩΣΗ ΑΣΦΑΛΕΙΑΣ: Χρησιμοποιούμε το ΙΔΙΟ μήνυμα σφάλματος
        είτε το email δεν υπάρχει ΕΙΤΕ ο κωδικός είναι λάθος.
        Αυτό αποτρέπει επιτιθέμενους από το να μαθαίνουν αν ένα email
        χρησιμοποιείται στο σύστημα.
        """
        # Βήμα 1: Ψάχνουμε χρήστη με αυτό το email
        user = await self.user_repo.get_user_by_email(email)
        if not user:
            # Δεν βρέθηκε χρήστης - αλλά λέμε "λάθος email ή κωδικός" (ασφάλεια)
            raise ValueError("Invalid email or password")

        # Βήμα 2: Ελέγχουμε τον κωδικό
        # verify_password συγκρίνει τον plain text κωδικό με το hash στη βάση
        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password")

        # Όλα ΟΚ - επιστρέφουμε τον χρήστη
        return user

    async def get_all_users(self):
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει όλους τους χρήστες.
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα User αντικειμένων.
        """
        return await self.user_repo.get_all_users()

    async def get_user_by_id(self, user_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Βρίσκει χρήστη με id.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το id αναζήτησης
        ΕΠΙΣΤΡΕΦΕΙ: User αντικείμενο.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.
        """
        user = await self.user_repo.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        return user

    async def create_user(self, email: str, password: str, full_name: str):
        """
        ΤΙ ΚΑΝΕΙ: Δημιουργεί νέο χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ:
            email: το email του νέου χρήστη
            password: ο plain text κωδικός (θα κρυπτογραφηθεί)
            full_name: το ονοματεπώνυμο
        ΕΠΙΣΤΡΕΦΕΙ: Το νέο User αντικείμενο.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν το email χρησιμοποιείται ήδη.

        ΚΑΝΟΝΑΣ: Δεν αποθηκεύουμε ποτέ plain text κωδικό.
        Κρυπτογραφούμε εδώ, στέλνουμε hash στο repository.
        """
        # Βήμα 1: Ελέγχουμε αν το email υπάρχει ήδη
        existing = await self.user_repo.get_user_by_email(email)
        if existing:
            raise ValueError("Email already in use")

        # Βήμα 2: Κρυπτογραφούμε τον κωδικό (bcrypt hash)
        password_hash = get_password_hash(password)

        # Βήμα 3: Δημιουργούμε τον χρήστη στη βάση
        user = await self.user_repo.create_user(email, password_hash, full_name)
        return user

    async def update_user(self, user_id: int, **updates):
        """
        ΤΙ ΚΑΝΕΙ: Ενημερώνει τα στοιχεία χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ:
            user_id: το id του χρήστη
            **updates: τα πεδία που αλλάζουν
        ΕΠΙΣΤΡΕΦΕΙ: Τον ενημερωμένο χρήστη.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί ή email σε χρήση.
        """
        # Αν ο χρήστης αλλάζει κωδικό, πρέπει να τον κρυπτογραφήσουμε
        if 'password' in updates and updates['password']:
            # Αντικαθιστούμε το plain text 'password' με κρυπτογραφημένο 'password_hash'
            updates['password_hash'] = get_password_hash(updates['password'])
            del updates['password']  # Διαγράφουμε το plain text - δεν το στέλνουμε στη βάση

        # Αν αλλάζει email, ελέγχουμε αν χρησιμοποιείται ήδη
        if 'email' in updates:
            existing = await self.user_repo.get_user_by_email(updates['email'])
            # Αν υπάρχει ΑΛΛΟΣ χρήστης με αυτό το email
            if existing and existing.id != user_id:
                raise ValueError("Email already in use")

        user = await self.user_repo.update_user(user_id, **updates)
        if not user:
            raise ValueError("User not found")
        return user

    async def delete_user(self, user_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Διαγράφει χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το id προς διαγραφή
        ΕΠΙΣΤΡΕΦΕΙ: Τον διαγραμμένο χρήστη.
        ΠΕΤΑΕΙ ΣΦΑΛΜΑ: ValueError αν δεν βρεθεί.
        """
        user = await self.user_repo.delete_user(user_id)
        if not user:
            raise ValueError("User not found")
        return user

    async def add_favorite(self, user_id: int, spot_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Προσθέτει θέση στα αγαπημένα χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ: user_id, spot_id
        """
        await self.user_repo.add_favorite(user_id, spot_id)

    async def remove_favorite(self, user_id: int, spot_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Αφαιρεί θέση από τα αγαπημένα χρήστη.
        ΠΑΡΑΜΕΤΡΟΙ: user_id, spot_id
        """
        await self.user_repo.remove_favorite(user_id, spot_id)

    async def get_favorites(self, user_id: int):
        """
        ΤΙ ΚΑΝΕΙ: Επιστρέφει τα ids των αγαπημένων θέσεων.
        ΠΑΡΑΜΕΤΡΟΙ: user_id - το id του χρήστη
        ΕΠΙΣΤΡΕΦΕΙ: Λίστα ints (spot_ids)
        """
        return await self.user_repo.get_favorites(user_id)

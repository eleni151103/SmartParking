"""
=======================================================================
deps.py - Εξαρτήσεις Αυθεντικοποίησης (Authentication Dependencies)
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Παρέχει "φίλτρα" (guards) που ελέγχουν αν ένας χρήστης είναι
    συνδεδεμένος ή αν έχει δικαιώματα διαχειριστή (admin).

    Τα FastAPI "Dependencies" (εξαρτήσεις) είναι συναρτήσεις που
    εκτελούνται αυτόματα ΠΡΙΝ από ένα endpoint.
    Αν αποτύχουν, επιστρέφουν σφάλμα και το endpoint δεν εκτελείται.

ΠΑΡΑΔΕΙΓΜΑ ΛΕΙΤΟΥΡΓΙΑΣ:
    1. Χρήστης κάνει GET /api/parking/spots (με token στο header)
    2. Το Depends(get_current_user) εκτελείται πρώτα
    3. Διαβάζει το token, επαληθεύει ότι είναι έγκυρο
    4. Βρίσκει τον χρήστη στη βάση
    5. Αν όλα ΟΚ → εκτελείται το endpoint
    6. Αν λάθος token → 401 Unauthorized

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    Σε κάθε protected endpoint (parking_router, user_router, reservation_router)
    ως: current_user: User = Depends(get_current_user)

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    security.py (decode token), user_repository.py (βρίσκει χρήστη),
    όλοι οι routers
=======================================================================
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer  # Εξάγει token από header
from jose import jwt, JWTError  # Αποκωδικοποίηση JWT
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.database import get_db
from app.models import User
from app.repositories.user_repository import UserRepository

# Ορίζουμε πού στέλνει ο χρήστης το token.
# Το OAuth2PasswordBearer εξάγει αυτόματα το token από το header:
# Authorization: Bearer <token>
# tokenUrl: το URL για login (χρησιμοποιείται στη διαδραστική τεκμηρίωση)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/users/login")


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    ΤΙ ΚΑΝΕΙ: Επαληθεύει το JWT token και επιστρέφει τον τρέχοντα χρήστη.

    ΠΑΡΑΜΕΤΡΟΙ:
        db: Σύνδεση με τη βάση δεδομένων (δίνεται αυτόματα)
        token: Το JWT token από το HTTP header (δίνεται αυτόματα)

    ΕΠΙΣΤΡΕΦΕΙ:
        Το αντικείμενο User αν το token είναι έγκυρο.

    ΠΕΤΑΕΙ ΣΦΑΛΜΑ:
        HTTP 401 Unauthorized αν:
        - Δεν υπάρχει token
        - Το token έχει λήξει ή είναι λάθος
        - Ο χρήστης δεν βρέθηκε στη βάση

    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
        Πολλά endpoints επιτρέπονται μόνο σε συνδεδεμένους χρήστες.
        Αντί να γράφουμε τον ίδιο έλεγχο παντού, τον κεντρικοποιούμε εδώ.
    """

    # Ετοιμάζουμε το σφάλμα που θα επιστρέψουμε αν κάτι πάει λάθος.
    # Χρησιμοποιούμε πάντα το ΙΔΙΟ μήνυμα για λόγους ασφαλείας
    # (δεν λέμε συγκεκριμένα τι πήγε στραβά).
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Αποκωδικοποιούμε το token.
        # Αν το token έχει λήξει ή είναι λάθος, πετάει JWTError.
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

        # Από το token εξάγουμε το "sub" (subject) = το user_id
        user_id: str = payload.get("sub")

        # Αν δεν υπάρχει user_id στο token, κάτι είναι λάθος
        if user_id is None:
            raise credentials_exception

    except (JWTError, ValidationError):
        # Αν το token δεν μπορεί να αποκωδικοποιηθεί
        raise credentials_exception

    # Ψάχνουμε τον χρήστη στη βάση με το ID που βρήκαμε στο token
    repo = UserRepository(db)
    user = await repo.get_user_by_id(int(user_id))
    if user is None:
        raise credentials_exception

    # Δεύτερος έλεγχος (defensive programming - άμυνα σε βάθος)
    user = await repo.get_user_by_id(int(user_id))
    if user is None:
        raise credentials_exception

    return user  # Επιστρέφουμε τον χρήστη στο endpoint που το ζήτησε


async def get_optional_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    ΤΙ ΚΑΝΕΙ: Προσπαθεί να βρει τον τρέχοντα χρήστη, αλλά δεν αποτυγχάνει
               αν δεν υπάρχει token.

    ΕΠΙΣΤΡΕΦΕΙ:
        Τον χρήστη αν είναι συνδεδεμένος, ή None αν δεν είναι.

    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
        Για endpoints που λειτουργούν και χωρίς login, αλλά παρέχουν
        επιπλέον λειτουργίες αν ο χρήστης είναι συνδεδεμένος.
        Π.χ. η προβολή χάρτη είναι διαθέσιμη σε όλους,
        αλλά τα αγαπημένα μόνο αν είσαι συνδεδεμένος.
    """
    try:
        return await get_current_user(db, token)
    except HTTPException:
        # Αν υπάρχει σφάλμα (π.χ. χωρίς token), επιστρέφουμε None
        return None


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    ΤΙ ΚΑΝΕΙ: Ελέγχει αν ο τρέχων χρήστης είναι διαχειριστής (admin).

    ΠΑΡΑΜΕΤΡΟΙ:
        current_user: Ο χρήστης που επέστρεψε το get_current_user

    ΕΠΙΣΤΡΕΦΕΙ:
        Τον χρήστη αν έχει admin δικαιώματα.

    ΠΕΤΑΕΙ ΣΦΑΛΜΑ:
        HTTP 403 Forbidden αν ο χρήστης δεν είναι admin.
        (403 = "Γνωρίζω ποιος είσαι, αλλά δεν έχεις άδεια")

    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
        Τα admin endpoints (δημιουργία/διαγραφή θέσεων) δεν πρέπει
        να είναι προσβάσιμα από απλούς χρήστες.
    """
    # Ελέγχουμε αν ο χρήστης έχει admin δικαιώματα
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"  # "Δεν έχεις αρκετά δικαιώματα"
        )
    return current_user

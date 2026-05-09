"""
=======================================================================
security.py - Κρυπτογράφηση Κωδικών και Δημιουργία Tokens
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Παρέχει τις βασικές λειτουργίες ασφαλείας:
    1. Κρυπτογράφηση κωδικών (hashing) - για ασφαλή αποθήκευση
    2. Δημιουργία JWT tokens - για αναγνώριση συνδεδεμένων χρηστών

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Η ασφάλεια είναι ευαίσθητο θέμα. Αντί να διασκορπίσουμε κώδικα
    κρυπτογράφησης παντού, τον συγκεντρώνουμε εδώ.

ΤΙ ΕΙΝΑΙ ΤΟ JWT (JSON Web Token):
    Ένα "ψηφιακό εισιτήριο" που αποδεικνύει ότι ο χρήστης είναι
    συνδεδεμένος. Μοιάζει με ένα κρυπτογραφημένο string.
    Ο χρήστης το στέλνει σε κάθε request ("Εγώ είμαι ο χρήστης με id=5").

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    - user_service.py: για hash κωδικού κατά εγγραφή χρήστη
    - user_router.py: για δημιουργία token κατά login
    - deps.py: για επαλήθευση token σε κάθε protected endpoint

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    user_service.py, user_router.py, deps.py
=======================================================================
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt  # Βιβλιοθήκη για δημιουργία/επαλήθευση JWT tokens
from passlib.context import CryptContext  # Βιβλιοθήκη για κρυπτογράφηση κωδικών
from app.core.config import settings  # Οι ρυθμίσεις μας (SECRET_KEY, ALGORITHM κλπ.)

# Δημιουργούμε ένα "context" κρυπτογράφησης.
# schemes=["bcrypt"]: χρησιμοποιούμε τον αλγόριθμο bcrypt για hash.
# Το bcrypt είναι ειδικά σχεδιασμένο για κωδικούς - είναι σκόπιμα αργό
# για να δυσκολέψει brute-force επιθέσεις.
# deprecated="auto": παλιές εκδόσεις αντιμετωπίζονται αυτόματα.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί ένα JWT token για έναν χρήστη.

    ΠΑΡΑΔΕΙΓΜΑ ΧΡΗΣΗΣ:
        token = create_access_token(subject=user.id)
        # Επιστρέφει κάτι σαν: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

    ΠΑΡΑΜΕΤΡΟΙ:
        subject: Το αναγνωριστικό του χρήστη (συνήθως το user.id)
                 Αυτό "κρύβεται" μέσα στο token.
        expires_delta: Πόσο ώρα ισχύει το token (προαιρετικό).
                       Αν δεν δοθεί, χρησιμοποιούνται οι default ρυθμίσεις.

    ΕΠΙΣΤΡΕΦΕΙ: Ένα string που είναι το κρυπτογραφημένο JWT token.

    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
        Κατά το login, ο χρήστης παίρνει αυτό το token και το στέλνει
        σε κάθε επόμενο request για να αποδείξει ότι είναι συνδεδεμένος.
    """

    # Υπολογίζουμε πότε λήγει το token.
    # Αν δόθηκε συγκεκριμένη διάρκεια, τη χρησιμοποιούμε.
    # Αλλιώς, παίρνουμε την default διάρκεια από τις ρυθμίσεις (1 εβδομάδα).
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    # Τα δεδομένα που θα "κρυφτούν" μέσα στο token.
    # "exp": πότε λήγει το token
    # "sub": το subject (ποιος είναι ο χρήστης - το id του)
    to_encode = {"exp": expire, "sub": str(subject)}

    # Κρυπτογραφούμε τα δεδομένα με το secret key και τον αλγόριθμο.
    # Μόνο ο server που έχει το SECRET_KEY μπορεί να επαληθεύσει τo token.
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    ΤΙ ΚΑΝΕΙ: Ελέγχει αν ο κωδικός που έδωσε ο χρήστης είναι σωστός.

    ΠΑΡΑΔΕΙΓΜΑ ΧΡΗΣΗΣ:
        is_correct = verify_password("myPassword123", "$2b$12$...")
        # Επιστρέφει True αν ο κωδικός είναι σωστός, False αν όχι

    ΠΑΡΑΜΕΤΡΟΙ:
        plain_password: Ο κωδικός όπως τον έγραψε ο χρήστης (π.χ. "abc123")
        hashed_password: Ο κρυπτογραφημένος κωδικός από τη βάση δεδομένων

    ΕΠΙΣΤΡΕΦΕΙ:
        True αν οι κωδικοί ταιριάζουν, False αν όχι.

    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
        Δεν αποθηκεύουμε τον κωδικό απευθείας, οπότε δεν μπορούμε
        να κάνουμε απλή σύγκριση. Ο bcrypt υπολογίζει ξανά το hash
        και συγκρίνει με αυτό που έχουμε αποθηκευμένο.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    ΤΙ ΚΑΝΕΙ: Κρυπτογραφεί έναν κωδικό (one-way hashing).

    ΠΑΡΑΔΕΙΓΜΑ ΧΡΗΣΗΣ:
        hashed = get_password_hash("myPassword123")
        # Επιστρέφει κάτι σαν: "$2b$12$abc123xyz..."

    ΠΑΡΑΜΕΤΡΟΙ:
        password: Ο απλός κωδικός που έδωσε ο χρήστης

    ΕΠΙΣΤΡΕΦΕΙ:
        Ένα κρυπτογραφημένο string (hash) που δεν μπορεί να "αποκρυπτογραφηθεί"
        πίσω στον αρχικό κωδικό.

    ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
        Κατά την εγγραφή χρήστη, δεν αποθηκεύουμε ποτέ τον πραγματικό
        κωδικό - μόνο το hash. Αν η βάση "χακαριστεί", οι κωδικοί παραμένουν
        προστατευμένοι.
    """
    return pwd_context.hash(password)

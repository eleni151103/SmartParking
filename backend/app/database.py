"""
=======================================================================
database.py - Σύνδεση με Βάση Δεδομένων και Redis Cache
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Δημιουργεί και διαχειρίζεται τις συνδέσεις με:
    1. PostgreSQL: Η κύρια βάση δεδομένων όπου αποθηκεύονται μόνιμα
       όλα τα δεδομένα (χρήστες, θέσεις, κρατήσεις).
    2. Redis: Μια "γρήγορη μνήμη" (cache) που κρατά δεδομένα
       προσωρινά για γρηγορότερη ανάγνωση.

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Η σύνδεση με βάση δεδομένων είναι κάτι που χρειαζόμαστε παντού.
    Αντί να τη δημιουργούμε σε κάθε αρχείο ξεχωριστά, την ορίζουμε
    μία φορά εδώ και την "εισάγουμε" (import) όπου χρειαζόμαστε.

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    - Κάθε φορά που κάποιο router ή service χρειάζεται να διαβάσει/γράψει
      δεδομένα στη βάση
    - Στο main.py για αρχικοποίηση κατά την εκκίνηση

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    main.py, όλα τα repositories (parking, user, reservation)
=======================================================================
"""

import os  # Για να διαβάσουμε μεταβλητές περιβάλλοντος (π.χ. DATABASE_URL)
from .models import Base  # Το "σχήμα" (schema) των πινάκων μας
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # Ασύγχρονη σύνδεση με PostgreSQL
from sqlalchemy.orm import sessionmaker  # Δημιουργία "συνεδριών" (sessions) με τη βάση
from dotenv import load_dotenv  # Φόρτωση μεταβλητών από αρχείο .env
import redis.asyncio as redis  # Ασύγχρονος client για Redis

# Φορτώνουμε τις μεταβλητές από το αρχείο .env (αν υπάρχει)
load_dotenv()


# =======================================================================
# ΡΥΘΜΙΣΗ POSTGRESQL
# =======================================================================

# Διαβάζουμε τη διεύθυνση (URL) της βάσης από μεταβλητή περιβάλλοντος.
# Αν δεν υπάρχει στο περιβάλλον, χρησιμοποιούμε μια προεπιλεγμένη τιμή
# για τοπική ανάπτυξη (local development).
# Το "postgresql+asyncpg://" σημαίνει ότι χρησιμοποιούμε ασύγχρονο driver.
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql+asyncpg://postgres_local:MyStrongPassw0rd!@localhost:5432/sm_parking"

# Δημιουργούμε τη "μηχανή" σύνδεσης (engine) με τη βάση.
# echo=True σημαίνει ότι θα εκτυπώνει τα SQL queries στο terminal (χρήσιμο για debugging).
# future=True σημαίνει ότι χρησιμοποιούμε τη νέα έκδοση του SQLAlchemy.
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Δημιουργούμε ένα "εργοστάσιο" (factory) για sessions.
# Κάθε φορά που χρειαζόμαστε να μιλήσουμε με τη βάση, δημιουργούμε
# ένα νέο "session" (σαν ένα νέο κανάλι επικοινωνίας).
# expire_on_commit=False: τα αντικείμενα παραμένουν χρήσιμα μετά το commit.
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# =======================================================================
# ΡΥΘΜΙΣΗ REDIS CACHE
# =======================================================================

# Διαβάζουμε τις ρυθμίσεις Redis από μεταβλητές περιβάλλοντος.
# Στο Docker, ο Redis τρέχει με το hostname "redis".
# Τοπικά, τρέχει στο "localhost".
REDIS_HOST = os.getenv("REDIS_HOST") or "localhost"
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))  # Η προεπιλεγμένη πόρτα του Redis
REDIS_DB = int(os.getenv("REDIS_DB", 0))  # Αριθμός της "βάσης" μέσα στο Redis (0-15)

# Δημιουργούμε τον client που θα χρησιμοποιούμε για να γράφουμε/διαβάζουμε
# από το Redis. decode_responses=True σημαίνει ότι τα δεδομένα επιστρέφονται
# ως strings αντί για bytes.
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB, decode_responses=True)


# =======================================================================
# ΒΟΗΘΗΤΙΚΕΣ ΣΥΝΑΡΤΗΣΕΙΣ
# =======================================================================

async def init_db():
    """
    ΤΙ ΚΑΝΕΙ: Δημιουργεί όλους τους πίνακες στη βάση δεδομένων.
    ΠΟΤΕ ΚΑΛΕΙΤΑΙ: Μία φορά κατά την εκκίνηση της εφαρμογής (στο main.py).
    ΤΙ ΕΠΙΣΤΡΕΦΕΙ: Τίποτα (None), απλά εκτελεί την εντολή.

    Αν οι πίνακες υπάρχουν ήδη, δεν κάνει τίποτα (δεν τους σβήνει).
    Αν δεν υπάρχουν, τους δημιουργεί βάσει των μοντέλων στο models.py.
    """
    async with engine.begin() as conn:
        # create_all: δημιούργησε ΟΛΑ τα tables που ορίζει το Base (models.py)
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """
    ΤΙ ΚΑΝΕΙ: Δίνει ένα session (κανάλι) επικοινωνίας με τη βάση.
    ΠΟΤΕ ΚΑΛΕΙΤΑΙ: Αυτόματα από το FastAPI σε κάθε HTTP request,
                   μέσω του μηχανισμού "Dependency Injection" (Depends).
    ΤΙ ΕΠΙΣΤΡΕΦΕΙ: Ένα AsyncSession αντικείμενο.

    Το "yield" σημαίνει ότι δίνουμε το session, περιμένουμε να τελειώσει
    το request, και μετά κλείνουμε τη σύνδεση αυτόματα.
    Αυτό εξασφαλίζει ότι δεν μένουν ανοικτές συνδέσεις στη βάση.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session  # Δίνουμε το session στον κώδικα που το ζήτησε
        finally:
            await session.close()  # Κλείνουμε πάντα στο τέλος


async def get_session() -> AsyncSession:
    """
    ΤΙ ΚΑΝΕΙ: Δίνει ένα standalone session για χρήση εκτός HTTP requests.
    ΠΟΤΕ ΚΑΛΕΙΤΑΙ: Στον MQTT consumer και κατά την προφόρτωση της cache,
                   δηλαδή σε περιπτώσεις που δεν υπάρχει HTTP request.
    ΤΙ ΕΠΙΣΤΡΕΦΕΙ: Ένα AsyncSession αντικείμενο.

    Διαφορά από get_db: αυτό δεν χρησιμοποιεί "yield" (δεν είναι generator),
    απλά επιστρέφει το session άμεσα.
    """
    async with AsyncSessionLocal() as session:
        return session

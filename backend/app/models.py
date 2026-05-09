"""
=======================================================================
models.py - Ορισμός Πινάκων Βάσης Δεδομένων (ORM Models)
=======================================================================

ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
    Ορίζει τη "δομή" (schema) κάθε πίνακα στη βάση δεδομένων.
    Κάθε κλάση (class) εδώ αντιστοιχεί σε ένα πίνακα.
    Κάθε ιδιότητα (Column) αντιστοιχεί σε μια στήλη του πίνακα.

ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
    Αντί να γράφουμε SQL χειροκίνητα ("CREATE TABLE ..."),
    χρησιμοποιούμε Python κλάσεις και το SQLAlchemy ORM κάνει
    αυτόματα τη μετατροπή σε SQL.
    ORM = Object Relational Mapper (χαρτογράφηση αντικειμένων σε σχέσεις)

ΠΟΤΕ ΧΡΗΣΙΜΟΠΟΙΕΙΤΑΙ:
    - Κατά την εκκίνηση: το database.py δημιουργεί τους πίνακες βάσει αυτού
    - Σε κάθε repository: για να κάνει queries στη βάση

ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
    database.py (δημιουργία πινάκων),
    parking_repository.py, user_repository.py, reservation_repository.py
=======================================================================
"""

from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, func, Numeric, Boolean
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """
    Βασική κλάση από την οποία κληρονομούν όλα τα μοντέλα.
    Το SQLAlchemy χρειάζεται αυτή τη βάση για να "ξέρει" ποιες κλάσεις
    είναι πίνακες βάσης δεδομένων.
    """
    pass


# =======================================================================
# ΠΙΝΑΚΑΣ: parking_spots (Θέσεις Στάθμευσης)
# =======================================================================

class ParkingSpot(Base):
    """
    ΤΙ ΑΝΤΙΠΡΟΣΩΠΕΥΕΙ: Μία θέση στάθμευσης στον χάρτη.

    Κάθε γραμμή σε αυτόν τον πίνακα είναι μία θέση.
    Η θέση έχει συντεταγμένες (latitude/longitude) για να εμφανίζεται
    στον χάρτη, και μια κατάσταση (status) για να ξέρουμε αν είναι
    ελεύθερη ή κατειλημμένη.

    Πιθανές καταστάσεις:
    - "Available": Ελεύθερη → πράσινο σήμα στον χάρτη
    - "Occupied": Κατειλημμένη → γκρι σήμα στον χάρτη
    - "Reserved": Κρατημένη → χρυσό σήμα στον χάρτη
    """
    __tablename__ = "parking_spots"  # Το όνομα του πίνακα στη βάση

    # primary_key=True: μοναδικό αναγνωριστικό κάθε εγγραφής (αυτόματα αυξάνεται)
    # index=True: δημιουργεί index για γρηγορότερες αναζητήσεις
    id = Column(Integer, primary_key=True, index=True)

    # Γεωγραφικές συντεταγμένες της θέσης
    # nullable=False σημαίνει ότι η τιμή είναι ΥΠΟΧΡΕΩΤΙΚΗ
    latitude = Column(Float, nullable=False)   # Γεωγραφικό πλάτος (π.χ. 37.9838)
    longitude = Column(Float, nullable=False)  # Γεωγραφικό μήκος (π.χ. 23.7275)

    # Διεύθυνση ανθρώπινης γλώσσας (π.χ. "Οδός Ερμού 15, Αθήνα")
    location = Column(String(100), nullable=False)

    # Πόλη και περιοχή (nullable=True σημαίνει προαιρετικό πεδίο)
    city = Column(String(50), nullable=True)   # Π.χ. "Athens"
    area = Column(String(50), nullable=True)   # Π.χ. "Kolonaki"

    # Τρέχουσα κατάσταση της θέσης
    status = Column(String(20), nullable=False, default="Available")

    # Πότε ενημερώθηκε τελευταία η κατάσταση
    # server_default=func.now(): η βάση βάζει αυτόματα την τρέχουσα ώρα
    last_updated = Column(DateTime(timezone=False), server_default=func.now())

    # ΣΧΕΣΕΙΣ (Relationships): Συνδέουν αυτόν τον πίνακα με άλλους.
    # Π.χ. μια θέση μπορεί να έχει πληροφορίες τιμολόγησης (paid_info).
    # uselist=False σημαίνει ότι κάθε θέση έχει ΜΟΝΟ μία τιμή (1-1 σχέση).
    paid_info = relationship("PaidParking", uselist=False, back_populates="spot")

    # Μια θέση μπορεί να έχει πολλές αλλαγές κατάστασης (1-πολλά)
    status_logs = relationship("SpotStatusLog", back_populates="spot")

    # Μια θέση μπορεί να είναι αγαπημένη σε πολλούς χρήστες (πολλά-πολλά)
    favorites = relationship("UserFavorites", back_populates="spot")

    # Μια θέση μπορεί να έχει πολλές κρατήσεις (1-πολλά)
    reservations = relationship("Reservation", back_populates="spot")


# =======================================================================
# ΠΙΝΑΚΑΣ: spot_status_log (Ιστορικό Αλλαγών Κατάστασης)
# =======================================================================

class SpotStatusLog(Base):
    """
    ΤΙ ΑΝΤΙΠΡΟΣΩΠΕΥΕΙ: Το ιστορικό αλλαγών κατάστασης για κάθε θέση.

    Κάθε φορά που μια θέση αλλάζει κατάσταση (π.χ. από "Available"
    σε "Occupied"), αποθηκεύεται μια νέα εγγραφή εδώ με χρονοσήμανση.
    Χρήσιμο για στατιστικά ανάλυση: πόσο συχνά κατέχεται μια θέση;
    """
    __tablename__ = "spot_status_log"

    id = Column(Integer, primary_key=True, index=True)

    # ForeignKey: αυτό το πεδίο αναφέρεται στο id του πίνακα parking_spots
    # Είναι σαν ένα "link" μεταξύ των πινάκων
    spot_id = Column(Integer, ForeignKey("parking_spots.id"), nullable=False)

    # Η κατάσταση που καταγράφηκε (π.χ. "Available", "Occupied")
    status = Column(String(20), nullable=False)

    # Πότε έγινε η αλλαγή
    timestamp = Column(DateTime(timezone=False), server_default=func.now())

    # Σύνδεση με τον πίνακα parking_spots για να μπορούμε να γράψουμε
    # log.spot.location αντί log.spot_id
    spot = relationship("ParkingSpot", back_populates="status_logs")


# =======================================================================
# ΠΙΝΑΚΑΣ: users (Χρήστες)
# =======================================================================

class User(Base):
    """
    ΤΙ ΑΝΤΙΠΡΟΣΩΠΕΥΕΙ: Ένας εγγεγραμμένος χρήστης της εφαρμογής.

    Σημαντικό: Ποτέ δεν αποθηκεύουμε τον κωδικό σε απλή μορφή (plain text).
    Αποθηκεύουμε μόνο τον "hashed" κωδικό - μια κρυπτογραφημένη έκδοση
    που δεν μπορεί να αποκρυπτογραφηθεί πίσω στον αρχικό.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # unique=True: κανένας άλλος χρήστης δεν μπορεί να έχει το ίδιο email
    email = Column(String(100), unique=True, nullable=False)

    # Αποθηκεύουμε ΜΟΝΟ τον κρυπτογραφημένο κωδικό (hash)
    # Ποτέ τον πραγματικό κωδικό! Αυτό είναι βασική αρχή ασφαλείας.
    password_hash = Column(Text, nullable=False)

    # Πλήρες όνομα χρήστη (προαιρετικό)
    full_name = Column(String(100), nullable=True)

    # Αν ο χρήστης είναι διαχειριστής (admin) - έχει πρόσβαση στο dashboard
    is_admin = Column(Boolean, default=False)

    # Πότε δημιουργήθηκε ο λογαριασμός
    created_at = Column(DateTime(timezone=False), server_default=func.now())

    # Σχέσεις: ένας χρήστης μπορεί να έχει πολλά αγαπημένα και κρατήσεις
    favorites = relationship("UserFavorites", back_populates="user")
    reservations = relationship("Reservation", back_populates="user")


# =======================================================================
# ΠΙΝΑΚΑΣ: user_favorites (Αγαπημένες Θέσεις)
# =======================================================================

class UserFavorites(Base):
    """
    ΤΙ ΑΝΤΙΠΡΟΣΩΠΕΥΕΙ: Τη σχέση "αγαπημένο" μεταξύ χρήστη και θέσης.

    Αυτός ο πίνακας υλοποιεί σχέση πολλά-προς-πολλά (many-to-many):
    - Ένας χρήστης μπορεί να έχει πολλές αγαπημένες θέσεις
    - Μια θέση μπορεί να είναι αγαπημένη σε πολλούς χρήστες

    Χρησιμοποιεί σύνθετο primary key (user_id + spot_id) για να
    εξασφαλίσει ότι κάθε συνδυασμός είναι μοναδικός.
    """
    __tablename__ = "user_favorites"

    # Σύνθετο primary key: ο συνδυασμός user_id + spot_id είναι μοναδικός
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    spot_id = Column(Integer, ForeignKey("parking_spots.id"), primary_key=True)

    # Συνδέσεις και προς τους δύο πίνακες
    user = relationship("User", back_populates="favorites")
    spot = relationship("ParkingSpot", back_populates="favorites")


# =======================================================================
# ΠΙΝΑΚΑΣ: reservations (Κρατήσεις)
# =======================================================================

class Reservation(Base):
    """
    ΤΙ ΑΝΤΙΠΡΟΣΩΠΕΥΕΙ: Μια κράτηση θέσης στάθμευσης από χρήστη.

    Όταν ένας χρήστης πατά "Reserve", δημιουργείται μια εγγραφή εδώ.
    Η θέση κρατείται για 30 δευτερόλεπτα (testing duration).
    Μετά τη λήξη, η θέση επιστρέφει στο "Available".
    """
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)

    # Ποιος χρήστης έκανε την κράτηση
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Ποια θέση κρατήθηκε
    spot_id = Column(Integer, ForeignKey("parking_spots.id"), nullable=False)

    # Πότε ξεκίνησε η κράτηση
    start_time = Column(DateTime(timezone=False), nullable=False)

    # Πότε τελειώνει (nullable=True: αν είναι None, η κράτηση είναι ενεργή)
    end_time = Column(DateTime(timezone=False), nullable=True)

    # Συνδέσεις με χρήστη και θέση για εύκολη πρόσβαση
    user = relationship("User", back_populates="reservations")
    spot = relationship("ParkingSpot", back_populates="reservations")


# =======================================================================
# ΠΙΝΑΚΑΣ: paid_parking (Τιμολόγηση Επί Πληρωμή Θέσεων)
# =======================================================================

class PaidParking(Base):
    """
    ΤΙ ΑΝΤΙΠΡΟΣΩΠΕΥΕΙ: Πληροφορίες τιμολόγησης για πληρωμένες θέσεις.

    Υλοποιεί 1-προς-1 (one-to-one) σχέση με τον πίνακα parking_spots.
    Δηλαδή, μια θέση έχει ΜΟΝΟ ένα price_per_hour.
    Αν μια θέση δεν έχει εγγραφή εδώ → είναι ΔΩΡΕΑΝ.
    Αν έχει εγγραφή εδώ → έχει ΧΡΕΩΣΗ ανά ώρα.
    """
    __tablename__ = "paid_parking"

    # Το spot_id είναι ταυτόχρονα primary key και foreign key
    spot_id = Column(Integer, ForeignKey("parking_spots.id"), primary_key=True)

    # Τιμή ανά ώρα σε ευρώ. Numeric(8, 2) = μέχρι 8 ψηφία, 2 δεκαδικά
    # Π.χ. 2.50 = 2,50 ευρώ ανά ώρα
    price_per_hour = Column(Numeric(8, 2), nullable=False)

    # Σύνδεση με τον πίνακα parking_spots
    spot = relationship("ParkingSpot", back_populates="paid_info")

/**
 * =======================================================================
 * distance.ts - Υπολογισμός Αποστάσεων μεταξύ Συντεταγμένων
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει μαθηματικές συναρτήσεις για υπολογισμό αποστάσεων μεταξύ
 *   γεωγραφικών συντεταγμένων (latitude, longitude).
 *
 * ΑΛΓΟΡΙΘΜΟΣ HAVERSINE:
 *   Η γη δεν είναι επίπεδη, είναι σφαιρική!
 *   Άρα δεν μπορούμε να χρησιμοποιήσουμε τον Πυθαγόρειο θεωρήμα.
 *   Ο τύπος Haversine υπολογίζει αποστάσεις ΠΑΝΩ στην επιφάνεια σφαίρας.
 *   Για μικρές αποστάσεις (π.χ. μέσα σε μια πόλη) είναι αρκετά ακριβής.
 *
 * ΧΡΗΣΗ:
 *   Εμφάνιση "~5 λεπτά με αυτοκίνητο" στη λίστα θέσεων.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   SpotListItem.tsx (εμφάνιση χρόνου οδήγησης)
 * =======================================================================
 */

/** Τύπος γεωγραφικών συντεταγμένων */
type LatLng = { lat: number; lng: number };

// Ακτίνα γης σε μέτρα (6.371 km)
const R = 6371e3;

/**
 * toRad - Μετατρέπει μοίρες σε ακτίνια (radians).
 * ΓΙΑΤΙ: Οι τριγωνομετρικές συναρτήσεις (Math.sin, Math.cos) δέχονται ακτίνια.
 * ΠΑΡΑΜΕΤΡΟΙ: v - γωνία σε μοίρες
 * ΕΠΙΣΤΡΕΦΕΙ: γωνία σε ακτίνια
 */
function toRad(v: number) { return (v * Math.PI) / 180; }

/**
 * haversineMeters - Υπολογίζει την απόσταση μεταξύ δύο σημείων.
 *
 * ΤΙ ΚΑΝΕΙ: Εφαρμόζει τον τύπο Haversine για σφαιρικές αποστάσεις.
 * ΠΑΡΑΜΕΤΡΟΙ:
 *   pointA - πρώτο σημείο {lat, lng}
 *   pointB - δεύτερο σημείο {lat, lng}
 * ΕΠΙΣΤΡΕΦΕΙ: Απόσταση σε μέτρα
 *
 * ΜΑΘΗΜΑΤΙΚΑ (απλοποιημένα):
 *   1. Μετατρέπουμε γεωγραφικές γωνίες σε ακτίνια
 *   2. Υπολογίζουμε τις διαφορές γεωγραφικού πλάτους/μήκους
 *   3. Εφαρμόζουμε τον τύπο Haversine (τριγωνομετρία σφαίρας)
 *   4. Πολλαπλασιάζουμε με ακτίνα γης
 */
export function haversineMeters(pointA: LatLng, pointB: LatLng): number {
    const lat1Rad = toRad(pointA.lat), lat2Rad = toRad(pointB.lat);
    const deltaLatRad = toRad(pointB.lat - pointA.lat);   // Διαφορά πλάτους
    const deltaLngRad = toRad(pointB.lng - pointA.lng);   // Διαφορά μήκους

    // Τύπος Haversine: a = sin²(Δlat/2) + cos(lat1)·cos(lat2)·sin²(Δlng/2)
    const squareHalfChord =
        Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

    // c = 2·atan2(√a, √(1-a))   →  d = R·c
    const angularDistance = 2 * Math.atan2(Math.sqrt(squareHalfChord), Math.sqrt(1 - squareHalfChord));
    return R * angularDistance;  // Απόσταση σε μέτρα
}

/**
 * getNearestDistanceMeters - Βρίσκει την απόσταση στο πλησιέστερο σημείο.
 *
 * ΤΙ ΚΑΝΕΙ: Από μια λίστα σημείων, βρίσκει αυτό που είναι πιο κοντά.
 * ΠΑΡΑΜΕΤΡΟΙ:
 *   origin  - το σημείο αφετηρίας (θέση χρήστη)
 *   targets - λίστα σημείων (θέσεις parking)
 * ΕΠΙΣΤΡΕΦΕΙ: Ελάχιστη απόσταση σε μέτρα, ή null αν η λίστα είναι άδεια
 */
export function getNearestDistanceMeters(origin: LatLng, targets: LatLng[]): number | null {
    if (!targets.length) return null;

    let minDistance = Infinity; // Ξεκινάμε με άπειρο (κάθε απόσταση είναι μικρότερη)
    for (const target of targets) {
        const distance = haversineMeters(origin, target);
        if (distance < minDistance) minDistance = distance;  // Κρατάμε τη μικρότερη
    }
    return minDistance === Infinity ? null : minDistance;
}

/**
 * drivingMinutes - Εκτιμά χρόνο οδήγησης βάσει απόστασης.
 *
 * ΤΙ ΚΑΝΕΙ: Μετατρέπει μέτρα σε λεπτά οδήγησης.
 * ΠΑΡΑΜΕΤΡΟΙ: meters - απόσταση σε μέτρα
 * ΕΠΙΣΤΡΕΦΕΙ: Εκτιμώμενα λεπτά οδήγησης (τουλάχιστον 1)
 *
 * ΥΠΟΛΟΓΙΣΜΟΣ: Μέση ταχύτητα πόλης ~30 km/h ≈ 500 m/min
 *   5 km / 500 m/min = 10 λεπτά
 */
export function drivingMinutes(meters: number): number {
    // Διαιρούμε με 500 (500 μέτρα/λεπτό) και στρογγυλοποιούμε
    // Math.max(1, ...): τουλάχιστον 1 λεπτό (αποφεύγουμε "0 λεπτά")
    return Math.max(1, Math.round(meters / 500));
}

/**
 * walkingMinutes - Συνώνυμο του drivingMinutes για συμβατότητα.
 * Κρατήθηκε για να μην σπάσει παλιός κώδικας που το χρησιμοποιούσε.
 */
export function walkingMinutes(meters: number): number {
    return drivingMinutes(meters);
}

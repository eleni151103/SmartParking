/**
 * =======================================================================
 * parking.ts - Τύποι Δεδομένων για Θέσεις Στάθμευσης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Ορίζει τους τύπους (types) που χρησιμοποιούνται σε ολόκληρο το
 *   frontend για θέσεις στάθμευσης.
 *
 * ΤΙ ΕΙΝΑΙ ΟΙ ΤΥΠΟΙ (TypeScript Types):
 *   Το TypeScript μας επιτρέπει να ορίσουμε τη "μορφή" των δεδομένων.
 *   Αν πούμε ότι κάτι είναι τύπου ParkingSpot, το TypeScript ελέγχει
 *   ότι έχει τα σωστά πεδία με τους σωστούς τύπους (αριθμός, string κτλ).
 *   Αυτό αποτρέπει bugs πριν τρέξει ο κώδικας.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
 *   Κεντρικό αρχείο τύπων - αλλαγές εδώ επηρεάζουν ολόκληρη την εφαρμογή.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Σχεδόν όλα τα αρχεία του frontend που χειρίζονται θέσεις parking.
 * =======================================================================
 */

/**
 * SpotStatus - Οι πιθανές καταστάσεις μιας θέσης στάθμευσης.
 *
 * Χρησιμοποιούμε "const object" αντί για enum για καλύτερη συμβατότητα
 * με το TypeScript. Το "as const" λέει: αυτές οι τιμές δεν αλλάζουν ποτέ.
 *
 * ΤΙΜΕΣ:
 *   Available    = Διαθέσιμη (πράσινο στον χάρτη)
 *   Occupied     = Κατειλημμένη (κόκκινο)
 *   Reserved     = Κρατημένη (κίτρινο)
 *   OutOfService = Εκτός λειτουργίας (γκρι)
 */
export const SpotStatus = {
    Available: "Available",
    Occupied: "Occupied",
    Reserved: "Reserved",
    OutOfService: "OutOfService",
} as const;

// Τύπος που αντιστοιχεί στις τιμές του SpotStatus object
// (δηλαδή: "Available" | "Occupied" | "Reserved" | "OutOfService")
export type SpotStatus = typeof SpotStatus[keyof typeof SpotStatus];

// Πιο ευέλικτος τύπος κατάστασης που δέχεται και άλλα strings
// (χρησιμοποιείται όταν δεν είμαστε σίγουροι για την τιμή)
export type ParkingStatus = "Available" | "Occupied" | "Reserved" | string;

/**
 * ParkingSpot - Ο κύριος τύπος δεδομένων για μια θέση στάθμευσης.
 *
 * Αντιστοιχεί στο ParkingSpotResponse του backend.
 * Το '?' σημαίνει ότι το πεδίο είναι προαιρετικό (μπορεί να λείπει).
 */
export type ParkingSpot = {
    id: number;              // Μοναδικό αναγνωριστικό
    latitude: number;        // Γεωγραφικό πλάτος (για τον χάρτη)
    longitude: number;       // Γεωγραφικό μήκος (για τον χάρτη)
    location: string;        // Περιγραφή τοποθεσίας (π.χ. "Ερμού 25")
    city?: string;           // Πόλη (προαιρετικό)
    area?: string;           // Περιοχή (προαιρετικό, π.χ. "Κολωνάκι")
    status: ParkingStatus;   // Τρέχουσα κατάσταση
    last_updated?: string;   // Πότε ενημερώθηκε τελευταία (ISO string)
    price_per_hour?: number | null; // Τιμή/ώρα (null = δωρεάν)
};

/**
 * SpotStatusLog - Εγγραφή ιστορικού αλλαγής κατάστασης.
 * Κάθε φορά που η κατάσταση αλλάζει, αποθηκεύεται εδώ.
 */
export type SpotStatusLog = {
    id: number;
    spot_id: number;       // Ποια θέση άλλαξε
    status: SpotStatus;    // Η νέα κατάσταση
    timestamp: string;     // Πότε έγινε η αλλαγή
};

/**
 * User - Τύπος χρήστη (ορισμένος εδώ για χρήση εντός parking context).
 * Βλέπε επίσης types/user.ts για πιο πλήρη ορισμό.
 */
export type User = {
    id: number;
    email: string;
    password_hash: string;
    full_name?: string | null;
    created_at: string;
};

/** UserFavorites - Σχέση χρήστη-αγαπημένης θέσης */
export type UserFavorites = {
    user_id: number;
    spot_id: number;
};

/**
 * Reservation - Κράτηση θέσης στάθμευσης.
 * end_time μπορεί να είναι null αν η κράτηση δεν έχει λήξει.
 */
export type Reservation = {
    id: number;
    user_id: number;
    spot_id: number;
    start_time: string;
    end_time?: string | null;
};

/** LatLng - Ζεύγος συντεταγμένων για τον χάρτη Leaflet */
export type LatLng = { lat: number; lng: number };

/**
 * toLatLng - Μετατρέπει ParkingSpot σε LatLng για τον χάρτη.
 * ΠΑΡΑΜΕΤΡΟΙ: spot - μια θέση parking
 * ΕΠΙΣΤΡΕΦΕΙ: { lat, lng } για χρήση στο Leaflet
 */
export function toLatLng(spot: ParkingSpot): LatLng {
    return { lat: spot.latitude, lng: spot.longitude };
}

/**
 * isAvailable - Ελέγχει αν μια θέση είναι διαθέσιμη.
 * ΠΑΡΑΜΕΤΡΟΙ: spot - η θέση προς έλεγχο
 * ΕΠΙΣΤΡΕΦΕΙ: true αν η κατάσταση είναι "Available"
 */
export function isAvailable(spot: ParkingSpot): boolean {
    return spot.status === SpotStatus.Available;
}

/** isPaid - Ελέγχει αν μια θέση είναι επί πληρωμή (έχει τιμή/ώρα) */
export const isPaid = (s: ParkingSpot) => (s.price_per_hour ?? null) !== null && s.price_per_hour !== undefined;

/** isFree - Ελέγχει αν μια θέση είναι δωρεάν (δεν έχει τιμή/ώρα) */
export const isFree = (s: ParkingSpot) => !isPaid(s);

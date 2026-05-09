/**
 * =======================================================================
 * normalizeSpot.ts - Ομογενοποίηση Δεδομένων Θέσης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Μετατρέπει "ακατέργαστα" δεδομένα από το API ή WebSocket σε
 *   τυποποιημένο ParkingSpot αντικείμενο.
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
 *   Τα δεδομένα μπορεί να έρθουν με διαφορετικές ονομασίες πεδίων:
 *   - REST API: snake_case   (price_per_hour, last_updated)
 *   - WebSocket: camelCase  (pricePerHour, lastUpdated)
 *   Αυτή η συνάρτηση "καθαρίζει" αυτές τις διαφορές.
 *
 * ΠΑΡΑΔΕΙΓΜΑ:
 *   Εισαγωγή: { id: "5", price_per_hour: "2.5", ... }
 *   Εξαγωγή:  { id: 5, price_per_hour: 2.5, ... }   (σωστοί τύποι)
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   useLiveSpots.ts (WebSocket updates), useViewportSpots.ts (API data)
 * =======================================================================
 */

import type { ParkingSpot } from "../types/parking";

/**
 * normalizeSpot - Μετατρέπει raw API/WebSocket data σε typed ParkingSpot.
 *
 * ΤΙ ΚΑΝΕΙ: Δέχεται οτιδήποτε (any) και επιστρέφει clean ParkingSpot.
 * ΠΑΡΑΜΕΤΡΟΙ: raw - τα ακατέργαστα δεδομένα
 * ΕΠΙΣΤΡΕΦΕΙ: Καθαρό ParkingSpot με σωστούς τύπους
 *
 * ΧΕΙΡΙΣΜΟΣ ΠΕΔΙΩΝ:
 * - ?? operator: "αν το αριστερό είναι null/undefined, χρησιμοποίησε το δεξί"
 * - Number(): μετατρέπει string σε αριθμό (π.χ. "5" → 5)
 * - String(): μετατρέπει οτιδήποτε σε string
 */
export function normalizeSpot(raw: any): ParkingSpot {
    // Τιμή/ώρα: δέχεται camelCase (WebSocket) ή snake_case (REST API)
    const price =
        raw.pricePerHour ?? raw.price_per_hour ?? null;

    return {
        id: Number(raw.id),                           // Αριθμός (σε string → number)
        latitude: Number(raw.latitude),               // Γεωγραφικό πλάτος
        longitude: Number(raw.longitude),             // Γεωγραφικό μήκος
        location: String(raw.location ?? ""),         // Τοποθεσία (default: κενό)
        status: String(raw.status ?? "Available"),    // Κατάσταση (default: Available)
        last_updated: raw.last_updated ?? raw.lastUpdated ?? null, // snake_case ή camelCase
        pricePerHour: price !== null && price !== undefined ? Number(price) : null,
    };
}

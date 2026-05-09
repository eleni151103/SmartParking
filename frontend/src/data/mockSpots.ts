/**
 * =======================================================================
 * mockSpots.ts - Δεδομένα Mock για Ανάπτυξη/Testing
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει σταθερά (hardcoded) δεδομένα θέσεων parking για:
 *   - Ανάπτυξη χωρίς backend (offline development)
 *   - Unit testing components
 *   - Γρήγορο prototype/demo
 *
 * ΓΙΑΤΙ ΧΡΕΙΑΖΕΤΑΙ:
 *   Κατά την ανάπτυξη, δεν θέλουμε πάντα να τρέχει ο backend server.
 *   Με mock data μπορούμε να δοκιμάσουμε το UI ανεξάρτητα από το backend.
 *
 * ΔΕΔΟΜΕΝΑ:
 *   7 θέσεις στην Αθήνα με διαφορετικά statuses:
 *   - Available (2): εμφανίζονται στον χάρτη
 *   - Occupied (1): δεν εμφανίζονται (κατειλημμένες)
 *   - Reserved (1): δεν εμφανίζονται (κρατημένες)
 *   - OutOfService (1): δεν εμφανίζονται (εκτός λειτουργίας)
 *
 * ΣΗΜΑΝΤΙΚΟ:
 *   Σε production, αυτά αντικαθίστανται από δεδομένα του πραγματικού API.
 *   Χρησιμοποιούνται μόνο για development/testing.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   parking.ts (τύποι SpotStatus, ParkingSpot, toLatLng, isAvailable)
 * =======================================================================
 */

import { type ParkingSpot, SpotStatus, toLatLng, isAvailable } from "../types/parking";

/**
 * spots - Πλήρης λίστα mock θέσεων parking στην Αθήνα.
 * Κάθε θέση έχει: id, συντεταγμένες, τοποθεσία, κατάσταση, last_updated.
 */
export const spots: ParkingSpot[] = [
    {
        id: 1,
        latitude: 37.9795,
        longitude: 23.7337,
        location: "Vas. Sofias Ave (Near Syntagma)",
        status: SpotStatus.Available,   // Διαθέσιμη - εμφανίζεται στον χάρτη
        last_updated: new Date().toISOString(),  // Τώρα (runtime)
    },
    {
        id: 2,
        latitude: 37.9780,
        longitude: 23.7260,
        location: "Ermou Street (Shopping District)",
        status: SpotStatus.Available,
        last_updated: new Date().toISOString(),
    },
    {
        id: 3,
        latitude: 37.9810,
        longitude: 23.7320,
        location: "Akadimias Street (University Area)",
        status: SpotStatus.Available,
        last_updated: new Date().toISOString(),
    },
    {
        id: 4,
        latitude: 37.9818,
        longitude: 23.7285,
        location: "Panepistimiou Ave (Central Athens)",
        status: SpotStatus.Available,
        last_updated: new Date().toISOString(),
    },
    {
        id: 5,
        latitude: 37.9830,
        longitude: 23.7270,
        location: "Omonia Square",
        status: SpotStatus.Occupied,    // Κατειλημμένη - δεν εμφανίζεται
        last_updated: new Date().toISOString(),
    },
    {
        id: 6,
        latitude: 37.9716,
        longitude: 23.7267,
        location: "Fix Metro Area",
        status: SpotStatus.Reserved,    // Κρατημένη - δεν εμφανίζεται
        last_updated: new Date().toISOString(),
    },
    {
        id: 7,
        latitude: 37.9752,
        longitude: 23.7340,
        location: "National Garden NW",
        status: SpotStatus.OutOfService,  // Εκτός λειτουργίας - δεν εμφανίζεται
        last_updated: new Date().toISOString(),
    },
];

/**
 * availableSpots - Προ-φιλτραρισμένη λίστα: μόνο Available θέσεις.
 * Χρήσιμο shortcut για components που θέλουν μόνο διαθέσιμες θέσεις.
 */
export const availableSpots = spots.filter(isAvailable);

/**
 * spotLatLngs - Λίστα συντεταγμένων για χρήση σε χάρτη.
 * Χρησιμοποιεί toLatLng() helper για μετατροπή ParkingSpot → {lat, lng}
 */
export const spotLatLngs = spots.map(toLatLng);

/**
 * =======================================================================
 * reservation.ts - Τύποι Δεδομένων Κρατήσεων
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Ορίζει τους τύπους για κρατήσεις θέσεων στάθμευσης στο frontend.
 *
 * ΓΙΑΤΙ ΥΠΑΡΧΕΙ:
 *   Το Reservation interface χρησιμοποιείται σε πολλά σημεία:
 *   ReservationsModal, useReservation hook, και API calls.
 *   Κεντρικός ορισμός αποφεύγει αντιφάσεις.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   ReservationsModal.tsx, useReservation.ts, api.ts
 * =======================================================================
 */

import type { ParkingSpot } from "./parking";

/**
 * Reservation - Πλήρης κράτηση με embedded πληροφορίες θέσης.
 *
 * ΣΗΜΑΝΤΙΚΟ: Περιέχει το spot αντικείμενο (joinedload από backend),
 * ώστε να μπορούμε να εμφανίζουμε λεπτομέρειες χωρίς extra API call.
 */
export interface Reservation {
    id: number;             // Μοναδικό αναγνωριστικό κράτησης
    user_id: number;        // Ποιος χρήστης έκανε την κράτηση
    spot_id: number;        // Ποια θέση κρατήθηκε
    start_time: string;     // Έναρξη κράτησης (ISO datetime string)
    end_time: string | null; // Λήξη κράτησης (null αν δεν έχει λήξει ακόμα)
    spot: ParkingSpot;      // Πλήρη στοιχεία θέσης (για εμφάνιση στη λίστα)
}

/** ReservationResponse - Alias για το Reservation (ίδιος τύπος, διαφορετικό όνομα) */
export type ReservationResponse = Reservation;

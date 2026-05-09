/**
 * =======================================================================
 * useReservation.ts - Hook Κράτησης Θέσης Στάθμευσης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει τη συνάρτηση handleReserve για κράτηση μιας θέσης.
 *   Ελέγχει αν ο χρήστης είναι συνδεδεμένος πριν επιτρέψει κράτηση.
 *
 * ΓΙΑΤΙ CUSTOM HOOK:
 *   Η λογική κράτησης (API call + alerts + auth check) είναι η ίδια
 *   για κάθε component που έχει κουμπί "Κράτηση". Αντί να γράψουμε
 *   τον ίδιο κώδικα παντού, το βάζουμε σε ένα hook.
 *
 * useCallback:
 *   Αποθηκεύει τη handleReserve και δεν την ξαναδημιουργεί
 *   σε κάθε render. Αναδημιουργείται ΜΟΝΟ αν αλλάξει το user.
 *   Αυτό βελτιστοποιεί performance (λιγότερα re-renders).
 *
 * ΧΡΗΣΗ:
 *   const { handleReserve } = useReservation();
 *   <button onClick={() => handleReserve(spot)}>Κράτηση</button>
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   SpotListItem.tsx, MapView.tsx (κουμπί κράτησης)
 * =======================================================================
 */

import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import type { ParkingSpot } from '../types/parking';

/**
 * useReservation - Custom hook για διαχείριση κρατήσεων.
 *
 * ΕΠΙΣΤΡΕΦΕΙ: { handleReserve } - η συνάρτηση για κράτηση
 */
export function useReservation() {
    // Παίρνουμε τον τρέχοντα χρήστη από το AuthContext
    const { user } = useAuth();

    /**
     * handleReserve - Κάνει κράτηση μιας θέσης.
     *
     * ΤΙ ΚΑΝΕΙ:
     * 1. Ελέγχει αν υπάρχει συνδεδεμένος χρήστης
     * 2. Στέλνει POST /api/reservations με user_id + spot_id
     * 3. Ενημερώνει τον χρήστη με alert (επιτυχία ή αποτυχία)
     *
     * ΠΑΡΑΜΕΤΡΟΙ: spot - η θέση που θέλει να κρατήσει ο χρήστης
     *
     * useCallback + [user]: η συνάρτηση ξαναδημιουργείται μόνο αν αλλάξει user
     */
    const handleReserve = useCallback(async (spot: ParkingSpot) => {
        console.log("handleReserve called", { user, spotId: spot.id });

        // Έλεγχος authentication - μόνο συνδεδεμένοι χρήστες μπορούν να κρατήσουν
        if (!user) {
            alert("Please login to reserve a spot.");
            return;
        }

        try {
            // POST /api/reservations/ με user_id + spot_id στο body
            await api.post('/reservations', {
                user_id: user.id,   // Ο τρέχων χρήστης κάνει κράτηση για τον εαυτό του
                spot_id: spot.id    // Η επιλεγμένη θέση
            });
            // Επιτυχής κράτηση - ενημέρωση χρήστη
            alert("Reservation successful! Spot reserved for 30 seconds.");
        } catch (error) {
            console.error("Reservation failed", error);
            // Αποτυχία - π.χ. η θέση κρατήθηκε ήδη από άλλον
            alert("Failed to reserve spot. It might be taken.");
        }
    }, [user]);  // [user]: ξαναδημιούργησε αν αλλάξει ο χρήστης

    return { handleReserve };
}

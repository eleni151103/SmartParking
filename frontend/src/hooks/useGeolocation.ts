/**
 * =======================================================================
 * useGeolocation.ts - Τοποθεσία Χρήστη σε Πραγματικό Χρόνο
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρακολουθεί την τοποθεσία του χρήστη χρησιμοποιώντας το
 *   Geolocation API του browser (GPS ή Wi-Fi positioning).
 *
 * ΤΙ ΕΙΝΑΙ ΤΟ GEOLOCATION API:
 *   Ενσωματωμένη λειτουργία κάθε browser που επιτρέπει πρόσβαση
 *   στη γεωγραφική θέση της συσκευής. Ο browser ζητά άδεια από τον χρήστη.
 *
 * watchPosition vs getCurrentPosition:
 *   - getCurrentPosition: παίρνει τη θέση ΜΙΑ φορά
 *   - watchPosition: παρακολουθεί ΣΥΝΕΧΩΣ (ενημερώνεται αν κινηθεί ο χρήστης)
 *   Χρησιμοποιούμε watchPosition για live tracking.
 *
 * ΧΡΗΣΗ:
 *   const { coords } = useGeolocation();
 *   // coords = null (άδεια δεν δόθηκε) ή { lat: 37.97, lng: 23.73 }
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   MapView.tsx (εμφάνιση θέσης χρήστη), SpotListItem.tsx (υπολογισμός αποστάσεων)
 * =======================================================================
 */

import { useEffect, useState } from 'react';

/** Τύπος συντεταγμένων */
type Coords = { lat: number; lng: number };

/**
 * useGeolocation - Custom hook για παρακολούθηση τοποθεσίας χρήστη.
 *
 * ΕΠΙΣΤΡΕΦΕΙ: { coords } - τρέχουσες συντεταγμένες ή null
 *
 * ΣΗΜΕΙΩΣΗ: Αν ο χρήστης αρνηθεί πρόσβαση ή ο browser δεν το υποστηρίζει,
 * το coords παραμένει null.
 */
export function useGeolocation() {
    // coords: η τρέχουσα θέση ή null αν δεν έχει ληφθεί ακόμα
    const [coords, setCoords] = useState<Coords | null>(null);

    useEffect(() => {
        // Ελέγχουμε αν ο browser υποστηρίζει Geolocation API
        if (!('geolocation' in navigator)) {
            return;  // Παλιός browser - δεν κάνουμε τίποτα
        }

        // Εκκίνηση παρακολούθησης θέσης
        // watchPosition επιστρέφει ένα watchId για καθαρισμό
        const watchId = navigator.geolocation.watchPosition(
            // Callback επιτυχίας: κάλεσε μας όταν έχεις νέες συντεταγμένες
            (pos) => {
                setCoords({
                    lat: pos.coords.latitude,   // Γεωγραφικό πλάτος
                    lng: pos.coords.longitude   // Γεωγραφικό μήκος
                });
            },
            // Callback σφάλματος: άδεια αρνήθηκε ή άλλο πρόβλημα
            (err) => {
                console.error("Geolocation error:", err);
            },
            // Επιλογές ακρίβειας
            {
                enableHighAccuracy: true,  // Χρησιμοποίησε GPS αν διαθέσιμο (πιο ακριβές)
                timeout: 20000,            // Περίμενε max 20 δευτερόλεπτα
                maximumAge: 0              // Μην χρησιμοποιείς cached θέση (θέλουμε live)
            }
        );

        // Cleanup function: τρέχει όταν το component αφαιρεθεί από τη σελίδα
        // clearWatch: σταματά την παρακολούθηση για να μην σπαταλά battery/CPU
        return () => navigator.geolocation.clearWatch(watchId);
    }, []);  // [] = τρέχει μία φορά (εκκίνηση παρακολούθησης)

    return { coords };
}

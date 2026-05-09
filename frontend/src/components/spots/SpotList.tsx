/**
 * =======================================================================
 * SpotList.tsx - Λίστα Θέσεων Στάθμευσης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει λίστα θέσεων parking ταξινομημένη κατά απόσταση από τον χρήστη.
 *   Χρησιμοποιεί SpotListItem για κάθε θέση.
 *
 * ΤΑΞΙΝΟΜΗΣΗ:
 *   Αν γνωρίζουμε τη θέση του χρήστη, ταξινομούμε τις θέσεις
 *   ανά απόσταση (πλησιέστερη πρώτα). Αλλιώς, εμφανίζουμε ως έχουν.
 *
 * useMemo:
 *   Η ταξινόμηση είναι ακριβή επιχείρηση (O(n log n)).
 *   Με useMemo την εκτελούμε ΜΟΝΟ όταν αλλάξουν spots ή userCoords.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Sidebar.tsx (κύριος χρήστης), SpotListItem.tsx (κάθε στοιχείο)
 * =======================================================================
 */

import type { ParkingSpot } from '../../types/parking';
import { haversineMeters } from '../../utils/distance';
import { toLatLng } from '../../types/parking';
import SpotListItem from './SpotListItem';
import { useMemo } from 'react';

type Props = {
    spots: ParkingSpot[];                        // Θέσεις προς εμφάνιση
    userCoords?: { lat: number; lng: number };   // Θέση χρήστη (προαιρετικό)
    showReserve: boolean;                         // Εμφάνιση κουμπιού κράτησης
    computeWalkMins: (meters: number) => number; // Συνάρτηση μετατροπής μέτρων → λεπτά
};

export default function SpotList({ spots, userCoords, showReserve, computeWalkMins }: Props) {
    // Ταξινόμηση θέσεων ανά απόσταση από χρήστη
    const sortedSpots = useMemo(() => {
        if (!userCoords) return spots;  // Χωρίς θέση χρήστη: χωρίς ταξινόμηση

        // [...spots]: αντιγραφή πίνακα (δεν τροποποιούμε τον original)
        // sort: ταξινόμηση βάσει απόστασης (μικρότερη πρώτα)
        return [...spots].sort((a, b) => {
            const distanceA = haversineMeters(userCoords, toLatLng(a));
            const distanceB = haversineMeters(userCoords, toLatLng(b));
            return distanceA - distanceB;  // Αρνητικό = a πριν b (ascending)
        });
    }, [spots, userCoords]);

    /**
     * handleNavigate - Ανοίγει Google Maps για πλοήγηση σε θέση.
     * ΠΑΡΑΜΕΤΡΟΙ: spot - η θέση προορισμός
     */
    const handleNavigate = (spot: ParkingSpot) => {
        const destination = `${spot.latitude},${spot.longitude}`;
        // Google Maps URL με driving mode
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
        window.open(url, '_blank');  // Ανοίγει σε νέα καρτέλα
    };

    return (
        <div className="space-y-2 md:space-y-3">
            {/* Κενή κατάσταση: δεν υπάρχουν θέσεις */}
            {sortedSpots.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">🚗</div>
                    <div className="text-sm">No parking spots available</div>
                </div>
            ) : (
                <>
                    {/* Υπότιτλος όταν ταξινομείται ανά απόσταση */}
                    {userCoords && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Sorted by distance from your location
                        </div>
                    )}

                    {/* Λίστα SpotListItem για κάθε θέση */}
                    {sortedSpots.map((s) => {
                        // Υπολογισμός απόστασης σε μέτρα (null αν δεν ξέρουμε θέση)
                        const meters = userCoords ? haversineMeters(userCoords, toLatLng(s)) : null;
                        // Μετατροπή μέτρων → λεπτά οδήγησης
                        const mins = meters != null ? computeWalkMins(meters) : null;

                        return (
                            <SpotListItem
                                key={s.id}
                                id={s.id}
                                name={s.location}
                                city={s.city}
                                area={s.area}
                                address={s.location}
                                pricePerHour={s.pricePerHour ?? null}
                                minutesWalk={mins}
                                showReserve={showReserve}
                                onNavigate={() => handleNavigate(s)}
                                status={s.status}
                            />
                        );
                    })}
                </>
            )}
        </div>
    );
}

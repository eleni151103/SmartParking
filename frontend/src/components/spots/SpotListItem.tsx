/**
 * =======================================================================
 * SpotListItem.tsx - Μεμονωμένη Κάρτα Θέσης Στάθμευσης
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει μια μεμονωμένη θέση parking ως κάρτα στη λίστα.
 *   Κάθε κάρτα περιέχει:
 *   - Τοποθεσία (πόλη/περιοχή/διεύθυνση)
 *   - Κουμπί αγαπημένου (αστέρι)
 *   - Κατάσταση, τιμή, χρόνος οδήγησης
 *   - Κουμπιά Reserve και Navigate
 *
 * ΑΓΑΠΗΜΕΝΑ:
 *   Το αστέρι αλλάζει μεταξύ γεμιστού (αγαπημένο) και κενού.
 *   e.stopPropagation(): αποτρέπει τυχαία κλικ να "περνούν" σε άλλα elements.
 *
 * ΕΜΦΑΝΙΣΗ ΤΙΤΛΟΥ:
 *   Αν υπάρχει city: εμφανίζει city ως τίτλο
 *   Αν υπάρχει area: εμφανίζει area ως υπότιτλο
 *   Αλλιώς: εμφανίζει name/address
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   SpotList.tsx (γονέας), FavoritesContext.tsx, useReservation.ts
 * =======================================================================
 */

import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useReservation } from '../../hooks/useReservation';
import React from 'react';

type Props = {
    id: number;                    // ID θέσης
    name: string;                  // Όνομα/τοποθεσία
    city?: string;                 // Πόλη (προαιρετικό)
    area?: string;                 // Περιοχή (προαιρετικό)
    address: string;               // Διεύθυνση
    pricePerHour: number | null;   // Τιμή/ώρα (null = δωρεάν)
    minutesWalk: number | null;    // Λεπτά οδήγησης (null αν άγνωστη θέση χρήστη)
    showReserve: boolean;          // Αν εμφανίζεται κουμπί κράτησης
    onNavigate?: () => void;       // Callback για πλοήγηση
    status: string;                // Κατάσταση θέσης
};

export default function SpotListItem({
    id,
    name,
    city,
    area,
    address,
    pricePerHour,
    minutesWalk,
    showReserve,
    onNavigate,
    status,
}: Props) {
    // isPaid: true αν έχει τιμή (όχι null και όχι NaN)
    const isPaid = pricePerHour != null && !Number.isNaN(pricePerHour);

    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    const { isAuthenticated } = useAuth();
    const { handleReserve } = useReservation();

    const isFav = isFavorite(id);  // Αν αυτή η θέση είναι αγαπημένη

    /**
     * toggleFavorite - Προσθέτει ή αφαιρεί από αγαπημένα.
     * e.stopPropagation(): αποτρέπει διάδοση κλικ σε parent elements
     */
    const toggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFav) {
            await removeFavorite(id);
        } else {
            await addFavorite(id);
        }
    };

    /**
     * getStatusColor - Επιστρέφει CSS κλάση χρώματος για κατάσταση.
     * free=πράσινο, occupied=κόκκινο, άλλο=γκρι
     */
    const getStatusColor = (s: string) => {
        switch (s.toLowerCase()) {
            case 'free': return 'text-green-600 dark:text-green-400';
            case 'occupied': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <div className="rounded-lg border border-gray-400 bg-white p-4 shadow-sm dark:border-gray-500 dark:bg-gray-800 relative">
            <div className="flex items-start justify-between">
                {/* Αριστερό τμήμα: πληροφορίες θέσης */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {/* Τίτλος: πόλη αν υπάρχει, αλλιώς name */}
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {city || name}
                        </h3>
                        {/* Κουμπί αγαπημένου - μόνο αν logged in */}
                        {isAuthenticated && (
                            <button
                                onClick={toggleFavorite}
                                className="text-yellow-500 hover:text-yellow-600 focus:outline-none"
                            >
                                {/* Γεμιστό αστέρι αν αγαπημένο */}
                                {isFav ? (
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                ) : (
                                    /* Κενό αστέρι αν δεν είναι αγαπημένο */
                                    <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Υπότιτλος: περιοχή ή διεύθυνση (αν διαφέρει από τίτλο) */}
                    {((area || address) !== (city || name)) && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {area || address}
                        </p>
                    )}

                    {/* Μεταδεδομένα: κατάσταση, τιμή, απόσταση */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className={`font-medium ${getStatusColor(status)}`}>
                            {status}
                        </span>
                        {isPaid ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                                €{pricePerHour!.toFixed(2)}/hr
                            </span>
                        ) : (
                            <span className="text-green-600 dark:text-green-400 font-medium">Free</span>
                        )}
                        {/* Χρόνος οδήγησης (εμφανίζεται μόνο αν γνωστή θέση χρήστη) */}
                        {minutesWalk !== null && (
                            <span className="text-gray-500 dark:text-gray-400">{minutesWalk} min drive</span>
                        )}
                    </div>
                </div>

                {/* Δεξί τμήμα: κουμπιά Reserve + Navigate */}
                <div className="flex flex-col gap-2 ml-3">
                    {/* Reserve - μόνο αν showReserve=true (logged in) */}
                    {showReserve && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Δημιουργούμε partial ParkingSpot για το handleReserve
                                handleReserve({ id, name, address, pricePerHour, latitude: 0, longitude: 0, location: name, status: status as any } as any);
                            }}
                            className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Reserve
                        </button>
                    )}
                    {/* Navigate - Google Maps πλοήγηση */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigate) onNavigate();
                        }}
                        className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                    >
                        Navigate
                    </button>
                </div>
            </div>
        </div>
    );
}

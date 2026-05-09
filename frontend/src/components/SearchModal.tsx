/**
 * =======================================================================
 * SearchModal.tsx - Modal Αναζήτησης Θέσης Parking
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει φόρμα αναζήτησης parking βάσει πόλης, περιοχής και τύπου.
 *   Όταν βρεθεί αποτέλεσμα, επιστρέφει συντεταγμένες για fly-to animation.
 *
 * ΡΟΗΛ:
 *   1. Χρήστης ανοίγει SearchModal (από Header)
 *   2. Φορτώνουμε διαθέσιμες πόλεις/περιοχές από /parking/locations
 *   3. Χρήστης επιλέγει πόλη → αυτόματο γέμισμα περιοχών
 *   4. Κλικ "Search" → API call /parking/search?city=...&area=...
 *   5. Backend επιστρέφει {id, latitude, longitude} πρώτης διαθέσιμης θέσης
 *   6. Χάρτης "πετάει" εκεί (fly-to)
 *
 * ΕΞΑΡΤΗΜΕΝΑ DROPDOWNS:
 *   - City dropdown: πάντα ενεργό
 *   - Area dropdown: ενεργοποιείται μόνο αφού επιλεγεί πόλη
 *   - Περιοχές φιλτράρονται βάσει επιλεγμένης πόλης (useMemo)
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   MainLayout.tsx (onSearch callback), MapView.tsx (fly-to), api.ts
 * =======================================================================
 */

import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";

/** SearchResult - Αποτέλεσμα αναζήτησης: συντεταγμένες θέσης */
export type SearchResult = {
    id: number;
    latitude: number;
    longitude: number;
    zoom?: number;  // Επίπεδο zoom για fly-to (προαιρετικό)
};

/** Locations - Πόλεις και περιοχές από το backend */
export type Locations = {
    cities: string[];
    areas: Record<string, string[]>;  // { "Athens": ["Kolonaki", "Exarchia", ...] }
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (result: SearchResult) => void;  // Callback με αποτέλεσμα
    isDark?: boolean;
    apiBase: string;
};

export default function SearchModal({ isOpen, onClose, onSearch, isDark }: Props) {
    // locations: πόλεις και αντίστοιχες περιοχές από API
    const [locations, setLocations] = useState<Locations>({ cities: [], areas: {} });

    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedArea, setSelectedArea] = useState<string>("");

    // isFree: null=όλα, true=μόνο δωρεάν, false=μόνο επί πληρωμή
    const [isFree, setIsFree] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Φόρτωση πόλεων/περιοχών μόλις ανοίξει το modal
    useEffect(() => {
        if (isOpen) {
            api.get<Locations>('/parking/locations')
                .then(setLocations)
                .catch(() => setError("Failed to load locations."));
        }
    }, [isOpen]);  // Τρέχει ξανά κάθε φορά που ανοίγει το modal

    /**
     * handleSearch - Εκτελεί αναζήτηση και επιστρέφει αποτέλεσμα.
     * Κτίζει query string με city + area (αν επιλέχθηκε) + is_free
     */
    const handleSearch = async () => {
        if (!selectedCity) {
            setError("Please select a city.");
            return;
        }
        setError(null);

        // URLSearchParams: ασφαλής κατασκευή query string
        const params = new URLSearchParams({ city: selectedCity });
        if (selectedArea) params.append("area", selectedArea);
        if (isFree !== null) params.append("is_free", String(isFree));

        try {
            const apiResult = await api.get<SearchResult>(`/parking/search?${params.toString()}`);

            // Zoom level: χαμηλότερο αν μόνο πόλη (πιο ευρύ), υψηλότερο αν περιοχή
            const result: SearchResult = {
                ...apiResult,
                zoom: selectedArea ? 16 : 13,
            };
            onSearch(result);  // Στέλνουμε στο MainLayout → MapView
            onClose();         // Κλείνουμε modal
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred.");
        }
    };

    // Περιοχές για επιλεγμένη πόλη - useMemo αποτρέπει επανα-υπολογισμό
    const availableAreas = useMemo(() => {
        if (!locations?.areas) return [];
        return locations.areas[selectedCity] || [];
    }, [selectedCity, locations]);

    // Reset area όταν αλλάζει η πόλη (παλιά περιοχή δεν ισχύει πλέον)
    useEffect(() => {
        setSelectedArea("");
    }, [selectedCity]);

    // Αν είναι κλειστό, δεν αποδίδουμε τίποτα
    if (!isOpen) return null;

    return (
        // Backdrop - σκούρο overlay πίσω από modal
        // onClick: κλείνει αν κλικάρει εκτός modal
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center transition-opacity duration-300"
            onClick={onClose}
        >
            {/* Modal κοντέινερ - stopPropagation: δεν κλείνει αν κλικάρει μέσα */}
            <div
                className={`rounded-xl shadow-2xl p-6 m-4 w-full max-w-md transform transition-all duration-300 ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-white'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Επικεφαλίδα + κουμπί κλεισίματος */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Find a Parking Spot</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Μήνυμα σφάλματος */}
                {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 rounded-lg text-sm p-3 mb-4">{error}</p>}

                <div className="grid grid-cols-1 gap-4">
                    {/* Dropdown πόλης */}
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">City</label>
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className={`w-full p-3 rounded-lg border transition ${isDark ? 'bg-gray-800 border-gray-600 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        >
                            <option value="">Select City</option>
                            {locations.cities.map((city) => (
                                <option key={city} value={city}>{city}</option>
                            ))}
                        </select>
                    </div>

                    {/* Dropdown περιοχής (disabled αν δεν έχει επιλεγεί πόλη) */}
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Area</label>
                        <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            disabled={!selectedCity}  // Ανενεργό χωρίς πόλη
                            className={`w-full p-3 rounded-lg border transition ${isDark ? 'bg-gray-800 border-gray-600 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} disabled:opacity-50`}
                        >
                            <option value="">Select Area</option>
                            {availableAreas.map((area) => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>

                    {/* Toggle: All / Free / Paid */}
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Parking Type</label>
                        <div className={`flex items-center justify-center p-1 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                            {/* Ενεργό κουμπί = μπλε, ανενεργό = διαφανές */}
                            <button onClick={() => setIsFree(null)} className={`w-full text-center px-4 py-2 rounded-md transition ${isFree === null ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}>All</button>
                            <button onClick={() => setIsFree(true)} className={`w-full text-center px-4 py-2 rounded-md transition ${isFree === true ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}>Free</button>
                            <button onClick={() => setIsFree(false)} className={`w-full text-center px-4 py-2 rounded-md transition ${isFree === false ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}>Paid</button>
                        </div>
                    </div>
                </div>

                {/* Κουμπί αναζήτησης */}
                <div className="mt-8">
                    <button
                        onClick={handleSearch}
                        className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition"
                    >
                        Search
                    </button>
                </div>
            </div>
        </div>
    );
}

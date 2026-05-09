/**
 * =======================================================================
 * Sidebar.tsx - Πλευρικό Πάνελ Λίστας Θέσεων
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Εμφανίζει τη λίστα διαθέσιμων θέσεων parking στα δεξιά του χάρτη.
 *   Περιέχει:
 *   - Στατιστικά (αριθμός διαθέσιμων, πλησιέστερη απόσταση)
 *   - Tabs για φιλτράρισμα (All / Free / Paid)
 *   - Λίστα θέσεων (SpotList)
 *
 * RESPONSIVE DESIGN:
 *   - Mobile: κρύβεται (slide-out από δεξιά), ανοίγει με κουμπί
 *   - Desktop (md+): πάντα ορατό στα δεξιά
 *   translate-x-full = κρυμμένο, translate-x-0 = ορατό
 *
 * ΦΙΛΤΡΑΡΙΣΜΑ:
 *   Το useMemo υπολογίζει τις φιλτραρισμένες θέσεις ΜΟΝΟ όταν
 *   αλλάζουν τα spots ή το selectedTab (όχι σε κάθε render).
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   MainLayout.tsx (κρατά state tab), SpotList.tsx, distance.ts
 * =======================================================================
 */

import type { ParkingSpot, Tab } from "../types/parking";
import { drivingMinutes, haversineMeters } from "../utils/distance";
import { isAvailable, isPaid, isFree } from "../types/parking";
import SpotList from "./spots/SpotList.tsx";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

type Props = {
    spots: ParkingSpot[];                          // Όλες οι θέσεις viewport
    userCoords?: { lat: number; lng: number };     // Θέση χρήστη (για απόσταση)
    isOpen?: boolean;                              // Αν είναι ανοιχτό (mobile)
    onClose?: () => void;                          // Κλείσιμο (mobile)
    selectedTab: Tab;                              // Ενεργό tab
    onChangeTab: (t: Tab) => void;                 // Αλλαγή tab
};

export default function Sidebar({
    spots,
    userCoords,
    isOpen = true,
    onClose,
    selectedTab,
    onChangeTab,
}: Props) {
    const { isAuthenticated } = useAuth();

    // useMemo: φιλτράρισμα θέσεων βάσει tab
    // Τρέχει ξανά ΜΟΝΟ όταν αλλάξουν spots ή selectedTab
    const filtered = useMemo(() => {
        // Πρώτα κρατάμε μόνο τις Available
        const avail = spots.filter(isAvailable);
        // Μετά φιλτράρουμε βάσει tab
        if (selectedTab === "free") return avail.filter(isFree);  // Μόνο δωρεάν
        if (selectedTab === "paid") return avail.filter(isPaid);  // Μόνο επί πληρωμή
        return avail;  // All = όλες οι available
    }, [spots, selectedTab]);

    // Αριθμός διαθέσιμων θέσεων στο τρέχον φίλτρο
    const availableCount = filtered.length;

    // Υπολογισμός πλησιέστερης θέσης (αν γνωρίζουμε τη θέση χρήστη)
    const nearestMeters =
        userCoords && filtered.length
            ? Math.min(
                // Υπολογίζουμε απόσταση για κάθε θέση και παίρνουμε το min
                ...filtered.map((s) =>
                    haversineMeters(userCoords, { lat: s.latitude, lng: s.longitude })
                )
            )
            : null;

    // Μετατροπή μέτρων σε "X.Xkm" ή "—" αν δεν γνωρίζουμε
    const nearestLabel =
        nearestMeters != null ? `${(nearestMeters / 1000).toFixed(1)}km` : "—";

    return (
        <aside
            className={`
                fixed md:relative top-0 right-0 h-full
                w-full md:w-[360px] md:max-w-none
                shrink-0 border-l border-gray-400 bg-gray-100
                flex flex-col transition-transform duration-300 ease-in-out
                dark:bg-gray-900 dark:border-gray-600 z-[2000]
                ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
            `}
        >
            {/* Mobile header με κουμπί κλεισίματος */}
            <div className="flex items-center justify-between p-4 border-b border-gray-400 bg-gray-200 dark:border-gray-600 dark:bg-gray-800 md:hidden">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Parking Spots
                </h2>
                {/* Κουμπί X για κλείσιμο (μόνο σε mobile) */}
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close sidebar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Κύριο περιεχόμενο - scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
                {/* Στατιστικά κάρτες */}
                <div className="mb-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Available Spots
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        {/* Κάρτα αριθμού διαθέσιμων */}
                        <div className="rounded-lg border border-gray-400 bg-white p-3 shadow-sm dark:border-gray-500 dark:bg-gray-800">
                            <div className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                {availableCount}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
                        </div>
                        {/* Κάρτα πλησιέστερης θέσης */}
                        <div className="rounded-lg border border-gray-400 bg-white p-3 shadow-sm dark:border-gray-500 dark:bg-gray-800">
                            <div className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                {nearestLabel}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Nearest</div>
                        </div>
                    </div>

                    {/* Tabs φιλτραρίσματος: All / Free / Paid */}
                    <div className="mt-4 flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
                        {/* Tab "All" */}
                        <button
                            onClick={() => onChangeTab("all")}
                            className={`
                                flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                                ${selectedTab === "all"
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                }
                            `}
                        >
                            All
                        </button>
                        {/* Tab "Free" - μόνο δωρεάν θέσεις */}
                        <button
                            onClick={() => onChangeTab("free")}
                            className={`
                                flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                                ${selectedTab === "free"
                                    ? "bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                }
                            `}
                        >
                            Free
                        </button>
                        {/* Tab "Paid" - μόνο επί πληρωμή */}
                        <button
                            onClick={() => onChangeTab("paid")}
                            className={`
                                flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
                                ${selectedTab === "paid"
                                    ? "bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm"
                                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                }
                            `}
                        >
                            Paid
                        </button>
                    </div>
                </div>

                {/* Λίστα θέσεων */}
                <div className="flex-1">
                    <SpotList
                        spots={filtered}
                        userCoords={userCoords}
                        showReserve={isAuthenticated}  // Κουμπί κράτησης μόνο αν logged in
                        computeWalkMins={(m) => drivingMinutes(m)}  // Υπολογισμός λεπτών
                    />
                </div>
            </div>
        </aside>
    );
}

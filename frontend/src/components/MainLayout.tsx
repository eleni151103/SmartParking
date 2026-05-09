/**
 * =======================================================================
 * MainLayout.tsx - Κύριο Layout της Εφαρμογής (Μετά Login)
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Το κεντρικό component που φαίνεται στον χρήστη μετά τη σύνδεση.
 *   Συντονίζει όλα τα κύρια τμήματα:
 *   - Header (επικεφαλίδα)
 *   - MapView (χάρτης Leaflet)
 *   - Sidebar (λίστα θέσεων)
 *   - Modals (αναζήτηση, αγαπημένα, κρατήσεις)
 *
 * ΣΥΓΧΩΝΕΥΣΗ ΔΕΔΟΜΕΝΩΝ (Merge Logic):
 *   Έχουμε δύο πηγές δεδομένων:
 *   1. viewportSpots: από REST API - πλήρη δεδομένα αλλά "ξεπερασμένα"
 *   2. liveSpots: από WebSocket - μόνο {id, status} αλλά real-time
 *
 *   Συγχωνεύουμε: παίρνουμε viewportSpots και "επικαλύπτουμε"
 *   τα statuses με τα liveSpots. Αποτέλεσμα: πλήρη + up-to-date δεδομένα.
 *
 * STATE MANAGEMENT:
 *   - tab: ενεργό φίλτρο (All/Free/Paid) - "lifted up" εδώ ώστε
 *     MapView και Sidebar να είναι συγχρονισμένα
 *   - bounds: τα όρια του χάρτη - ενημερώνονται κάθε φορά που ο χρήστης
 *     κουνά/ζουμάρει τον χάρτη
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   Όλα τα κύρια components + context providers
 * =======================================================================
 */

import { useMemo, useState } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MapView, { type Bounds } from "./MapView";
import { useTheme } from "../hooks/useTheme";
import { useGeolocation } from "../hooks/useGeolocation";
import { useLiveSpots } from "../hooks/useLiveSpots";
import { useViewportSpots } from "../hooks/useViewportSpots";
import type { ParkingSpot, Tab } from "../types/parking";
import { isAvailable } from "../types/parking";
import SearchModal, { type SearchResult } from "./SearchModal";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import FavoritesModal from "./FavoritesModal";
import ReservationsModal from "./ReservationsModal";

export default function MainLayout() {
    // URL βάσης API - από .env ή default localhost
    const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

    // --- MODAL STATES ---
    // Κάθε modal έχει δική του boolean κατάσταση (ανοιχτό/κλειστό)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);          // Mobile sidebar
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);   // Αναζήτηση πόλης
    const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false); // Αγαπημένα
    const [isReservationsModalOpen, setIsReservationsModalOpen] = useState(false); // Κρατήσεις

    // searchResult: συντεταγμένες αποτελέσματος αναζήτησης
    // Όταν ο χρήστης αναζητά "Αθήνα/Κολωνάκι", ο χάρτης "πετάει" εκεί
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

    // tab: φίλτρο λίστας (All/Free/Paid) - κοινό για Sidebar και MapView
    const [tab, setTab] = useState<Tab>("all");

    // --- HOOKS ---
    const { isDark, toggleTheme } = useTheme();     // Dark/light mode
    const { coords } = useGeolocation();             // Θέση χρήστη (GPS)

    // bounds: τρέχοντα όρια ορατού χάρτη
    // Αρχικά: περιοχή Αθήνας (πριν ξέρουμε πού βρίσκεται ο χρήστης)
    const [bounds, setBounds] = useState<Bounds>({
        swLat: 37.9,  // Νότιο γεωγραφικό πλάτος
        swLng: 23.6,  // Δυτικό γεωγραφικό μήκος
        neLat: 38.1,  // Βόρειο γεωγραφικό πλάτος
        neLng: 23.9,  // Ανατολικό γεωγραφικό μήκος
    });

    // Ανάκτηση θέσεων από REST API βάσει viewport
    // undefined status = παίρνουμε ΟΛΑ τα statuses (όχι μόνο Available)
    const viewportSpots = useViewportSpots(API_BASE, bounds, undefined);

    // Real-time updates από WebSocket
    const { spots: liveSpots } = useLiveSpots();

    // --- MERGE LOGIC ---
    // Συγχώνευση: viewport (πλήρη δεδομένα) + live (νέα statuses)
    const merged: ParkingSpot[] = useMemo(() => {
        // Αν δεν υπάρχουν live updates, επιστρέφουμε απευθείας τα viewport spots
        if (!liveSpots.length) return viewportSpots;

        // Δημιουργούμε Map<id, status> για γρήγορη αναζήτηση: O(1) αντί O(n)
        const statusMap = new Map(liveSpots.map((s) => [s.id, s.status]));

        // Ενημερώνουμε κάθε spot με το πιο πρόσφατο status αν υπάρχει
        const updatedSpots = viewportSpots.map((s) =>
            statusMap.has(s.id)
                ? { ...s, status: statusMap.get(s.id)! }  // Νέο status από WebSocket
                : s                                         // Αμετάβλητο
        );

        return updatedSpots;
    }, [viewportSpots, liveSpots]);

    // Φιλτράρισμα: μόνο διαθέσιμες θέσεις για το Sidebar
    // useMemo: δεν ξαναυπολογίζεται αν δεν αλλάξει το merged
    const availableSpots = useMemo(() => {
        return merged.filter(isAvailable);
    }, [merged]);

    /** handleSearch - Λαμβάνει αποτέλεσμα αναζήτησης (συντεταγμένες) */
    const handleSearch = (result: SearchResult) => {
        setSearchResult(result);  // Στέλνεται στο MapView για fly-to animation
    };

    return (
        // FavoritesProvider: περιτυλίγει ολόκληρο το layout ώστε
        // τα αγαπημένα να είναι διαθέσιμα παντού (Sidebar, MapView, κτλ.)
        <FavoritesProvider>
            {/* Full-screen layout: header + main area */}
            <div className="h-screen w-screen flex flex-col">
                {/* Επικεφαλίδα - callbacks για άνοιγμα modals */}
                <Header
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    onSearchClick={() => setIsSearchModalOpen(true)}
                    onFavoritesClick={() => setIsFavoritesModalOpen(true)}
                    onReservationsClick={() => setIsReservationsModalOpen(true)}
                />

                {/* Κύριο περιεχόμενο: χάρτης + sidebar */}
                <div className="flex flex-1 overflow-hidden relative">
                    <div className="flex-1 relative">
                        {/* Κουμπί toggle sidebar - ΜΟΝΟ σε mobile */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="absolute top-2 right-2 z-[1000] md:hidden bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center border border-blue-500"
                            aria-label="Open parking spots"
                        >
                            {/* Hamburger menu icon */}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {/* Χάρτης Leaflet */}
                        <MapView
                            userCoords={coords || { lat: 37.9838, lng: 23.7275 }}  // Default: Αθήνα
                            spots={merged}
                            onBounds={setBounds}          // Ενημέρωση bounds κάθε φορά που κουνιέται
                            isDark={isDark}
                            selectedTab={tab}
                            searchResult={searchResult}
                            onSearchResultHandled={() => setSearchResult(null)}  // Cleanup μετά fly-to
                        />
                    </div>

                    {/* Sidebar - λίστα θέσεων */}
                    <Sidebar
                        spots={availableSpots}
                        userCoords={coords || undefined}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        selectedTab={tab}             // Κοινό tab με MapView
                        onChangeTab={setTab}          // Αλλαγή tab από Sidebar
                    />

                    {/* Mobile backdrop - σκούρο overlay πίσω από το sidebar */}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-[1500] md:hidden"
                            onClick={() => setIsSidebarOpen(false)}  // Κλικ για κλείσιμο
                        />
                    )}

                    {/* Modals */}
                    <SearchModal
                        isOpen={isSearchModalOpen}
                        onClose={() => setIsSearchModalOpen(false)}
                        onSearch={handleSearch}
                        isDark={isDark}
                        apiBase={API_BASE}
                    />

                    <FavoritesModal
                        isOpen={isFavoritesModalOpen}
                        onClose={() => setIsFavoritesModalOpen(false)}
                        spots={merged}
                        userCoords={coords || undefined}
                    />

                    <ReservationsModal
                        isOpen={isReservationsModalOpen}
                        onClose={() => setIsReservationsModalOpen(false)}
                        apiBase={API_BASE}
                    />
                </div>
            </div>
        </FavoritesProvider>
    );
}

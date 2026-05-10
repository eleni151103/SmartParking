

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

    const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";


    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
    const [isReservationsModalOpen, setIsReservationsModalOpen] = useState(false);


    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);


    const [tab, setTab] = useState<Tab>("all");


    const { isDark, toggleTheme } = useTheme();
    const { coords } = useGeolocation();


    const [bounds, setBounds] = useState<Bounds>({
        swLat: 37.9,
        swLng: 23.6,
        neLat: 38.1,
        neLng: 23.9,
    });


    const viewportSpots = useViewportSpots(API_BASE, bounds, undefined);


    const { spots: liveSpots } = useLiveSpots();


    const merged: ParkingSpot[] = useMemo(() => {

        if (!liveSpots.length) return viewportSpots;


        const statusMap = new Map(liveSpots.map((s) => [s.id, s.status]));


        const updatedSpots = viewportSpots.map((s) =>
            statusMap.has(s.id)
                ? { ...s, status: statusMap.get(s.id)! }
                : s
        );

        return updatedSpots;
    }, [viewportSpots, liveSpots]);


    const availableSpots = useMemo(() => {
        return merged.filter(isAvailable);
    }, [merged]);


    const handleSearch = (result: SearchResult) => {
        setSearchResult(result);
    };

    return (


        <FavoritesProvider>
            {}
            <div className="h-screen w-screen flex flex-col">
                {}
                <Header
                    isDark={isDark}
                    toggleTheme={toggleTheme}
                    onSearchClick={() => setIsSearchModalOpen(true)}
                    onFavoritesClick={() => setIsFavoritesModalOpen(true)}
                    onReservationsClick={() => setIsReservationsModalOpen(true)}
                />

                {}
                <div className="flex flex-1 overflow-hidden relative">
                    <div className="flex-1 relative">
                        {}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="absolute top-2 right-2 z-[1000] md:hidden bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center border border-blue-500"
                            aria-label="Open parking spots"
                        >
                            {}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {}
                        <MapView
                            userCoords={coords || { lat: 37.9838, lng: 23.7275 }}
                            spots={merged}
                            onBounds={setBounds}
                            isDark={isDark}
                            selectedTab={tab}
                            searchResult={searchResult}
                            onSearchResultHandled={() => setSearchResult(null)}
                        />
                    </div>

                    {}
                    <Sidebar
                        spots={availableSpots}
                        userCoords={coords || undefined}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        selectedTab={tab}
                        onChangeTab={setTab}
                    />

                    {}
                    {isSidebarOpen && (
                        <div
                            className="fixed inset-0 bg-black/50 z-[1500] md:hidden"
                            onClick={() => setIsSidebarOpen(false)}
                        />
                    )}

                    {}
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

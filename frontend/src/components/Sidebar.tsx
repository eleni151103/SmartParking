

import type { ParkingSpot, Tab } from "../types/parking";
import { drivingMinutes, haversineMeters } from "../utils/distance";
import { isAvailable, isPaid, isFree } from "../types/parking";
import SpotList from "./spots/SpotList.tsx";
import { useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";

type Props = {
    spots: ParkingSpot[];
    userCoords?: { lat: number; lng: number };
    isOpen?: boolean;
    onClose?: () => void;
    selectedTab: Tab;
    onChangeTab: (t: Tab) => void;
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


    const filtered = useMemo(() => {

        const avail = spots.filter(isAvailable);

        if (selectedTab === "free") return avail.filter(isFree);
        if (selectedTab === "paid") return avail.filter(isPaid);
        return avail;
    }, [spots, selectedTab]);


    const availableCount = filtered.length;


    const nearestMeters =
        userCoords && filtered.length
            ? Math.min(

                ...filtered.map((s) =>
                    haversineMeters(userCoords, { lat: s.latitude, lng: s.longitude })
                )
            )
            : null;


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
            {}
            <div className="flex items-center justify-between p-4 border-b border-gray-400 bg-gray-200 dark:border-gray-600 dark:bg-gray-800 md:hidden">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Parking Spots
                </h2>
                {}
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

            {}
            <div className="flex-1 overflow-y-auto p-4">
                {}
                <div className="mb-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                        Available Spots
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        {}
                        <div className="rounded-lg border border-gray-400 bg-white p-3 shadow-sm dark:border-gray-500 dark:bg-gray-800">
                            <div className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                {availableCount}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Available</div>
                        </div>
                        {}
                        <div className="rounded-lg border border-gray-400 bg-white p-3 shadow-sm dark:border-gray-500 dark:bg-gray-800">
                            <div className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                {nearestLabel}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Nearest</div>
                        </div>
                    </div>

                    {}
                    <div className="mt-4 flex gap-1 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
                        {}
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
                        {}
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
                        {}
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

                {}
                <div className="flex-1">
                    <SpotList
                        spots={filtered}
                        userCoords={userCoords}
                        showReserve={isAuthenticated}
                        computeWalkMins={(m) => drivingMinutes(m)}
                    />
                </div>
            </div>
        </aside>
    );
}

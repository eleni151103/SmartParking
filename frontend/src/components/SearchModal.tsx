

import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";


export type SearchResult = {
    id: number;
    latitude: number;
    longitude: number;
    zoom?: number;
};


export type Locations = {
    cities: string[];
    areas: Record<string, string[]>;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (result: SearchResult) => void;
    isDark?: boolean;
    apiBase: string;
};

export default function SearchModal({ isOpen, onClose, onSearch, isDark }: Props) {

    const [locations, setLocations] = useState<Locations>({ cities: [], areas: {} });

    const [selectedCity, setSelectedCity] = useState<string>("");
    const [selectedArea, setSelectedArea] = useState<string>("");


    const [isFree, setIsFree] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (isOpen) {
            api.get<Locations>('/parking/locations')
                .then(setLocations)
                .catch(() => setError("Failed to load locations."));
        }
    }, [isOpen]);


    const handleSearch = async () => {
        if (!selectedCity) {
            setError("Please select a city.");
            return;
        }
        setError(null);


        const params = new URLSearchParams({ city: selectedCity });
        if (selectedArea) params.append("area", selectedArea);
        if (isFree !== null) params.append("is_free", String(isFree));

        try {
            const apiResult = await api.get<SearchResult>(`/parking/search?${params.toString()}`);


            const result: SearchResult = {
                ...apiResult,
                zoom: selectedArea ? 16 : 13,
            };
            onSearch(result);
            onClose();
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred.");
        }
    };


    const availableAreas = useMemo(() => {
        if (!locations?.areas) return [];
        return locations.areas[selectedCity] || [];
    }, [selectedCity, locations]);


    useEffect(() => {
        setSelectedArea("");
    }, [selectedCity]);


    if (!isOpen) return null;

    return (


        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[2000] flex items-center justify-center transition-opacity duration-300"
            onClick={onClose}
        >
            {}
            <div
                className={`rounded-xl shadow-2xl p-6 m-4 w-full max-w-md transform transition-all duration-300 ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-white'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Find a Parking Spot</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {}
                {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 border border-red-400 dark:border-red-600 rounded-lg text-sm p-3 mb-4">{error}</p>}

                <div className="grid grid-cols-1 gap-4">
                    {}
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

                    {}
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 block">Area</label>
                        <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            disabled={!selectedCity}
                            className={`w-full p-3 rounded-lg border transition ${isDark ? 'bg-gray-800 border-gray-600 focus:ring-blue-500 focus:border-blue-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'} disabled:opacity-50`}
                        >
                            <option value="">Select Area</option>
                            {availableAreas.map((area) => (
                                <option key={area} value={area}>{area}</option>
                            ))}
                        </select>
                    </div>

                    {}
                    <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 block">Parking Type</label>
                        <div className={`flex items-center justify-center p-1 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
                            {}
                            <button onClick={() => setIsFree(null)} className={`w-full text-center px-4 py-2 rounded-md transition ${isFree === null ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}>All</button>
                            <button onClick={() => setIsFree(true)} className={`w-full text-center px-4 py-2 rounded-md transition ${isFree === true ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}>Free</button>
                            <button onClick={() => setIsFree(false)} className={`w-full text-center px-4 py-2 rounded-md transition ${isFree === false ? 'bg-blue-600 text-white shadow' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}>Paid</button>
                        </div>
                    </div>
                </div>

                {}
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

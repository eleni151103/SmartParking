

import { useFavorites } from '../contexts/FavoritesContext';
import type { ParkingSpot } from '../types/parking';
import SpotList from './spots/SpotList';
import { drivingMinutes } from '../utils/distance';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    spots: ParkingSpot[];
    userCoords?: { lat: number; lng: number };
}

export default function FavoritesModal({ isOpen, onClose, spots, userCoords }: Props) {

    const { favorites } = useFavorites();


    if (!isOpen) return null;


    const favoriteSpots = spots.filter(s => favorites.includes(s.id));

    return (

        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
                {}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        My Favorites
                    </h2>
                    {}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-4">
                    {favoriteSpots.length === 0 ? (

                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No favorites yet.</p>
                            <p className="text-sm mt-2">Mark spots as favorite to see them here.</p>
                        </div>
                    ) : (

                        <SpotList
                            spots={favoriteSpots}
                            userCoords={userCoords}
                            showReserve={true}
                            computeWalkMins={(m) => drivingMinutes(m)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

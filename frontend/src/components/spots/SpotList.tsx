

import type { ParkingSpot } from '../../types/parking';
import { haversineMeters } from '../../utils/distance';
import { toLatLng } from '../../types/parking';
import SpotListItem from './SpotListItem';
import { useMemo } from 'react';

type Props = {
    spots: ParkingSpot[];
    userCoords?: { lat: number; lng: number };
    showReserve: boolean;
    computeWalkMins: (meters: number) => number;
};

export default function SpotList({ spots, userCoords, showReserve, computeWalkMins }: Props) {

    const sortedSpots = useMemo(() => {
        if (!userCoords) return spots;


        return [...spots].sort((a, b) => {
            const distanceA = haversineMeters(userCoords, toLatLng(a));
            const distanceB = haversineMeters(userCoords, toLatLng(b));
            return distanceA - distanceB;
        });
    }, [spots, userCoords]);


    const handleNavigate = (spot: ParkingSpot) => {
        const destination = `${spot.latitude},${spot.longitude}`;

        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-2 md:space-y-3">
            {}
            {sortedSpots.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">🚗</div>
                    <div className="text-sm">No parking spots available</div>
                </div>
            ) : (
                <>
                    {}
                    {userCoords && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                            Sorted by distance from your location
                        </div>
                    )}

                    {}
                    {sortedSpots.map((s) => {

                        const meters = userCoords ? haversineMeters(userCoords, toLatLng(s)) : null;

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

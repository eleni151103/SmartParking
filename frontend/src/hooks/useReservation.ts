

import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import type { ParkingSpot } from '../types/parking';


export function useReservation() {

    const { user } = useAuth();


    const handleReserve = useCallback(async (spot: ParkingSpot) => {
        console.log("handleReserve called", { user, spotId: spot.id });


        if (!user) {
            alert("Please login to reserve a spot.");
            return;
        }

        try {

            await api.post('/reservations', {
                user_id: user.id,
                spot_id: spot.id
            });

            alert("Reservation successful! Spot reserved for 30 seconds.");
        } catch (error) {
            console.error("Reservation failed", error);

            alert("Failed to reserve spot. It might be taken.");
        }
    }, [user]);

    return { handleReserve };
}



import type { ParkingSpot } from "./parking";


export interface Reservation {
    id: number;
    user_id: number;
    spot_id: number;
    start_time: string;
    end_time: string | null;
    spot: ParkingSpot;
}


export type ReservationResponse = Reservation;



export const SpotStatus = {
    Available: "Available",
    Occupied: "Occupied",
    Reserved: "Reserved",
    OutOfService: "OutOfService",
} as const;


export type SpotStatus = typeof SpotStatus[keyof typeof SpotStatus];


export type ParkingStatus = "Available" | "Occupied" | "Reserved" | string;


export type ParkingSpot = {
    id: number;
    latitude: number;
    longitude: number;
    location: string;
    city?: string;
    area?: string;
    status: ParkingStatus;
    last_updated?: string;
    price_per_hour?: number | null;
    pricePerHour?: number | null;
};


export type SpotStatusLog = {
    id: number;
    spot_id: number;
    status: SpotStatus;
    timestamp: string;
};


export type User = {
    id: number;
    email: string;
    password_hash: string;
    full_name?: string | null;
    created_at: string;
};


export type UserFavorites = {
    user_id: number;
    spot_id: number;
};


export type Reservation = {
    id: number;
    user_id: number;
    spot_id: number;
    start_time: string;
    end_time?: string | null;
};


export type LatLng = { lat: number; lng: number };


export function toLatLng(spot: ParkingSpot): LatLng {
    return { lat: spot.latitude, lng: spot.longitude };
}


export function isAvailable(spot: ParkingSpot): boolean {
    return spot.status === SpotStatus.Available;
}


export const isPaid = (s: ParkingSpot) => {
    const price = s.pricePerHour ?? s.price_per_hour ?? null;
    return price !== null && price !== undefined;
};


export const isFree = (s: ParkingSpot) => !isPaid(s);

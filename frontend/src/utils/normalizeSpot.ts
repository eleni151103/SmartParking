

import type { ParkingSpot } from "../types/parking";


export function normalizeSpot(raw: any): ParkingSpot {

    const price =
        raw.pricePerHour ?? raw.price_per_hour ?? null;

    return {
        id: Number(raw.id),
        latitude: Number(raw.latitude),
        longitude: Number(raw.longitude),
        location: String(raw.location ?? ""),
        status: String(raw.status ?? "Available"),
        last_updated: raw.last_updated ?? raw.lastUpdated ?? null,
        pricePerHour: price !== null && price !== undefined ? Number(price) : null,
    };
}

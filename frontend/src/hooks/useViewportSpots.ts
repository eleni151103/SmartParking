

import { useEffect, useMemo, useState } from "react";
import type { ParkingSpot } from "../types/parking";
import { normalizeSpot } from "../utils/normalizeSpot.ts";
import { authService } from "../services/authService";


type Bounds = { swLat: number; swLng: number; neLat: number; neLng: number };


export function useViewportSpots(
    apiBase = "http://localhost:8000/api",
    bounds: Bounds,
    status: "Available" | "Occupied" | "Reserved" | "Maintenance" | undefined = undefined,
    limit = 200
) {

    const [spots, setSpots] = useState<ParkingSpot[]>([]);


    const qs = useMemo(() => {
        const p = new URLSearchParams({
            swLat: String(bounds.swLat),
            swLng: String(bounds.swLng),
            neLat: String(bounds.neLat),
            neLng: String(bounds.neLng),
            limit: String(limit),
        });

        if (status) p.set("status", status);
        return p.toString();
    }, [bounds, status, limit]);


    useEffect(() => {


        let cancelled = false;

        (async () => {

            const headers: Record<string, string> = {};
            if (authService.isAuthenticated()) {
                Object.assign(headers, authService.getAuthHeaders());
            }


            const res = await fetch(`${apiBase}/parking/spots/in_viewport?${qs}`, {
                headers
            });
            if (!res.ok) return;


            const data: { spots: ParkingSpot[]; total: number } = await res.json();

            if (!cancelled) {

                setSpots(data.spots.map(normalizeSpot));
            }
        })();


        return () => { cancelled = true; };
    }, [apiBase, qs]);

    return spots;
}



import { useEffect, useState } from 'react';


type Coords = { lat: number; lng: number };


export function useGeolocation() {

    const [coords, setCoords] = useState<Coords | null>(null);

    useEffect(() => {

        if (!('geolocation' in navigator)) {
            return;
        }


        const watchId = navigator.geolocation.watchPosition(

            (pos) => {
                setCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },

            (err) => {
                console.error("Geolocation error:", err);
            },

            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0
            }
        );


        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    return { coords };
}

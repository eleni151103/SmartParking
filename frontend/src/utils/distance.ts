

type LatLng = { lat: number; lng: number };


const R = 6371e3;


function toRad(v: number) { return (v * Math.PI) / 180; }


export function haversineMeters(pointA: LatLng, pointB: LatLng): number {
    const lat1Rad = toRad(pointA.lat), lat2Rad = toRad(pointB.lat);
    const deltaLatRad = toRad(pointB.lat - pointA.lat);
    const deltaLngRad = toRad(pointB.lng - pointA.lng);


    const squareHalfChord =
        Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) *
        Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);


    const angularDistance = 2 * Math.atan2(Math.sqrt(squareHalfChord), Math.sqrt(1 - squareHalfChord));
    return R * angularDistance;
}


export function getNearestDistanceMeters(origin: LatLng, targets: LatLng[]): number | null {
    if (!targets.length) return null;

    let minDistance = Infinity;
    for (const target of targets) {
        const distance = haversineMeters(origin, target);
        if (distance < minDistance) minDistance = distance;
    }
    return minDistance === Infinity ? null : minDistance;
}


export function drivingMinutes(meters: number): number {


    return Math.max(1, Math.round(meters / 500));
}


export function walkingMinutes(meters: number): number {
    return drivingMinutes(meters);
}

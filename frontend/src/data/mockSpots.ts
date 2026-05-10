

import { type ParkingSpot, SpotStatus, toLatLng, isAvailable } from "../types/parking";


export const spots: ParkingSpot[] = [
    {
        id: 1,
        latitude: 37.9795,
        longitude: 23.7337,
        location: "Vas. Sofias Ave (Near Syntagma)",
        status: SpotStatus.Available,
        last_updated: new Date().toISOString(),
    },
    {
        id: 2,
        latitude: 37.9780,
        longitude: 23.7260,
        location: "Ermou Street (Shopping District)",
        status: SpotStatus.Available,
        last_updated: new Date().toISOString(),
    },
    {
        id: 3,
        latitude: 37.9810,
        longitude: 23.7320,
        location: "Akadimias Street (University Area)",
        status: SpotStatus.Available,
        last_updated: new Date().toISOString(),
    },
    {
        id: 4,
        latitude: 37.9818,
        longitude: 23.7285,
        location: "Panepistimiou Ave (Central Athens)",
        status: SpotStatus.Available,
        last_updated: new Date().toISOString(),
    },
    {
        id: 5,
        latitude: 37.9830,
        longitude: 23.7270,
        location: "Omonia Square",
        status: SpotStatus.Occupied,
        last_updated: new Date().toISOString(),
    },
    {
        id: 6,
        latitude: 37.9716,
        longitude: 23.7267,
        location: "Fix Metro Area",
        status: SpotStatus.Reserved,
        last_updated: new Date().toISOString(),
    },
    {
        id: 7,
        latitude: 37.9752,
        longitude: 23.7340,
        location: "National Garden NW",
        status: SpotStatus.OutOfService,
        last_updated: new Date().toISOString(),
    },
];


export const availableSpots = spots.filter(isAvailable);


export const spotLatLngs = spots.map(toLatLng);

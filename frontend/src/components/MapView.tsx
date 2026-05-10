

import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression } from "leaflet";
import type { ParkingSpot, Tab } from "../types/parking";
import { isAvailable } from "../types/parking";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { type SearchResult } from "./SearchModal";
import { useFavorites } from "../contexts/FavoritesContext";
import { useReservation } from "../hooks/useReservation";


const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;


const FreeIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});


const UserIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});


const FavoriteIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});


function FlyTo({ center, zoom, onFlyEnd }: { center: LatLngExpression; zoom: number; onFlyEnd: () => void }) {
    const map = useMap();

    const hasFlownRef = useRef(false);

    useEffect(() => {
        if (!hasFlownRef.current) {
            hasFlownRef.current = true;


            const handleMoveEnd = () => {
                onFlyEnd();
                map.off('moveend', handleMoveEnd);
            };

            map.on('moveend', handleMoveEnd);
            map.flyTo(center, zoom, {
                animate: true,
                duration: 1.5,
            });


            return () => {
                map.off('moveend', handleMoveEnd);
            };
        }
    }, [center, zoom, map, onFlyEnd]);

    return null;
}


const LIGHT_TILES = {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
};


const DARK_TILES = {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attribution">CARTO</a>',
    subdomains: ["a", "b", "c", "d"] as const,
};


export type Bounds = {
    swLat: number;
    swLng: number;
    neLat: number;
    neLng: number;
};


function UseBounds({ onBounds }: { onBounds: (b: Bounds) => void }) {
    const map = useMapEvents({

        moveend() {
            const b = map.getBounds();
            onBounds({
                swLat: b.getSouthWest().lat,
                swLng: b.getSouthWest().lng,
                neLat: b.getNorthEast().lat,
                neLng: b.getNorthEast().lng,
            });
        },
    });


    useEffect(() => {
        map.whenReady(() => {
            const b = map.getBounds();
            onBounds({
                swLat: b.getSouthWest().lat,
                swLng: b.getSouthWest().lng,
                neLat: b.getNorthEast().lat,
                neLng: b.getNorthEast().lng,
            });
        });
    }, [map, onBounds]);

    return null;
}


function MapControls() {
    const map = useMap();

    return (
        <div className="absolute right-4 bottom-4 z-[1000] flex flex-col gap-2">
            {}
            <button className="bg-white rounded shadow p-2" onClick={() => map.zoomIn()} aria-label="Zoom in">+</button>
            {}
            <button className="bg-white rounded shadow p-2" onClick={() => map.zoomOut()} aria-label="Zoom out">−</button>
            {}
            <button className="bg-white rounded shadow p-2" onClick={() => map.locate({ setView: true, maxZoom: 16 })} aria-label="Locate">📍</button>
        </div>
    );
}

type Props = {
    userCoords?: { lat: number; lng: number };
    spots: ParkingSpot[];
    onBounds: (b: Bounds) => void;
    isDark?: boolean;
    selectedTab: Tab;
    isAuthenticated?: boolean;
    searchResult?: SearchResult | null;
    onSearchResultHandled: () => void;
};

export default function MapView({
    userCoords,
    spots,
    onBounds,
    isDark = false,
    selectedTab,
    isAuthenticated = false,
    searchResult,
    onSearchResultHandled,
}: Props) {

    const center: LatLngExpression = userCoords ? [userCoords.lat, userCoords.lng] : [37.9838, 23.7275];


    const tiles = isDark ? DARK_TILES : LIGHT_TILES;

    const { isFavorite, addFavorite, removeFavorite } = useFavorites();


    const markers = useMemo(() => {
        const avail = spots.filter(isAvailable);
        if (selectedTab === "free") return avail.filter((s) => s.pricePerHour == null);
        if (selectedTab === "paid") return avail.filter((s) => s.pricePerHour != null);
        return avail;
    }, [spots, selectedTab]);

    const { handleReserve } = useReservation();


    const toggleFavorite = useCallback(async (spot: ParkingSpot) => {
        if (isFavorite(spot.id)) {
            await removeFavorite(spot.id);
        } else {
            await addFavorite(spot.id);
        }
    }, [isFavorite, addFavorite, removeFavorite]);

    return (
        <div className="h-full w-full relative">
            {}
            <MapContainer
                center={center}
                zoom={13}
                scrollWheelZoom={true}
                className="h-full w-full"
                zoomControl={false}
            >
                {}
                {searchResult && (
                    <FlyTo
                        key={`${searchResult.latitude}-${searchResult.longitude}`}
                        center={[searchResult.latitude, searchResult.longitude]}
                        zoom={searchResult.zoom ?? 16}
                        onFlyEnd={onSearchResultHandled}
                    />
                )}

                {}
                <TileLayer {...tiles} />

                {}
                <UseBounds onBounds={onBounds} />

                {}
                <MapControls />

                {}
                {userCoords && (
                    <Marker position={[userCoords.lat, userCoords.lng]} icon={UserIcon}>
                        <Popup offset={[0, -16]}>Your location</Popup>
                    </Marker>
                )}

                {}
                {markers.map((s) => {
                    const isPaid = s.pricePerHour != null;
                    const isFav = isFavorite(s.id);

                    const icon = isFav ? FavoriteIcon : (isPaid ? DefaultIcon : FreeIcon);

                    return (
                        <Marker key={s.id} position={[s.latitude, s.longitude]} icon={icon}>
                            <Popup offset={[0, -18]}>
                                <div className="text-sm">
                                    {}
                                    <div className="flex justify-between items-start">
                                        <div className="font-medium">{s.location}</div>
                                        {isAuthenticated && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(s);
                                                }}
                                                className="text-yellow-500 hover:text-yellow-600 focus:outline-none ml-2 flex-shrink-0 p-1 relative z-[9999]"
                                                title={isFav ? "Remove from favorites" : "Add to favorites"}
                                            >
                                                {}
                                                {isFav ? (
                                                    <svg className="w-6 h-6 fill-current drop-shadow-sm" viewBox="0 0 24 24">
                                                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6 stroke-current fill-none drop-shadow-sm" viewBox="0 0 24 24" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>

                                    {}
                                    <div className="mt-2">
                                        Status: <span className="font-semibold text-green-600">{s.status}</span>
                                    </div>

                                    {}
                                    {isPaid ? (
                                        <div className="mt-1">
                                            Price: <span className="font-semibold">€{s.pricePerHour!.toFixed(2)}/hr</span>
                                        </div>
                                    ) : (
                                        <div className="mt-1">
                                            <span className="font-semibold text-green-700">Free parking</span>
                                        </div>
                                    )}

                                    {}
                                    {isAuthenticated && (
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleReserve(s); }}
                                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                                            >
                                                Reserve
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();

                                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}&travelmode=driving`, '_blank');
                                                }}
                                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                                            >
                                                Navigate
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}

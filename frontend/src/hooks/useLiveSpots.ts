

import { useEffect, useRef, useState } from "react";


export type LiveSpot = { id: number; status: string };


const WS_ENDPOINT =
    (import.meta as any)?.env?.VITE_WS_URL ?? "ws://localhost:8000/ws";


function coerceToLiveSpot(obj: any): LiveSpot | null {
    if (!obj || typeof obj !== "object") {
        return null;
    }


    if (("id" in obj || "spot_id" in obj) && "status" in obj) {
        const id = Number("id" in obj ? obj.id : obj.spot_id);
        const status = String(obj.status);
        const result = Number.isFinite(id) ? { id, status } : null;
        return result;
    }


    if ("topic" in obj && "payload" in obj && typeof obj.topic === "string") {

        const parts = String(obj.topic).split("/");
        const maybeId = Number(parts?.[2]);
        if (Number.isFinite(maybeId)) {
            const result = { id: maybeId, status: String(obj.payload) };
            return result;
        }
    }


    if (Array.isArray(obj) && obj.length > 0) {
        return coerceToLiveSpot(obj[0]);
    }

    return null;
}


function parseMessage(data: any): LiveSpot | null {
    if (typeof data === "string") {
        try {

            const parsed = JSON.parse(data);
            return coerceToLiveSpot(parsed);
        } catch (e) {
            console.warn('Failed to parse JSON from string:', data, e);
            return null;
        }
    }
    if (typeof data === "object" && data !== null) {
        console.log('Processing object data:', data);
        return coerceToLiveSpot(data);
    }
    console.warn('Unhandled message type:', typeof data, data);
    return null;
}


export function useLiveSpots() {

    const [spots, setSpots] = useState<LiveSpot[]>([]);


    const [connected, setConnected] = useState(false);


    const byIdRef = useRef<Map<number, LiveSpot>>(new Map());


    const wsRef = useRef<WebSocket | null>(null);


    const reconnectTimerRef = useRef<number | null>(null);


    const backoffRef = useRef(500);


    const isMountedRef = useRef(true);


    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;

            if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
            try { wsRef.current?.close(); } catch { }
        };
    }, []);

    useEffect(() => {

        const connect = () => {
            if (!isMountedRef.current) return;


            try { wsRef.current?.close(); } catch { }


            const ws = new WebSocket(WS_ENDPOINT);
            wsRef.current = ws;


            ws.onopen = () => {
                if (!isMountedRef.current) return;
                setConnected(true);
                backoffRef.current = 500;
            };


            ws.onmessage = (evt) => {
                if (!isMountedRef.current) return;


                const parsed = parseMessage(evt.data);
                if (!parsed) {
                    console.warn('Failed to parse WebSocket message:', evt.data);
                    return;
                }


                const next = new Map(byIdRef.current);
                next.set(parsed.id, parsed);
                byIdRef.current = next;


                setSpots(Array.from(next.values()));
            };


            const scheduleReconnect = () => {
                if (!isMountedRef.current) return;
                setConnected(false);


                const delay = Math.min(backoffRef.current, 10_000);

                backoffRef.current = Math.min(backoffRef.current * 2, 10_000);


                if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);


                reconnectTimerRef.current = window.setTimeout(connect, delay);
            };


            ws.onerror = () => {
                scheduleReconnect();
            };


            ws.onclose = () => {
                scheduleReconnect();
            };
        };


        connect();


        return () => {
            if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
            try { wsRef.current?.close(); } catch { }
            wsRef.current = null;
            setConnected(false);
        };
    }, []);

    return { spots, connected, wsUrl: WS_ENDPOINT };
}

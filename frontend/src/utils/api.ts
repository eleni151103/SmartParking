

import { authService } from '../services/authService';


const API_BASE_URL = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000/api';


async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {

    const url = `${API_BASE_URL}${endpoint}`;


    const authHeaders = authService.getAuthHeaders();


    const headers = {
        ...authHeaders,
        ...options?.headers as Record<string, string>,
    };


    const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store',
    });


    if (!response.ok) {

        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'API request failed');
    }


    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return null as T;
    }
    return response.json();
}


export const api = {

    get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),


    post: <T>(endpoint: string, body?: any) => request<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
    }),


    put: <T>(endpoint: string, body?: any) => request<T>(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' }
    }),


    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

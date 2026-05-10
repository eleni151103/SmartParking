

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';


interface FavoritesContextType {
    favorites: number[];
    addFavorite: (spotId: number) => Promise<void>;
    removeFavorite: (spotId: number) => Promise<void>;
    isFavorite: (spotId: number) => boolean;
    loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);


export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const { user, isAuthenticated } = useAuth();


    const [favorites, setFavorites] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);


    const fetchFavorites = useCallback(async () => {
        if (!user || !isAuthenticated) {

            setFavorites([]);
            return;
        }
        try {
            setLoading(true);

            const res = await api.get<number[]>(`/users/${user.id}/favorites`);
            setFavorites(res || []);
        } catch (error: any) {


            if (error?.message?.includes('401')) {
                setFavorites([]);
                return;
            }
            console.error("Failed to fetch favorites", error);
        } finally {

            setLoading(false);
        }
    }, [user, isAuthenticated]);


    useEffect(() => {
        if (isAuthenticated && user) {
            fetchFavorites();
        } else {
            setFavorites([]);
        }
    }, [fetchFavorites, isAuthenticated, user]);


    const addFavorite = async (spotId: number) => {
        if (!user) return;
        try {


            setFavorites(prev => [...prev, spotId]);


            await api.post(`/users/${user.id}/favorites/${spotId}`);
        } catch (error) {
            console.error("Failed to add favorite", error);

            setFavorites(prev => prev.filter(id => id !== spotId));
        }
    };


    const removeFavorite = async (spotId: number) => {
        if (!user) return;
        try {


            setFavorites(prev => prev.filter(id => id !== spotId));

            await api.delete(`/users/${user.id}/favorites/${spotId}`);
        } catch (error) {
            console.error("Failed to remove favorite", error);

            setFavorites(prev => [...prev, spotId]);
        }
    };


    const isFavorite = (spotId: number) =>
        Array.isArray(favorites) && favorites.includes(spotId);

    return (
        <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, loading }}>
            {children}
        </FavoritesContext.Provider>
    );
};


export const useFavorites = () => {
    const context = useContext(FavoritesContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoritesProvider');
    }
    return context;
};



import { useEffect, useState } from 'react';
import type { Reservation } from '../types/reservation';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    apiBase: string;
}

export default function ReservationsModal({ isOpen, onClose, apiBase }: Props) {

    const { user } = useAuth();


    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (isOpen && user) {
            setLoading(true);
            setError(null);


            fetch(`${apiBase}/reservations/user/${user.id}`, {
                headers: authService.getAuthHeaders()
            })
                .then(res => {

                    if (!res.ok) throw new Error('Failed to fetch reservations');
                    return res.json();
                })
                .then((data: Reservation[]) => {


                    const sorted = data.sort((a, b) =>
                        new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                    );
                    setReservations(sorted);
                })
                .catch(err => {
                    console.error(err);
                    setError('Could not load reservations');
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, user, apiBase]);


    if (!isOpen) return null;

    return (

        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            {}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                {}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        My Reservations
                    </h2>
                    {}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (

                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (

                        <div className="text-center py-8 text-red-500">
                            {error}
                        </div>
                    ) : reservations.length === 0 ? (

                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <p>No reservations found.</p>
                            <p className="text-sm mt-2">Reserve a spot to see it here.</p>
                        </div>
                    ) : (

                        <div className="space-y-4">
                            {reservations.map(res => (

                                <div key={res.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        {}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {}
                                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                                    {res.spot.location}
                                                </h3>
                                                {}
                                                {}
                                                {!(res.end_time && new Date(res.end_time) < new Date()) && (
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            {}
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {res.spot.city ? `${res.spot.city}, ` : ''}{res.spot.area || ''}
                                            </p>
                                        </div>

                                        {}
                                        <div className="text-right text-sm">
                                            {}
                                            <div className="text-gray-900 dark:text-gray-200 font-medium">
                                                {new Date(res.start_time).toLocaleDateString()}
                                            </div>
                                            {}
                                            {}
                                            <div className="text-xs text-gray-500 dark:text-gray-500">
                                                {new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {' - '}
                                                {}
                                                {res.end_time
                                                    ? new Date(res.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : 'Now'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

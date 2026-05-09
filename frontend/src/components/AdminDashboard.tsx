/**
 * =======================================================================
 * AdminDashboard.tsx - Πίνακας Διαχείρισης για Διαχειριστές (Admin)
 * =======================================================================
 *
 * ΤΙ ΚΑΝΕΙ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   Παρέχει πλήρη διαχείριση θέσεων parking:
 *   - Εμφάνιση όλων των θέσεων σε πίνακα (table)
 *   - Δημιουργία νέας θέσης (Create)
 *   - Επεξεργασία υπάρχουσας (Edit/Update)
 *   - Διαγραφή με επιβεβαίωση (Delete)
 *   - Αναζήτηση/φιλτράρισμα θέσεων
 *
 * CRUD PATTERN:
 *   Create → POST /parking/spots
 *   Read   → GET /parking/spots (όλα, χωρίς φίλτρα viewport)
 *   Update → PUT /parking/spots/{id}
 *   Delete → DELETE /parking/spots/{id}
 *
 * COMPONENTS ΣΕ ΑΥΤΟ ΤΟ ΑΡΧΕΙΟ:
 *   1. SpotForm    - Φόρμα δημιουργίας/επεξεργασίας (εσωτερικό component)
 *   2. AdminDashboard - Κύριο component με πίνακα και logic
 *
 * ΓΙΑΤΙ ΔΥΟ MODALS:
 *   - isFormOpen: για Create/Edit form
 *   - isDeleteModalOpen: για επιβεβαίωση διαγραφής
 *   Το Modal component (ui/Modal.tsx) χρησιμοποιείται και στα δύο.
 *
 * ΣΥΝΕΡΓΑΖΕΤΑΙ ΜΕ:
 *   api.ts (CRUD requests), Modal.tsx (UI modals), parking.ts (τύποι),
 *   App.tsx (routing: /admin → AdminDashboard)
 * =======================================================================
 */

import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { ParkingSpot } from '../types/parking';
import { Modal } from './ui/Modal';

/**
 * SpotFormData - Δεδομένα φόρμας θέσης parking.
 * Χρησιμοποιείται τόσο για Create όσο και για Edit.
 * price_per_hour?: προαιρετικό (undefined = δωρεάν, > 0 = επί πληρωμή)
 */
type SpotFormData = {
    location: string;
    latitude: number;
    longitude: number;
    status: string;
    city: string;
    area: string;
    price_per_hour?: number;
};

/**
 * =======================================================================
 * SpotForm - Φόρμα Δημιουργίας/Επεξεργασίας Θέσης
 * =======================================================================
 * Εσωτερικό component που χρησιμοποιείται σε δύο περιπτώσεις:
 * 1. Δημιουργία νέας: initialData=null → κενή φόρμα
 * 2. Επεξεργασία:     initialData=spot → προ-γεμισμένη φόρμα
 *
 * CONTROLLED COMPONENT:
 *   Κάθε input ελέγχεται από το React state (formData).
 *   onChange: ενημερώνει το state → React επαναρεντάρει → input εμφανίζει νέα τιμή
 */
const SpotForm: React.FC<{
    initialData?: ParkingSpot | null;   // Αν υπάρχει: Edit mode, αν null: Create mode
    onSubmit: (data: SpotFormData) => void;  // Callback υποβολής φόρμας
    onCancel: () => void;               // Callback ακύρωσης
}> = ({ initialData, onSubmit, onCancel }) => {
    // formData: τρέχουσες τιμές φόρμας
    const [formData, setFormData] = useState<SpotFormData>({
        location: '',
        latitude: 0,
        longitude: 0,
        status: 'Available',
        city: '',
        area: '',
        price_per_hour: 0,
    });

    /**
     * useEffect - Προ-γεμίζει τη φόρμα αν επεξεργαζόμαστε υπάρχουσα θέση.
     * Τρέχει όταν αλλάξει το initialData (π.χ. άνοιγμα modal επεξεργασίας).
     */
    useEffect(() => {
        if (initialData) {
            // Αντιγράφουμε δεδομένα από το υπάρχον spot στη φόρμα
            setFormData({
                location: initialData.location,
                latitude: initialData.latitude,
                longitude: initialData.longitude,
                status: initialData.status,
                city: initialData.city || '',
                area: initialData.area || '',
                price_per_hour: initialData.price_per_hour || 0,
            });
        }
    }, [initialData]);

    /**
     * handleChange - Ενημερώνει state κάθε φορά που ο χρήστης αλλάζει κάποιο πεδίο.
     * [name]: value → computed property name: το key της ιδιότητας προσδιορίζεται δυναμικά
     * parseFloat: τα latitude/longitude/price πρέπει να είναι αριθμοί, όχι strings
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            // Αριθμητικά πεδία: μετατροπή string → number
            [name]: name === 'latitude' || name === 'longitude' || name === 'price_per_hour'
                ? parseFloat(value)
                : value,
        }));
    };

    /**
     * handleSubmit - Αποτρέπει default browser submit και καλεί το onSubmit callback.
     * e.preventDefault(): αποτρέπει ανανέωση σελίδας (default behavior φόρμας)
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Πεδίο: Τοποθεσία (υποχρεωτικό) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location Name</label>
                <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                />
            </div>

            {/* Πεδία: Συντεταγμένες (δύο στη σειρά) */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Latitude</label>
                    <input
                        type="number"
                        step="any"  // step="any": επιτρέπει δεκαδικά ψηφία (37.9838)
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Longitude</label>
                    <input
                        type="number"
                        step="any"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    />
                </div>
            </div>

            {/* Πεδία: Πόλη και Περιοχή */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                    <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Area</label>
                    <input
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                    />
                </div>
            </div>

            {/* Τιμολόγηση: checkbox + conditional input */}
            <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col justify-end">
                    {/* Checkbox: "Paid" on/off */}
                    {/* !!formData.price_per_hour: μετατρέπει τιμή σε boolean (0=false, >0=true) */}
                    <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <input
                            type="checkbox"
                            checked={!!formData.price_per_hour && formData.price_per_hour > 0}
                            onChange={(e) => {
                                // Αν tick: θέτουμε τιμή 1.0€, αλλιώς 0 (δωρεάν)
                                setFormData(prev => ({
                                    ...prev,
                                    price_per_hour: e.target.checked ? 1.0 : 0
                                }));
                            }}
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span>Paid Parking Space</span>
                    </label>

                    {/* Conditional input: εμφανίζεται μόνο αν είναι επί πληρωμή */}
                    {formData.price_per_hour !== undefined && formData.price_per_hour > 0 && (
                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Price/Hr (€)</label>
                            <input
                                type="number"
                                step="0.01"   // Βήμα 1 λεπτό (0.01€)
                                min="0.10"    // Ελάχιστη τιμή 10 λεπτά
                                name="price_per_hour"
                                value={formData.price_per_hour}
                                onChange={handleChange}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Κουμπιά: Cancel + Submit */}
            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                    Cancel
                </button>
                {/* Δυναμικό label: "Update" αν επεξεργασία, "Create" αν νέο */}
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    {initialData ? 'Update Spot' : 'Create Spot'}
                </button>
            </div>
        </form>
    );
};

/**
 * =======================================================================
 * AdminDashboard - Κύριο Component Διαχείρισης
 * =======================================================================
 * Ο διαχειριστής βλέπει αυτό το component όταν πηγαίνει στο /admin.
 * Έχει πλήρη CRUD για θέσεις parking.
 */
export const AdminDashboard: React.FC = () => {
    // spots: όλες οι θέσεις (χωρίς φίλτρα viewport)
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(true);

    // isFormOpen: modal δημιουργίας/επεξεργασίας
    const [isFormOpen, setIsFormOpen] = useState(false);
    // editingSpot: η θέση που επεξεργαζόμαστε (null = νέα δημιουργία)
    const [editingSpot, setEditingSpot] = useState<ParkingSpot | null>(null);

    // isDeleteModalOpen: modal επιβεβαίωσης διαγραφής
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    // spotToDelete: η θέση που πρόκειται να διαγραφεί
    const [spotToDelete, setSpotToDelete] = useState<ParkingSpot | null>(null);

    // searchTerm: κείμενο αναζήτησης για φιλτράρισμα πίνακα
    const [searchTerm, setSearchTerm] = useState('');

    /**
     * fetchSpots - Ανακτά ΟΛΕΣτις θέσεις από το API.
     * Χρησιμοποιείται αρχικά + μετά από κάθε CRUD operation
     * για να ανανεώσει τον πίνακα.
     */
    const fetchSpots = async () => {
        try {
            setLoading(true);
            const data = await api.get<ParkingSpot[]>('/parking/spots');
            setSpots(data);
        } catch (error) {
            console.error('Failed to fetch spots:', error);
        } finally {
            setLoading(false);
        }
    };

    // Φόρτωση θέσεων κατά το αρχικό render
    useEffect(() => {
        fetchSpots();
    }, []);  // [] = τρέχει μόνο μια φορά (component mount)

    /**
     * handleCreate - Στέλνει νέα θέση στο backend.
     * POST /parking/spots με τα δεδομένα φόρμας.
     * Μετά επιτυχίας: κλείνει modal + ανανεώνει λίστα.
     */
    const handleCreate = async (data: SpotFormData) => {
        try {
            await api.post('/parking/spots', data);
            setIsFormOpen(false);
            fetchSpots();  // Ανανέωση πίνακα
        } catch (error) {
            console.error('Failed to create spot:', error);
            alert('Failed to create spot');
        }
    };

    /**
     * handleUpdate - Ενημερώνει υπάρχουσα θέση στο backend.
     * PUT /parking/spots/{id} με τα νέα δεδομένα.
     * Guard: αν δεν υπάρχει editingSpot, δεν κάνει τίποτα.
     */
    const handleUpdate = async (data: SpotFormData) => {
        if (!editingSpot) return;  // Δεν πρέπει να συμβεί, αλλά για ασφάλεια
        try {
            await api.put(`/parking/spots/${editingSpot.id}`, data);
            setIsFormOpen(false);
            setEditingSpot(null);  // Καθαρισμός
            fetchSpots();
        } catch (error) {
            console.error('Failed to update spot:', error);
            alert('Failed to update spot');
        }
    };

    /**
     * handleDeleteClick - Ανοίγει modal επιβεβαίωσης διαγραφής.
     * Δεν διαγράφει ακόμα - απαιτεί επιβεβαίωση από χρήστη.
     */
    const handleDeleteClick = (spot: ParkingSpot) => {
        setSpotToDelete(spot);  // Αποθήκευση θέσης για διαγραφή
        setIsDeleteModalOpen(true);  // Άνοιγμα modal επιβεβαίωσης
    };

    /**
     * confirmDelete - Εκτελεί πραγματική διαγραφή μετά επιβεβαίωση.
     * DELETE /parking/spots/{id}
     * Καλείται μόνο αφού ο χρήστης πατήσει "Delete" στο confirmation modal.
     */
    const confirmDelete = async () => {
        if (!spotToDelete) return;
        try {
            await api.delete(`/parking/spots/${spotToDelete.id}`);
            setIsDeleteModalOpen(false);
            setSpotToDelete(null);  // Καθαρισμός
            fetchSpots();
        } catch (error) {
            console.error('Failed to delete spot:', error);
            alert('Failed to delete spot');
        }
    };

    /** openCreateModal - Ανοίγει modal για νέα θέση (μηδενίζει editingSpot) */
    const openCreateModal = () => {
        setEditingSpot(null);   // null = create mode (όχι edit)
        setIsFormOpen(true);
    };

    /** openEditModal - Ανοίγει modal για επεξεργασία υπάρχουσας θέσης */
    const openEditModal = (spot: ParkingSpot) => {
        setEditingSpot(spot);   // Αποθήκευση θέσης → φόρμα θα προ-γεμιστεί
        setIsFormOpen(true);
    };

    /**
     * filteredSpots - Φιλτράρει θέσεις βάσει searchTerm.
     * Ελέγχει αν το searchTerm βρίσκεται στο location, city, ή area.
     * toLowerCase(): case-insensitive αναζήτηση (Αθήνα = αθήνα = ΑΘΗΝΑ)
     */
    const filteredSpots = spots.filter(spot =>
        spot.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spot.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        spot.area?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header: τίτλος + κουμπί "Add New Spot" */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    {/* Κουμπί πίσω στον χάρτη */}
                    <button
                        onClick={() => window.location.href = '/'}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Return to Map"
                    >
                        {/* Βέλος αριστερά */}
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                </div>
                {/* Κουμπί δημιουργίας νέας θέσης */}
                <button
                    onClick={openCreateModal}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
                >
                    {/* + εικονίδιο */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Spot
                </button>
            </div>

            {/* Πεδίο αναζήτησης */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by location, city, or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Πίνακας θέσεων */}
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">  {/* Horizontal scroll σε μικρές οθόνες */}
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        {/* Επικεφαλίδες πίνακα */}
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">City / Area</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price/Hr</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {/* Μία γραμμή ανά θέση */}
                            {filteredSpots.map((spot) => (
                                <tr key={spot.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">#{spot.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{spot.location}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {spot.city} {spot.area ? `- ${spot.area}` : ''}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {/* Αν έχει τιμή: εμφάνιση €, αλλιώς "Free" */}
                                        {spot.price_per_hour ? `€${spot.price_per_hour}` : 'Free'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {/* Badge κατάστασης: πράσινο/κόκκινο/κίτρινο */}
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                            ${spot.status === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                spot.status === 'Occupied' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                            {spot.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {/* Κουμπί επεξεργασίας */}
                                        <button
                                            onClick={() => openEditModal(spot)}
                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                                        >
                                            Edit
                                        </button>
                                        {/* Κουμπί διαγραφής - ανοίγει confirmation modal */}
                                        <button
                                            onClick={() => handleDeleteClick(spot)}
                                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Δημιουργίας/Επεξεργασίας */}
            {/* Ο τίτλος αλλάζει δυναμικά ανάλογα με τη λειτουργία */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingSpot ? 'Edit Parking Spot' : 'Add New Parking Spot'}
            >
                <SpotForm
                    initialData={editingSpot}  // null = create, object = edit
                    onSubmit={editingSpot ? handleUpdate : handleCreate}  // Διαφορετικό callback ανά mode
                    onCancel={() => setIsFormOpen(false)}
                />
            </Modal>

            {/* Modal Επιβεβαίωσης Διαγραφής */}
            {/* Εμφανίζει το όνομα της θέσης για να είναι σαφές τι διαγράφεται */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Delete"
            >
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Are you sure you want to delete the spot at <strong>{spotToDelete?.location}</strong>?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                        >
                            Cancel
                        </button>
                        {/* Κόκκινο κουμπί: οπτικό σήμα επικίνδυνης ενέργειας */}
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

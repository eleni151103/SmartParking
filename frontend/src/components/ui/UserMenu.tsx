

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../ui/Modal';
import { ChangePasswordForm } from '../auth/ChangePasswordForm';

interface Props {
  onFavoritesClick?: () => void;
  onReservationsClick?: () => void;
}

export const UserMenu: React.FC<Props> = ({ onFavoritesClick, onReservationsClick }) => {


  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);


  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);


  const menuRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {


      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };


    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }


    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);


  if (!user) return null;


  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };


  const handleChangePassword = () => {
    setIsMenuOpen(false);
    setIsChangePasswordModalOpen(true);
  };


  const handleFavorites = () => {
    if (onFavoritesClick) {
      onFavoritesClick();
    }
    setIsMenuOpen(false);
  };


  const handleReservations = () => {
    if (onReservationsClick) {
      onReservationsClick();
    }
    setIsMenuOpen(false);
  };

  return (
    <>
      {}
      <div className="relative" ref={menuRef}>
        {}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
          aria-label="User menu"
        >
          {}
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>

        {}
        {isMenuOpen && (

          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[9999]">
            {}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</p>
              {}
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>

            {}
            <div className="py-1">
              <button
                onClick={handleChangePassword}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={handleFavorites}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Favorite Parking Spots
              </button>
              <button
                onClick={handleReservations}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Reservations
              </button>
              {}
              {user.is_admin && (
                <a
                  href="/admin"
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Admin Dashboard
                </a>
              )}
            </div>

            {}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {}
      <Modal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        title="Change Password"
      >
        <ChangePasswordForm onClose={() => setIsChangePasswordModalOpen(false)} />
      </Modal>
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineIndicator: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBackOnline, setShowBackOnline] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowBackOnline(true);
            setTimeout(() => setShowBackOnline(false), 3000);
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBackOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <AnimatePresence>
            {!isOnline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[2000] bg-red-500/90 backdrop-blur-md text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg"
                >
                    <WifiOff size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Mode Hors Ligne</span>
                </motion.div>
            )}

            {showBackOnline && (
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    className="fixed top-0 left-0 right-0 z-[2000] bg-green-500/90 backdrop-blur-md text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg"
                >
                    <Wifi size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Connexion Rétablie</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OfflineIndicator;

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { UnlockedDeviceIdentity, loadAndUnlockDeviceIdentity } from './DeviceIdentity';
import { supabase } from '@/integrations/supabase/client';

interface DeviceCryptoContextValue {
    unlockedIdentity: UnlockedDeviceIdentity | null;
    isUnlocked: boolean;
    unlockWithPin: (pin: string) => Promise<void>;
    lock: () => void;
}

const DeviceCryptoContext = createContext<DeviceCryptoContextValue | undefined>(undefined);

export function DeviceCryptoProvider({ children }: { children: ReactNode }) {
    const [unlockedIdentity, setUnlockedIdentity] = useState<UnlockedDeviceIdentity | null>(null);

    const unlockWithPin = useCallback(async (pin: string) => {
        try {
            const identity = await loadAndUnlockDeviceIdentity(pin);
            setUnlockedIdentity(identity);
            console.log("[DeviceCrypto] unlock=SUCCESS");
        } catch (error) {
            console.log("[DeviceCrypto] unlock=FAILED");
            throw error;
        }
    }, []);

    const lock = useCallback(() => {
        setUnlockedIdentity(null);
        console.log("[DeviceCrypto] identity=LOCKED");
    }, []);

    // Listen to Supabase auth state changes and lock on sign out
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                lock();
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [lock]);

    const value = {
        unlockedIdentity,
        isUnlocked: !!unlockedIdentity,
        unlockWithPin,
        lock
    };

    return (
        <DeviceCryptoContext.Provider value={value}>
            {children}
        </DeviceCryptoContext.Provider>
    );
}

export function useDeviceCrypto() {
    const context = useContext(DeviceCryptoContext);
    if (context === undefined) {
        throw new Error("useDeviceCrypto must be used within a DeviceCryptoProvider");
    }
    return context;
}

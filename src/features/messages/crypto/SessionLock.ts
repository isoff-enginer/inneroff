/**
 * SessionLock.ts
 * 
 * Garantiza exclusión mutua para operaciones atómicas de sesión (Double Ratchet).
 * Previene vulnerabilidades de Cross-Tab Concurrency en IndexedDB.
 */

class FallbackMutex {
    private queue: (() => void)[] = [];
    private locked = false;

    async lock(): Promise<void> {
        if (!this.locked) {
            this.locked = true;
            return;
        }
        return new Promise<void>(resolve => {
            this.queue.push(resolve);
        });
    }

    unlock() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            if (next) next();
        } else {
            this.locked = false;
        }
    }
}

const memoryLocks = new Map<string, FallbackMutex>();

function getMemoryMutex(id: string): FallbackMutex {
    if (!memoryLocks.has(id)) {
        memoryLocks.set(id, new FallbackMutex());
    }
    return memoryLocks.get(id)!;
}

/**
 * Ejecuta una función garantizando que ninguna otra pestaña o worker local
 * opere concurrentemente sobre la misma sesión.
 * Utiliza Web Locks API por defecto (Cross-Tab safe), con un fallback asíncrono
 * para entornos que no lo soporten (Vitest/Node antiguo).
 */
export async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
    const lockName = `e2ee_session_${sessionId}`;
    
    if (typeof navigator !== 'undefined' && navigator.locks) {
        return navigator.locks.request(lockName, async () => {
            return await fn();
        });
    } else {
        // Fallback a Mutex en memoria (No protege cross-tab, pero sí concurrencia intra-tab)
        const mutex = getMemoryMutex(lockName);
        await mutex.lock();
        try {
            return await fn();
        } finally {
            mutex.unlock();
        }
    }
}

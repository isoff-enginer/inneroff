/**
 * KeyStore.ts
 * 
 * Capa de abstracción para IndexedDB que almacena de forma persistente
 * el material criptográfico local del usuario (protegido por LocalKeyProtection).
 * 
 * Se implementa un wrapper Promise ligero sobre la API nativa de IndexedDB
 * para evitar depender de librerías externas que agreguen peso o riesgos a la SPA.
 */

const DB_NAME = 'E2EE_KeyStore';
const DB_VERSION = 1;
const STORE_NAME = 'protected_keys';

// Namespaces definidos para evitar colisiones
export type KeyNamespace = 'identity' | 'session' | 'ratchet' | 'attachments';

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        // Fallback para entornos como Node/Vitest donde no existe IndexedDB globalmente
        if (typeof indexedDB === 'undefined') {
            return reject(new Error("IndexedDB is not available in this environment"));
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // Usaremos clave primaria compuesta [namespace, keyId] serializada como string
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event: Event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event: Event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
}

function makeId(namespace: KeyNamespace, keyId: string): string {
    return `${namespace}::${keyId}`;
}

export async function saveProtectedData(namespace: KeyNamespace, keyId: string, data: any): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        const record = {
            id: makeId(namespace, keyId),
            data: data
        };

        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function getProtectedData(namespace: KeyNamespace, keyId: string): Promise<any | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        
        const request = store.get(makeId(namespace, keyId));

        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.data);
            } else {
                resolve(null);
            }
        };
        request.onerror = () => reject(request.error);
    });
}

export async function removeProtectedData(namespace: KeyNamespace, keyId: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        
        const request = store.delete(makeId(namespace, keyId));

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Fallback en memoria (Exclusivamente para testing cuando IndexedDB falla)
const memoryFallback = new Map<string, any>();

export async function saveProtectedDataMemory(namespace: KeyNamespace, keyId: string, data: any): Promise<void> {
    memoryFallback.set(makeId(namespace, keyId), data);
}

export async function getProtectedDataMemory(namespace: KeyNamespace, keyId: string): Promise<any | null> {
    return memoryFallback.get(makeId(namespace, keyId)) || null;
}

export async function removeProtectedDataMemory(namespace: KeyNamespace, keyId: string): Promise<void> {
    memoryFallback.delete(makeId(namespace, keyId));
}

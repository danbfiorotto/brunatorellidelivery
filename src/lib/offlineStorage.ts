/**
 * Wrapper simples para IndexedDB
 * Usado para armazenar operações offline
 */

interface OfflineOperation {
    id: string;
    type: 'create' | 'update' | 'delete';
    entity: string;
    data: unknown;
    timestamp: number;
    retries: number;
}

const DB_NAME = 'endosystem_offline';
const DB_VERSION = 1;
const STORE_NAME = 'operations';

/**
 * Abre conexão com IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('entity', 'entity', { unique: false });
            }
        };
    });
}

/**
 * Salva operação offline
 */
export async function saveOfflineOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const id = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullOperation: OfflineOperation = {
        ...operation,
        id,
        timestamp: Date.now(),
        retries: 0,
    };
    
    return new Promise((resolve, reject) => {
        const request = store.add(fullOperation);
        request.onsuccess = () => resolve(id);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Obtém todas as operações offline
 */
export async function getOfflineOperations(): Promise<OfflineOperation[]> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Remove operação offline
 */
export async function removeOfflineOperation(id: string): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Incrementa contador de retries
 */
export async function incrementRetries(id: string): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const operation = getRequest.result;
            if (operation) {
                operation.retries += 1;
                const putRequest = store.put(operation);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                resolve();
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

/**
 * Limpa todas as operações offline
 */
export async function clearOfflineOperations(): Promise<void> {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Verifica se IndexedDB está disponível
 */
export function isIndexedDBAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
}

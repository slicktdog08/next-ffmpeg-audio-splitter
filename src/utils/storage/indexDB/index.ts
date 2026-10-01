// Simple IndexedDB file storage utilities
import { useState, useEffect } from 'react'

let db: IDBDatabase | null = null

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db)

        const request = indexedDB.open('FileStorage', 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
            db = request.result
            resolve(db)
        }
        request.onupgradeneeded = () => {
            const database = request.result
            if (!database.objectStoreNames.contains('files')) {
                database.createObjectStore('files')
            }
        }
    })
}

export const storeFile = async (file: File, key = 'currentFile'): Promise<void> => {
    // Read file data before starting transaction
    const arrayBuffer = await file.arrayBuffer()

    const database = await initDB()
    const tx = database.transaction(['files'], 'readwrite')
    const store = tx.objectStore('files')

    const fileData = {
        name: file.name,
        type: file.type,
        size: file.size,
        data: arrayBuffer,
    }

    store.put(fileData, key)
    await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(void 0)
        tx.onerror = () => reject(tx.error)
    })
}

export const getFile = async (key = 'currentFile'): Promise<File | null> => {
    const database = await initDB()
    const tx = database.transaction(['files'], 'readonly')
    const store = tx.objectStore('files')

    return new Promise((resolve, reject) => {
        const request = store.get(key)
        request.onsuccess = () => {
            const result = request.result
            if (!result) return resolve(null)

            const blob = new Blob([result.data], { type: result.type })
            const file = new File([blob], result.name, { type: result.type })
            resolve(file)
        }
        request.onerror = () => reject(request.error)
    })
}

export const deleteFile = async (key = 'currentFile'): Promise<void> => {
    const database = await initDB()
    const tx = database.transaction(['files'], 'readwrite')
    const store = tx.objectStore('files')

    return new Promise((resolve, reject) => {
        const request = store.delete(key)
        request.onsuccess = () => resolve(void 0)
        request.onerror = () => reject(request.error)
    })
}

export const useIndexedDBFile = (key = 'currentFile') => {
    const [file, setFile] = useState<File | null>(null)

    // Load file on mount
    useEffect(() => {
        getFile(key).then(setFile).catch(console.error)
    }, [key])

    const updateFile = async (newFile: File | null) => {
        if (newFile) {
            await storeFile(newFile, key)
        }
        setFile(newFile)
    }

    const deleteFileFromHook = async () => {
        await deleteFile(key)
        setFile(null)
    }

    return [file, updateFile, deleteFileFromHook] as const
}

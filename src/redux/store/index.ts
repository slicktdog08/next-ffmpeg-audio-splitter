'use client'

import { createStore, combineReducers } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import { rootReducer } from '../reducers/index'
import storage from 'redux-persist/lib/storage'
import { createTransform, persistReducer, persistStore, PersistConfig } from 'redux-persist'
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2'
import { AUDIO_SPLITTER_PERSISTED_FIELDS, AudioSplitterStateType } from '../reducers/audio-splitter'

/**
 * Only durable audio-splitter fields are written to localStorage. Blob URLs (audioSrc, coverArtPreview)
 * die with the page — the files themselves live in IndexedDB and are re-linked on mount — and
 * in-flight state (isLoading, progress, recaptcha…) must never survive a reload.
 */
const audioSplitterTransform = createTransform<AudioSplitterStateType, Partial<AudioSplitterStateType>>(
    (state) =>
        Object.fromEntries(AUDIO_SPLITTER_PERSISTED_FIELDS.map((key) => [key, state[key]])) as Partial<
            AudioSplitterStateType
        >,
    (persisted) => persisted as AudioSplitterStateType,
    { whitelist: ['audioSplitterReducer'] }
)

const rootReducers = combineReducers({ ...rootReducer })
export type RootState = ReturnType<typeof rootReducers>

const persistConfig: PersistConfig<RootState> = {
    key: 'root',
    storage,
    whitelist: ['audioSplitterReducer'],
    transforms: [audioSplitterTransform],
    // merge the persisted subset *into* the slice's initial state rather than replacing the slice
    stateReconciler: autoMergeLevel2,
}

const persistedReducer = persistReducer(persistConfig, rootReducers)

export const store = createStore(persistedReducer, composeWithDevTools())
export const persistor = persistStore(store)

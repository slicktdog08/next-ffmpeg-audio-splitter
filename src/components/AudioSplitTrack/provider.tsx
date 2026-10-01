'use client'
import { createContext, useContext, ReactNode } from 'react'
import useAudioSplitTrackState from './hook'
import { AudioSplitTrackStateReturnValue } from './types'

export const AudioSplitTrackContext = createContext<AudioSplitTrackStateReturnValue | undefined>(undefined)

export function AudioSplitTrackProvider({ children }: { children: ReactNode }) {
    const defaultState: AudioSplitTrackStateReturnValue = useAudioSplitTrackState()

    return <AudioSplitTrackContext.Provider value={defaultState}>{children}</AudioSplitTrackContext.Provider>
}

export const useAudioSplitTrackContext = () => {
    const context = useContext(AudioSplitTrackContext)
    if (!context) {
        throw new Error('useAudioSplitTrackContext must be used within an AudioSplitTrackProvider')
    }
    return context
}

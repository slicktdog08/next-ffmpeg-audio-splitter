import { Timestamp } from '@app/audio-tools/split-track/types'
import { ChangeEvent, Dispatch, MutableRefObject } from 'react'
import WaveSurfer from 'wavesurfer.js'

export interface AudioSplitTrackFileUploadProgress {
    percentComplete: number
    uploaded: number
    total: number
}

export interface ParsedMessage {
    key: string
    data: any
}

// Define a function type that parses a message into a key and data
export type ParseResponseMessage = (msg: string) => ParsedMessage

// Define a function type for handling event chunks
export type HandleEventStreamChunk = (chunk: string) => void

// Define a function type for handling the stream end
export type HandleStreamEnd = () => void
export interface AudioSplitTrackStateReturnValue {
    wavesurferRef: MutableRefObject<any | null>
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleTimestampClick: (timestamp: string) => void
    handleCoverArtChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleAddTimestamp: () => void
    handleRemoveTimestamp: (index: number) => void
    handleTextModeSubmit: () => void
    handleSubmit: () => void
    handleAddTimestampWithCurrentTime: () => void
    handleDownloadIndividualFilesToggleChange: (event: ChangeEvent<HTMLInputElement>) => void
    capatchaVerifyCallback: (data: any) => void
    handleOnAlbumInfoSave: () => void
    clearMP3Upload: () => void
    currentSong?: { index: number; title: string }
    togglePlayPause: () => void
    seekForward: () => void
    seekBackward: () => void
    skipToPreviousTrack: () => void
    skipToNextTrack: () => void
    trackDuration: number
    wavesurfContainerRef: (el: HTMLDivElement | null) => void
    handleEditAfterSubmitClick: () => void
    isWaveformLoading: boolean
    /** 0–100 fetch progress reported by WaveSurfer; 100 while the audio is being decoded */
    waveformLoadProgress: number
    isWaveSurferReady: boolean
    isRestoringSession: boolean
}

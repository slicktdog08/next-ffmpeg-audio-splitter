import { Timestamp } from '@app/audio-tools/split-track/types'
import { AudioSplitTrackFileUploadProgress } from '@components/AudioSplitTrack/types'
import { generateNewTimestampId, sortAndChainTimestamps, timestampsToTextBlock } from '@components/AudioSplitTrack/utils'
import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { AudioCodec, AudioBitrate } from '@app/audio-tools/split-track/types'

export type AudioSplitterStateType = {
    isLoading: boolean
    hasResults: boolean
    artist: string
    album: string
    year: string
    genre: string
    timestamps: Timestamp[]
    useTextMode: boolean
    textInput: string
    audioSrc: string | null
    coverArtPreview: string | null
    progress: string[]
    error: string[]
    success: string | null
    recapatcha: string | null
    downloadIndividualFiles: boolean
    uploadProgress: number
    fileUploadProgress: AudioSplitTrackFileUploadProgress
    zipFileKey: string | null
    isAlbumInfoDrawerOpen: boolean
    isPlaying: boolean
    isWaveformLoading: boolean
    zoomLevel: number
    currentPlaybackTime: number
    isViewAllTracksMode: boolean
    shouldShowReaptcha: boolean
    audioCodec: AudioCodec
    audioBitrate: AudioBitrate
    /** which first-visit guide step is showing, if any (not persisted) */
    tourStep: string | null
}

/** Fields worth keeping across reloads. Everything else is derived, transient, or a blob URL. */
export const AUDIO_SPLITTER_PERSISTED_FIELDS = [
    'artist',
    'album',
    'year',
    'genre',
    'timestamps',
    'useTextMode',
    'textInput',
    'downloadIndividualFiles',
    'zoomLevel',
    'audioCodec',
    'audioBitrate',
    'isAlbumInfoDrawerOpen',
] as const satisfies readonly (keyof AudioSplitterStateType)[]

const initialState: AudioSplitterStateType = {
    isLoading: false,
    hasResults: false,
    artist: '',
    album: '',
    year: '',
    genre: '',
    timestamps: [],
    useTextMode: false,
    textInput: '',
    audioSrc: null,
    coverArtPreview: null,
    progress: [],
    error: [],
    success: null,
    recapatcha: null,
    downloadIndividualFiles: false,
    uploadProgress: 0,
    fileUploadProgress: {
        percentComplete: 0,
        uploaded: 0,
        total: 0,
    },
    zipFileKey: null,
    isAlbumInfoDrawerOpen: false,
    isPlaying: false,
    isWaveformLoading: false,
    zoomLevel: 5,
    currentPlaybackTime: 0,
    isViewAllTracksMode: false,
    shouldShowReaptcha: false,
    audioCodec: 'copy',
    audioBitrate: '128k',
    tourStep: null,
}

const columnSlice = createSlice({
    name: 'audio-splitter',
    initialState,
    reducers: {
        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setHasResults: (state, action: PayloadAction<boolean>) => {
            state.hasResults = action.payload
        },
        setArtist: (state, action: PayloadAction<string>) => {
            state.artist = action.payload
        },
        setAlbum: (state, action: PayloadAction<string>) => {
            state.album = action.payload
        },
        setYear: (state, action: PayloadAction<string>) => {
            state.year = action.payload
        },
        setGenre: (state, action: PayloadAction<string>) => {
            state.genre = action.payload
        },
        setTimestamps: (state, action: PayloadAction<Timestamp>) => {
            state.timestamps = state.timestamps.map((t) => (t.id === action.payload.id ? action.payload : t))
        },
        replaceTimestamps: (state, action: PayloadAction<Timestamp[]>) => {
            state.timestamps = action.payload
        },
        handleAddTimestamp: (state, action: PayloadAction<{ start: string } | undefined>) => {
            const start = action.payload?.start ?? ''
            const next = [...state.timestamps, { start, end: '', title: '', id: generateNewTimestampId(state.timestamps) }]
            // Keep the list chronological and chain the ends, however the user jumped around while adding
            state.timestamps = sortAndChainTimestamps(next)
        },
        updateTimestamp: (state, action: PayloadAction<{ index: number; field: keyof Timestamp; value: string }>) => {
            const { index, field, value } = action.payload

            // Update the current timestamp's field
            state.timestamps[index][field] = value

            // If the field being updated is 'start' and the previous timestamp's end is empty, update the previous one
            if (field === 'start' && index > 0 && !state.timestamps[index - 1].end) {
                state.timestamps[index - 1].end = value
            }
        },
        setUseTextMode: (state, action: PayloadAction<boolean>) => {
            const { payload: newValue } = action
            // Update text input to match current timestamps
            if (newValue) {
                const textBlockTimestamps = timestampsToTextBlock(state.timestamps)
                state.textInput = textBlockTimestamps
            }
            state.useTextMode = action.payload
        },
        setTourStep: (state, action: PayloadAction<string | null>) => {
            state.tourStep = action.payload
        },
        setTextInput: (state, action: PayloadAction<string>) => {
            state.textInput = action.payload
        },
        setAudioSrc: (state, action: PayloadAction<string | null>) => {
            state.audioSrc = action.payload
        },
        setCoverArtPreview: (state, action: PayloadAction<string | null>) => {
            state.coverArtPreview = action.payload
        },
        setProgress: (state, action: PayloadAction<string>) => {
            state.progress = [...state.progress, action.payload]
        },
        clearProgress: (state) => {
            state.progress = []
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = [...state.error, action.payload]
        },
        clearErrorList: (state) => {
            state.error = []
        },
        setSuccess: (state, action: PayloadAction<string | null>) => {
            state.success = action.payload
        },
        setUploadProgress: (state, action: PayloadAction<number>) => {
            state.uploadProgress = action.payload
        },
        setZipFileKey: (state, action: PayloadAction<string | null>) => {
            state.zipFileKey = action.payload
        },
        setRecapatcha: (state, action: PayloadAction<string | null>) => {
            state.recapatcha = action.payload
        },
        setDownloadIndividualFiles: (state, action: PayloadAction<boolean>) => {
            state.downloadIndividualFiles = action.payload
        },
        setIsAlbumInfoDrawerOpen: (state, action: PayloadAction<boolean>) => {
            state.isAlbumInfoDrawerOpen = action.payload
        },
        setIsPlaying: (state, action: PayloadAction<boolean>) => {
            state.isPlaying = action.payload
        },
        setIsWaveformLoading: (state, action: PayloadAction<boolean>) => {
            state.isWaveformLoading = action.payload
        },
        setZoomLevel: (state, action: PayloadAction<number>) => {
            state.zoomLevel = action.payload
        },
        setCurrentPlaybackTime: (state, action: PayloadAction<number>) => {
            state.currentPlaybackTime = action.payload
        },
        setIsViewAllTracksMode: (state, action: PayloadAction<boolean>) => {
            state.isViewAllTracksMode = action.payload
        },
        setFileUploadProgress: (state, action: PayloadAction<AudioSplitTrackFileUploadProgress>) => {
            state.fileUploadProgress = action.payload
        },
        setFileUploadProgressPercentComplete: (state, action: PayloadAction<number>) => {
            state.fileUploadProgress.percentComplete = action.payload
        },
        setFileUploadProgressUploaded: (state, action: PayloadAction<number>) => {
            state.fileUploadProgress.uploaded = action.payload
        },
        setFileUploadProgressTotal: (state, action: PayloadAction<number>) => {
            state.fileUploadProgress.total = action.payload
        },
        resetState: () => initialState,
        resetHasResults: (state) => {
            state.hasResults = initialState.hasResults
            state.zipFileKey = initialState.zipFileKey
            state.isLoading = initialState.isLoading
            state.shouldShowReaptcha = initialState.shouldShowReaptcha
            state.uploadProgress = initialState.uploadProgress
            state.error = initialState.error
            state.success = initialState.success
            state.progress = initialState.progress
        },
        setShouldShowReaptcha: (state, action: PayloadAction<boolean>) => {
            state.shouldShowReaptcha = action.payload
        },
        setAudioCodec: (state, action: PayloadAction<AudioCodec>) => {
            state.audioCodec = action.payload
        },
        setAudioBitrate: (state, action: PayloadAction<AudioBitrate>) => {
            state.audioBitrate = action.payload
        },
    },
})

export const { actions } = columnSlice

export const { reducer } = columnSlice

import { rootReducer } from '@redux/reducers'
import { AudioSplitterStateType } from '@redux/reducers/audio-splitter'

type RootState = typeof rootReducer

// Base selector - typed properly
export const selectAudioSplitterState = (state: RootState): AudioSplitterStateType =>
    state.audioSplitterReducer as unknown as AudioSplitterStateType

// Simple property selectors - no need for createSelector
export const selectIsLoading = (state: RootState) => selectAudioSplitterState(state).isLoading
export const selectHasResults = (state: RootState) => selectAudioSplitterState(state).hasResults
export const selectArtist = (state: RootState) => selectAudioSplitterState(state).artist
export const selectAlbum = (state: RootState) => selectAudioSplitterState(state).album
export const selectYear = (state: RootState) => selectAudioSplitterState(state).year
export const selectGenre = (state: RootState) => selectAudioSplitterState(state).genre
export const selectTimestamps = (state: RootState) => selectAudioSplitterState(state).timestamps
export const selectUseTextMode = (state: RootState) => selectAudioSplitterState(state).useTextMode
export const selectTextInput = (state: RootState) => selectAudioSplitterState(state).textInput
export const selectAudioSrc = (state: RootState) => selectAudioSplitterState(state).audioSrc
export const selectCoverArtPreview = (state: RootState) => selectAudioSplitterState(state).coverArtPreview
export const selectProgress = (state: RootState) => selectAudioSplitterState(state).progress
export const selectError = (state: RootState) => selectAudioSplitterState(state).error
export const selectSuccess = (state: RootState) => selectAudioSplitterState(state).success
export const selectRecaptcha = (state: RootState) => selectAudioSplitterState(state).recapatcha
export const selectDownloadIndividualFiles = (state: RootState) =>
    selectAudioSplitterState(state).downloadIndividualFiles
export const selectUploadProgress = (state: RootState) => selectAudioSplitterState(state).uploadProgress
export const selectFileUploadProgress = (state: RootState) => selectAudioSplitterState(state).fileUploadProgress
export const selectZipFileKey = (state: RootState) => selectAudioSplitterState(state).zipFileKey
export const selectIsAlbumInfoDrawerOpen = (state: RootState) => selectAudioSplitterState(state).isAlbumInfoDrawerOpen
export const selectIsPlaying = (state: RootState) => selectAudioSplitterState(state).isPlaying
export const selectIsWaveformLoading = (state: RootState) => selectAudioSplitterState(state).isWaveformLoading
export const selectZoomLevel = (state: RootState) => selectAudioSplitterState(state).zoomLevel
export const selectCurrentPlaybackTime = (state: RootState) => selectAudioSplitterState(state).currentPlaybackTime
export const selectIsViewAllTracksMode = (state: RootState) => selectAudioSplitterState(state).isViewAllTracksMode
export const selectShouldShowReaptcha = (state: RootState) => selectAudioSplitterState(state).shouldShowReaptcha
export const selectAudioCodec = (state: RootState) => selectAudioSplitterState(state).audioCodec
export const selectAudioBitrate = (state: RootState) => selectAudioSplitterState(state).audioBitrate

export const selectTourStep = (state: RootState) => selectAudioSplitterState(state).tourStep

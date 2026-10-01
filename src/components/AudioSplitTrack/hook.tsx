'use client'
import { AudioSplitTrackProgressTypes, Timestamp } from '@app/audio-tools/split-track/types'
import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    timestampToSeconds,
    parseTimestamps,
    parseResponseMessage,
    formatTime,
    generateNewTimestampId,
    sortAndChainTimestamps,
    findTimestampProblems,
} from './utils'
import { AudioSplitTrackStateReturnValue } from './types'
import WaveSurfer from 'wavesurfer.js'
import { parseTimeToSeconds } from './components/waveform/utilities'
import RegionsPlugin, { Region } from 'wavesurfer.js/dist/plugins/regions'
import { actions } from '@redux/reducers/audio-splitter'
import { useDispatch, useSelector } from 'react-redux'
import { bindActionCreators } from '@reduxjs/toolkit'
import {
    selectAlbum,
    selectArtist,
    selectAudioSrc,
    selectCoverArtPreview,
    selectCurrentPlaybackTime,
    selectGenre,
    selectRecaptcha,
    selectTextInput,
    selectTimestamps,
    selectYear,
    selectZoomLevel,
    selectAudioCodec,
    selectAudioBitrate,
    selectDownloadIndividualFiles,
} from '@redux/selectors/audio-splitter'
import { getFile, useIndexedDBFile } from '@src/utils/storage/indexDB'

const useAudioSplitTrackState: () => AudioSplitTrackStateReturnValue = () => {
    const {
        setIsLoading,
        setHasResults,
        setTimestamps,
        setUseTextMode,
        setAudioSrc,
        setCoverArtPreview,
        setProgress,
        setError,
        setSuccess,
        setUploadProgress,
        setZipFileKey,
        setRecapatcha,
        setDownloadIndividualFiles,
        setIsAlbumInfoDrawerOpen,
        setCurrentPlaybackTime,
        setFileUploadProgress,
        setIsPlaying,
        setZoomLevel,
        clearErrorList,
        clearProgress,
        replaceTimestamps,
        handleAddTimestamp,
        resetState,
    } = bindActionCreators(actions, useDispatch())

    const [file, setFile, clearFile] = useIndexedDBFile('track-file')
    const [coverArt, setCoverArt, clearCoverArt] = useIndexedDBFile('cover-art')
    const regionsPluginRef = useRef<RegionsPlugin | null>(null)
    const [isWaveSurferReady, setIsWaveSurferReady] = useState<boolean>(false)
    const [isWaveformLoading, setIsWaveformLoading] = useState<boolean>(false)
    // 0–100 while WaveSurfer fetches the audio; decoding follows and has no progress events
    const [waveformLoadProgress, setWaveformLoadProgress] = useState<number>(0)
    // true until we know whether IndexedDB holds a previous session's files
    const [isRestoringSession, setIsRestoringSession] = useState<boolean>(true)

    const artist = useSelector(selectArtist)
    const album = useSelector(selectAlbum)
    const year = useSelector(selectYear)
    const genre = useSelector(selectGenre)
    const timestamps = useSelector(selectTimestamps)
    const textInput = useSelector(selectTextInput)
    const audioSrc = useSelector(selectAudioSrc)
    const coverArtPreview = useSelector(selectCoverArtPreview)
    const recapatcha = useSelector(selectRecaptcha)
    const zoomLevel = useSelector(selectZoomLevel)
    const currentPlaybackTime = useSelector(selectCurrentPlaybackTime)
    const audioCodec = useSelector(selectAudioCodec)
    const audioBitrate = useSelector(selectAudioBitrate)
    const downloadIndividualFiles = useSelector(selectDownloadIndividualFiles)

    const wavesurferRef = useRef<any | null>(null)
    // The waveform container is mounted/unmounted independently of audioSrc (pre-hydration shell,
    // view-all mode), so it lives in state: WaveSurfer inits when *both* exist.
    const [waveformContainer, setWaveformContainer] = useState<HTMLDivElement | null>(null)
    const wavesurfContainerRef = useCallback((el: HTMLDivElement | null) => setWaveformContainer(el), [])

    const processFileChange = ({ file }: { file: File }) => {
        setFile(file)
        setAudioSrc(URL.createObjectURL(file)) // Create audio source
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0]
            processFileChange({ file: selectedFile })
            setIsAlbumInfoDrawerOpen(true)
        }
    }

    const handleZoom = (newZoomLevel: number) => {
        setZoomLevel(newZoomLevel)
        if (isWaveSurferReady && wavesurferRef.current) {
            wavesurferRef.current.zoom(newZoomLevel)
        }
    }

    // Restore a previous session's files from IndexedDB on mount. Blob URLs are never persisted
    // (see redux store transform), so this is the only way audioSrc / coverArtPreview get set after a reload.
    useEffect(() => {
        Promise.all([
            getFile('track-file').then((loadedFile) => {
                if (loadedFile) processFileChange({ file: loadedFile })
            }),
            getFile('cover-art').then((loadedCoverArt) => {
                if (loadedCoverArt) processCoverArtChange({ file: loadedCoverArt })
            }),
        ])
            .catch((err) => console.error('Failed to restore previous session', err))
            .finally(() => setIsRestoringSession(false))
    }, [])

    useEffect(() => {
        if (!audioSrc) return // No audio? Do nothing.
        if (!waveformContainer) return // No container yet? The effect re-runs once it mounts.
        if (wavesurferRef.current) return

        // Black-on-gradient to match the home cards; our own transport replaces the native control bar.
        wavesurferRef.current = WaveSurfer.create({
            container: waveformContainer,
            waveColor: 'rgba(0,0,0,0.28)',
            progressColor: '#000000',
            cursorColor: '#000000',
            cursorWidth: 2,
            // short phones (≤600px tall) get a slimmer wave so the track list keeps some room
            height: window.innerHeight <= 600 ? 40 : window.matchMedia('(max-width: 600px)').matches ? 56 : 96,
            barWidth: 3,
            barGap: 2,
            barRadius: 3,
            backend: 'MediaElement',
            minPxPerSec: zoomLevel,
            autoplay: false,
            normalize: true,
            mediaControls: false,
        })

        setIsWaveformLoading(true)
        setWaveformLoadProgress(0)
        wavesurferRef.current.load(audioSrc) // Load the audio
        wavesurferRef.current.on('loading', (percent: number) => setWaveformLoadProgress(Math.round(percent)))

        // 'ready' (audio decoded, duration known) rather than 'init': regions and the transport
        // both need a real duration, and after a reload the timestamps already exist at this point.
        wavesurferRef.current.on('ready', () => {
            setWaveformLoadProgress(100)
            setIsWaveformLoading(false)
            wavesurferRef.current?.zoom(zoomLevel)
            setIsWaveSurferReady(true)
        })
        wavesurferRef.current.on('play', () => setIsPlaying(true))
        wavesurferRef.current.on('pause', () => setIsPlaying(false))
        wavesurferRef.current.on('timeupdate', (timestamp: number) => setCurrentPlaybackTime(timestamp))
        wavesurferRef.current.on('error', (error: Error) => console.error('WaveSurfer error:', error))

        return () => {
            wavesurferRef.current?.destroy()
            wavesurferRef.current = null
            regionsPluginRef.current = null
            regionsByIdRef.current.clear()
            setIsWaveSurferReady(false)
        }
    }, [audioSrc, waveformContainer])

    // Handle mouse wheel zooming (optimized for MacBook touchpads)
    useEffect(() => {
        const element = waveformContainer
        if (!element) return

        const onWheel = (e: WheelEvent) => {
            e.preventDefault()
            const delta = e.deltaY
            const zoomChange = delta > 0 ? -5 : 5 // Adjust zoom sensitivity
            const newZoomLevel = Math.max(1, zoomLevel + zoomChange) // Min zoom level 1 for more visibility
            handleZoom(newZoomLevel)
        }

        element.addEventListener('wheel', onWheel)

        return () => {
            element.removeEventListener('wheel', onWheel)
        }
    }, [zoomLevel, handleZoom, waveformContainer])

    // One region per timestamp id, kept in sync by diffing: a title keystroke only updates that region's
    // label, a time edit only moves that region, and nothing else on the waveform is touched.
    const regionsByIdRef = useRef<Map<string, { region: Region; label: HTMLSpanElement; start: number; end: number; index: number }>>(
        new Map()
    )

    useEffect(() => {
        const ws = wavesurferRef.current
        if (!isWaveSurferReady || !ws) return

        let plugin = regionsPluginRef.current
        if (!plugin) {
            plugin = ws.registerPlugin(RegionsPlugin.create()) as RegionsPlugin
            regionsPluginRef.current = plugin
            regionsByIdRef.current.clear()
        }

        const known = regionsByIdRef.current
        const seen = new Set<string>()

        timestamps.forEach(({ id, start, end, title }, index) => {
            const startSeconds = parseTimeToSeconds(start)
            const endSeconds = end ? parseTimeToSeconds(end) : ws.getDuration()
            const text = title || `Track ${index + 1}`
            const color = index % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.10)'
            seen.add(id)

            const existing = known.get(id)
            if (existing) {
                if (existing.label.textContent !== text) existing.label.textContent = text
                if (existing.start !== startSeconds || existing.end !== endSeconds) {
                    existing.region.setOptions({ start: startSeconds, end: endSeconds })
                    existing.start = startSeconds
                    existing.end = endSeconds
                }
                if (existing.index !== index) {
                    existing.region.setOptions({ color })
                    existing.index = index
                }
                return
            }

            // small pill label in the corner of each region
            const label = document.createElement('span')
            label.textContent = text
            label.style.cssText =
                'display:inline-block;margin:6px;padding:2px 8px;border-radius:9999px;background:rgba(0,0,0,0.75);' +
                'color:#fff;font:600 11px/1.6 var(--font-body),sans-serif;white-space:nowrap;max-width:60%;overflow:hidden;text-overflow:ellipsis;pointer-events:none'

            const region = plugin!.addRegion({
                id,
                start: startSeconds,
                end: endSeconds,
                color,
                drag: false,
                resize: false,
                content: label,
            } satisfies Partial<Region>)
            known.set(id, { region, label, start: startSeconds, end: endSeconds, index })
        })

        // removed tracks
        known.forEach((entry, id) => {
            if (!seen.has(id)) {
                entry.region.remove()
                known.delete(id)
            }
        })
    }, [timestamps, isWaveSurferReady])

    const handleTimestampClick = (timestamp: string) => {
        const seconds = timestampToSeconds(timestamp)
        if (wavesurferRef.current) {
            wavesurferRef.current.setTime(seconds)
            wavesurferRef.current.play()
        }
    }

    const processCoverArtChange = ({ file }: { file: File }) => {
        setCoverArt(file)
        setCoverArtPreview(URL.createObjectURL(file))
    }

    const handleCoverArtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedImage = e.target.files[0]
            processCoverArtChange({ file: selectedImage })
        }
    }

    const handleAddTimestampWithCurrentTime = () => {
        const currentTime = currentPlaybackTime

        if (currentTime !== undefined) {
            // Format the current time as HH:MM:SS or MM:SS based on hours
            const formattedTime = formatTime(currentTime)
            handleAddTimestamp({ start: formattedTime })
        } else {
            console.error('Audio reference is not available')
        }
    }

    const handleRemoveTimestamp = (index: number) => {
        const newTimestamps = timestamps.filter((_, i) => i !== index)
        replaceTimestamps(newTimestamps)
    }

    const capatchaVerifyCallback = (data: any) => {
        setRecapatcha(data)
    }

    const handleTextModeSubmit = () => {
        const parsedTracks = parseTimestamps(textInput)
        const formattedTimestamps = sortAndChainTimestamps(
            parsedTracks.map((track, index) => ({
                start: track.start,
                end: '',
                title: track.title,
                id: generateNewTimestampId(timestamps, index),
            }))
        )
        replaceTimestamps(formattedTimestamps)
        setUseTextMode(false)
    }

    const handleDownloadIndividualFilesToggleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setDownloadIndividualFiles(event.target.checked)
    }

    const handleOnAlbumInfoSave = () => {
        if (!coverArtPreview)
            return alert('Please upload cover art. Just asking for a little creativity from you friend :p')
        setIsAlbumInfoDrawerOpen(false)
    }

    const clearMP3Upload = () => {
        if (confirm('This will clear your uploaded MP3 file and all progress. Are you sure?')) {
            clearFile()
            clearCoverArt()
            setCoverArtPreview(null)
            resetState()
        }
    }

    const handleEditAfterSubmitClick = () => {
        setHasResults(false)
        setFileUploadProgress({ percentComplete: 0, uploaded: 0, total: 0 })
        setUploadProgress(0)
        clearErrorList()
        setSuccess(null)
        setZipFileKey(null)
        clearProgress()
    }

    const togglePlayPause = () => {
        if (!wavesurferRef.current) return

        const ws = wavesurferRef.current
        // Check if it's playing and toggle accordingly
        if (ws.isPlaying()) {
            ws.pause()
        } else {
            ws.play()
        }
    }

    // Seek forward 10 seconds
    const seekForward = () => {
        if (wavesurferRef.current) {
            const newTime = Math.min(wavesurferRef.current.getDuration(), currentPlaybackTime + 10)
            wavesurferRef.current.setTime(newTime)
        }
    }

    // Seek backward 10 seconds
    const seekBackward = () => {
        if (wavesurferRef.current) {
            const newTime = Math.max(0, currentPlaybackTime - 10)
            wavesurferRef.current.setTime(newTime)
        }
    }

    // Skip to previous timestamp
    const skipToPreviousTrack = () => {
        if (!wavesurferRef.current || timestamps.length === 0) return

        const currentTime = currentPlaybackTime
        let prevTimestamp = timestamps
            .slice()
            .reverse()
            .find((ts) => ts.start && timestampToSeconds(ts.start) < currentTime)

        if (prevTimestamp) {
            wavesurferRef.current.setTime(timestampToSeconds(prevTimestamp.start))
        }
    }

    // Skip to next timestamp
    const skipToNextTrack = () => {
        if (!wavesurferRef.current || timestamps.length === 0) return

        const currentTime = currentPlaybackTime
        let nextTimestamp = timestamps.find((ts) => ts.start && timestampToSeconds(ts.start) > currentTime)

        if (nextTimestamp) {
            wavesurferRef.current.setTime(timestampToSeconds(nextTimestamp.start))
        }
    }

    // Keep track of playback time
    const trackDuration = wavesurferRef.current?.getDuration() || 0

    const currentSong: { index: number; title: string } = useMemo(() => {
        const currentTime = currentPlaybackTime

        // Find the current timestamp based on time
        const index = timestamps.findIndex((timestamp) => {
            const startTime = timestampToSeconds(timestamp.start)
            const endTime = timestamp.end ? timestampToSeconds(timestamp.end) : Infinity
            return currentTime >= startTime && currentTime < endTime
        })

        const { title = '' } = timestamps?.[index] ?? {}

        return { title, index }
    }, [timestamps, currentPlaybackTime])

    let messageBuffer: string = '' // Buffer to store incomplete messages
    // set when the stream reports an error, so the request is not treated as a result
    const streamFailedRef = useRef(false)

    // Function to handle each incoming chunk from the XMLHttpRequest onprogress event
    const handleEventStreamChunk = (chunk: string) => {
        const decodedChunk: string = chunk

        // Append the decoded chunk to the buffer
        messageBuffer += decodedChunk

        // Split on double newlines to process each event
        const messages: string[] = messageBuffer.split('\n\n')

        // Keep any incomplete message in the buffer for the next chunk
        messageBuffer = messages.pop() || ''

        // Process each complete message
        messages.forEach((msg: string) => {
            const { key, data } = parseResponseMessage(msg) // Assume this parses the SSE message

            switch (key) {
                case AudioSplitTrackProgressTypes.console:
                    setProgress(data) // Update console progress
                    break

                case AudioSplitTrackProgressTypes.track:
                    const trackData = JSON.parse(data)
                    setTimestamps(trackData as Timestamp)
                    break

                case AudioSplitTrackProgressTypes.progress:
                    setUploadProgress(Number(data))
                    break

                case AudioSplitTrackProgressTypes.error:
                    streamFailedRef.current = true
                    setError(data)
                    break

                case AudioSplitTrackProgressTypes.success:
                    setSuccess(data) // Mark success
                    break

                case AudioSplitTrackProgressTypes.tracks:
                    // Final tracklist handling
                    const tracksData = JSON.parse(data)
                    setZipFileKey(tracksData?.key)
                    break

                default:
                    console.error('Unknown event type:', key)
            }
        })
    }

    let accumulatedLength: number = 0

    const handleSubmit = () => {
        setHasResults(false) // Reset results state
        streamFailedRef.current = false
        if (!file) return alert('Please upload an MP3 file')
        if (!timestamps.length) return alert('Add at least one track first')

        // Refuse impossible cuts here rather than after a long upload
        clearErrorList()
        const problems = findTimestampProblems(timestamps, wavesurferRef.current?.getDuration() || 0)
        if (problems.length) {
            problems.forEach((p) => setError(`Error: ${p.message}`))
            return
        }

        const formData = new FormData()
        formData.append('file', file)
        if (coverArt) formData.append('coverArt', coverArt)
        formData.append('artist', artist)
        formData.append('album', album)
        formData.append('year', year)
        formData.append('genre', genre)
        formData.append('timestamps', JSON.stringify(timestamps))
        formData.append('recapatcha', recapatcha ?? '')
        formData.append('audioCodec', audioCodec)
        formData.append('audioBitrate', audioBitrate)
        formData.append('shouldUploadIndividualFiles', String(downloadIndividualFiles))

        // Create an XMLHttpRequest instance
        const xhr = new XMLHttpRequest()

        xhr.onprogress = function (): void {
            // Extract new unprocessed text from the response
            const newChunk = xhr.responseText.substring(accumulatedLength)

            // Update accumulated length to avoid reprocessing
            accumulatedLength = xhr.responseText.length

            // Pass the new chunk to the streaming handler
            handleEventStreamChunk(newChunk)
        }

        xhr.upload.onprogress = function (event) {
            if (event.lengthComputable) {
                const uploaded = event.loaded // Bytes uploaded so far
                const total = event.total // Total file size in bytes
                const percentComplete = (uploaded / total) * 100

                setFileUploadProgress({ percentComplete, uploaded, total }) // Update progress state
            }
        }

        xhr.onerror = function (): void {
            console.error('An error occurred during the request:', xhr.responseText)
            alert(
                "Ouch, something went really wrong. I apologize. I am a lone developers and bugs can be pesky. Try running this again please. I'll try my best to save your progress."
            )
            setFileUploadProgress({ percentComplete: 0, uploaded: 0, total: 0 })
            setIsLoading(false)
            setUploadProgress(0)
            setHasResults(false)
        }

        // Clean up loading state after request is finished
        xhr.onloadend = function () {
            setIsLoading(false) // Set loading state to false when done
            setUploadProgress(0)
            setFileUploadProgress({ percentComplete: 0, uploaded: 0, total: 0 })
            // A non-2xx reply is a plain text body, not an SSE stream (captcha rejected, bad input, crash):
            // surface it in the error list instead of silently showing an empty result.
            if (xhr.status >= 400) {
                setError(`Error: ${xhr.responseText?.trim() || `request failed (${xhr.status})`}`)
                setHasResults(false)
                return
            }
            // A failed stream (ffmpeg error etc.) is not a result either: keep the track list on screen
            // so nobody loses the timestamps they just entered.
            setHasResults(!streamFailedRef.current)
        }

        // Set up the request
        xhr.open('POST', '/audio-tools/split-track', true)

        // Start the upload
        setIsLoading(true) // Set loading state to true before sending
        xhr.send(formData) // Send the form data
    }

    return {
        wavesurferRef,
        handleFileChange,
        handleTimestampClick,
        handleCoverArtChange,
        handleAddTimestamp,
        handleRemoveTimestamp,
        handleTextModeSubmit,
        handleSubmit,
        handleAddTimestampWithCurrentTime,
        handleDownloadIndividualFilesToggleChange,
        capatchaVerifyCallback,
        handleOnAlbumInfoSave,
        clearMP3Upload,
        currentSong,
        togglePlayPause,
        seekForward,
        seekBackward,
        skipToPreviousTrack,
        skipToNextTrack,
        trackDuration,
        wavesurfContainerRef,
        handleEditAfterSubmitClick,
        isWaveformLoading,
        waveformLoadProgress,
        isWaveSurferReady,
        isRestoringSession,
    } as AudioSplitTrackStateReturnValue
}

export default useAudioSplitTrackState

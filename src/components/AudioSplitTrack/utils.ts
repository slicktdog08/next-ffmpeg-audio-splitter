import { useEffect, useState } from 'react'
import { AudioSplitTrackProgressTypes, Timestamp } from '@app/audio-tools/split-track/types'

interface ParsedTrack {
    start: string
    title: string
}

/**
 * Parses a string containing timestamps and track titles.
 * @param input - A string where each line contains a timestamp and track title.
 * @returns An array of ParsedTrack objects with 'start' and 'title'.
 */
export function parseTimestamps(input: string): ParsedTrack[] {
    const lines = input.split('\n') // Split the input by newlines
    const parsedTracks: ParsedTrack[] = []

    // Regular expression to match a variety of timestamp formats like 'mm:ss', 'h:mm:ss', 'mm.ss', etc.
    const timestampRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/

    lines.forEach((line) => {
        const match = line.match(timestampRegex)
        if (match) {
            const timestamp = match[1].trim() // Extract the timestamp part
            const title = line.replace(match[0], '').replace('-', '').trim() // Extract the title by removing the timestamp
            parsedTracks.push({ start: timestamp, title })
        }
    })

    return parsedTracks
}

export function timestampsToTextBlock(timestamps: Timestamp[]): string {
    return timestamps.map((timestamp) => `${timestamp.start} ${timestamp.title}`).join('\n')
}
/**
 * Validates whether a string is a valid timestamp format (MM:SS or HH:MM:SS).
 * @param timestamp - The string to validate.
 * @returns true if the string is a valid timestamp, false otherwise.
 */
export function isValidTimestamp(timestamp: string): boolean {
    const regex = /^(\d{1,2}:\d{2}|\d{1,2}:\d{2}:\d{2})$/ // Regex to match MM:SS or HH:MM:SS format
    return regex.test(timestamp)
}

// Utility to convert timestamps from MM:SS or HH:MM:SS to seconds
export const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number)
    if (parts.length === 2) {
        // MM:SS format
        return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
        // HH:MM:SS format
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return 0
}

interface ParsedMessage {
    key: keyof typeof AudioSplitTrackProgressTypes
    data: string
}

export function parseResponseMessage(msg: string): ParsedMessage {
    // Iterate over all enum values
    for (const key in AudioSplitTrackProgressTypes) {
        const prefix = AudioSplitTrackProgressTypes[key as keyof typeof AudioSplitTrackProgressTypes]

        if (msg.startsWith(`${prefix}:`)) {
            // Strip off the prefix and colon, then return the key and the remaining value
            return {
                key: key as keyof typeof AudioSplitTrackProgressTypes,
                data: msg.slice(prefix.length + 1).trim(),
            }
        }
    }
    // If no match, return null
    console.error(`Could not parse this response`, msg)
    return { key: 'error', data: `Client could not parse a response event.` }
}

// Helper function to format time as HH:MM:SS or MM:SS
export const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Sort tracks by start time and make every track end where the next one begins (the last one runs to
 * the end of the audio). Used whenever a track is added, so adding out of order can never produce a
 * track that ends before it starts.
 */
export const sortAndChainTimestamps = (timestamps: Timestamp[]): Timestamp[] => {
    const sorted = [...timestamps].sort((a, b) => timestampToSeconds(a.start) - timestampToSeconds(b.start))
    return sorted.map((t, i) => ({ ...t, end: sorted[i + 1]?.start ?? '' }))
}

export interface TimestampProblem {
    index: number
    message: string
}

/** Client-side mirror of the server's checks so users get told before uploading a 100 MB file. */
export const findTimestampProblems = (timestamps: Timestamp[], durationSeconds: number): TimestampProblem[] => {
    const problems: TimestampProblem[] = []
    timestamps.forEach((t, index) => {
        const name = t.title?.trim() || `Track ${index + 1}`
        if (!isValidTimestamp(t.start)) {
            problems.push({ index, message: `${name}: start time "${t.start}" isn't a valid MM:SS time.` })
            return
        }
        if (t.end && !isValidTimestamp(t.end)) {
            problems.push({ index, message: `${name}: end time "${t.end}" isn't a valid MM:SS time.` })
            return
        }
        const start = timestampToSeconds(t.start)
        const end = t.end ? timestampToSeconds(t.end) : durationSeconds
        if (durationSeconds && start >= durationSeconds) {
            problems.push({ index, message: `${name}: starts at ${t.start}, after the audio ends (${formatTime(durationSeconds)}).` })
        } else if (t.end && end <= start) {
            problems.push({ index, message: `${name}: ends (${t.end}) before it starts (${t.start}).` })
        }
    })
    return problems
}

export const generateNewTimestampId = (timestamps: Timestamp[], index?: number) =>
    `timestamp-id-${index ?? timestamps?.length + 1}`

/** Matches the tool's single breakpoint (600px) used to swap desktop/mobile sub-layouts. */
export const SMALL_SCREEN_QUERY = '(max-width: 600px)'

export const useIsSmallScreen = () => {
    const [isSm, setIsSm] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia(SMALL_SCREEN_QUERY)
        setIsSm(mq.matches)
        const handler = (e: MediaQueryListEvent) => setIsSm(e.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [])
    return isSm
}

/** false during SSR and the hydration render, true afterwards. */
export const useHasMounted = () => {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    return mounted
}

export interface VisualViewportState {
    /** height of the part of the page the user can actually see (shrinks for the on-screen keyboard) */
    height: number | null
    /** how far the visual viewport is scrolled from the layout viewport's top (iOS shifts the page for the keyboard) */
    offsetTop: number
    /** true when the visible area is much shorter than the window — i.e. the keyboard is up */
    keyboardOpen: boolean
}

/**
 * Tracks `window.visualViewport`. Mobile browsers, iOS especially, do not shrink the layout viewport for the
 * on-screen keyboard, so a `position: fixed; inset: 0` app keeps its full height and the bottom of it —
 * including whatever input just got focus — ends up under the keyboard. Sizing the app to the visual
 * viewport instead keeps everything reachable.
 */
export const useVisualViewport = (): VisualViewportState => {
    const [state, setState] = useState<VisualViewportState>({ height: null, offsetTop: 0, keyboardOpen: false })

    useEffect(() => {
        const vv = window.visualViewport
        if (!vv) return
        const update = () => {
            const height = Math.round(vv.height)
            setState({
                height,
                offsetTop: Math.round(vv.offsetTop),
                keyboardOpen: height < window.innerHeight * 0.75,
            })
        }
        update()
        vv.addEventListener('resize', update)
        vv.addEventListener('scroll', update)
        return () => {
            vv.removeEventListener('resize', update)
            vv.removeEventListener('scroll', update)
        }
    }, [])

    return state
}

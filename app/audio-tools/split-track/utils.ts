import ffmpeg from 'fluent-ffmpeg'
import fs, { createReadStream } from 'fs'
import path from 'path'
import NodeID3, { Tags } from 'node-id3'
import {
    AudioCodec,
    AudioSplitTrackProgressTypes,
    SplitTrackFileType,
    SplitTrackProgressEvent,
    UploadSplitTrackToS3Params,
} from './types'
import { putSplitTrackFile } from './storage'

import archiver from 'archiver'

// Define types for the function parameters
interface Timestamp {
    id: string
    start: string
    end?: string
    title: string
}

interface TrackInfo {
    inputAudioPath: string
    artist: string
    album: string
    year: number
    genre: string
    coverArtPath: string
    timestamps: Timestamp[]
}

interface ProcessTracksParams {
    outputDir: string
    tracks: TrackInfo[]
    progress: SplitTrackProgressEvent
    pid: string
    shouldUploadFileToS3?: boolean
    audioCodec?: string
    audioBitrate?: string
}

export const zipDirectory = (sourceDir: string, outPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outPath)
        const archive = archiver('zip', { zlib: { level: 9 } })

        // Handle errors
        output.on('close', () => resolve())
        archive.on('error', (err: any) => reject(err))

        // Pipe archive data to the output file
        archive.pipe(output)

        // Append files from the source directory into the archive
        archive.directory(sourceDir, false)

        archive.finalize()
    })
}

function timestampToMillis(timestamp: string): number {
    const parts = timestamp.split(':')
    if (parts.length === 3) {
        return (parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10)) * 1000
    } else if (parts.length === 2) {
        return (parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)) * 1000
    } else {
        throw new Error('Timestamp format is incorrect')
    }
}

async function getAudioDuration(inputAudioPath: string): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        ffmpeg.ffprobe(inputAudioPath, (err, metadata) => {
            if (err) return reject(err)
            resolve(metadata.format.duration ? metadata.format.duration * 1000 : 0)
        })
    })
}

/**
 * Get the appropriate file extension based on the audio codec
 */
function getFileExtensionForCodec(audioCodec: AudioCodec): string {
    switch (audioCodec) {
        case 'copy':
            return '.mp3'
        case 'libmp3lame':
            return '.mp3'
        case 'aac':
            return '.m4a' // AAC is typically stored in M4A containers
        case 'libopus':
            return '.opus'
        default:
            return '.mp3'
    }
}

const MIME_BY_MAGIC: [number[], string][] = [
    [[0x89, 0x50, 0x4e, 0x47], 'image/png'],
    [[0xff, 0xd8, 0xff], 'image/jpeg'],
    [[0x47, 0x49, 0x46], 'image/gif'],
    [[0x52, 0x49, 0x46, 0x46], 'image/webp'],
]

/** Sniff the cover's real type so the ID3 APIC frame is right even when a PNG is uploaded as ".jpg". */
export function detectImageMime(data: Buffer): string {
    for (const [magic, mime] of MIME_BY_MAGIC) {
        if (magic.every((byte, i) => data[i] === byte)) return mime
    }
    return 'image/jpeg'
}

export interface Segment {
    index: number
    title: string
    start: string
    end?: string
    startSeconds: number
    endSeconds: number
}

/**
 * Turn the user's timestamps into concrete cut points, refusing anything ffmpeg would choke on
 * (a track that ends before it starts, or starts after the audio ends) with a message that names the track.
 */
export function resolveSegments(timestamps: Timestamp[], totalDurationMs: number): Segment[] {
    const totalSeconds = totalDurationMs / 1000
    return timestamps.map((timestamp, index) => {
        const title = timestamp.title?.trim() || `Track ${index + 1}`
        let startSeconds: number
        try {
            startSeconds = timestampToMillis(timestamp.start) / 1000
        } catch {
            throw new Error(`Track "${title}" has an invalid start time "${timestamp.start}". Use MM:SS or HH:MM:SS.`)
        }
        let endSeconds = totalSeconds
        if (timestamp.end?.trim()) {
            try {
                endSeconds = timestampToMillis(timestamp.end) / 1000
            } catch {
                throw new Error(`Track "${title}" has an invalid end time "${timestamp.end}". Use MM:SS or HH:MM:SS.`)
            }
        }
        if (startSeconds >= totalSeconds) {
            throw new Error(
                `Track "${title}" starts at ${timestamp.start}, but the audio is only ${formatSeconds(totalSeconds)} long.`
            )
        }
        if (endSeconds > totalSeconds) endSeconds = totalSeconds
        if (endSeconds <= startSeconds) {
            throw new Error(
                `Track "${title}" ends (${timestamp.end}) before it starts (${timestamp.start}). Fix its times and try again.`
            )
        }
        return { index, title, start: timestamp.start, end: timestamp.end, startSeconds, endSeconds }
    })
}

const formatSeconds = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
}

const ID3_METADATA_KEYS = { title: 'title', artist: 'artist', album: 'album', date: 'date', genre: 'genre', track: 'track' }

export async function processTracks(params: ProcessTracksParams): Promise<void> {
    const {
        outputDir,
        tracks,
        progress,
        pid,
        shouldUploadFileToS3,
        audioCodec = 'copy',
        audioBitrate = '128k',
    } = params

    for (const trackInfo of tracks) {
        const { inputAudioPath, artist, album, year, genre, coverArtPath, timestamps } = trackInfo

        // Validate if the cover art file exists
        if (!fs.existsSync(coverArtPath)) {
            throw new Error(`Cover art file not found: ${coverArtPath}`)
        }

        // Load cover art
        const coverArtData: Buffer = fs.readFileSync(coverArtPath)
        const coverArtMime = detectImageMime(coverArtData)

        // Get the duration of the input audio file, then validate every cut before touching ffmpeg
        const totalDuration = await getAudioDuration(inputAudioPath)
        const segments = resolveSegments(timestamps, totalDuration)
        await ensureDirectoryExistence(outputDir)

        const fileExtension = getFileExtensionForCodec(audioCodec as AudioCodec)
        const isMp3Output = fileExtension === '.mp3'
        // audioBitrate arrives as '128k'; fluent-ffmpeg wants a number in kbps
        const safeBitrate = parseInt(audioBitrate, 10) || 128

        for (const segment of segments) {
            const { index, title, startSeconds, endSeconds } = segment
            progress(AudioSplitTrackProgressTypes.progress, `${((index / segments.length) * 100).toFixed(1)}`)

            const duration = endSeconds - startSeconds
            const outputFilePath: string = path.join(outputDir, `${sanitizeFileName(title)}${fileExtension}`)

            // Tags every container understands; mp3 gets a full ID3 rewrite (with cover) afterwards.
            const metadata = [
                `${ID3_METADATA_KEYS.title}=${title}`,
                `${ID3_METADATA_KEYS.artist}=${artist}`,
                `${ID3_METADATA_KEYS.album}=${album}`,
                `${ID3_METADATA_KEYS.date}=${year}`,
                `${ID3_METADATA_KEYS.genre}=${genre}`,
                `${ID3_METADATA_KEYS.track}=${index + 1}/${segments.length}`,
            ].flatMap((kv) => ['-metadata', kv])

            await new Promise<string>((resolve, reject) => {
                let command = ffmpeg(inputAudioPath)
                    .setStartTime(startSeconds)
                    .setDuration(duration)
                    // Only the first audio stream. Sources often carry an embedded cover as an
                    // "attached picture" video stream, which must not be trimmed/re-encoded per track.
                    // NB: variadic form — fluent-ffmpeg splits array entries on spaces ("artist=E2E Artist" → two args).
                    .outputOptions('-map', '0:a:0', '-map_metadata', '-1', ...metadata)
                    .audioCodec(audioCodec)

                if (audioCodec !== 'copy') command = command.audioBitrate(safeBitrate)

                // AAC/M4A can carry the cover as an attached picture; ID3 has no meaning in an MP4 container.
                if (audioCodec === 'aac') {
                    command = command
                        .input(coverArtPath)
                        .outputOptions('-map', '1:v:0', '-c:v', coverArtMime === 'image/png' ? 'png' : 'mjpeg', '-disposition:v:0', 'attached_pic')
                }

                command
                    .output(outputFilePath)
                    .on('start', (cmd: string) => console.log('FFMPEG:', cmd))
                    .on('stderr', (line: string) => {
                        if (process.env.SPLIT_TRACK_FFMPEG_VERBOSE === 'true') console.log('FFMPEG STDERR:', line)
                    })
                    .on('end', () => resolve(outputFilePath))
                    .on('error', (err: Error, _stdout: string | null, stderr: string | null) => {
                        const detail = (stderr || err.message || '').trim().split('\n').filter(Boolean).slice(-3).join(' | ')
                        reject(new Error(`ffmpeg could not cut "${title}": ${detail}`))
                    })
                    .run()
            })

            if (isMp3Output) {
                // Full ID3v2 rewrite including the front cover
                const tags: Tags = {
                    title,
                    trackNumber: `${index + 1}/${segments.length}`,
                    artist,
                    album,
                    year: year.toString(),
                    genre,
                    image: {
                        mime: coverArtMime,
                        type: { id: 3, name: 'front cover' },
                        description: 'Cover',
                        imageBuffer: coverArtData,
                    },
                }
                const written = NodeID3.write(tags, outputFilePath)
                if (written !== true) throw new Error(`Could not write ID3 tags for "${title}"`)
            }

            const fileName = path.basename(outputFilePath)
            progress(AudioSplitTrackProgressTypes.console, `Track '${title}' successfully written.`)
            let s3UploadKey: string | null = null
            if (shouldUploadFileToS3) {
                const s3Upload = await uploadSplitTrackFileToS3({
                    data: createReadStream(outputFilePath) as any,
                    name: fileName,
                    pid,
                    type: SplitTrackFileType.TRACK,
                })
                s3UploadKey = s3Upload.Key
                progress(AudioSplitTrackProgressTypes.console, `Track '${title}' successfully uploaded.`)
            }
            progress(
                AudioSplitTrackProgressTypes.track,
                JSON.stringify({
                    ...timestamps[index],
                    url: s3UploadKey,
                    duration: duration.toString(),
                } as Timestamp)
            )
        }
    }
    progress(AudioSplitTrackProgressTypes.console, 'All tracks have been split, exported, and tagged with cover art.')
}
/**
 * Store a finished track/zip so the client can download it by key.
 * Backed by S3 or the local filesystem depending on SPLIT_TRACK_STORAGE — see storage.ts.
 */
export const uploadSplitTrackFileToS3 = putSplitTrackFile

export const ensureDirectoryExistence = (filePath: string) =>
    new Promise<void>((resolve, reject) => {
        fs.mkdir(filePath, { recursive: true }, (error) => {
            if (error) {
                reject(error)
            }
            resolve()
        })
    })

/**
 * Generates a timestamps.txt file and writes it to the specified output directory.
 * Provides progress updates via sendProgress.
 * @param {string} outputDir - The directory where the timestamps.txt file should be saved.
 * @param {Array<{ start: string, end: string }>} timestamps - The array of timestamps.
 * @param {SplitTrackProgressEvent} sendProgress - The function to send progress updates.
 * @returns {Promise<string | null>} - The path of the generated timestamps file.
 */
export async function generateTimestampsFile(
    outputDir: string,
    timestamps: Timestamp[],
    sendProgress: SplitTrackProgressEvent
): Promise<string | null> {
    try {
        if (!Array.isArray(timestamps) || timestamps.length === 0) {
            console.log('No timestamps provided to generateTimestampsFile')
            return null
        }

        await ensureDirectoryExistence(outputDir)

        const timestampsFilePath = path.join(outputDir, 'timestamps.txt')

        const timestampsText = timestamps
            .map((timestamp, index) => `${timestamp.title ?? `Track ${index}`}: ${timestamp.start} - ${timestamp.end}`)
            .join('\n')

        try {
            await fs.promises.writeFile(timestampsFilePath, timestampsText, 'utf8')
        } catch (error: any) {
            console.log(`File write error: ${error.message}`)
            return null
        }

        sendProgress(AudioSplitTrackProgressTypes.console, 'Timestamps file generated successfully!')
        return timestampsFilePath
    } catch (error) {
        console.error('Error generating timestamps.txt:', error)
        sendProgress(
            AudioSplitTrackProgressTypes.error,
            `Error generating timestamp file. Your output zip will be missing timestamps.`
        )
        return null
    }
}

export function sanitizeFileName(fileName: string): string {
    return fileName
        .replace(/[\/\\:*?"<>|]/g, '_') // Replace unsafe characters with '_'
        .replace(/\s+/g, ' ') // Normalize multiple spaces
        .trim() // Remove leading/trailing whitespace
        .replace(/^\.+/, '') // Prevent hidden files (no leading periods)
        .substring(0, 255) // Limit to 255 characters (max filename length)
}

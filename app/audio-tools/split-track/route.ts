import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import {
    AudioSplitTrackProgressTypes,
    SplitTrackProgressEvent,
    SplitTrackFileType,
    AudioCodec,
    AudioBitrate,
} from './types'
import {
    ensureDirectoryExistence,
    generateTimestampsFile,
    processTracks,
    sanitizeFileName,
    uploadSplitTrackFileToS3,
    zipDirectory,
} from './utils'
import { randomUUID } from 'crypto'
import { getSplitTrackOutputDir } from './constants'
import { AUDIO_SPLIT_TOOL_S3_PATH, getSplitTrackFile } from './storage'
import { verifyUserCapcha } from '@src/utils/verify-recaptcha'

export const runtime = 'nodejs'
// This is required to enable streaming
export const dynamic = 'force-dynamic'

// Define the GET route handler
export async function GET(request: NextRequest) {
    // Next normalises request.url (re-encodes the query string), so read the param properly and
    // rebuild the stored key: path segments are plain, the file name is stored URI-encoded (see storage.ts).
    const rawKey = request.nextUrl.searchParams.get('key')
    if (!rawKey) {
        return NextResponse.json({ error: 'Key query parameter is required' }, { status: 400 })
    }
    const segments = rawKey.split('/')
    const storedName = segments[segments.length - 1]
    const key = [...segments.slice(0, -1), encodeURIComponent(storedName)].join('/')
    // Browsers save a bare ".zip" as "zip" — always give the download a real name.
    const displayName = /^\.\w+$/.test(storedName) ? `tracks${storedName}` : storedName

    // only files this tool produced are downloadable
    if (!key.startsWith(`${AUDIO_SPLIT_TOOL_S3_PATH}/`) || segments.includes('..')) {
        return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
    }

    try {
        // Fetch the file from storage (S3 or local, see storage.ts) using the key
        const data = await getSplitTrackFile(key)

        // Check if the file exists and return its content
        if (!data?.body) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 })
        }

        // Return the file content as a stream, named as the user typed it
        return new NextResponse(data.body as any, {
            status: 200,
            headers: {
                'Content-Type': data.contentType,
                'Content-Disposition': `attachment; filename="${displayName.replace(/[^\x20-\x7e]|"/g, '_')}"; filename*=UTF-8''${encodeURIComponent(displayName)}`,
            },
        })
    } catch (error) {
        // Handle any errors that occur
        console.error('Error fetching file from S3:', error)
        return NextResponse.json({ error: 'Failed to fetch the file' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        // random process id to follow process
        const pid = randomUUID()

        // Extract files and metadata from the formData
        const file = formData.get('file') as File | null
        const coverArt = formData.get('coverArt') as File | null
        const artist = formData.get('artist') as string
        const album = formData.get('album') as string
        const year = formData.get('year') as string
        const genre = formData.get('genre') as string
        const recapatcha = formData.get('recapatcha') as string
        const timestamps = JSON.parse(formData.get('timestamps') as string)
        const shouldUploadIndividualFiles = formData.get('shouldUploadIndividualFiles') === 'true'
        const audioCodec = (formData.get('audioCodec') as AudioCodec) || 'copy'
        const audioBitrate = (formData.get('audioBitrate') as AudioBitrate) || '128k'

        // Validate input
        if (!file) {
            return new NextResponse('No audio file provided', { status: 400 })
        }

        if (!timestamps || !Array.isArray(timestamps)) {
            return new NextResponse('Invalid timestamps supplied', { status: 400 })
        }
        try {
            await verifyUserCapcha(recapatcha)
        } catch (err) {
            console.error('Error verifying recaptcha:', err)
            return new NextResponse('Recaptcha verification failed', { status: 401 })
        }

        const audioFileInputDir = getSplitTrackOutputDir(pid, SplitTrackFileType.TRACK_SOURCE)
        const audioFileOutputDir = getSplitTrackOutputDir(pid, SplitTrackFileType.TRACK)
        const audioFilesOutputDir = getSplitTrackOutputDir(pid, SplitTrackFileType.TRACKS)
        const coverArtInputDir = getSplitTrackOutputDir(pid, SplitTrackFileType.COVER_ART)

        // Create paths for storing the temporary files
        const safeFileName = sanitizeFileName(file.name)
        const audioFilePath = path.join(audioFileInputDir, encodeURIComponent(safeFileName))
        const safeCoverArtFileName = sanitizeFileName(coverArt?.name ?? 'unknown_cover_art_file_name')
        const coverArtFilePath = coverArt
            ? path.join(coverArtInputDir, encodeURIComponent(safeCoverArtFileName))
            : 'unknown'

        // Store the files locally
        await ensureDirectoryExistence(audioFileInputDir)
        await fs.writeFile(audioFilePath, new Uint8Array(await file.arrayBuffer()))
        if (coverArt) {
            await ensureDirectoryExistence(coverArtInputDir)
            await fs.writeFile(coverArtFilePath!, new Uint8Array(await coverArt.arrayBuffer()))
        }

        // Create an encoder for SSE
        const encoder = new TextEncoder()
        let sendProgress: SplitTrackProgressEvent

        const stream = new ReadableStream({
            start(controller) {
                sendProgress = (type, message) => {
                    controller.enqueue(encoder.encode(`${type}: ${message}\n\n`))
                }
                ;(async () => {
                    try {
                        sendProgress(
                            AudioSplitTrackProgressTypes.console,
                            "So you want to make your long MP3 an album? :) Let's do it!"
                        )

                        // Log the processing options
                        if (audioCodec === 'copy') {
                            sendProgress(
                                AudioSplitTrackProgressTypes.console,
                                `Processing with original audio codec (fastest processing)`
                            )
                        } else {
                            sendProgress(
                                AudioSplitTrackProgressTypes.console,
                                `Processing with ${audioCodec} codec at ${audioBitrate} bitrate`
                            )
                        }

                        // Call the function to process tracks
                        await ensureDirectoryExistence(audioFileOutputDir)
                        await processTracks({
                            pid,
                            outputDir: audioFileOutputDir,
                            tracks: [
                                {
                                    inputAudioPath: audioFilePath,
                                    artist,
                                    album,
                                    year: Number(year),
                                    genre,
                                    coverArtPath: coverArtFilePath,
                                    timestamps,
                                },
                            ],
                            progress: sendProgress,
                            shouldUploadFileToS3: shouldUploadIndividualFiles,
                            audioCodec,
                            audioBitrate,
                        })

                        sendProgress(
                            AudioSplitTrackProgressTypes.console,
                            "Let's create a timestamps.txt because we don't want to lose those."
                        )
                        await ensureDirectoryExistence(audioFilesOutputDir)
                        await generateTimestampsFile(audioFileOutputDir, timestamps, sendProgress)

                        sendProgress(
                            AudioSplitTrackProgressTypes.console,
                            'Poof, now we are creating your download link. This may take a little while.'
                        )
                        const zipFilePath = `${audioFilesOutputDir}/${file.name}.zip`
                        await zipDirectory(audioFileOutputDir, zipFilePath)
                        const zipFileData = await fs.readFile(zipFilePath)
                        // Name the zip after the album, falling back to the source file so it is never just ".zip"
                        const zipName = sanitizeFileName(album || path.parse(file.name).name || 'tracks') || 'tracks'
                        const s3ZipUpload = await uploadSplitTrackFileToS3({
                            data: zipFileData,
                            name: zipName,
                            pid,
                            type: SplitTrackFileType.TRACKS,
                        })

                        sendProgress(
                            AudioSplitTrackProgressTypes.success,
                            'All tracks have been processed successfully'
                        )
                        sendProgress(
                            AudioSplitTrackProgressTypes.console,
                            'Watch below for your download link shortly.'
                        )
                        // Send final list of processed tracks in ZIP format
                        sendProgress(AudioSplitTrackProgressTypes.tracks, JSON.stringify({ key: s3ZipUpload.Key }))

                        // Clean up temporary files
                        await fs.unlink(audioFilePath)
                        if (coverArtFilePath) {
                            await fs.unlink(coverArtFilePath)
                        }
                    } catch (error: any) {
                        sendProgress(AudioSplitTrackProgressTypes.error, `Error: ${error.message}`)
                    } finally {
                        controller.close()
                    }
                })()
            },
        })

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'Transfer-Encoding': 'chunked',
            },
        })
    } catch (error: any) {
        console.error('Error processing request:', error)
        return new NextResponse('Failed to process request', { status: 500 })
    }
}

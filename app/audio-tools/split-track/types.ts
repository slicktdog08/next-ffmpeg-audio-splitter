export enum AudioSplitTrackProgressTypes {
    console = 'console',
    track = 'track',
    tracks = 'tracks',
    error = 'error',
    success = 'success',
    progress = 'progress',
}

export interface SplitTrackProgressEvent {
    (type: AudioSplitTrackProgressTypes, message: string): void
}

export interface Timestamp {
    start: string
    end?: string
    title: string
    id: string
    url?: string
    duration?: string
}

export interface TrackInfo {
    inputAudioPath: string
    artist: string
    album: string
    year: number
    genre: string
    coverArtPath: string
    timestamps: Timestamp[]
}

export interface ProcessTracksParams {
    outputDir: string
    tracks: TrackInfo[]
    progress: SplitTrackProgressEvent
    pid: string
    shouldUploadFileToS3?: boolean
    audioCodec?: AudioCodec
    audioBitrate?: AudioBitrate
}

export interface AudioSplitRequestParams {
    file: File
    coverArt: File
    name: string
    artist: string
    album: string
    year: string
    genre: string
    timestamps: Timestamp[]
}

export interface UploadSplitTrackToS3Params {
    data: any
    name: string
    pid: string
    type: SplitTrackFileType
}

export enum SplitTrackFileType {
    TRACK = 'track',
    TRACKS = 'tracks',
    COVER_ART = 'cover-art',
    TRACK_SOURCE = 'track-source',
}

/**
 * Audio codec options - focused on practical choices for MP3 processing
 */
export type AudioCodec =
    | 'copy' // Keep original quality (fastest, recommended)
    | 'libmp3lame' // Re-encode as MP3 (universal compatibility)
    | 'aac' // Re-encode as AAC (smaller files, good quality)
    | 'libopus' // Re-encode as Opus (best compression, modern)

/**
 * Audio bitrate options when re-encoding
 */
export type AudioBitrate =
    | '128k' // Standard quality (FFmpeg default)
    | '192k' // High quality
    | '256k' // Very high quality
    | '320k' // Maximum quality

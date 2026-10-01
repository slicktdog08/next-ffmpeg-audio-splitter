/** Shown in the header wordmark, page title and the exported tracklist. Override per deployment. */
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'MP3 Track Splitter'

/** Where the source lives; forks should point this at their own repo. */
export const SOURCE_URL =
    process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/slicktdog08/next-ffmpeg-audio-splitter'

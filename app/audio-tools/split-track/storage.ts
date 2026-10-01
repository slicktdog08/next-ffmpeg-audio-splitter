import fs, { createReadStream, createWriteStream } from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import s3, { AWS_BUCKET_NAME } from '@src/utils/aws'
import { getObjectFromS3 } from '@src/utils/aws/get-object-from-s3'
import { SPLIT_TRACK_OUTPUT_DIR_PATH } from './constants'
import { SplitTrackFileType, UploadSplitTrackToS3Params } from './types'

export const AUDIO_SPLIT_TOOL_S3_PATH = 'audio-split-tool'

/**
 * Where finished tracks/zips are stored so the client can download them by key.
 *  - 's3'    (default) uploads to AWS_BUCKET_NAME
 *  - 'local' writes under generated/audio-split/_store — for local dev, E2E and CI, no AWS creds needed
 */
export type SplitTrackStorageMode = 's3' | 'local'

export const getStorageMode = (): SplitTrackStorageMode =>
    process.env.SPLIT_TRACK_STORAGE === 'local' ? 'local' : 's3'

const LOCAL_STORE_ROOT = path.join(SPLIT_TRACK_OUTPUT_DIR_PATH, '_store')

export const buildSplitTrackKey = ({ name, pid, type }: Omit<UploadSplitTrackToS3Params, 'data'>) => {
    const fileName = encodeURIComponent(`${name}${type === SplitTrackFileType.TRACKS ? '.zip' : ''}`)
    return `${AUDIO_SPLIT_TOOL_S3_PATH}/${pid}/${type}/${fileName}`
}

/** Resolve a key to a path inside the local store, refusing anything that escapes it. */
const resolveLocalPath = (key: string) => {
    const resolved = path.resolve(LOCAL_STORE_ROOT, key)
    if (!resolved.startsWith(LOCAL_STORE_ROOT + path.sep)) {
        throw new Error('Invalid key')
    }
    return resolved
}

export interface StoredSplitTrackFile {
    Key: string
}

export const putSplitTrackFile = async ({
    name,
    data,
    pid,
    type,
}: UploadSplitTrackToS3Params): Promise<StoredSplitTrackFile> => {
    const key = buildSplitTrackKey({ name, pid, type })

    if (getStorageMode() === 'local') {
        const target = resolveLocalPath(key)
        await fs.promises.mkdir(path.dirname(target), { recursive: true })
        if (data instanceof Readable) {
            await pipeline(data, createWriteStream(target))
        } else {
            await fs.promises.writeFile(target, data)
        }
        return { Key: key }
    }

    const result = await s3
        .upload({
            Bucket: AWS_BUCKET_NAME,
            Body: data,
            Key: key,
            ...(type === SplitTrackFileType.TRACKS && { ContentType: 'application/zip' }),
        })
        .promise()
    return { Key: result.Key }
}

export interface RetrievedSplitTrackFile {
    body: ReadableStream | Buffer | null
    contentType: string
}

const contentTypeForKey = (key: string) => {
    if (key.endsWith('.zip')) return 'application/zip'
    if (key.endsWith('.mp3')) return 'audio/mpeg'
    if (key.endsWith('.m4a')) return 'audio/mp4'
    if (key.endsWith('.opus')) return 'audio/ogg'
    return 'application/octet-stream'
}

export const getSplitTrackFile = async (key: string): Promise<RetrievedSplitTrackFile | null> => {
    if (getStorageMode() === 'local') {
        const target = resolveLocalPath(key)
        if (!fs.existsSync(target)) return null
        return {
            body: Readable.toWeb(createReadStream(target)) as ReadableStream,
            contentType: contentTypeForKey(key),
        }
    }

    const data = await getObjectFromS3({ Bucket: AWS_BUCKET_NAME, Key: key })
    if (!data.Body) return null
    return {
        body: data.Body as any,
        contentType: data.ContentType || contentTypeForKey(key),
    }
}

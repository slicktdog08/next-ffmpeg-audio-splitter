import path from 'path'
import { SplitTrackFileType } from './types'

export const SPLIT_TRACK_OUTPUT_DIR = 'generated/audio-split'
export const SPLIT_TRACK_OUTPUT_DIR_PATH = path.join(process.cwd(), SPLIT_TRACK_OUTPUT_DIR)
export const getSplitTrackOutputDir = (pid: string, type: SplitTrackFileType) =>
    `${SPLIT_TRACK_OUTPUT_DIR_PATH}/${pid}/${type}`

import React from 'react'
import { formatBytes } from './utils'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { font } from '@components/AudioSplitTrack/ui'

enum ProgressType {
    uploading = 'uploading',
    processing = 'processing',
}

const UploadProgress = () => {
    const uploadProgress = useSelector(selectors.selectUploadProgress)
    const isLoading = useSelector(selectors.selectIsLoading)
    const fileUploadProgress = useSelector(selectors.selectFileUploadProgress)

    if (!isLoading) return null

    const totalProgress: number = (uploadProgress + fileUploadProgress.percentComplete) / 2
    const progressType = totalProgress < 50 ? ProgressType.uploading : ProgressType.processing
    const title = totalProgress > 97 ? 'Finishing up' : progressType === ProgressType.uploading ? 'Uploading' : 'Splitting'

    return (
        <div className="w-full max-w-[760px] mx-auto px-4 md:px-6 mb-4" data-testid="upload-progress">
            <div className="flex items-baseline justify-between mb-2">
                <p className={`${font.heading} text-xl md:text-2xl`}>{title}…</p>
                <p className="text-sm tabular-nums text-black/60">{totalProgress.toFixed(0)}%</p>
            </div>

            <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
                <div
                    className="h-2 rounded-full bg-black transition-all duration-300"
                    style={{ width: `${Math.min(totalProgress, 100)}%` }}
                />
            </div>

            <p className="text-xs text-black/55 mt-2">
                {progressType === ProgressType.uploading
                    ? `Uploading your file — ${formatBytes(fileUploadProgress.uploaded)} of ${formatBytes(fileUploadProgress.total)}`
                    : `Upload complete, cutting and tagging tracks (${uploadProgress?.toFixed(0)}%)`}
            </p>
        </div>
    )
}

export default UploadProgress

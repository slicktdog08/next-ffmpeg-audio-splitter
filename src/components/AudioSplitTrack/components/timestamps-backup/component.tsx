'use client'
import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { timestampsToTextBlock } from '@components/AudioSplitTrack/utils'
import { DownloadIcon } from '../icons'
import { pillClass } from '@components/AudioSplitTrack/ui'
import { Timestamp } from '@app/audio-tools/split-track/types'
import { SITE_NAME } from '@src/constants'

/**
 * Lets the user take their timestamps with them at any point — before splitting, after an error,
 * whenever. Built entirely client-side from redux state, so it works even if the server is down.
 * The file uses the "MM:SS Title" format text mode accepts, so it pastes straight back in.
 */
export const buildTimestampsFile = (timestamps: Timestamp[], album?: string) => {
    const header = [
        `# ${album?.trim() ? `${album.trim()} — ` : ''}tracklist from ${SITE_NAME}`,
        '# Paste these lines into "Paste timestamps as text" to pick up where you left off.',
        '',
    ]
    return header.concat(timestampsToTextBlock(timestamps)).join('\n') + '\n'
}

export const timestampsFileName = (album?: string) =>
    `${(album?.trim() || 'tracklist').replace(/[\/\\:*?"<>|]/g, '_')}-timestamps.txt`

interface PropTypes {
    variant?: 'outline' | 'ghost' | 'onGradient'
    size?: 'sm' | 'md'
    className?: string
    label?: string
    /** icon-only on phones (the label stays for assistive tech and from `sm` up) */
    compact?: boolean
}

const TimestampsBackup = ({
    variant = 'outline',
    size = 'sm',
    className = '',
    label = 'Save timestamps',
    compact = false,
}: PropTypes) => {
    const timestamps = useSelector(selectors.selectTimestamps)
    const album = useSelector(selectors.selectAlbum)
    const [copied, setCopied] = useState(false)

    if (!timestamps.length) return null

    const content = buildTimestampsFile(timestamps, album)

    const download = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = timestampsFileName(album)
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            download()
        }
    }

    return (
        <span className={`inline-flex items-center gap-1 shrink-0 ${className}`} data-testid="timestamps-backup">
            <button
                type="button"
                onClick={download}
                className={pillClass(variant, size, compact ? 'px-3 sm:px-4' : '')}
                title="Download a .txt of your timestamps"
                aria-label={label}
            >
                <DownloadIcon fontSize="small" />
                <span className={compact ? 'hidden sm:inline' : ''}>{label}</span>
            </button>
            <button
                type="button"
                onClick={copy}
                className={pillClass('ghost', size, 'px-3 text-black/60 hover:text-black')}
                title="Copy timestamps to the clipboard"
                aria-label="Copy timestamps"
            >
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </span>
    )
}

export default TimestampsBackup

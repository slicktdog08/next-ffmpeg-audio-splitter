import { ArchiveIcon, SettingsIcon } from '../icons'
import React, { useEffect, useRef, useState } from 'react'
import * as selectors from '@redux/selectors/audio-splitter'
import { useDispatch, useSelector } from 'react-redux'
import { actions } from '@redux/reducers/audio-splitter'
import { bindActionCreators } from '@reduxjs/toolkit'
import Link from 'next/link'
import { font, pillClass } from '@components/AudioSplitTrack/ui'

const ProgressLog = () => {
    const progress = useSelector(selectors.selectProgress)
    const isLoading = useSelector(selectors.selectIsLoading)
    const zipFileKey = useSelector(selectors.selectZipFileKey)

    const logRef = useRef<HTMLDivElement>(null)
    const [isUserScrolling, setIsUserScrolling] = useState(false)
    const { resetHasResults } = bindActionCreators(actions, useDispatch())

    useEffect(() => {
        const el = logRef.current
        if (el && !isUserScrolling) {
            el.scrollTop = el.scrollHeight
        }
    }, [progress, isUserScrolling])

    const handleScroll = () => {
        const el = logRef.current
        if (el) {
            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4
            setIsUserScrolling(!atBottom)
        }
    }

    // Relative so it works on any host (prod, staging, local E2E) — same as the link below.
    const downloadZipLink = () => `/audio-tools/split-track?key=${zipFileKey}`

    useEffect(() => {
        if (zipFileKey) {
            window.open(downloadZipLink(), '_blank')
        }
    }, [zipFileKey])

    if (!progress.length && !isLoading) return null

    return (
        <div data-testid="progress-log" className="w-full max-w-[760px] mx-auto px-4 md:px-6 mb-4">
            {zipFileKey && (
                <div className="mb-4">
                    <h2 className={`${font.heading} text-2xl md:text-3xl`}>Your album is ready.</h2>
                    <p className="text-sm text-black/60 mt-1">
                        The download should have opened in a new tab — if not, grab it below.
                    </p>
                </div>
            )}

            {/* Terminal-style log */}
            <div
                ref={logRef}
                onScroll={handleScroll}
                role="log"
                aria-live="polite"
                className="rounded-2xl bg-black text-white/90 font-mono text-[13px] leading-relaxed px-4 py-3 max-h-[200px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent]"
            >
                {progress.map((line, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                        <span className="text-white/35 select-none">› </span>
                        {line}
                    </p>
                ))}
            </div>

            {zipFileKey && (
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Link
                        href={downloadZipLink()}
                        target="_blank"
                        className={pillClass('primary', 'md', 'flex-1 sm:flex-none')}
                    >
                        <ArchiveIcon fontSize="small" /> Download Zip
                    </Link>
                    <button onClick={() => resetHasResults()} className={pillClass('outline', 'md', 'flex-1 sm:flex-none')}>
                        <SettingsIcon fontSize="small" /> Change Timestamps
                    </button>
                </div>
            )}
        </div>
    )
}

export default ProgressLog

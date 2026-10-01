import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import { DownloadIcon } from '../icons'
import React from 'react'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import Link from 'next/link'
import { font } from '@components/AudioSplitTrack/ui'

const Tracklist = () => {
    const timestamps = useSelector(selectors.selectTimestamps)
    const { handleTimestampClick } = useAudioSplitTrackContext()

    if (!timestamps.length) return null

    return (
        <div className="w-full max-w-[760px] mx-auto px-4 md:px-6" data-testid="tracklist">
            <h3 className={`${font.heading} text-lg md:text-xl mb-2`}>Tracklist</h3>
            <ol className="list-none m-0 p-0 rounded-2xl border border-black/10 divide-y divide-black/10 overflow-hidden">
                {timestamps.map((timestamp, index) => (
                    <li key={index} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <button
                            onClick={() => handleTimestampClick(timestamp.start)}
                            className="min-w-0 text-left truncate hover:underline cursor-pointer"
                        >
                            <span className="text-black/40 mr-2 tabular-nums">{index + 1}.</span>
                            <span className="font-semibold">{timestamp.title || `Track ${index + 1}`}</span>
                            <span className="text-black/50 ml-2 tabular-nums">{timestamp.start}</span>
                        </button>
                        {timestamp.url && (
                            <Link
                                href={`/audio-tools/split-track?key=${timestamp.url}`}
                                target="_blank"
                                className="shrink-0 inline-flex items-center gap-1 rounded-full ring-1 ring-black px-3 py-1 text-xs font-semibold hover:bg-black hover:text-white transition-colors"
                                aria-label={`Download ${timestamp.title}`}
                            >
                                <DownloadIcon fontSize="small" /> MP3
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    )
}

export default Tracklist

import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import React from 'react'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { ArrowIcon, card, font, pillClass } from '@components/AudioSplitTrack/ui'
import { SOURCE_URL } from '@src/constants'

const STEPS = [
    ['Upload', 'One long MP3 — a mixtape, a live set, a whole album in a single file.'],
    ['Mark tracks', 'Tap along on the waveform or paste timestamps you already have.'],
    ['Download', 'Every track cut, tagged with artist, album and cover art, zipped up.'],
]

const UploadFiles = () => {
    const audioSrc = useSelector(selectors.selectAudioSrc)
    const isLoading = useSelector(selectors.selectIsLoading)
    const { handleFileChange } = useAudioSplitTrackContext()

    if (isLoading || audioSrc) return null

    return (
        <div className="flex-1 min-h-0 w-full px-3 md:px-6 pb-3 md:pb-6 flex">
            {/* `my-auto` on the child (not `items-center` on the parent) so that when the copy is taller than the
                card — every phone — it starts at the top and scrolls, instead of overflowing off the top uncut-able. */}
            <div
                data-testid="upload-card"
                className={`flex-1 min-h-0 ${card} gradient-animate-1 overflow-y-auto overflow-x-hidden flex flex-col shadow-sm`}
            >
                <div className="w-full max-w-5xl mx-auto my-auto px-5 py-8 sm:px-6 sm:py-10 md:px-12 md:py-16 text-black">
                    <div
                        className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl sm:rounded-full bg-black text-white text-xs md:text-sm px-4 py-2 mb-4 sm:mb-6 max-w-full"
                        data-testid="open-source-notice"
                    >
                        <span className="font-semibold">Open source.</span>
                        <span className="text-white/80">
                            Free to use here, and the code is free to learn from.{' '}
                            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline text-white">
                                View it on GitHub
                            </a>
                        </span>
                    </div>
                    <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-black/60 mb-4">
                        Free tool
                    </p>
                    <h1 className={`${font.heading} text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[0.95] mb-4 sm:mb-5`}>
                        Turn one long MP3
                        <br />
                        <span className="text-black/70">into an album.</span>
                    </h1>
                    <p className="text-base sm:text-lg md:text-2xl text-black/75 leading-relaxed max-w-2xl mb-6 sm:mb-8">
                        Upload, mark where each track starts, and download a zip of tagged MP3s — right in your
                        browser.
                    </p>

                    <label className={pillClass('primary', 'lg', 'group')}>
                        Choose MP3
                        <ArrowIcon className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                        <input type="file" accept="audio/mp3" className="sr-only" onChange={handleFileChange} />
                    </label>

                    <ol className="mt-8 md:mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                        {STEPS.map(([title, body], i) => (
                            <li key={title} className="rounded-2xl bg-white/50 backdrop-blur-sm px-5 py-4">
                                <p className={`${font.heading} text-base md:text-lg`}>
                                    <span className="text-black/40 mr-2">0{i + 1}</span>
                                    {title}
                                </p>
                                <p className="text-sm md:text-[15px] text-black/70 mt-1 leading-relaxed">{body}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    )
}

export default UploadFiles

import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import React from 'react'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { font } from '@components/AudioSplitTrack/ui'

const AlbumInfoPreview = () => {
    const artist = useSelector(selectors.selectArtist)
    const album = useSelector(selectors.selectAlbum)
    const year = useSelector(selectors.selectYear)
    const genre = useSelector(selectors.selectGenre)
    const audioSrc = useSelector(selectors.selectAudioSrc)

    const { currentSong } = useAudioSplitTrackContext()

    if (!audioSrc) return null

    const meta = [album || 'Unknown album', year, genre].filter(Boolean).join(' · ')

    return (
        <div className="flex flex-col justify-center min-w-0 text-left">
            <p className="text-[11px] md:text-xs font-semibold uppercase tracking-[0.18em] text-black/50 mb-1">
                Now playing
            </p>
            <p
                data-testid="now-playing-title"
                className={`${font.heading} text-2xl md:text-3xl xl:text-4xl leading-tight truncate`}
            >
                {currentSong?.title || 'Untitled track'}
            </p>
            <p className="text-base md:text-lg text-black/80 truncate mt-0.5">{artist || 'Unknown artist'}</p>
            <p className="text-sm md:text-[15px] text-black/60 truncate">{meta}</p>
        </div>
    )
}

export default AlbumInfoPreview

import { COMMON_GENRES } from '@components/AudioSplitTrack/constants'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import React, { useState, useRef, useEffect } from 'react'
import CoverArt from '../cover-art/component'
import { CloseIcon, RestartIcon } from '../icons'
import { useDispatch, useSelector } from 'react-redux'
import {
    selectAlbum,
    selectArtist,
    selectAudioSrc,
    selectDownloadIndividualFiles,
    selectGenre,
    selectIsLoading,
    selectYear,
    selectAudioCodec,
    selectAudioBitrate,
} from '@redux/selectors/audio-splitter'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'
import { AudioCodec, AudioBitrate } from '@app/audio-tools/split-track/types'
import { ArrowIcon, font, inputClass, labelClass, pillClass } from '@components/AudioSplitTrack/ui'

const AlbumInfo = () => {
    const artist = useSelector(selectArtist)
    const album = useSelector(selectAlbum)
    const year = useSelector(selectYear)
    const genre = useSelector(selectGenre)
    const downloadIndividualFiles = useSelector(selectDownloadIndividualFiles)
    const isLoading = useSelector(selectIsLoading)
    const audioSrc = useSelector(selectAudioSrc)
    const audioCodec = useSelector(selectAudioCodec)
    const audioBitrate = useSelector(selectAudioBitrate)

    const { setArtist, setAlbum, setYear, setGenre, setAudioCodec, setAudioBitrate } = bindActionCreators(
        actions,
        useDispatch()
    )

    const { handleDownloadIndividualFilesToggleChange, handleOnAlbumInfoSave, clearMP3Upload } =
        useAudioSplitTrackContext()

    // Genre autocomplete state
    const [genreOpen, setGenreOpen] = useState(false)
    const [genreFilter, setGenreFilter] = useState(genre)
    const genreRef = useRef<HTMLDivElement>(null)

    const filteredGenres = COMMON_GENRES.filter((g) => g.toLowerCase().includes((genreFilter ?? '').toLowerCase()))

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (genreRef.current && !genreRef.current.contains(e.target as Node)) {
                setGenreOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative w-full max-w-[1100px] mx-auto">
            <div className="flex items-start justify-between gap-4 mb-4 md:mb-6">
                <div>
                    <h2 className={`${font.heading} text-2xl md:text-3xl`}>Album info</h2>
                    <p className="text-sm text-black/60 mt-1">Written into every track as ID3 tags.</p>
                </div>
                <button
                    onClick={handleOnAlbumInfoSave}
                    className="shrink-0 w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 text-black flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Close"
                >
                    <CloseIcon />
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                {/* Cover Art */}
                <div className="shrink-0 flex md:block justify-center">
                    <CoverArt />
                </div>

                {/* Form fields */}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                        <label htmlFor="album-artist" className={labelClass}>
                            Artist
                        </label>
                        <input
                            id="album-artist"
                            className={inputClass}
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            disabled={!!isLoading}
                            placeholder="Artist"
                        />
                    </div>
                    <div>
                        <label htmlFor="album-name" className={labelClass}>
                            Album
                        </label>
                        <input
                            id="album-name"
                            className={inputClass}
                            value={album}
                            onChange={(e) => setAlbum(e.target.value)}
                            disabled={!!isLoading}
                            placeholder="Album"
                        />
                    </div>
                    <div>
                        <label htmlFor="album-year" className={labelClass}>
                            Year
                        </label>
                        <input
                            id="album-year"
                            type="number"
                            className={inputClass}
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            disabled={!!isLoading}
                            placeholder="Year"
                        />
                    </div>

                    {/* Genre autocomplete */}
                    <div ref={genreRef} className="relative">
                        <label htmlFor="album-genre" className={labelClass}>
                            Genre
                        </label>
                        <input
                            id="album-genre"
                            className={inputClass}
                            value={genreFilter ?? ''}
                            onChange={(e) => {
                                setGenreFilter(e.target.value)
                                setGenre(e.target.value)
                                setGenreOpen(true)
                            }}
                            onFocus={() => setGenreOpen(true)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape' || e.key === 'Tab') setGenreOpen(false)
                            }}
                            disabled={!!isLoading}
                            placeholder="Genre"
                            autoComplete="off"
                        />
                        {genreOpen && filteredGenres.length > 0 && (
                            <ul className="absolute z-50 w-full bg-white text-black border border-black/10 rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1 py-1">
                                {filteredGenres.map((g) => (
                                    <li
                                        key={g}
                                        className="px-3.5 py-2 cursor-pointer hover:bg-black/5 text-sm"
                                        onMouseDown={() => {
                                            setGenre(g)
                                            setGenreFilter(g)
                                            setGenreOpen(false)
                                        }}
                                    >
                                        {g}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Audio Codec */}
                    <div>
                        <label htmlFor="audio-codec" className={labelClass}>
                            Audio codec
                        </label>
                        <select
                            id="audio-codec"
                            className={inputClass}
                            value={audioCodec}
                            onChange={(e) => setAudioCodec(e.target.value as AudioCodec)}
                            disabled={!!isLoading}
                        >
                            <option value="copy">Keep original (fastest)</option>
                            <option value="libmp3lame">MP3 (universal)</option>
                            <option value="aac">AAC (smaller files)</option>
                            <option value="libopus">Opus (best compression)</option>
                        </select>
                        <p className="text-xs text-black/50 mt-1.5">How each track is encoded.</p>
                    </div>

                    {/* Audio Bitrate */}
                    <div>
                        <label htmlFor="audio-bitrate" className={labelClass}>
                            Audio bitrate
                        </label>
                        {audioCodec === 'copy' ? (
                            <div className={`${inputClass} bg-black/[0.03] text-black/40 select-none`} aria-hidden="true">
                                Original bitrate
                            </div>
                        ) : (
                            <select
                                id="audio-bitrate"
                                className={inputClass}
                                value={audioBitrate}
                                onChange={(e) => setAudioBitrate(e.target.value as AudioBitrate)}
                                disabled={!!isLoading}
                            >
                                <option value="128k">128k (standard)</option>
                                <option value="192k">192k (high quality)</option>
                                <option value="256k">256k (very high quality)</option>
                                <option value="320k">320k (maximum quality)</option>
                            </select>
                        )}
                        <p className="text-xs text-black/50 mt-1.5">
                            {audioCodec === 'copy'
                                ? 'Not applicable when keeping the original format.'
                                : 'Higher bitrate = better quality, larger files.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer: toggle + actions */}
            <div className="mt-6 md:mt-8 pt-5 border-t border-black/10 flex flex-col sm:flex-row sm:items-center gap-4">
                {audioSrc && (
                    <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                        <input
                            type="checkbox"
                            checked={downloadIndividualFiles}
                            onChange={handleDownloadIndividualFilesToggleChange}
                            className="mt-1 w-4 h-4 accent-black cursor-pointer shrink-0"
                        />
                        <span>
                            <span className="block text-sm font-semibold">Download MP3s separately</span>
                            <span className="block text-xs text-black/60">
                                {downloadIndividualFiles
                                    ? 'Slower, but each track gets its own download link.'
                                    : 'Faster: all tracks in a single zip.'}
                            </span>
                        </span>
                    </label>
                )}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <button
                        onClick={clearMP3Upload}
                        className={pillClass('ghost', 'md', 'text-black/60 hover:text-black')}
                        type="button"
                    >
                        <RestartIcon fontSize="small" /> Start over
                    </button>
                    <button
                        onClick={handleOnAlbumInfoSave}
                        disabled={!!isLoading}
                        className={pillClass('primary', 'md', 'group')}
                        aria-label="Save"
                        type="button"
                    >
                        Save
                        <ArrowIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AlbumInfo

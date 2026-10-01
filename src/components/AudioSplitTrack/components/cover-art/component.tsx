import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import { EditIcon, PhotoIcon } from '../icons'
import React from 'react'
import * as selectors from '@redux/selectors/audio-splitter'
import { useDispatch, useSelector } from 'react-redux'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'

const CoverArt = () => {
    const coverArtPreview = useSelector(selectors.selectCoverArtPreview)
    const isAlbumInfoDrawerOpen = useSelector(selectors.selectIsAlbumInfoDrawerOpen)
    const { handleCoverArtChange } = useAudioSplitTrackContext()
    const { setIsAlbumInfoDrawerOpen } = bindActionCreators(actions, useDispatch())

    const sizeClass = isAlbumInfoDrawerOpen
        ? 'w-[120px] h-[120px] md:w-[200px] md:h-[200px]'
        : 'w-[96px] h-[96px] md:w-[140px] md:h-[140px] xl:w-[168px] xl:h-[168px]'

    const frame =
        `relative ${sizeClass} rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center ` +
        'bg-white/60 shadow-lg ring-1 ring-black/10 transition-transform hover:scale-[1.02]'
    const image = coverArtPreview
        ? { backgroundImage: `url(${coverArtPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : {}
    const badge =
        'absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center shadow'

    const placeholder = (
        <span className="text-black/60 font-semibold text-xs md:text-sm p-2 text-center leading-tight">
            {isAlbumInfoDrawerOpen ? 'Upload cover art' : 'Add cover art'}
        </span>
    )

    return (
        <div data-testid="cover-art">
            {isAlbumInfoDrawerOpen ? (
                <label className={frame} style={image} aria-label="Upload cover art">
                    <input type="file" accept="image/*" className="sr-only" onChange={handleCoverArtChange} />
                    {!coverArtPreview && placeholder}
                    <span className={badge}>
                        <PhotoIcon fontSize="small" />
                    </span>
                </label>
            ) : (
                <button
                    type="button"
                    className={frame}
                    style={image}
                    onClick={() => setIsAlbumInfoDrawerOpen(true)}
                    aria-label="Edit album info"
                >
                    {!coverArtPreview && placeholder}
                    <span className={badge}>
                        <EditIcon fontSize="small" />
                    </span>
                </button>
            )}
        </div>
    )
}

export default CoverArt

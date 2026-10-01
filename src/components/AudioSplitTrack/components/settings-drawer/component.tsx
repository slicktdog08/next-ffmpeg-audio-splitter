import React from 'react'
import AlbumInfo from '../album-info/component'
import { useDispatch, useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'

const SettingsDrawer = () => {
    const isAlbumInfoDrawerOpen = useSelector(selectors.selectIsAlbumInfoDrawerOpen)
    const { setIsAlbumInfoDrawerOpen } = bindActionCreators(actions, useDispatch())
    const { handleOnAlbumInfoSave } = useAudioSplitTrackContext()

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
                    isAlbumInfoDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={handleOnAlbumInfoSave}
                aria-hidden="true"
            />

            {/* Bottom sheet. Sized to its content, capped below the header. `invisible` when closed so it is
                truly gone (no focus / no bounding box) once the slide-out ends. */}
            <div
                data-testid="album-info-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Album info"
                aria-hidden={!isAlbumInfoDrawerOpen}
                className={`fixed bottom-0 left-0 right-0 z-50 max-h-[calc(100dvh-64px)] md:max-h-[calc(100dvh-80px)] flex flex-col rounded-t-3xl bg-white text-black shadow-[0_-20px_60px_rgba(0,0,0,0.25)] transition-[translate,visibility] duration-300 ease-out ${
                    isAlbumInfoDrawerOpen ? 'translate-y-0 visible' : 'translate-y-full invisible'
                }`}
            >
                <div className="shrink-0 flex justify-center pt-3 pb-1">
                    <span className="w-10 h-1.5 rounded-full bg-black/15" aria-hidden="true" />
                </div>
                <div className="min-h-0 overflow-auto px-4 pb-6 md:px-8 md:pb-8">
                    <AlbumInfo />
                </div>
            </div>
        </>
    )
}

export default SettingsDrawer

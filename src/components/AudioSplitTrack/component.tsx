'use client'
import React, { useEffect } from 'react'
import TimestampBuilder from './components/timestamp-builder/component'
import UploadProgress from './components/upload-progress/component'
import ProgressLog from './components/progress-log/component'
import UploadFiles from './components/upload-files/component'
import Waveform from './components/waveform/component'
import SettingsDrawer from './components/settings-drawer/component'
import CoverArt from './components/cover-art/component'
import AlbumInfoPreview from './components/album-info-preview/component'
import TrackSeek from './components/seeker/component'
import Tracklist from './components/tracklist/component'
import Onboarding from './components/onboarding/component'
import TimestampsBackup from './components/timestamps-backup/component'
import {
    selectAudioSrc,
    selectCoverArtPreview,
    selectError,
    selectHasResults,
    selectIsLoading,
    selectIsViewAllTracksMode,
    selectUseTextMode,
    selectTourStep,
} from '@redux/selectors/audio-splitter'
import { useDispatch, useSelector } from 'react-redux'
import { actions } from '@redux/reducers/audio-splitter'
import { bindActionCreators } from '@reduxjs/toolkit'
import HeaderToolbar, { HeaderShell } from './components/header-toolbar/component'
import { useHasMounted, useIsSmallScreen, useVisualViewport } from './utils'
import { useAudioSplitTrackContext } from './provider'
import { card, font } from './ui'
import { paletteGradient, useCoverArtPalette } from './palette'

/**
 * Full-viewport tool laid out like the home page: off-white page, inset rounded cards.
 *   header (wordmark · title · actions)
 *   ├─ upload card                         (no audio yet, fills the rest)
 *   └─ player card  – cover / album info / transport / waveform, sized to content
 *      list card    – timestamps, progress, results; takes the remaining height and scrolls
 * No viewport-height maths: a short laptop screen just gives the list less room.
 */
const AudioSplitTrack = () => {
    const audioSrc = useSelector(selectAudioSrc)
    const error = useSelector(selectError)
    const isLoading = useSelector(selectIsLoading)
    const hasResults = useSelector(selectHasResults)
    const isViewAllTracksMode = useSelector(selectIsViewAllTracksMode)
    const useTextMode = useSelector(selectUseTextMode)
    const tourStep = useSelector(selectTourStep)
    const coverArtPreview = useSelector(selectCoverArtPreview)

    // The player card takes its gradient from the cover art so the two always match; until there is
    // cover art it wears the same brand gradient as the home page.
    const coverPalette = useCoverArtPalette(coverArtPreview)

    const { setUseTextMode } = bindActionCreators(actions, useDispatch())
    const hasMounted = useHasMounted()
    const { isRestoringSession } = useAudioSplitTrackContext()
    const isSm = useIsSmallScreen()
    const viewport = useVisualViewport()

    // Fill exactly what the user can see. On phones with the keyboard up — or while the first-visit guide
    // is asking for a track name, which is the same moment — collapse the player so the list, and the
    // field being edited, gets the little room that is left.
    const appStyle: React.CSSProperties = viewport.height
        ? { height: viewport.height, top: viewport.offsetTop }
        : { height: '100dvh', top: 0 }
    const collapsePlayer = isSm && (viewport.keyboardOpen || tourStep === 'name' || useTextMode)

    // The list card owns scrolling; the document never scrolls.
    useEffect(() => {
        const html = document.documentElement.style
        const body = document.body.style
        html.overflow = 'hidden'
        html.height = '100%'
        body.overflow = 'hidden'
        body.height = '100%'
        body.margin = '0'
        body.padding = '0'
        return () => {
            html.overflow = ''
            html.height = ''
            body.overflow = ''
            body.height = ''
            body.margin = ''
            body.padding = ''
        }
    }, [])

    // redux-persist rehydrates before React hydrates, so anything reading persisted state would
    // mismatch the server HTML. Render a state-free shell until mounted and the IndexedDB restore has
    // settled — this also avoids flashing the upload screen at someone with a session to resume.
    if (!hasMounted || isRestoringSession) {
        return (
            <div className={`fixed inset-0 flex flex-col bg-[#fafafa] text-black ${font.body}`} data-testid="splitter-shell">
                <HeaderShell />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-black/15 border-t-black animate-spin" aria-label="Loading" />
                </div>
            </div>
        )
    }

    return (
        <div
            className={`fixed left-0 right-0 flex flex-col bg-[#fafafa] text-black ${font.body}`}
            style={appStyle}
            data-testid="splitter-app"
            data-keyboard-open={collapsePlayer || undefined}
        >
            <HeaderToolbar />
            <SettingsDrawer />
            <Onboarding />

            <UploadFiles />

            {audioSrc && (
                <div
                    className={`flex-1 min-h-0 flex flex-col gap-3 md:gap-4 px-3 md:px-6 ${
                        collapsePlayer ? 'pb-1' : 'pb-3 md:pb-6'
                    }`}
                >
                    {/* Player card. Sized to its content so it never overlaps the list below. */}
                    <section
                        data-testid="top-section"
                        className={`shrink-0 w-full ${card} gradient-animate-3 text-black overflow-hidden shadow-sm ${
                            collapsePlayer ? 'hidden' : ''
                        }`}
                        style={coverPalette ? paletteGradient(coverPalette) : undefined}
                        data-cover-palette={coverPalette?.join(',')}
                    >
                        <div className="flex flex-wrap items-center w-full max-w-[1400px] mx-auto px-4 pt-3 sm:pt-4 md:px-8 md:pt-6 gap-y-2 sm:gap-y-3 [@media(max-height:600px)]:pt-2 [@media(max-height:600px)]:gap-y-1">
                            <div className="w-[104px] md:w-auto shrink-0 flex items-center justify-center">
                                <CoverArt />
                            </div>
                            <div className="flex-1 min-w-0 md:px-6">
                                <AlbumInfoPreview />
                            </div>

                            {!isViewAllTracksMode && (
                                <div className="w-full md:w-auto md:ml-auto flex flex-col items-center gap-2">
                                    <TrackSeek />
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-black/70 hover:text-black">
                                        <input
                                            type="checkbox"
                                            checked={useTextMode}
                                            onChange={(e) => setUseTextMode(e.target.checked)}
                                            className="w-4 h-4 accent-black cursor-pointer"
                                        />
                                        Paste timestamps as text
                                    </label>
                                </div>
                            )}
                        </div>

                        {!isViewAllTracksMode && (
                            <div className="w-full mt-2 md:mt-3 [@media(max-height:600px)]:mt-1">
                                <Waveform />
                            </div>
                        )}
                    </section>

                    {/* List card: fills whatever is left and scrolls on its own. */}
                    <section
                        data-testid="bottom-section"
                        className={`flex-1 min-h-0 ${card} bg-white border border-black/[0.06] shadow-sm overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.25)_transparent]`}
                    >
                        <div className="py-3 md:py-5">
                            {!isLoading && !hasResults && <TimestampBuilder />}
                            <div className="w-full">
                                {!!error.length && (
                                    <div className="max-w-[760px] mx-auto px-4 mb-4">
                                        {error.map((err, index) => (
                                            <div
                                                key={index}
                                                className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 mb-2 text-sm"
                                                role="alert"
                                            >
                                                <span aria-hidden="true">⚠️</span>
                                                <span>{err}</span>
                                            </div>
                                        ))}
                                        {/* Errors are where people lose work — make the way out obvious. */}
                                        <div
                                            className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-black/[0.03] border border-black/10 px-4 py-3 text-sm"
                                            data-testid="timestamps-safe"
                                        >
                                            <p className="flex-1 text-black/70">
                                                <span className="font-semibold text-black">Your timestamps are safe.</span> They're
                                                still listed below and saved in this browser — grab a copy before you retry.
                                            </p>
                                            <TimestampsBackup />
                                        </div>
                                    </div>
                                )}

                                <UploadProgress />
                                <ProgressLog />
                                {hasResults && !isLoading && <Tracklist />}
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

export default AudioSplitTrack

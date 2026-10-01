import React, { useEffect } from 'react'
import Link from 'next/link'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import * as selectors from '@redux/selectors/audio-splitter'
import { useDispatch, useSelector } from 'react-redux'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'
import Capatcha from '../capatcha/component'
import { RestartIcon, DownloadIcon, AddIcon } from '../icons'
import { font, pillClass } from '@components/AudioSplitTrack/ui'
import { SITE_NAME } from '@src/constants'

export const headerClassName =
    'relative flex items-center justify-between gap-2 sm:gap-3 w-full h-14 sm:h-16 md:h-20 shrink-0 px-3 sm:px-4 md:px-8 bg-[#fafafa]'

/** Site wordmark; links back home. Truncates rather than pushing the actions off a narrow phone. */
export const Wordmark = () => (
    <Link href="/" className={`${font.heading} text-lg sm:text-xl md:text-2xl text-black hover:opacity-70 transition-opacity min-w-0 truncate`}>
        {SITE_NAME}
    </Link>
)

/** Redux-free header for the pre-hydration shell, so the bar never jumps once state arrives. */
export const HeaderShell = () => (
    <div className={headerClassName}>
        <Wordmark />
        <ToolTitle />
        <div />
    </div>
)

const ToolTitle = () => (
    <span className="hidden sm:block absolute left-1/2 -translate-x-1/2 text-sm font-semibold tracking-wide uppercase text-black/50">
        MP3 Track Splitter
    </span>
)

const HeaderToolbar = () => {
    const { clearMP3Upload, handleAddTimestampWithCurrentTime, handleSubmit } = useAudioSplitTrackContext()

    const zipFileKey = useSelector(selectors.selectZipFileKey)
    const isViewAllTracksMode = useSelector(selectors.selectIsViewAllTracksMode)
    const isLoading = useSelector(selectors.selectIsLoading)
    const recapatcha = useSelector(selectors.selectRecaptcha)
    const shouldShowReaptcha = useSelector(selectors.selectShouldShowReaptcha)
    const audioSrc = useSelector(selectors.selectAudioSrc)
    const timestamps = useSelector(selectors.selectTimestamps)

    const { setRecapatcha, setShouldShowReaptcha } = bindActionCreators(actions, useDispatch())

    const handleSubmitWithCaptcha = () => {
        // Local dev / E2E: skip the reCAPTCHA modal. The server must also run with SKIP_CAPTCHA=true.
        if (process.env.NEXT_PUBLIC_SKIP_CAPTCHA === 'true') return setRecapatcha('captcha-skipped')
        if (!recapatcha?.length) return setShouldShowReaptcha(true)
        else setShouldShowReaptcha(false)
    }

    useEffect(() => {
        if (recapatcha?.length) {
            setRecapatcha(null)
            handleSubmit()
        }
    }, [recapatcha])

    const canAddTrack = !isViewAllTracksMode && !zipFileKey && !shouldShowReaptcha && audioSrc
    const canDownload = !zipFileKey?.length && audioSrc && !!timestamps.length

    return (
        <header data-testid="header-toolbar" className={headerClassName}>
            <Wordmark />
            <ToolTitle />

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                {audioSrc && (
                    <button
                        onClick={clearMP3Upload}
                        className={pillClass('ghost', 'sm', 'px-2 sm:px-3 text-black/60 hover:text-black')}
                        aria-label="Reset"
                        title="Start over with a different MP3"
                    >
                        <RestartIcon fontSize="small" />
                        <span className="hidden md:inline">Start over</span>
                    </button>
                )}
                {canAddTrack && (
                    <button
                        onClick={handleAddTimestampWithCurrentTime}
                        disabled={isLoading}
                        className={pillClass('outline', 'sm', 'px-2.5 sm:px-3 md:px-4')}
                        aria-label="Add Track"
                        title="Add a track at the current time"
                        data-tour="add-track"
                    >
                        <AddIcon fontSize="small" />
                        <span className="hidden md:inline">Add track</span>
                    </button>
                )}
                {canDownload && (
                    <button
                        onClick={handleSubmitWithCaptcha}
                        disabled={isLoading}
                        className={pillClass('primary', 'sm', 'px-2.5 sm:px-3 md:px-4')}
                        aria-label="Download"
                        title="Split and download your album"
                        data-tour="download"
                    >
                        <DownloadIcon fontSize="small" />
                        <span className="hidden md:inline">Split &amp; download</span>
                    </button>
                )}
            </div>
            <Capatcha />
        </header>
    )
}

export default HeaderToolbar

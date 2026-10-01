import React from 'react'
import Reaptcha from 'reaptcha'
import * as selectors from '@redux/selectors/audio-splitter'
import { useDispatch, useSelector } from 'react-redux'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'
import { font } from '@components/AudioSplitTrack/ui'

const Capatcha = () => {
    const audioSrc = useSelector(selectors.selectAudioSrc)
    const coverArtPreview = useSelector(selectors.selectCoverArtPreview)
    const useTextMode = useSelector(selectors.selectUseTextMode)
    const isLoading = useSelector(selectors.selectIsLoading)
    const timestamps = useSelector(selectors.selectTimestamps)
    const zipFileKey = useSelector(selectors.selectZipFileKey)
    const recapatcha = useSelector(selectors.selectRecaptcha)
    const shouldShowReaptcha = useSelector(selectors.selectShouldShowReaptcha)
    const { capatchaVerifyCallback } = useAudioSplitTrackContext()
    const { setRecapatcha, setShouldShowReaptcha } = bindActionCreators(actions, useDispatch())

    const show =
        audioSrc &&
        coverArtPreview &&
        !useTextMode &&
        !isLoading &&
        !!timestamps.length &&
        !zipFileKey &&
        shouldShowReaptcha &&
        !recapatcha?.length

    if (!show) return null

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-6 relative max-w-sm w-full text-black">
                <button
                    onClick={() => setShouldShowReaptcha(false)}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-lg leading-none"
                    aria-label="Close"
                >
                    ×
                </button>
                <h3 className={`${font.heading} text-xl mb-1`}>One quick check</h3>
                <p className="text-sm text-black/60 mb-4">Confirm you're human and we'll start splitting.</p>
                <div className="flex justify-center">
                    <Reaptcha
                        sitekey={process.env.NEXT_PUBLIC_REACT_CAPTCHA_SITE_KEY ?? ''}
                        onVerify={capatchaVerifyCallback}
                        onExpire={() => setRecapatcha(null)}
                        size="compact"
                    />
                </div>
            </div>
        </div>
    )
}

export default Capatcha

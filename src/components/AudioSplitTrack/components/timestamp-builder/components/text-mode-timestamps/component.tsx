import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'
import { ArrowIcon, font, pillClass } from '@components/AudioSplitTrack/ui'

const TextModeTimestamps = () => {
    const { handleTextModeSubmit } = useAudioSplitTrackContext()
    const useTextMode = useSelector(selectors.selectUseTextMode)
    const textInput = useSelector(selectors.selectTextInput)
    const { setUseTextMode, setTextInput } = bindActionCreators(actions, useDispatch())

    if (!useTextMode) return null

    return (
        <div className="w-full max-w-[860px] mx-auto px-4 md:px-6">
            <div className="flex items-baseline justify-between gap-3 mb-3 md:mb-4">
                <h2 className={`${font.heading} text-xl md:text-2xl`}>Paste timestamps</h2>
                <span className="text-sm text-black/50">one track per line</span>
            </div>
            <textarea
                rows={8}
                placeholder={'0:00 Intro\n3:45 Second Song\n7:10 Another One'}
                className="w-full rounded-2xl border border-black/15 bg-black/[0.03] px-4 py-3 text-base md:text-[15px] font-mono text-black placeholder-black/35 focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 resize-none overflow-y-auto"
                style={{ maxHeight: 260 }}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
            />
            <p className="text-xs text-black/50 mt-2">
                Formats like <span className="font-mono">1:23 Title</span>, <span className="font-mono">01:23 - Title</span>{' '}
                and <span className="font-mono">1:02:03 Title</span> all work. Each track ends where the next begins.
            </p>
            <div className="flex items-center justify-end gap-3 mt-4">
                <button onClick={() => setUseTextMode(false)} className={pillClass('ghost', 'md')} type="button">
                    Cancel
                </button>
                <button onClick={handleTextModeSubmit} className={pillClass('primary', 'md', 'group')} type="button">
                    Submit
                    <ArrowIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
            </div>
        </div>
    )
}

export default TextModeTimestamps

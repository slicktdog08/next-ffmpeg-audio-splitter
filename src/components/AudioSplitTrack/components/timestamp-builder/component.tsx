import React from 'react'
import MobileTimestamps from './components/mobile-timestamps/component'
import Timestamps from './components/timestamps/component'
import TextModeTimestamps from './components/text-mode-timestamps/component'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { useIsSmallScreen } from '@components/AudioSplitTrack/utils'
import { font } from '@components/AudioSplitTrack/ui'
import TimestampsBackup from '../timestamps-backup/component'

const TimestampBuilder = () => {
    const useTextMode = useSelector(selectors.selectUseTextMode)
    const timestamps = useSelector(selectors.selectTimestamps)
    const isMobile = useIsSmallScreen()

    if (useTextMode) return <TextModeTimestamps />

    return (
        <div className="w-full max-w-[860px] mx-auto px-4 md:px-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3 md:mb-4 px-3">
                <h2 className={`${font.heading} text-xl md:text-2xl`}>Tracks</h2>
                <span className="flex items-center gap-2 sm:gap-3 text-sm text-black/50 min-w-0">
                    <span className="whitespace-nowrap">
                        {timestamps.length ? `${timestamps.length} track${timestamps.length === 1 ? '' : 's'}` : ''}
                    </span>
                    <TimestampsBackup compact />
                </span>
            </div>
            {!isMobile && <Timestamps />}
            {isMobile && <MobileTimestamps />}
        </div>
    )
}

export default TimestampBuilder

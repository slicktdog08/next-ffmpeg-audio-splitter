import React from 'react'
import { PlayArrowIcon, PauseIcon, SkipPreviousIcon, SkipNextIcon, Replay10Icon, Forward10Icon } from '../icons'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { formatTime } from '@components/AudioSplitTrack/utils'
import { iconButtonClass } from '@components/AudioSplitTrack/ui'

const TrackSeek = () => {
    const isPlaying = useSelector(selectors.selectIsPlaying)
    const currentPlaybackTime = useSelector(selectors.selectCurrentPlaybackTime)
    const {
        togglePlayPause,
        seekForward,
        seekBackward,
        skipToPreviousTrack,
        skipToNextTrack,
        wavesurferRef,
        trackDuration,
        isWaveSurferReady,
    } = useAudioSplitTrackContext()

    if (!wavesurferRef.current) return null

    const small = iconButtonClass('w-10 h-10 md:w-11 md:h-11 text-black/70 hover:text-black hover:bg-black/10')
    const main = iconButtonClass(
        'w-14 h-14 md:w-16 md:h-16 bg-black text-white shadow-lg hover:scale-105 hover:shadow-xl'
    )

    return (
        <div className="flex flex-col items-center gap-1.5 w-full">
            <div className="flex items-center justify-center gap-1 md:gap-2">
                <button onClick={skipToPreviousTrack} className={small} aria-label="Previous track">
                    <SkipPreviousIcon />
                </button>
                <button onClick={seekBackward} className={small} aria-label="Replay 10 seconds">
                    <Replay10Icon />
                </button>
                <button
                    onClick={togglePlayPause}
                    className={main}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    disabled={!isWaveSurferReady}
                >
                    {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
                </button>
                <button onClick={seekForward} className={small} aria-label="Forward 10 seconds">
                    <Forward10Icon />
                </button>
                <button onClick={skipToNextTrack} className={small} aria-label="Next track">
                    <SkipNextIcon />
                </button>
            </div>
            <p className="text-xs md:text-sm tabular-nums text-black/60" data-testid="time-readout">
                {formatTime(currentPlaybackTime)} <span className="text-black/35">/</span>{' '}
                {trackDuration ? formatTime(trackDuration) : '--:--'}
            </p>
        </div>
    )
}

export default TrackSeek

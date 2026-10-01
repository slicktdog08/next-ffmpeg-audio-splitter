import React, { useCallback } from 'react'
import { TimerIcon, InfoIcon, PlayArrowIcon, DeleteIcon, PauseCircleIcon } from '../../../icons'
import { Timestamp as TimestampType } from '@app/audio-tools/split-track/types'
import { determineIfOverlapping } from '../utilities'
import { isValidTime } from '../../utilities'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import { useDispatch, useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'
import { iconButtonClass, inputClass, labelClass } from '@components/AudioSplitTrack/ui'

export interface TimestampPropTypes {
    timestamp: TimestampType
    index: number
}

const timeInput = `${inputClass} tabular-nums`

const Timestamp = ({ timestamp, index }: TimestampPropTypes) => {
    const timestamps = useSelector(selectors.selectTimestamps)
    const { trackDuration: duration, handleTimestampClick, handleRemoveTimestamp, currentSong } =
        useAudioSplitTrackContext()

    const { updateTimestamp } = bindActionCreators(actions, useDispatch())

    const isOverlapping = useCallback((i: number) => determineIfOverlapping({ timestamps, index: i }), [timestamps])

    const startValid = isValidTime(timestamp.start, duration)
    const endValid = isValidTime(timestamp.end ?? '', duration)
    const overlap = isOverlapping(index)
    const isPlaying = currentSong?.title === timestamp.title
    // Column headings once, at the top of the list; later rows keep them for screen readers only.
    const label = index === 0 ? labelClass : 'sr-only'

    return (
        <div
            data-testid="timestamp-row"
            className={`flex items-end gap-2 md:gap-3 mb-2 w-full rounded-2xl px-3 py-2 transition-colors ${
                isPlaying ? 'bg-black/[0.04]' : 'hover:bg-black/[0.02]'
            }`}
        >
            <div className="w-8 shrink-0 text-center text-sm font-semibold text-black/40 tabular-nums pb-3">
                {index + 1}
            </div>

            {/* Start Time */}
            <div className="relative w-[7.5rem] shrink-0">
                <label className={label}>Start</label>
                <div className="relative">
                    {!startValid && (
                        <span
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-500"
                            title="This start time occurs after the end of the track."
                        >
                            <TimerIcon fontSize="small" />
                        </span>
                    )}
                    <input
                        type="text"
                        value={timestamp.start}
                        onChange={(e) => updateTimestamp({ index, field: 'start', value: e.target.value })}
                        className={`${timeInput} ${!startValid ? 'pl-8 border-red-400' : ''}`}
                        placeholder="MM:SS"
                    />
                </div>
            </div>

            {/* End Time */}
            <div className="relative w-[7.5rem] shrink-0">
                <label className={label}>End</label>
                <div className="relative">
                    {!endValid && timestamp.end && (
                        <span
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-500"
                            title="This end time occurs after the end of the track."
                        >
                            <TimerIcon fontSize="small" />
                        </span>
                    )}
                    <input
                        type="text"
                        value={timestamp.end}
                        onChange={(e) => updateTimestamp({ index, field: 'end', value: e.target.value })}
                        className={`${timeInput} ${!endValid && timestamp.end ? 'pl-8 border-red-400' : ''}`}
                        placeholder="MM:SS"
                    />
                </div>
            </div>

            {/* Track Title */}
            <div className="relative flex-1 min-w-0">
                <label className={label}>Track title</label>
                <input
                    type="text"
                    value={timestamp.title}
                    onChange={(e) => updateTimestamp({ index, field: 'title', value: e.target.value })}
                    className={inputClass}
                    placeholder="Track title"
                    data-tour={index === 0 ? 'track-title' : undefined}
                />
            </div>

            {/* Row actions */}
            <div className="flex items-center gap-1 shrink-0 pb-0.5">
                {overlap && (
                    <span className="text-red-500" title="This timestamp overlaps with another timestamp.">
                        <InfoIcon fontSize="small" />
                    </span>
                )}
                <button
                    onClick={() => handleTimestampClick(timestamp.start)}
                    className={iconButtonClass('w-10 h-10 text-black/70 hover:bg-black/10 hover:text-black')}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    title="Play from here"
                >
                    {isPlaying ? <PauseCircleIcon /> : <PlayArrowIcon />}
                </button>
                <button
                    onClick={() => handleRemoveTimestamp(index)}
                    className={iconButtonClass('w-10 h-10 text-black/50 hover:bg-red-50 hover:text-red-600')}
                    aria-label="Delete"
                    title="Remove track"
                >
                    <DeleteIcon fontSize="small" />
                </button>
            </div>
        </div>
    )
}

export default Timestamp

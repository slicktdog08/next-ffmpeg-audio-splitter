import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import { MoreHorizIcon, EditIcon, DeleteIcon, InfoIcon, SaveIcon } from '../../../icons'
import React, { useCallback, useRef, useState } from 'react'
import { TimestampPropTypes } from '../timestamp/component'
import { formatTime } from '@components/AudioSplitTrack/utils'
import { convertTimeToSeconds } from '../../utilities'
import { determineIfOverlapping } from '../utilities'
import { useDispatch, useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'
import { bindActionCreators } from 'redux'
import { actions } from '@redux/reducers/audio-splitter'
import { iconButtonClass, inputClass, labelClass } from '@components/AudioSplitTrack/ui'

const MobileTimestamp = ({ timestamp, index }: TimestampPropTypes) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const hasNoTrackName = !timestamp.title
    const [isEditMode, setIsEditMode] = useState<boolean>(hasNoTrackName)
    const timestamps = useSelector(selectors.selectTimestamps)
    const { currentSong, handleTimestampClick, handleRemoveTimestamp } = useAudioSplitTrackContext()
    const menuRef = useRef<HTMLDivElement>(null)

    const { updateTimestamp } = bindActionCreators(actions, useDispatch())

    const handleEditClick = () => {
        setIsEditMode(true)
        setIsMenuOpen(false)
    }

    const handleRemoveTimestampClick = () => {
        handleRemoveTimestamp(index)
        setIsMenuOpen(false)
    }

    const handleTimestampNameClick = () => {
        if (isEditMode) return
        handleTimestampClick(timestamp.start)
    }

    const isOverlapping = useCallback((i: number) => determineIfOverlapping({ timestamps, index: i }), [timestamps])
    const overlap = isOverlapping(index)
    const isPlaying = currentSong?.title === timestamp.title

    return (
        <li
            data-testid="timestamp-row"
            className={`relative py-2.5 pr-1 ${isEditMode ? 'rounded-2xl bg-black/[0.03] px-3 my-1' : ''}`}
        >
            {/* Timeline bullet, centred on the line to the left */}
            <span
                className={`absolute -left-[1.3rem] top-4 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                    isPlaying ? 'bg-black' : 'bg-black/30'
                }`}
                aria-hidden="true"
            />

            <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0" onClick={handleTimestampNameClick}>
                    {isEditMode ? (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <label className={labelClass}>Track title</label>
                                <input
                                    className={inputClass}
                                    value={timestamp.title}
                                    onChange={(e) => updateTimestamp({ index, field: 'title', value: e.target.value })}
                                    placeholder="Track title"
                                    autoFocus
                                    data-tour={index === 0 ? 'track-title' : undefined}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className={`text-base leading-tight truncate ${isPlaying ? 'font-bold' : 'font-semibold'}`}>
                                <span className="text-black/40 mr-2 tabular-nums">{index + 1}.</span>
                                {timestamp.title}
                            </p>
                            <p className="text-xs text-black/55 mt-0.5 tabular-nums">
                                {formatTime(Number(convertTimeToSeconds(timestamp.start)))} –{' '}
                                {timestamp.end ? formatTime(Number(convertTimeToSeconds(timestamp.end))) : 'end'}
                                {overlap && (
                                    <span
                                        className="inline-flex items-center gap-1 ml-2 text-red-600"
                                        title="This timestamp overlaps with another timestamp."
                                    >
                                        <InfoIcon fontSize="small" /> overlaps
                                    </span>
                                )}
                            </p>
                        </>
                    )}
                </div>

                {isEditMode ? (
                    <button
                        onClick={() => setIsEditMode(false)}
                        className={iconButtonClass('w-10 h-10 mt-5 bg-black text-white shrink-0')}
                        aria-label="Save title"
                    >
                        <SaveIcon fontSize="small" />
                    </button>
                ) : (
                    <button
                        onClick={(e) => {
                            setIsMenuOpen((v) => !v)
                            e.stopPropagation()
                        }}
                        className={iconButtonClass('w-9 h-9 text-black/60 hover:bg-black/10 shrink-0')}
                        aria-label="More options"
                    >
                        <MoreHorizIcon />
                    </button>
                )}
            </div>

            {isEditMode && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                        <label className={labelClass}>Start</label>
                        <input
                            type="text"
                            value={timestamp.start}
                            onChange={(e) => updateTimestamp({ index, field: 'start', value: e.target.value })}
                            className={`${inputClass} tabular-nums`}
                            placeholder="MM:SS"
                        />
                    </div>
                    <div>
                        <label className={labelClass}>End</label>
                        <input
                            type="text"
                            value={timestamp.end}
                            onChange={(e) => updateTimestamp({ index, field: 'end', value: e.target.value })}
                            className={`${inputClass} tabular-nums`}
                            placeholder="MM:SS"
                        />
                    </div>
                </div>
            )}

            {/* Popover menu */}
            {isMenuOpen && (
                <div
                    ref={menuRef}
                    className="absolute right-0 top-11 z-50 bg-white rounded-xl shadow-xl border border-black/10 py-1 min-w-[140px]"
                >
                    <button
                        onClick={handleEditClick}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-black/5 text-sm text-left"
                    >
                        <EditIcon fontSize="small" /> Edit
                    </button>
                    <button
                        onClick={handleRemoveTimestampClick}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 text-sm text-left"
                    >
                        <DeleteIcon fontSize="small" /> Remove
                    </button>
                    <button
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full px-4 py-2 text-xs text-black/40 hover:bg-black/5 text-left"
                    >
                        Close
                    </button>
                </div>
            )}
        </li>
    )
}

export default MobileTimestamp

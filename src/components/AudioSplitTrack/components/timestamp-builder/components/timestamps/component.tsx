import React from 'react'
import Timestamp from '../timestamp/component'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'

const EmptyState = () => (
    <div className="rounded-2xl border border-dashed border-black/15 px-6 py-10 text-center">
        <p className="font-semibold text-black/80">No tracks yet</p>
        <p className="text-sm text-black/55 mt-1 max-w-sm mx-auto">
            Play the audio and hit <span className="font-semibold text-black">Add track</span> wherever a song
            starts, or paste timestamps as text.
        </p>
    </div>
)

const Timestamps = () => {
    const timestamps = useSelector(selectors.selectTimestamps)
    return (
        <div className="flex flex-col w-full">
            {!timestamps.length && <EmptyState />}
            {timestamps.map((timestamp, index) => (
                <Timestamp timestamp={timestamp} key={`timestamp-${index}`} index={index} />
            ))}
        </div>
    )
}

export default Timestamps

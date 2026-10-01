import React from 'react'
import MobileTimestamp from '../mobile-timestamp/component'
import { useSelector } from 'react-redux'
import * as selectors from '@redux/selectors/audio-splitter'

const MobileTimestamps = () => {
    const timestamps = useSelector(selectors.selectTimestamps)

    return (
        <div className="flex items-stretch w-full">
            {/* Vertical timeline line */}
            <div className="w-0.5 ml-1 bg-black/15 rounded-full shrink-0" />

            <ul className="w-full pl-4 list-none m-0">
                {timestamps.map((timestamp, index) => (
                    <MobileTimestamp key={index} timestamp={timestamp} index={index} />
                ))}
                {!timestamps.length && (
                    <li className="rounded-2xl border border-dashed border-black/15 px-4 py-6 text-center">
                        <p className="font-semibold text-black/80 text-sm">No tracks yet</p>
                        <p className="text-xs text-black/55 mt-1">
                            Play and tap <span className="font-semibold text-black">+</span> where each song starts,
                            or paste timestamps as text.
                        </p>
                    </li>
                )}
            </ul>
        </div>
    )
}

export default MobileTimestamps

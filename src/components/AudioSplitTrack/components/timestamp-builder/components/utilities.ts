import { Timestamp as TimestampType } from '@app/audio-tools/split-track/types'
import { convertTimeToSeconds } from '../utilities'

type DetermineIfOverlappingOptions = {
    timestamps: TimestampType[]
    index: number
}
export const determineIfOverlapping = ({ timestamps, index }: DetermineIfOverlappingOptions) => {
    const currentStart = convertTimeToSeconds(timestamps[index].start ?? '0:00')
    const currentEnd = convertTimeToSeconds(timestamps[index].end ?? '0:00')

    for (let i = 0; i < timestamps.length; i++) {
        if (i !== index) {
            const otherStart = convertTimeToSeconds(timestamps[i].start ?? '0:00')
            const otherEnd = convertTimeToSeconds(timestamps[i].end ?? '0:00')

            // Check for actual overlap
            if (currentStart < otherEnd && currentEnd > otherStart) {
                return true
            }
        }
    }
    return false
}

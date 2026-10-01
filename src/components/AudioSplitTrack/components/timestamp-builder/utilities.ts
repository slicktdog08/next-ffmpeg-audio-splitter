export const convertTimeToSeconds = (time: string): number => {
    const timeParts = time.split(':').map(Number)

    // Handle HH:MM:SS format
    if (timeParts.length === 3) {
        const [hours, minutes, seconds] = timeParts
        return hours * 3600 + minutes * 60 + seconds
    }

    // Handle MM:SS format
    if (timeParts.length === 2) {
        const [minutes, seconds] = timeParts
        return minutes * 60 + seconds
    }

    // Invalid time format
    return 0
}

export const isValidTime = (time: string, duration: number): boolean => {
    const timeInSeconds = convertTimeToSeconds(time)
    return timeInSeconds <= duration
}

export const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
}

export const parseTimeToSeconds = (time: string): number => {
    const parts = time.split(':').map(Number)
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2] // HH:MM:SS
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1] // MM:SS
    }
    return parseFloat(time) // Assume raw seconds if no `:` found
}

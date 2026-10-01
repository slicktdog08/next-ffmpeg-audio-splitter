import { useEffect, useState, type CSSProperties } from 'react'

/** Three gradient stops pulled from the cover art, ordered most- to least-prominent. */
export type CoverPalette = [string, string, string]

/** Cover is downsampled to this many pixels per side before sampling — plenty for a palette, cheap to scan. */
const SAMPLE_SIZE = 48
const HUE_BUCKETS = 24
/** Below this saturation a pixel counts as neutral (black / white / grey) rather than a hue. */
const NEUTRAL_SAT = 0.14
/** Ignore hue buckets covering less than this share of the sampled pixels — specks, not the cover's colour. */
const MIN_BUCKET_SHARE = 0.015
/** Black text sits on the gradient, so every stop is nudged to at least this relative luminance (~7:1). */
const MIN_LUMINANCE = 0.3
const MAX_LUMINANCE = 0.85

type Rgb = [number, number, number]
type Hsl = [number, number, number]

const rgbToHsl = ([r, g, b]: Rgb): Hsl => {
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    if (max === min) return [0, 0, l]
    const d = max - min
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h: number
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
    return [h, s, l]
}

const hslToRgb = ([h, s, l]: Hsl): Rgb => {
    if (s === 0) return [l, l, l]
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const channel = (hue: number) => {
        const t = hue < 0 ? hue + 1 : hue > 1 ? hue - 1 : hue
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
    }
    return [channel(h + 1 / 3), channel(h), channel(h - 1 / 3)]
}

/** WCAG relative luminance of an sRGB colour (channels 0–1). */
const luminance = (rgb: Rgb): number => {
    const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const toHex = (rgb: Rgb): string =>
    '#' +
    rgb
        .map((c) =>
            Math.round(Math.min(1, Math.max(0, c)) * 255)
                .toString(16)
                .padStart(2, '0')
        )
        .join('')

const hueDistance = (a: number, b: number): number => {
    const d = Math.abs(a - b)
    return Math.min(d, 1 - d)
}

type LuminanceRange = [number, number]
const READABLE: LuminanceRange = [MIN_LUMINANCE, MAX_LUMINANCE]
const LIGHT: LuminanceRange = [0.6, MAX_LUMINANCE]
const DARK: LuminanceRange = [MIN_LUMINANCE, 0.42]
const MID: LuminanceRange = [0.45, 0.6]

/**
 * Bring a sampled colour into the range the home-page gradient lives in: vivid enough to read as
 * that hue, light enough for the black text and controls on top of it.
 */
const toGradientStop = ([h, s, l]: Hsl, [min, max]: LuminanceRange = READABLE): string => {
    const isNeutral = s < NEUTRAL_SAT
    let hsl: Hsl = [h, isNeutral ? s : Math.max(s, 0.6), l]
    let rgb = hslToRgb(hsl)
    let y = luminance(rgb)
    // Walk lightness in small steps until the stop is readable: luminance depends on hue, so a fixed
    // HSL lightness would leave blues too dark and yellows too bright.
    for (let i = 0; i < 50 && (y < min || y > max); i++) {
        hsl = [hsl[0], hsl[1], hsl[2] + (y < min ? 0.02 : -0.02)]
        rgb = hslToRgb(hsl)
        y = luminance(rgb)
    }
    return toHex(rgb)
}

interface Bucket {
    count: number
    sum: Rgb
    /** Mean hue/sat of the pixels in the bucket, filled in after sampling. */
    hsl: Hsl
    neutral: boolean
}

/**
 * Pick three distinct colours from an image. Pixels are grouped by hue; the biggest, most saturated
 * group leads, then the next two are chosen for distance from what's already picked so the gradient
 * shows the cover's range rather than three shades of its dominant colour.
 */
export const paletteFromImage = (image: CanvasImageSource): CoverPalette | null => {
    const canvas = document.createElement('canvas')
    canvas.width = SAMPLE_SIZE
    canvas.height = SAMPLE_SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
    const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)

    // One bucket per hue slice, plus a trailing one for neutrals.
    const buckets: Bucket[] = Array.from({ length: HUE_BUCKETS + 1 }, () => ({
        count: 0,
        sum: [0, 0, 0],
        hsl: [0, 0, 0],
        neutral: false,
    }))
    let sampled = 0
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue
        const rgb: Rgb = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255]
        const [h, s] = rgbToHsl(rgb)
        const bucket = s < NEUTRAL_SAT ? buckets[HUE_BUCKETS] : buckets[Math.floor(h * HUE_BUCKETS) % HUE_BUCKETS]
        bucket.count++
        bucket.sum[0] += rgb[0]
        bucket.sum[1] += rgb[1]
        bucket.sum[2] += rgb[2]
        sampled++
    }
    if (!sampled) return null

    const candidates = buckets
        .map((b, index) => {
            if (!b.count) return null
            const mean: Rgb = [b.sum[0] / b.count, b.sum[1] / b.count, b.sum[2] / b.count]
            return { ...b, hsl: rgbToHsl(mean), neutral: index === HUE_BUCKETS }
        })
        .filter((b): b is Bucket => !!b && b.count / sampled >= MIN_BUCKET_SHARE)
    if (!candidates.length) return null

    // Saturation-weighted so a small vivid accent beats a large muddy background.
    const weight = (b: Bucket) => b.count * (b.neutral ? 0.5 : 0.5 + b.hsl[1])
    const distance = (a: Bucket, b: Bucket) => {
        if (a.neutral || b.neutral) return a.neutral === b.neutral ? Math.abs(a.hsl[2] - b.hsl[2]) : 0.5
        return hueDistance(a.hsl[0], b.hsl[0]) * 2 + Math.abs(a.hsl[2] - b.hsl[2]) * 0.5
    }

    const picked: Bucket[] = [candidates.reduce((best, b) => (weight(b) > weight(best) ? b : best))]
    while (picked.length < 3) {
        const remaining = candidates.filter((b) => !picked.includes(b))
        if (!remaining.length) break
        const next = remaining.reduce((best, b) => {
            const score = (bucket: Bucket) =>
                Math.min(...picked.map((p) => distance(p, bucket))) * Math.sqrt(weight(bucket))
            return score(b) > score(best) ? b : best
        })
        // Everything left is within ~30° of a picked hue: stop and derive shades instead.
        if (Math.min(...picked.map((p) => distance(p, next))) < 0.16) break
        picked.push(next)
    }

    // Covers with one or two colours get lighter / darker / muted shades of the lead so the gradient
    // still moves. Shades are aimed at a luminance band rather than an HSL offset, otherwise the
    // readability clamp would pull them all back to the same colour.
    const stops = picked.map((b) => toGradientStop(b.hsl))
    const lead = picked[0].hsl
    const leadIsLight = luminance(hslToRgb(lead)) >= 0.5
    const shades = lead[1] < NEUTRAL_SAT
        ? [toGradientStop(lead, leadIsLight ? DARK : LIGHT), toGradientStop(lead, MID)]
        : [toGradientStop(lead, leadIsLight ? DARK : LIGHT), toGradientStop([lead[0], lead[1] * 0.45, lead[2]])]
    while (stops.length < 3) stops.push(shades[stops.length - picked.length])

    return stops as CoverPalette
}

const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Could not load cover art'))
        img.src = src
    })

/**
 * Colours pulled from the current cover art, or null while there is no cover (or it can't be read),
 * in which case the caller should keep the default brand gradient.
 */
export const useCoverArtPalette = (coverArtSrc: string | null): CoverPalette | null => {
    const [palette, setPalette] = useState<CoverPalette | null>(null)

    useEffect(() => {
        if (!coverArtSrc) {
            setPalette(null)
            return
        }
        let cancelled = false
        loadImage(coverArtSrc)
            .then((img) => {
                if (!cancelled) setPalette(paletteFromImage(img))
            })
            .catch(() => {
                if (!cancelled) setPalette(null)
            })
        return () => {
            cancelled = true
        }
    }, [coverArtSrc])

    return palette
}

/** Inline background matching `.gradient-animate-*`; the class still supplies the size and animation. */
export const paletteGradient = ([a, b, c]: CoverPalette): CSSProperties => ({
    backgroundImage: `linear-gradient(-45deg, ${a}, ${b}, ${c}, ${a})`,
})

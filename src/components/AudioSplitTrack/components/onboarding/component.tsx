'use client'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { bindActionCreators } from '@reduxjs/toolkit'
import * as selectors from '@redux/selectors/audio-splitter'
import { actions } from '@redux/reducers/audio-splitter'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'
import { ArrowIcon, font, pillClass } from '@components/AudioSplitTrack/ui'
import { PlayArrowIcon } from '../icons'

/**
 * First-visit guided flow, remembered per browser:
 *
 *   welcome  – a dialog once the track is loaded: "press play and we'll mark your first track"
 *            – yes → audio plays, the first track is created, and…
 *   name     – a tip on that track's title field: "what's this one called?"; advances when the
 *              field loses focus (they clicked/tapped away)
 *   download – a tip on the download button, once there is at least one track
 *
 *   "I'll paste timestamps" on the welcome dialog opens text mode instead and skips `name`.
 */
export const TOUR_STORAGE_KEY = 'audio-splitter:tour:v2'
export type TourStepId = 'welcome' | 'name' | 'download'
export const TOUR_STEPS: TourStepId[] = ['welcome', 'name', 'download']

const readDismissed = (): Set<string> => {
    try {
        const raw = localStorage.getItem(TOUR_STORAGE_KEY)
        return new Set(raw ? (JSON.parse(raw) as string[]) : [])
    } catch {
        return new Set()
    }
}

const writeDismissed = (ids: Set<string>) => {
    try {
        localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(Array.from(ids)))
    } catch {
        /* storage blocked: the tour simply shows again next visit */
    }
}

const GUTTER = 12
const POPOVER_WIDTH = 300

interface Anchor {
    target: DOMRect
    top: number
    left: number
    arrowLeft: number
    placement: 'above' | 'below'
}

/** Positions a popover next to `selector`, re-measuring on resize/scroll and once after layout settles. */
const useAnchor = (selector: string | null) => {
    const [anchor, setAnchor] = useState<Anchor | null>(null)

    const measure = useCallback(() => {
        if (!selector) return setAnchor(null)
        const el = document.querySelector<HTMLElement>(selector)
        const r = el?.getBoundingClientRect()
        if (!r || !r.width || !r.height) return setAnchor(null)

        const vw = window.innerWidth
        const vh = window.visualViewport?.height ?? window.innerHeight
        const width = Math.min(POPOVER_WIDTH, vw - GUTTER * 2)
        const estimatedHeight = 150
        const placement: 'above' | 'below' =
            r.bottom + estimatedHeight + GUTTER < vh || r.top < estimatedHeight ? 'below' : 'above'
        const centre = r.left + r.width / 2
        const left = Math.min(Math.max(GUTTER, centre - width / 2), vw - width - GUTTER)
        const top = placement === 'below' ? r.bottom + 10 : r.top - 10
        setAnchor({ target: r, top, left, arrowLeft: Math.min(Math.max(16, centre - left), width - 16), placement })
    }, [selector])

    useLayoutEffect(() => {
        measure()
        if (!selector) return
        window.addEventListener('resize', measure)
        window.addEventListener('scroll', measure, true)
        window.visualViewport?.addEventListener('resize', measure)
        const t = window.setTimeout(measure, 350)
        return () => {
            window.removeEventListener('resize', measure)
            window.removeEventListener('scroll', measure, true)
            window.visualViewport?.removeEventListener('resize', measure)
            window.clearTimeout(t)
        }
    }, [measure, selector])

    return anchor
}

const Onboarding = () => {
    const audioSrc = useSelector(selectors.selectAudioSrc)
    const isAlbumInfoDrawerOpen = useSelector(selectors.selectIsAlbumInfoDrawerOpen)
    const timestamps = useSelector(selectors.selectTimestamps)
    const zipFileKey = useSelector(selectors.selectZipFileKey)
    const isLoading = useSelector(selectors.selectIsLoading)
    const shouldShowReaptcha = useSelector(selectors.selectShouldShowReaptcha)
    const useTextMode = useSelector(selectors.selectUseTextMode)
    const { isWaveSurferReady, togglePlayPause, handleAddTimestampWithCurrentTime } = useAudioSplitTrackContext()
    const { setUseTextMode, setTourStep } = bindActionCreators(actions, useDispatch())

    const [dismissed, setDismissed] = useState<Set<string> | null>(null)
    // set for the rest of this visit once they chose "play"; the `name` step only makes sense right after
    const [guiding, setGuiding] = useState(false)
    useEffect(() => setDismissed(readDismissed()), [])

    const dismiss = useCallback(
        (ids: TourStepId[]) => {
            const next = new Set(dismissed ?? [])
            ids.forEach((id) => next.add(id))
            writeDismissed(next)
            setDismissed(next)
        },
        [dismissed]
    )

    const trackLoaded = !!audioSrc && isWaveSurferReady && !isAlbumInfoDrawerOpen && !isLoading
    const step = useMemo<TourStepId | null>(() => {
        if (!dismissed) return null
        if (!dismissed.has('welcome')) return trackLoaded && !useTextMode && timestamps.length === 0 ? 'welcome' : null
        if (guiding && !dismissed.has('name')) return trackLoaded && !useTextMode && timestamps.length > 0 ? 'name' : null
        if (!dismissed.has('download'))
            return trackLoaded && timestamps.length > 0 && !zipFileKey && !shouldShowReaptcha ? 'download' : null
        return null
    }, [dismissed, guiding, trackLoaded, useTextMode, timestamps.length, zipFileKey, shouldShowReaptcha])

    // let the layout react (phones collapse the player while a track is being named)
    useEffect(() => {
        setTourStep(step)
        return () => {
            setTourStep(null)
        }
    }, [step])

    // --- welcome: play + first track, or straight to text mode -------------------------------------
    const startGuided = () => {
        setGuiding(true)
        dismiss(['welcome'])
        handleAddTimestampWithCurrentTime()
        togglePlayPause()
    }
    const startTextMode = () => {
        dismiss(['welcome', 'name'])
        setUseTextMode(true)
    }

    // --- name: focus the title field, advance when it loses focus ---------------------------------
    useEffect(() => {
        if (step !== 'name') return
        const input = document.querySelector<HTMLInputElement>('[data-tour="track-title"]')
        if (!input) return
        const onBlur = () => dismiss(['name'])
        // give the row a moment to mount (mobile opens the editor with an animation), then focus it
        const t = window.setTimeout(() => {
            input.focus({ preventScroll: false })
            input.addEventListener('focusout', onBlur, { once: true })
        }, 250)
        // browsers do not reliably blur a field that is removed (mobile's editor closes on Save), so treat
        // the field disappearing as "done" too
        const gone = window.setInterval(() => {
            if (!document.contains(input)) dismiss(['name'])
        }, 300)
        return () => {
            window.clearTimeout(t)
            window.clearInterval(gone)
            input.removeEventListener('focusout', onBlur)
        }
    }, [step, dismiss])

    useEffect(() => {
        if (!step || step === 'welcome') return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') dismiss([step])
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [step, dismiss])

    const anchorSelector = step === 'name' ? '[data-tour="track-title"]' : step === 'download' ? '[data-tour="download"]' : null
    const anchor = useAnchor(anchorSelector)

    if (!step) return null

    if (step === 'welcome') {
        return (
            <div
                className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-4"
                role="presentation"
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tour-welcome-title"
                    data-testid="tour-welcome"
                    className="w-full max-w-md rounded-3xl bg-white text-black shadow-2xl p-6 sm:p-8"
                >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50 mb-2">Ready when you are</p>
                    <h2 id="tour-welcome-title" className={`${font.heading} text-2xl sm:text-3xl leading-tight`}>
                        Want to press play and divide it as you listen?
                    </h2>
                    <p className="text-[15px] text-black/70 leading-relaxed mt-3">
                        We'll start the audio and mark your first track right away. After that, tap{' '}
                        <span className="font-semibold text-black">+ Add track</span> whenever the next song starts.
                    </p>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 mt-6">
                        <button type="button" onClick={startTextMode} className={pillClass('ghost', 'md', 'text-black/60 hover:text-black')}>
                            I'll paste timestamps
                        </button>
                        <button type="button" onClick={startGuided} className={pillClass('primary', 'md', 'group')} autoFocus>
                            <PlayArrowIcon fontSize="small" /> Play &amp; start
                            <ArrowIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (!anchor) return null

    const copy: Record<Exclude<TourStepId, 'welcome'>, { title: string; body: string }> = {
        name: {
            title: 'What’s this track called?',
            body: 'Type a name for it. You can rename any track later — click anywhere else when you’re done.',
        },
        download: {
            title: 'Split & download when you’re done',
            body: 'Press + Add track each time a new song starts. When the list is complete, this cuts, tags and zips everything.',
        },
    }
    const { title, body } = copy[step]
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - GUTTER * 2)

    return (
        <>
            {/* Spotlight: everything but the control being explained is dimmed. One element with a huge
                box-shadow, pointer-events off, so the whole page stays clickable — including the target. */}
            <div
                aria-hidden="true"
                className="fixed z-[45] pointer-events-none ring-2 ring-white/90 transition-all duration-300"
                style={{
                    top: anchor.target.top - 6,
                    left: anchor.target.left - 6,
                    width: anchor.target.width + 12,
                    height: anchor.target.height + 12,
                    borderRadius: anchor.target.height > 80 ? 18 : 9999,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                }}
            />

            <div
                role="dialog"
                aria-label={title}
                aria-live="polite"
                data-testid="tour-step"
                data-tour-step={step}
                className="fixed z-[46] bg-black text-white rounded-2xl shadow-2xl p-4 pr-5"
                style={{
                    top: anchor.placement === 'below' ? anchor.top : undefined,
                    bottom: anchor.placement === 'above' ? window.innerHeight - anchor.top : undefined,
                    left: anchor.left,
                    width,
                }}
            >
                <span
                    aria-hidden="true"
                    className="absolute w-3 h-3 bg-black rotate-45"
                    style={{ left: anchor.arrowLeft - 6, ...(anchor.placement === 'below' ? { top: -6 } : { bottom: -6 }) }}
                />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-1">
                    {step === 'name' ? 'Step 1 of 2' : guiding ? 'Step 2 of 2' : 'Tip'}
                </p>
                <p className={`${font.heading} text-base leading-snug`}>{title}</p>
                <p className="text-[13px] text-white/75 leading-relaxed mt-1">{body}</p>
                <div className="flex items-center justify-end gap-3 mt-3">
                    {step === 'name' ? (
                        <button
                            type="button"
                            onClick={() => dismiss(['name'])}
                            className="text-xs text-white/50 hover:text-white underline-offset-2 hover:underline cursor-pointer"
                        >
                            Skip
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => dismiss(['download'])}
                            className={pillClass('onGradient', 'sm', 'ring-0 bg-white text-black hover:bg-white/90 hover:text-black')}
                        >
                            Got it
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}

export default Onboarding

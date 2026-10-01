import React from 'react'
import { useAudioSplitTrackContext } from '@components/AudioSplitTrack/provider'

function Waveform() {
    const { wavesurfContainerRef, isWaveSurferReady, waveformLoadProgress } = useAudioSplitTrackContext()

    // WaveSurfer reports fetch progress; decoding (the slow part for big files) has no events, so say so
    const decoding = waveformLoadProgress >= 100
    const label = decoding ? 'Decoding audio…' : `Loading waveform… ${waveformLoadProgress}%`

    return (
        <div className="relative w-full">
            {!isWaveSurferReady && (
                <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 px-4" data-testid="waveform-loading">
                    <div
                        className="w-full max-w-md h-1 rounded-full bg-black/10 overflow-hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={waveformLoadProgress}
                        aria-label="Loading waveform"
                    >
                        <div
                            className={`h-full bg-black/70 rounded-full transition-[width] duration-200 ${decoding ? 'animate-pulse' : ''}`}
                            style={{ width: `${Math.max(4, waveformLoadProgress)}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium text-black/60">{label}</span>
                </div>
            )}
            {/* click / drag on the wave seeks; scroll-wheel zooms (see hook) */}
            <div ref={wavesurfContainerRef} data-testid="waveform" className="cursor-crosshair" />
        </div>
    )
}

export default Waveform

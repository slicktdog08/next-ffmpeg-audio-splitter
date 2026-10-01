declare module 'wavesurfer.js' {
    interface WaveSurfer {
        addRegion(options: any): any
        clearRegions(): void
        create(): WaveSurfer
    }

    export function create(arg0: {
        container: HTMLDivElement
        waveColor: string
        cursorColor: string | undefined
        height: number
        backend: string
        minPxPerSec: number
        autoplay: boolean
        normalize: boolean
        progressColor: string
        barRadius: number
        barWidth?: number
        barGap?: number
        cursorWidth?: number
        mediaControls: boolean
    }): any {
        throw new Error('Function not implemented.')
    }
}

import React from 'react'
import AudioSplitTrack from '@components/AudioSplitTrack/component'
import { AudioSplitTrackProvider } from '@components/AudioSplitTrack/provider'

const Home = () => (
    <AudioSplitTrackProvider>
        <div className="h-dvh overflow-hidden bg-[#fafafa]">
            <AudioSplitTrack />
        </div>
    </AudioSplitTrackProvider>
)

export default Home

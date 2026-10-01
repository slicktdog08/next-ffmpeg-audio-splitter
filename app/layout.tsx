import React from 'react'
import { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Provider from './provider'
import { SITE_NAME } from '@src/constants'
import '@src/styles.css'

const sans = Inter({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-sans' })

const DESCRIPTION =
    'Split a long MP3 into individual tagged tracks with cover art, artist, album and genre metadata. Free, in your browser.'

export const metadata: Metadata = {
    ...(process.env.NEXT_PUBLIC_SITE_URL && { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) }),
    title: `Free MP3 Track Splitter | ${SITE_NAME}`,
    description: DESCRIPTION,
    robots: { index: true, follow: true },
}

/**
 * The splitter is a fixed, full-viewport app: pinch-zoom breaks its layout and iOS's focus-zoom on inputs
 * is the wrong experience, so scaling is locked here (inputs are also ≥16px so iOS never wants to zoom).
 * `resizesContent` lets Chrome/Android shrink the layout viewport for the keyboard; iOS is handled in JS.
 */
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    interactiveWidget: 'resizes-content',
    themeColor: '#fafafa',
}

const RootLayout = ({ children }: { children: React.ReactNode }) => (
    <html lang="en" className={sans.variable}>
        <body>
            <Provider>{children}</Provider>
        </body>
    </html>
)

export default RootLayout

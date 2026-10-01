import { test, expect, Page } from '@playwright/test'
import AdmZip from 'adm-zip'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
    ALBUM,
    COVER_FIXTURE,
    COVER_PNG_FIXTURE,
    MP3_EMBEDDED_COVER_FIXTURE,
    addTimestampsViaTextMode,
    fillAlbumInfo,
    gotoFresh,
    loadTrack,
    saveAlbumInfo,
    ui,
    uploadMp3,
} from './helpers/audio-splitter'

/**
 * The whole pipeline: upload → SSE progress → ffmpeg split → tag → zip → download by key.
 * Runs against SPLIT_TRACK_STORAGE=local and SKIP_CAPTCHA=true (see playwright.config.ts).
 * The audio maths only need to be right once, so this file runs on the laptop project only.
 *
 * Source fixture is the "realistic" one: stereo, 48 kHz, ID3-tagged, embedded PNG cover — the
 * attached-picture stream is exactly what broke real uploads before `-map 0:a:0`.
 */
test.describe('audio track splitter – split pipeline', () => {
    test.beforeEach(async ({}, testInfo) => {
        test.skip(testInfo.project.name !== 'laptop', 'pipeline is viewport-independent')
    })
    test.setTimeout(180_000)

    const probe = (file: string, entries: string) =>
        execFileSync('ffprobe', ['-v', 'error', '-show_entries', entries, '-of', 'default=nw=1:nk=1', file])
            .toString()
            .trim()
    /** key=value pairs for the whole file, e.g. tags and per-stream fields */
    const probeMap = (file: string, entries: string) =>
        Object.fromEntries(
            execFileSync('ffprobe', ['-v', 'error', '-show_entries', entries, '-of', 'default=nw=1', file])
                .toString()
                .trim()
                .split('\n')
                .filter(Boolean)
                .map((l) => l.split('=') as [string, string])
        )

    async function runSplit(page: Page) {
        // the app opens the zip in a new tab as soon as the key arrives; we fetch it ourselves instead
        const popup = page
            .waitForEvent('popup')
            .then((p) => p.close())
            .catch(() => {})
        await ui.download(page).click()

        await expect(ui.progressLog(page)).toBeVisible()
        await expect(ui.downloadZip(page)).toBeVisible({ timeout: 120_000 })
        await expect(ui.progressLog(page)).toContainText('Watch below for your download link shortly.')
        await expect(ui.errorAlert(page)).toHaveCount(0)
        await popup
        const href = await ui.downloadZip(page).getAttribute('href')
        expect(href).toMatch(/^\/audio-tools\/split-track\?key=audio-split-tool\//)
        return href!
    }

    async function fetchZip(page: Page, href: string, expectedName = 'E2E Album.zip') {
        const res = await page.request.get(href)
        expect(res.status()).toBe(200)
        expect(res.headers()['content-type']).toBe('application/zip')
        // the browser names the download from this header; it must be "<name>.zip", never just ".zip"
        expect(res.headers()['content-disposition']).toContain(`attachment; filename="${expectedName}"`)
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'split-e2e-'))
        const zip = new AdmZip(await res.body())
        zip.extractAllTo(dir, true)
        return { dir, names: zip.getEntries().map((e) => e.entryName).sort() }
    }

    async function chooseEncoding(page: Page, codec: string, bitrate?: string) {
        await page.getByTestId('top-section').getByTestId('cover-art').click()
        await expect(ui.drawer(page)).toBeVisible()
        await ui.drawer(page).getByLabel('Audio codec').selectOption(codec)
        if (bitrate) await ui.drawer(page).getByLabel('Audio bitrate').selectOption(bitrate)
        await ui.drawerSave(page).click()
        await expect(ui.drawer(page)).toBeHidden()
    }

    test('splits a real-world MP3 (embedded cover) into tagged tracks and a downloadable zip', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page, { file: MP3_EMBEDDED_COVER_FIXTURE })
        await addTimestampsViaTextMode(page)

        const href = await runSplit(page)
        const { dir, names } = await fetchZip(page, href)
        expect(names).toEqual(['Intro.mp3', 'Middle.mp3', 'Outro.mp3', 'timestamps.txt'])

        for (const name of ['Intro.mp3', 'Middle.mp3', 'Outro.mp3']) {
            const file = path.join(dir, name)
            // right length (stream copy cuts on frame boundaries → small tolerance)
            const duration = Number(probe(file, 'format=duration'))
            expect(duration, `${name} duration`).toBeGreaterThan(9.5)
            expect(duration, `${name} duration`).toBeLessThan(10.5)
            // exactly one audio stream + our cover; the source's attached picture was not carried over as a second one
            const streams = probe(file, 'stream=codec_type').split('\n')
            expect(streams.filter((s) => s === 'audio')).toHaveLength(1)
            expect(streams.filter((s) => s === 'video')).toHaveLength(1)
            // stream copy keeps the source format
            expect(probe(file, 'stream=sample_rate').split('\n')[0]).toBe('48000')
        }

        // ID3 tags are ours, not the source file's ("Reach" / "Test Artist" must be gone)
        const tags = probeMap(path.join(dir, 'Middle.mp3'), 'format_tags=title,artist,album,track,genre,date')
        expect(tags).toMatchObject({
            'TAG:title': 'Middle',
            'TAG:artist': ALBUM.artist,
            'TAG:album': ALBUM.album,
            'TAG:genre': ALBUM.genre,
            'TAG:date': ALBUM.year,
            'TAG:track': '2/3',
        })

        expect(fs.readFileSync(path.join(dir, 'timestamps.txt'), 'utf8')).toBe(
            'Intro: 00:00 - 00:10\nMiddle: 00:10 - 00:20\nOutro: 00:20 - '
        )

        // key handling on the download route
        const bad = await page.request.get('/audio-tools/split-track?key=../../.env.local')
        expect(bad.status()).toBe(400)
        const missing = await page.request.get('/audio-tools/split-track?key=audio-split-tool/nope/tracks/x.zip')
        expect(missing.status()).toBe(404)

        // "Change Timestamps" returns to editing with the tracks intact
        await page.getByRole('button', { name: /Change Timestamps/ }).click()
        await expect(ui.timestampRows(page)).toHaveCount(3)
        await expect(ui.download(page)).toBeVisible()
    })

    test('zip is named after the source file when the album name is empty', async ({ page }) => {
        await gotoFresh(page)
        await uploadMp3(page)
        await fillAlbumInfo(page, { ...ALBUM, album: '' })
        await saveAlbumInfo(page)
        await expect(page.getByTestId('waveform-loading')).toBeHidden()
        await addTimestampsViaTextMode(page)

        const href = await runSplit(page)
        expect(href).toMatch(/sample-30s\.zip$/)
        const { names } = await fetchZip(page, href, 'sample-30s.zip')
        expect(names).toContain('Intro.mp3')
    })

    /**
     * Every codec/bitrate the UI offers must produce a playable, tagged file. Each case checks the
     * container, the codec ffprobe reports, the bitrate where one was requested, the tags, and the cover.
     */
    const ENCODINGS: {
        codec: string
        bitrate?: string
        ext: string
        codecName: string
        minKbps?: number
        maxKbps?: number
        cover: boolean
        tags: 'id3' | 'container'
    }[] = [
        { codec: 'copy', ext: '.mp3', codecName: 'mp3', cover: true, tags: 'id3' },
        { codec: 'libmp3lame', bitrate: '192k', ext: '.mp3', codecName: 'mp3', minKbps: 180, maxKbps: 205, cover: true, tags: 'id3' },
        { codec: 'libmp3lame', bitrate: '320k', ext: '.mp3', codecName: 'mp3', minKbps: 300, maxKbps: 330, cover: true, tags: 'id3' },
        { codec: 'aac', bitrate: '128k', ext: '.m4a', codecName: 'aac', minKbps: 100, maxKbps: 160, cover: true, tags: 'container' },
        { codec: 'aac', bitrate: '256k', ext: '.m4a', codecName: 'aac', minKbps: 220, maxKbps: 300, cover: true, tags: 'container' },
        { codec: 'libopus', bitrate: '128k', ext: '.opus', codecName: 'opus', cover: false, tags: 'container' },
    ]

    for (const enc of ENCODINGS) {
        test(`encodes ${enc.codec}${enc.bitrate ? ` @ ${enc.bitrate}` : ''} → ${enc.ext} @slow`, async ({ page }) => {
            await gotoFresh(page)
            await loadTrack(page, { file: MP3_EMBEDDED_COVER_FIXTURE, cover: COVER_PNG_FIXTURE })
            await chooseEncoding(page, enc.codec, enc.bitrate)
            await addTimestampsViaTextMode(page)

            const href = await runSplit(page)
            const { dir, names } = await fetchZip(page, href)
            expect(names).toEqual(['Intro', 'Middle', 'Outro'].map((n) => n + enc.ext).concat('timestamps.txt'))

            const file = path.join(dir, `Middle${enc.ext}`)
            // ffprobe emits one codec_name/codec_type pair per stream; audio first
            const raw = probe(file, 'stream=codec_type,codec_name').split('\n')
            expect(raw[0]).toBe(enc.codecName)
            expect(raw[1]).toBe('audio')
            expect(raw.filter((v) => v === 'video')).toHaveLength(enc.cover ? 1 : 0)

            const duration = Number(probe(file, 'format=duration'))
            expect(duration).toBeGreaterThan(9.5)
            expect(duration).toBeLessThan(10.5)

            if (enc.minKbps) {
                const bitrate = Number(probe(file, 'stream=bit_rate').split('\n')[0] || probe(file, 'format=bit_rate'))
                expect(bitrate / 1000, 'kbps').toBeGreaterThan(enc.minKbps)
                expect(bitrate / 1000, 'kbps').toBeLessThan(enc.maxKbps!)
            }

            // ID3/MP4 keep tags on the container, Ogg/Opus keeps them on the stream
            const tags = {
                ...probeMap(file, 'stream_tags=title,artist,album,genre'),
                ...probeMap(file, 'format_tags=title,artist,album,genre'),
            }
            const tag = (k: string) => tags[`TAG:${k}`] ?? tags[`TAG:${k.toUpperCase()}`]
            expect(tag('title')).toBe('Middle')
            expect(tag('artist')).toBe(ALBUM.artist)
            expect(tag('album')).toBe(ALBUM.album)
            expect(tag('genre')).toBe(ALBUM.genre)
        })
    }

    test('per-track downloads when "Download MP3s separately" is on', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await page.getByTestId('top-section').getByTestId('cover-art').click()
        await expect(ui.drawer(page)).toBeVisible()
        await ui.drawer(page).getByRole('checkbox', { name: /Download MP3s separately/ }).check()
        await ui.drawerSave(page).click()
        await expect(ui.drawer(page)).toBeHidden()
        await addTimestampsViaTextMode(page)

        await runSplit(page)
        const trackLinks = page.locator('a[href*="/audio-tools/split-track?key=audio-split-tool/"][href*="/track/"]')
        await expect(trackLinks).toHaveCount(3)
        const res = await page.request.get((await trackLinks.first().getAttribute('href'))!)
        expect(res.status()).toBe(200)
        expect(res.headers()['content-type']).toBe('audio/mpeg')
    })

    test('the API names the track when a cut is impossible instead of failing inside ffmpeg', async ({ page }) => {
        // straight to the route: the UI refuses these before uploading, but the server must too
        const send = async (timestamps: object[]) => {
            const res = await page.request.post('/audio-tools/split-track', {
                multipart: {
                    file: { name: 'src.mp3', mimeType: 'audio/mpeg', buffer: fs.readFileSync(MP3_EMBEDDED_COVER_FIXTURE) },
                    coverArt: { name: 'cover.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync(COVER_FIXTURE) },
                    artist: 'a',
                    album: 'b',
                    year: '2024',
                    genre: 'g',
                    recapatcha: 'x',
                    timestamps: JSON.stringify(timestamps),
                    audioCodec: 'copy',
                    audioBitrate: '128k',
                },
            })
            expect(res.status()).toBe(200)
            return res.text()
        }

        // the exact shape from the bug report: a later track whose end was set to an earlier start
        let body = await send([
            { id: '1', start: '00:20', end: '00:05', title: 'Reversed' },
            { id: '2', start: '00:05', end: '', title: 'Later' },
        ])
        expect(body).toContain('error: Error: Track "Reversed" ends (00:05) before it starts (00:20)')
        expect(body).not.toContain('tracks:')

        body = await send([{ id: '1', start: '01:40', end: '', title: 'Too late' }])
        expect(body).toContain('error: Error: Track "Too late" starts at 01:40, but the audio is only 0:30 long')

        body = await send([{ id: '1', start: 'abc', end: '', title: 'Garbage' }])
        expect(body).toContain('error: Error: Track "Garbage" has an invalid start time "abc"')

        // untitled tracks get a name in the message too
        body = await send([{ id: '1', start: '00:10', end: '00:02', title: '' }])
        expect(body).toContain('Track "Track 1" ends (00:02) before it starts (00:10)')
    })

    test('a bad file reports an error and lets the user try again', async ({ page }) => {
        await gotoFresh(page)
        // a JPEG disguised as an MP3: WaveSurfer can't decode it and neither can ffprobe
        await ui.mp3Input(page).setInputFiles({
            name: 'not-audio.mp3',
            mimeType: 'audio/mp3',
            buffer: fs.readFileSync(COVER_FIXTURE),
        })
        await expect(ui.drawer(page)).toBeVisible()
        await ui.artist(page).fill('x')
        await ui.coverArtInput(page).setInputFiles(COVER_FIXTURE)
        await ui.drawerSave(page).click()
        await expect(ui.drawer(page)).toBeHidden()

        await ui.addTrack(page).click()
        await ui.download(page).click()
        await expect(ui.errorAlert(page).first()).toBeVisible({ timeout: 60_000 })
        await expect(ui.errorAlert(page).first()).toContainText(/Error/)
        // not stuck in a loading state, and the work is still there and retrievable
        await expect(ui.download(page)).toBeVisible()
        await expect(ui.download(page)).toBeEnabled()
        await expect(ui.timestampRows(page)).toHaveCount(1)
        await expect(ui.timestampsSafe(page)).toBeVisible()
        const downloadPromise = page.waitForEvent('download')
        await ui.timestampsSafe(page).getByRole('button', { name: 'Save timestamps' }).click()
        const file = await downloadPromise
        expect(fs.readFileSync((await file.path())!, 'utf8')).toMatch(/\n0?0:00/)
    })
})

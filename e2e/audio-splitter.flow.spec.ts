import { test, expect } from '@playwright/test'
import fs from 'fs'
import {
    ALBUM,
    addTimestampsViaTextMode,
    fillAlbumInfo,
    gotoFresh,
    loadTrack,
    saveAlbumInfo,
    ui,
    uploadMp3,
} from './helpers/audio-splitter'

/** The <audio> WaveSurfer drives (MediaElement backend, mediaControls: true). */
const media = (page: Parameters<typeof gotoFresh>[0]) => page.locator('audio').first()

test.describe('audio track splitter – flow', () => {
    test('upload opens the album drawer; saving needs cover art', async ({ page }) => {
        await gotoFresh(page)
        await uploadMp3(page)

        // no cover art yet → alert, drawer stays open
        let alertMessage = ''
        page.once('dialog', async (d) => {
            alertMessage = d.message()
            await d.accept()
        })
        await ui.drawerSave(page).click()
        await expect.poll(() => alertMessage).toMatch(/cover art/i)
        await expect(ui.drawer(page)).toBeVisible()

        await fillAlbumInfo(page)
        await saveAlbumInfo(page)

        // preview reflects what was entered
        const top = ui.topSection(page)
        await expect(top.getByText(ALBUM.artist)).toBeVisible()
        await expect(top.getByText(ALBUM.album)).toBeVisible()
        await expect(top.getByText(ALBUM.year)).toBeVisible()
        await expect(top.getByText(ALBUM.genre)).toBeVisible()
        await expect(ui.uploadHeading(page)).toBeHidden()
    })

    test('the player card gradient is picked from the cover art', async ({ page }) => {
        await gotoFresh(page)
        await uploadMp3(page)

        // No cover yet → the brand gradient from the home page, nothing extracted.
        const top = ui.topSection(page)
        await expect(top).not.toHaveAttribute('data-cover-palette', /./)
        const brandGradient = await top.evaluate((el) => getComputedStyle(el).backgroundImage)
        expect(brandGradient).toContain('rgb(255, 224, 49)') // #ffe031, first stop of gradient-animate-3

        await fillAlbumInfo(page)
        await saveAlbumInfo(page)

        // The fixture cover is pink and blue → three distinct stops, each hex, none the brand yellow.
        await expect(top).toHaveAttribute('data-cover-palette', /^#[0-9a-f]{6},#[0-9a-f]{6},#[0-9a-f]{6}$/)
        const stops = (await top.getAttribute('data-cover-palette'))!.split(',')
        expect(new Set(stops).size).toBe(3)
        const coverGradient = await top.evaluate((el) => getComputedStyle(el).backgroundImage)
        expect(coverGradient).not.toEqual(brandGradient)
        expect(coverGradient).not.toContain('rgb(255, 224, 49)')
        // still animates the way the brand cards do
        expect(await top.evaluate((el) => getComputedStyle(el).animationName)).toBe('gradientShift')
    })

    test('text mode builds a tracklist with computed end times', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)

        const rows = ui.timestampRows(page)
        await expect(rows).toHaveCount(3)
        const isMobile = test.info().project.name.startsWith('mobile')
        if (isMobile) {
            await expect(rows.nth(0)).toContainText('Intro')
            await expect(rows.nth(0)).toContainText(/0:00 [-–] 0:10/)
            await expect(rows.nth(2)).toContainText(/0:20 [-–] end/)
        } else {
            await expect(rows.nth(0).getByPlaceholder('MM:SS').nth(0)).toHaveValue('00:00')
            await expect(rows.nth(0).getByPlaceholder('MM:SS').nth(1)).toHaveValue('00:10')
            await expect(rows.nth(0).getByPlaceholder('Track Title')).toHaveValue('Intro')
            await expect(rows.nth(2).getByPlaceholder('MM:SS').nth(1)).toHaveValue('')
        }
        // regions drawn on the waveform, one per track
        await expect(ui.regions(page)).toHaveCount(3)
        // text mode closes itself after submit
        await expect(ui.textModeToggle(page)).not.toBeChecked()
    })

    test('"Add Track" adds a row at the current playback time', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await ui.addTrack(page).click()
        await expect(ui.timestampRows(page)).toHaveCount(1)
        await ui.addTrack(page).click()
        await expect(ui.timestampRows(page)).toHaveCount(2)
        await expect(ui.download(page)).toBeVisible()
    })

    test('renaming a track updates only its label on the waveform; regions are not rebuilt', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)
        await expect(ui.regions(page)).toHaveCount(3)

        // tag the live region elements so we can tell whether they survive the edit
        await ui.regions(page).evaluateAll((els) => els.forEach((el, i) => el.setAttribute('data-probe', `r${i}`)))

        const isMobile = test.info().project.name.startsWith('mobile')
        const row = ui.timestampRows(page).nth(1)
        if (isMobile) {
            await row.getByRole('button', { name: 'More options' }).click()
            await row.getByRole('button', { name: 'Edit' }).click()
        }
        const title = row.getByPlaceholder('Track title')
        await title.fill('Middle renamed')

        await expect(ui.regions(page).nth(1)).toContainText('Middle renamed')
        const probes = await ui.regions(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-probe')))
        expect(probes, 'region elements were recreated').toEqual(['r0', 'r1', 'r2'])
        // the other labels are untouched
        await expect(ui.regions(page).nth(0)).toContainText('Intro')
        await expect(ui.regions(page).nth(2)).toContainText('Outro')

        // deleting a track removes just that region
        if (isMobile) {
            await row.getByRole('button', { name: 'Save title' }).click()
            await row.getByRole('button', { name: 'More options' }).click()
            await row.getByRole('button', { name: 'Remove' }).click()
        } else {
            await row.getByRole('button', { name: 'Delete' }).click()
        }
        await expect(ui.regions(page)).toHaveCount(2)
        const after = await ui.regions(page).evaluateAll((els) => els.map((el) => el.getAttribute('data-probe')))
        expect(after).toEqual(['r0', 'r2'])
    })

    test('tracks added out of order are kept chronological, each ending where the next begins', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        const audio = media(page)
        const seekTo = async (seconds: number) => {
            await audio.evaluate((a: HTMLAudioElement, t) => (a.currentTime = t), seconds)
            await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(seconds - 0.5)
            // wavesurfer's timeupdate → redux; give it a tick
            await page.waitForTimeout(150)
        }

        // the sequence from the bug report: a late track first, then an earlier one
        await seekTo(20)
        await ui.addTrack(page).click()
        await seekTo(5)
        await ui.addTrack(page).click()
        await seekTo(12)
        await ui.addTrack(page).click()
        await expect(ui.timestampRows(page)).toHaveCount(3)

        // untitled rows show their start/end inputs on every layout (mobile opens them in edit mode)
        const row = (i: number) => ui.timestampRows(page).nth(i).getByPlaceholder('MM:SS')
        await expect(row(0).nth(0)).toHaveValue('0:05')
        await expect(row(0).nth(1)).toHaveValue('0:12')
        await expect(row(1).nth(0)).toHaveValue('0:12')
        await expect(row(1).nth(1)).toHaveValue('0:20')
        await expect(row(2).nth(0)).toHaveValue('0:20')
        await expect(row(2).nth(1)).toHaveValue('')
        // nothing ends before it starts, so submit is not refused
        await expect(ui.errorAlert(page)).toHaveCount(0)
    })

    test('an impossible cut is refused before anything is uploaded', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)
        let requests = 0
        await page.route('**/audio-tools/split-track', (route) => {
            requests += 1
            return route.continue()
        })

        // reverse a track's end by hand (typed, so the chronological add logic does not apply)
        const isMobile = test.info().project.name.startsWith('mobile')
        if (isMobile) {
            const row = ui.timestampRows(page).nth(1)
            await row.getByRole('button', { name: 'More options' }).click()
            await row.getByRole('button', { name: 'Edit' }).click()
            await row.getByPlaceholder('MM:SS').nth(1).fill('00:02')
            await row.getByRole('button', { name: 'Save title' }).click()
        } else {
            await ui.timestampRows(page).nth(1).getByPlaceholder('MM:SS').nth(1).fill('00:02')
        }

        await ui.download(page).click()
        await expect(ui.errorAlert(page).first()).toContainText('Middle: ends (00:02) before it starts (00:10)')
        expect(requests, 'no upload should have been attempted').toBe(0)
        await expect(ui.timestampRows(page)).toHaveCount(3)
        await expect(ui.timestampsSafe(page)).toBeVisible()
    })

    test('transport controls drive playback', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)
        const audio = media(page)

        await ui.playPause(page).click()
        await expect(ui.playPause(page)).toHaveAttribute('aria-label', 'Pause')
        await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(0.2)
        await ui.playPause(page).click()
        await expect(ui.playPause(page)).toHaveAttribute('aria-label', 'Play')

        await page.getByRole('button', { name: 'Forward 10 seconds' }).click()
        await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(9.5)
        // now inside "Middle" → preview title follows the playhead
        await expect(ui.nowPlaying(page)).toHaveText('Middle')

        await page.getByRole('button', { name: 'Next track' }).click()
        await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(19.5)
        await page.getByRole('button', { name: 'Previous track' }).click()
        await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeLessThan(11)
        await page.getByRole('button', { name: 'Replay 10 seconds' }).click()
        await expect.poll(() => audio.evaluate((a: HTMLAudioElement) => a.currentTime)).toBeLessThan(1)
    })

    test('work survives a reload (IndexedDB + redux-persist)', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)
        const palette = await ui.topSection(page).getAttribute('data-cover-palette')

        await page.reload()
        await expect(ui.uploadHeading(page)).toBeHidden()
        await expect(ui.waveform(page)).toBeVisible()
        await expect(page.getByTestId('waveform-loading')).toBeHidden()
        await expect(ui.timestampRows(page)).toHaveCount(3)
        await expect(ui.topSection(page).getByText(ALBUM.artist)).toBeVisible()
        await expect(ui.regions(page)).toHaveCount(3)
        // cover art restored from IndexedDB → same gradient as before the reload
        await expect(ui.topSection(page)).toHaveAttribute('data-cover-palette', palette!)
    })

    test('a rejected request (e.g. captcha) is shown as an error, not an empty result', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)
        await page.route('**/audio-tools/split-track', (route) =>
            route.fulfill({ status: 401, contentType: 'text/plain', body: 'Recaptcha verification failed' })
        )
        await ui.download(page).click()
        await expect(ui.errorAlert(page).first()).toContainText('Recaptcha verification failed')
        await expect(ui.downloadZip(page)).toBeHidden()
        // the way out is right next to the error: timestamps still listed, and downloadable
        await expect(ui.timestampsSafe(page)).toBeVisible()
        const downloadPromise = page.waitForEvent('download')
        await ui.timestampsSafe(page).getByRole('button', { name: 'Save timestamps' }).click()
        expect((await downloadPromise).suggestedFilename()).toBe('E2E Album-timestamps.txt')
        // still editable and re-submittable
        await expect(ui.timestampRows(page)).toHaveCount(3)
        await expect(ui.download(page)).toBeEnabled()
    })

    test('timestamps can be saved as a text file that pastes straight back in', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)

        const downloadPromise = page.waitForEvent('download')
        await ui.saveTimestamps(page).first().click()
        const download = await downloadPromise
        expect(download.suggestedFilename()).toBe('E2E Album-timestamps.txt')
        const content = fs.readFileSync((await download.path())!, 'utf8')
        expect(content).toContain('00:00 Intro')
        expect(content).toContain('00:10 Middle')
        expect(content).toContain('00:20 Outro')

        // round trip: the file's lines are exactly what text mode accepts
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page, content.trim())
        await expect(ui.timestampRows(page)).toHaveCount(3)
    })

    test('reset clears everything after confirmation', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)

        page.once('dialog', (d) => d.dismiss())
        await ui.reset(page).click()
        await expect(ui.timestampRows(page)).toHaveCount(3)

        page.once('dialog', (d) => d.accept())
        await ui.reset(page).click()
        await expect(ui.uploadHeading(page)).toBeVisible()
        await page.reload()
        await expect(ui.uploadHeading(page)).toBeVisible()
    })
})

import { test, expect } from '@playwright/test'
import {
    TOUR_STORAGE_KEY,
    addTimestampsViaTextMode,
    box,
    expectWithinViewport,
    gotoFresh,
    loadTrack,
    ui,
} from './helpers/audio-splitter'

const audioEl = (page: Parameters<typeof gotoFresh>[0]) => page.locator('audio').first()

/**
 * First-visit guided flow: welcome dialog → play + first track → name it → download tip. Shown once per
 * browser, anchored to the real controls, never in the way.
 */
test.describe('audio track splitter – first-visit guide', () => {
    test('"Play & start" plays the audio, creates the first track and asks for its name', async ({ page }) => {
        await gotoFresh(page, { tour: true })
        await expect(ui.tourWelcome(page)).toBeHidden() // nothing to guide on the upload screen

        await loadTrack(page)
        const welcome = ui.tourWelcome(page)
        await expect(welcome).toBeVisible()
        await expect(welcome).toContainText('press play and divide it')
        await expectWithinViewport(page, welcome, 'welcome dialog')

        await welcome.getByRole('button', { name: /Play & start/ }).click()
        await expect(welcome).toBeHidden()

        // audio is playing and the first track exists at 0:00 (phones collapse the player while naming,
        // so check the media element rather than the transport button here)
        await expect.poll(() => audioEl(page).evaluate((a: HTMLAudioElement) => !a.paused)).toBe(true)
        await expect.poll(() => audioEl(page).evaluate((a: HTMLAudioElement) => a.currentTime)).toBeGreaterThan(0.2)
        await expect(ui.timestampRows(page)).toHaveCount(1)
        if (test.info().project.name.startsWith('mobile')) await expect(ui.topSection(page)).toBeHidden()

        // the "name it" tip points at the title field, which has focus
        const tip = ui.tourStep(page)
        await expect(tip).toHaveAttribute('data-tour-step', 'name')
        await expect(tip).toContainText('What’s this track called?')
        await expectWithinViewport(page, tip, 'name tip')
        const title = ui.firstTitle(page)
        await expect(title).toBeFocused()
        const t = await box(title)
        const b = await box(tip)
        expect(b.x).toBeLessThan(t.x + t.width)
        expect(b.x + b.width).toBeGreaterThan(t.x)

        // typing works with the tip up; nothing advances until focus leaves the field
        await title.fill('Opening song')
        await expect(tip).toHaveAttribute('data-tour-step', 'name')
        await page.getByRole('heading', { name: 'Tracks' }).click()
        await expect(tip).toHaveAttribute('data-tour-step', 'download')
        await expect(tip).toContainText('Split & download')
        await expectWithinViewport(page, tip, 'download tip')
        // the player is back and still playing
        await expect(ui.topSection(page)).toBeVisible()
        await expect(ui.playPause(page)).toHaveAttribute('aria-label', 'Pause')
        // the download tip points at the download button and does not block it
        const dl = await box(ui.download(page))
        const d = await box(tip)
        expect(d.x).toBeLessThan(dl.x + dl.width)
        expect(d.x + d.width).toBeGreaterThan(dl.x)
        await expect(ui.download(page)).toBeEnabled()

        await tip.getByRole('button', { name: 'Got it' }).click()
        await expect(tip).toBeHidden()

        // the name stuck (mobile keeps the editor open until its Save button), and after a reload nothing comes back
        await expect(ui.firstTitle(page)).toHaveValue('Opening song')
        await page.reload()
        await expect(ui.timestampRows(page)).toHaveCount(1)
        await expect(ui.tourWelcome(page)).toBeHidden()
        await expect(ui.tourStep(page)).toBeHidden()
        const dismissed = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), TOUR_STORAGE_KEY)
        expect(dismissed).toEqual(expect.arrayContaining(['welcome', 'name', 'download']))
    })

    test('"I\'ll paste timestamps" opens text mode; the download tip still appears once tracks exist', async ({ page }) => {
        await gotoFresh(page, { tour: true })
        await loadTrack(page)
        await ui.tourWelcome(page).getByRole('button', { name: /paste timestamps/ }).click()
        await expect(ui.tourWelcome(page)).toBeHidden()
        await expect(ui.textModeInput(page)).toBeVisible()
        // phones collapse the player (and its toggle) while pasting; elsewhere the toggle reflects the mode
        if (test.info().project.name.startsWith('mobile')) await expect(ui.topSection(page)).toBeHidden()
        else await expect(ui.textModeToggle(page)).toBeChecked()
        await expect(ui.tourStep(page)).toBeHidden()
        // audio was not started behind their back
        await expect.poll(() => audioEl(page).evaluate((a: HTMLAudioElement) => a.paused)).toBe(true)

        await ui.textModeInput(page).fill('00:00 A\n00:10 B')
        await ui.textModeSubmit(page).click()
        await expect(ui.timestampRows(page)).toHaveCount(2)
        await expect(ui.tourStep(page)).toHaveAttribute('data-tour-step', 'download')
        await ui.tourStep(page).getByRole('button', { name: 'Got it' }).click()
        await expect(ui.tourStep(page)).toBeHidden()
    })

    test('"Skip" on the name step goes straight to the download tip', async ({ page }) => {
        await gotoFresh(page, { tour: true })
        await loadTrack(page)
        await ui.tourWelcome(page).getByRole('button', { name: /Play & start/ }).click()
        await expect(ui.tourStep(page)).toHaveAttribute('data-tour-step', 'name')
        await ui.tourStep(page).getByRole('button', { name: 'Skip' }).click()
        await expect(ui.tourStep(page)).toHaveAttribute('data-tour-step', 'download')
    })

    test('never shows for a returning visitor', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await expect(ui.tourWelcome(page)).toBeHidden()
        await addTimestampsViaTextMode(page)
        await expect(ui.tourStep(page)).toBeHidden()
    })
})

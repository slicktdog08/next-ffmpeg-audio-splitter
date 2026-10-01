import { test, expect } from '@playwright/test'
import { addTimestampsViaTextMode, gotoFresh, loadTrack, uploadMp3, fillAlbumInfo, ui } from './helpers/audio-splitter'

/**
 * Not an assertion suite: walks the tool through each state and captures a full-page screenshot
 * per viewport into e2e/.results/walkthrough. Use it to *look* at the layout while iterating:
 *   yarn e2e audio-splitter.walkthrough
 */
const shot = (page: Parameters<typeof gotoFresh>[0], name: string) =>
    page.screenshot({ path: `${test.info().project.outputDir}/walkthrough/${test.info().project.name}/${name}.png`, fullPage: false })

test('walkthrough: capture every state', async ({ page }) => {
    test.setTimeout(180_000)
    await gotoFresh(page, { tour: true })
    await shot(page, '01-empty')

    await uploadMp3(page)
    await page.waitForTimeout(400) // drawer slide-in
    await shot(page, '02-drawer-open-empty')

    await fillAlbumInfo(page)
    await page.waitForTimeout(300) // cover art decode
    await shot(page, '03-drawer-filled')

    await ui.drawerSave(page).click()
    await page.getByTestId('waveform-loading').waitFor({ state: 'hidden' })
    await page.waitForTimeout(400) // drawer slide-out
    await shot(page, '04-loaded-welcome')
    await ui.tourWelcome(page).getByRole('button', { name: /Play & start/ }).click()
    await page.waitForTimeout(600)
    await shot(page, '04b-guide-name')
    await ui.firstTitle(page).fill('Opening song')
    await page.getByRole('heading', { name: 'Tracks' }).click()
    await page.waitForTimeout(400)
    await shot(page, '04c-guide-download')
    await ui.tourStep(page).getByRole('button', { name: 'Got it' }).click()
    await ui.playPause(page).click() // pause again for the remaining shots
    page.once('dialog', (d) => d.accept())
    await ui.reset(page).click()
    await expect(ui.uploadHeading(page)).toBeVisible()
    await uploadMp3(page)
    await fillAlbumInfo(page)
    await ui.drawerSave(page).click()
    await page.getByTestId('waveform-loading').waitFor({ state: 'hidden' })

    await ui.textModeToggle(page).check()
    await shot(page, '05-text-mode')

    await addTimestampsViaTextMode(page)
    await page.waitForTimeout(400) // regions paint
    await shot(page, '06-tracks-added')

    await ui.playPause(page).click()
    await page.waitForTimeout(1500)
    await shot(page, '07-playing')
    await ui.playPause(page).click()

    page.on('popup', (p) => p.close())
    await ui.download(page).click()
    await ui.downloadZip(page).waitFor({ timeout: 120_000 })
    await page.waitForTimeout(300)
    await shot(page, '08-results')
})

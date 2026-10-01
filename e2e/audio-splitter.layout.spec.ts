import { test, expect } from '@playwright/test'
import {
    addTimestampsViaTextMode,
    box,
    expectNoClippedControls,
    expectNoHorizontalOverflow,
    expectWithinViewport,
    fillAlbumInfo,
    gotoFresh,
    installFakeVisualViewport,
    loadTrack,
    setKeyboardHeight,
    ui,
    uploadMp3,
    viewport,
} from './helpers/audio-splitter'

/**
 * Usability at desktop / laptop / mobile. These are geometric checks — nothing here cares what the
 * tool looked like under MUI, only that every control a user needs is on screen and reachable.
 */
test.describe('audio track splitter – layout', () => {
    test('empty state: upload call-to-action is centred and on screen', async ({ page }) => {
        await gotoFresh(page)
        await expectNoHorizontalOverflow(page)
        await expectWithinViewport(page, ui.uploadHeading(page), 'heading')
        // the notice is the first thing in the card: it must be fully inside the card, not clipped by its top edge
        const cardBox = await box(page.getByTestId('upload-card'))
        const notice = await box(ui.sourceNotice(page))
        expect(notice.y, 'notice clipped by the top of the card').toBeGreaterThanOrEqual(cardBox.y)
        expect(notice.x + notice.width, 'notice clipped by the right of the card').toBeLessThanOrEqual(cardBox.x + cardBox.width + 1)
        await expectWithinViewport(page, ui.sourceNotice(page), 'open-source notice')
        // and the primary action is reachable: either on screen already or by scrolling the card
        await ui.chooseMp3(page).scrollIntoViewIfNeeded()
        await expectWithinViewport(page, ui.chooseMp3(page), 'Choose MP3 after scroll')
        const button = ui.chooseMp3(page)
        await expectWithinViewport(page, button, 'Choose MP3')

        // on wide screens the call to action sits in the hero card without scrolling; phones scroll the card
        const b = await box(button)
        const vp = await viewport(page)
        if (vp.width >= 600) {
            expect(b.y).toBeGreaterThan(vp.height * 0.15)
            expect(b.y + b.height).toBeLessThan(vp.height * 0.85)
        }
    })

    test('album info drawer: every field and Save are reachable', async ({ page }) => {
        await gotoFresh(page)
        await uploadMp3(page)
        await page.waitForTimeout(400)
        await fillAlbumInfo(page)

        for (const [label, loc] of [
            ['artist', ui.artist(page)],
            ['album', ui.album(page)],
            ['year', ui.year(page)],
            ['genre', ui.genre(page)],
            ['save', ui.drawerSave(page)],
        ] as const) {
            await loc.scrollIntoViewIfNeeded()
            await expectWithinViewport(page, loc, label)
        }
        // the drawer scrolls internally; the document itself never does
        await expectNoHorizontalOverflow(page)
        expect(await page.evaluate(() => window.scrollY)).toBe(0)

        // cover art must not overlap the first form field
        const cover = await box(ui.drawerCoverArt(page))
        const artist = await box(ui.artist(page))
        const overlapsHorizontally = cover.x < artist.x + artist.width && cover.x + cover.width > artist.x
        const overlapsVertically = cover.y < artist.y + artist.height && cover.y + cover.height > artist.y
        expect(overlapsHorizontally && overlapsVertically, 'cover art overlaps the Artist field').toBe(false)
    })

    test('player with tracks: transport, header actions and the first rows fit on screen', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)
        await page.waitForTimeout(400)

        await expectNoHorizontalOverflow(page)
        await expectWithinViewport(page, ui.header(page), 'header')
        await expectWithinViewport(page, ui.topSection(page), 'top section')
        await expectWithinViewport(page, ui.playPause(page), 'play/pause')
        await expectWithinViewport(page, ui.addTrack(page), 'Add Track')
        await expectWithinViewport(page, ui.download(page), 'Download')
        await expectWithinViewport(page, ui.waveform(page), 'waveform')

        // top and bottom sections stack without overlapping
        const top = await box(ui.topSection(page))
        const bottom = await box(ui.bottomSection(page))
        expect(bottom.y).toBeGreaterThanOrEqual(top.y + top.height - 1)

        // the list gets a usable amount of room even on the shortest viewport
        expect(bottom.height, 'bottom section height').toBeGreaterThanOrEqual(180)

        // the first row is always visible without scrolling; the second too unless the screen is
        // shorter than ~640px (original iPhone SE), where the list scrolls
        const rows = ui.timestampRows(page)
        await expectWithinViewport(page, rows.nth(0), 'row 1')
        if ((await viewport(page)).height >= 640) await expectWithinViewport(page, rows.nth(1), 'row 2')
        await rows.nth(1).scrollIntoViewIfNeeded()
        await expectWithinViewport(page, rows.nth(1), 'row 2 after scroll')

        // nothing in the list card is clipped by its edges (the bottom card hides horizontal overflow,
        // so a plain page-overflow check would not catch a button pushed off the right)
        await expectNoClippedControls(page, ui.bottomSection(page), 'list card')
        await expectWithinViewport(page, ui.saveTimestamps(page).first(), 'Save timestamps')
        await expectWithinViewport(page, ui.copyTimestamps(page).first(), 'Copy timestamps')
    })

    test('nothing in the album drawer is clipped either', async ({ page }) => {
        await gotoFresh(page)
        await uploadMp3(page)
        await page.waitForTimeout(400)
        await expectNoClippedControls(page, ui.drawer(page), 'drawer')
    })

    test('many tracks: the list scrolls on its own and the player stays put', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        const many = Array.from({ length: 14 }, (_, i) => `00:${String(i * 2).padStart(2, '0')} Track ${i + 1}`).join('\n')
        await addTimestampsViaTextMode(page, many)
        await page.waitForTimeout(300)

        const topBefore = await box(ui.topSection(page))
        const { scrollHeight, clientHeight } = await ui.bottomSection(page).evaluate((el) => ({
            scrollHeight: el.scrollHeight,
            clientHeight: el.clientHeight,
        }))
        expect(scrollHeight, 'bottom section should overflow and scroll').toBeGreaterThan(clientHeight)

        const last = ui.timestampRows(page).last()
        await last.scrollIntoViewIfNeeded()
        await expectWithinViewport(page, last, 'last row')

        const topAfter = await box(ui.topSection(page))
        expect(topAfter.y).toBeCloseTo(topBefore.y, 0)
        expect(await page.evaluate(() => window.scrollY)).toBe(0)
    })

    test('text mode: textarea is readable and its buttons are on screen', async ({ page }) => {
        await gotoFresh(page)
        await loadTrack(page)
        await ui.textModeToggle(page).check()
        const ta = ui.textModeInput(page)
        await expectWithinViewport(page, ta, 'textarea')
        await expectWithinViewport(page, ui.textModeSubmit(page), 'Submit')

        // text must contrast with its background (the MUI→Tailwind port shipped black-on-black)
        const { color, bg } = await ta.evaluate((el) => {
            const cs = getComputedStyle(el)
            // walk up to the first (mostly) opaque background; tints like oklab(0 0 0 / 0.03) don't count
            const alphaOf = (c: string) => {
                const m = c.match(/\/\s*([\d.]+)\)$/) ?? c.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)$/)
                return c === 'transparent' ? 0 : m ? Number(m[1]) : 1
            }
            let node: HTMLElement | null = el as HTMLElement
            let bg = cs.backgroundColor
            while (node && alphaOf(bg) < 0.5) {
                node = node.parentElement
                bg = node ? getComputedStyle(node).backgroundColor : 'rgb(255, 255, 255)'
            }
            return { color: cs.color, bg }
        })
        const lum = (c: string) => {
            const [r, g, b] = c.match(/[\d.]+/g)!.map(Number)
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        expect(Math.abs(lum(color) - lum(bg)), `contrast between ${color} and ${bg}`).toBeGreaterThan(100)
    })
})

/**
 * Phone-specific behaviour: iOS zoom rules and the on-screen keyboard.
 */
test.describe('audio track splitter – phone', () => {
    test.beforeEach(async ({}, testInfo) => {
        test.skip(!testInfo.project.name.startsWith('mobile'), 'phone-only behaviour')
    })

    test('the route locks page zoom and every field is ≥16px, so iOS never auto-zooms on focus', async ({ page }) => {
        await gotoFresh(page)
        const content = await page.locator('meta[name="viewport"]').last().getAttribute('content')
        expect(content).toContain('maximum-scale=1')
        expect(content).toContain('user-scalable=no')

        await uploadMp3(page)
        await page.waitForTimeout(400)
        const check = async (scope: ReturnType<typeof ui.drawer>, label: string) => {
            const sizes = await scope
                .locator('input:not([type=file]):not([type=checkbox]), select, textarea')
                .evaluateAll((els) => els.map((el) => [el.getAttribute('placeholder') || el.id || el.tagName, parseFloat(getComputedStyle(el).fontSize)]))
            expect(sizes.length, `${label}: fields found`).toBeGreaterThan(0)
            for (const [name, size] of sizes) expect(size, `${label}: ${name} font-size`).toBeGreaterThanOrEqual(16)
        }
        await check(ui.drawer(page), 'drawer')
        await fillAlbumInfo(page)
        await ui.drawerSave(page).click()
        await expect(ui.drawer(page)).toBeHidden()
        await addTimestampsViaTextMode(page)
        // open a row for editing
        await ui.timestampRows(page).first().getByRole('button', { name: 'More options' }).click()
        await ui.timestampRows(page).first().getByRole('button', { name: 'Edit' }).click()
        await check(ui.bottomSection(page), 'track editor')
        await ui.textModeToggle(page).check()
        await check(ui.bottomSection(page), 'text mode')
    })

    test('with the keyboard up, the app shrinks to the visible area and the field being edited stays reachable', async ({ page }) => {
        await installFakeVisualViewport(page)
        await gotoFresh(page)
        await loadTrack(page)
        await addTimestampsViaTextMode(page)
        const vp = await viewport(page)
        const fullHeight = (await box(ui.app(page))).height
        expect(fullHeight).toBeCloseTo(vp.height, 0)

        // edit the last row's title, then "raise" a 300px keyboard
        const last = ui.timestampRows(page).last()
        await last.getByRole('button', { name: 'More options' }).click()
        await last.getByRole('button', { name: 'Edit' }).click()
        const title = last.getByPlaceholder('Track title')
        await title.focus()
        await setKeyboardHeight(page, 300)

        await expect(ui.app(page)).toHaveAttribute('data-keyboard-open', 'true')
        await expect.poll(async () => (await box(ui.app(page))).height).toBe(vp.height - 300)
        await expect(ui.topSection(page)).toBeHidden()
        // the list card fills what is left, and the focused field can be brought into the visible area
        const list = await box(ui.bottomSection(page))
        expect(list.y + list.height).toBeLessThanOrEqual(vp.height - 300 + 1)
        await title.scrollIntoViewIfNeeded()
        const t = await box(title)
        expect(t.y).toBeGreaterThanOrEqual(0)
        expect(t.y + t.height).toBeLessThanOrEqual(vp.height - 300 + 1)
        await title.fill('Typed with keyboard up')

        // keyboard down: player comes back, nothing lost
        await setKeyboardHeight(page, 0)
        await expect(ui.topSection(page)).toBeVisible()
        await expect.poll(async () => (await box(ui.app(page))).height).toBeCloseTo(vp.height, 0)
        await expect(title).toHaveValue('Typed with keyboard up')
    })
})

/**
 * Visual baselines per viewport. Rendering differs slightly across OSes, so these run locally by
 * default and in CI only when E2E_VISUAL=1 (regenerate with `yarn e2e:update-snapshots`).
 */
test.describe('audio track splitter – visual', () => {
    test.skip(!!process.env.CI && !process.env.E2E_VISUAL, 'visual snapshots are opt-in on CI')

    test('states look right', async ({ page }) => {
        await gotoFresh(page)
        // the gradient cards animate on a 15–20 s loop; freeze them so two captures can ever match,
        // and wait for the local fonts (a capture in the fallback font differs by ~10 % of pixels)
        await page.addStyleTag({ content: '[class*="gradient-animate"] { animation: none !important; }' })
        await page.evaluate(() => document.fonts.ready)
        await expect(page).toHaveScreenshot('01-empty.png', { maxDiffPixelRatio: 0.02 })

        await uploadMp3(page)
        await page.waitForTimeout(400)
        await fillAlbumInfo(page)
        await page.keyboard.press('Escape')
        await expect(page).toHaveScreenshot('02-drawer.png', { maxDiffPixelRatio: 0.02 })

        await ui.drawerSave(page).click()
        await expect(ui.drawer(page)).toBeHidden()
        await expect(page.getByTestId('waveform-loading')).toBeHidden()
        await addTimestampsViaTextMode(page)
        await page.waitForTimeout(400)
        // the waveform canvas is not deterministic; the regions/labels drawn over it are
        await expect(page).toHaveScreenshot('03-tracks.png', {
            maxDiffPixelRatio: 0.02,
            mask: [ui.waveform(page)],
        })
    })
})

import { expect, Page, Locator } from '@playwright/test'
import path from 'path'

export const ROUTE = '/'
export const FIXTURES = path.join(__dirname, '..', 'fixtures')
export const MP3_FIXTURE = path.join(FIXTURES, 'sample-30s.mp3')
/** Stereo 48 kHz, ID3-tagged, with an embedded PNG cover (an "attached picture" video stream) — like real rips. */
export const MP3_EMBEDDED_COVER_FIXTURE = path.join(FIXTURES, 'sample-30s-embedded-cover.mp3')
export const COVER_FIXTURE = path.join(FIXTURES, 'cover.jpg')
export const COVER_PNG_FIXTURE = path.join(FIXTURES, 'cover.png')
export const TIMESTAMPS_TEXT = `00:00 Intro\n00:10 Middle\n00:20 Outro`

export const ALBUM = { artist: 'E2E Artist', album: 'E2E Album', year: '2026', genre: 'Electronic' }

/** Selectors kept in one place so tests read like a script. */
export const ui: Record<string, (page: Page) => Locator> = {
    uploadHeading: (page: Page) => page.getByRole('heading', { name: /Turn one long MP3/ }),
    mp3Input: (page: Page) => page.locator('input[type="file"][accept="audio/mp3"]'),
    drawer: (page: Page) => page.getByTestId('album-info-drawer'),
    // everything inside the drawer is scoped to it: the player behind it renders a second CoverArt
    drawerCoverArt: (page: Page) => ui.drawer(page).getByTestId('cover-art'),
    coverArtInput: (page: Page) => ui.drawer(page).locator('input[type="file"][accept="image/*"]'),
    drawerSave: (page: Page) => ui.drawer(page).getByRole('button', { name: 'Save' }),
    artist: (page: Page) => ui.drawer(page).getByPlaceholder('Artist'),
    album: (page: Page) => ui.drawer(page).getByPlaceholder('Album'),
    year: (page: Page) => ui.drawer(page).getByPlaceholder('Year'),
    genre: (page: Page) => ui.drawer(page).getByPlaceholder('Genre'),
    header: (page: Page) => page.getByTestId('header-toolbar'),
    topSection: (page: Page) => page.getByTestId('top-section'),
    bottomSection: (page: Page) => page.getByTestId('bottom-section'),
    waveform: (page: Page) => page.getByTestId('waveform'),
    chooseMp3: (page: Page) => page.getByText('Choose MP3'),
    // wavesurfer draws regions inside its shadow DOM with part="region region-<id>"
    regions: (page: Page) => page.getByTestId('waveform').locator('[part~="region"]'),
    nowPlaying: (page: Page) => page.getByTestId('now-playing-title'),
    shell: (page: Page) => page.getByTestId('splitter-shell'),
    tourStep: (page: Page) => page.getByTestId('tour-step'),
    tourWelcome: (page: Page) => page.getByTestId('tour-welcome'),
    firstTitle: (page: Page) => page.locator('[data-tour="track-title"]'),
    saveTimestamps: (page: Page) => page.getByRole('button', { name: 'Save timestamps' }),
    copyTimestamps: (page: Page) => page.getByRole('button', { name: 'Copy timestamps' }),
    app: (page: Page) => page.getByTestId('splitter-app'),
    timestampsSafe: (page: Page) => page.getByTestId('timestamps-safe'),
    sourceNotice: (page: Page) => page.getByTestId('open-source-notice'),
    addTrack: (page: Page) => page.getByRole('button', { name: 'Add Track' }),
    download: (page: Page) => page.getByRole('button', { name: 'Download' }),
    reset: (page: Page) => page.getByRole('button', { name: 'Reset' }),
    textModeToggle: (page: Page) => page.getByRole('checkbox', { name: /Paste timestamps as text/ }),
    textModeInput: (page: Page) => page.getByPlaceholder(/0:00 Intro/),
    textModeSubmit: (page: Page) => page.getByRole('button', { name: 'Submit' }),
    timestampRows: (page: Page) => page.getByTestId('timestamp-row'),
    playPause: (page: Page) => page.getByRole('button', { name: /^(Play|Pause)$/ }).first(),
    progressLog: (page: Page) => page.getByTestId('progress-log'),
    downloadZip: (page: Page) => page.getByRole('link', { name: /Download Zip/ }),
    errorAlert: (page: Page) => page.getByTestId('bottom-section').getByRole('alert'),
}

export const TOUR_STORAGE_KEY = 'audio-splitter:tour:v2'
const ALL_TOUR_STEPS = ['welcome', 'name', 'download']

/**
 * Fresh visit: clears persisted redux + IndexedDB so each test starts on the upload screen.
 * The first-visit tour is pre-dismissed unless `tour: true` — it must never sit over a control a test clicks.
 */
export async function gotoFresh(page: Page, { tour = false }: { tour?: boolean } = {}) {
    await page.goto(ROUTE)
    await page.evaluate(async ({ key, steps, tour }) => {
        localStorage.clear()
        sessionStorage.clear()
        if (!tour) localStorage.setItem(key, JSON.stringify(steps))
        const dbs = (await indexedDB.databases?.()) ?? [{ name: 'FileStorage' }]
        await Promise.all(
            dbs.map(
                (db) =>
                    new Promise<void>((resolve) => {
                        if (!db.name) return resolve()
                        const req = indexedDB.deleteDatabase(db.name)
                        req.onsuccess = req.onerror = req.onblocked = () => resolve()
                    })
            )
        )
    }, { key: TOUR_STORAGE_KEY, steps: ALL_TOUR_STEPS, tour })
    await page.reload()
    await expect(ui.shell(page)).toBeHidden()
    await expect(ui.uploadHeading(page)).toBeVisible()
}

export async function uploadMp3(page: Page, file = MP3_FIXTURE) {
    await ui.mp3Input(page).setInputFiles(file)
    await expect(ui.drawer(page)).toBeVisible()
}

export async function fillAlbumInfo(page: Page, info = ALBUM, cover = COVER_FIXTURE) {
    await ui.artist(page).fill(info.artist)
    await ui.album(page).fill(info.album)
    await ui.year(page).fill(info.year)
    await ui.genre(page).fill(info.genre)
    // close the autocomplete without changing the value
    await page.keyboard.press('Escape')
    await ui.coverArtInput(page).setInputFiles(cover)
}

export async function saveAlbumInfo(page: Page) {
    await ui.drawerSave(page).click()
    await expect(ui.drawer(page)).toBeHidden()
}

/** Upload → album info → saved, waveform ready. The state most tests start from. */
export async function loadTrack(page: Page, opts: { file?: string; cover?: string } = {}) {
    await uploadMp3(page, opts.file)
    await fillAlbumInfo(page, ALBUM, opts.cover)
    await saveAlbumInfo(page)
    await expect(ui.waveform(page)).toBeVisible()
    await expect(page.getByTestId('waveform-loading')).toBeHidden()
}

export async function addTimestampsViaTextMode(page: Page, text = TIMESTAMPS_TEXT, expectedCount?: number) {
    // phones collapse the player (and its toggle) once text mode is on, so only toggle when needed
    if (!(await ui.textModeInput(page).isVisible())) await ui.textModeToggle(page).check()
    await ui.textModeInput(page).fill(text)
    await ui.textModeSubmit(page).click()
    // lines without a timestamp (comments, blanks) are ignored by the parser
    const lines = text.split('\n').filter((l) => /\d{1,2}:\d{2}/.test(l)).length
    await expect(ui.timestampRows(page)).toHaveCount(expectedCount ?? lines)
}

/** Geometry helpers used by the usability assertions. */
export async function box(locator: Locator) {
    const b = await locator.boundingBox()
    if (!b) throw new Error('Element has no bounding box (not rendered?)')
    return b
}

export async function viewport(page: Page) {
    const vp = page.viewportSize()
    if (!vp) throw new Error('No viewport')
    return vp
}

export async function expectNoHorizontalOverflow(page: Page) {
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
    }))
    expect(scrollWidth, 'page must not scroll horizontally').toBeLessThanOrEqual(clientWidth)
}

/** Every element with a data-testid / role we care about must be within the viewport. */
export async function expectWithinViewport(page: Page, locator: Locator, label: string) {
    const b = await box(locator)
    const vp = await viewport(page)
    expect(b.x, `${label} left edge`).toBeGreaterThanOrEqual(-1)
    expect(b.y, `${label} top edge`).toBeGreaterThanOrEqual(-1)
    expect(b.x + b.width, `${label} right edge`).toBeLessThanOrEqual(vp.width + 1)
    expect(b.y + b.height, `${label} bottom edge`).toBeLessThanOrEqual(vp.height + 1)
}

/** Every interactive control inside `container` must be fully inside the viewport horizontally. */
export async function expectNoClippedControls(page: Page, container: Locator, label: string) {
    const vp = await viewport(page)
    const boxes = await container.locator('button, a, input, select, textarea').evaluateAll((els) =>
        els
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => {
                const r = el.getBoundingClientRect()
                return { x: r.x, right: r.right, name: (el as HTMLElement).getAttribute('aria-label') || (el as HTMLElement).textContent?.trim().slice(0, 30) || el.tagName }
            })
    )
    for (const b of boxes) {
        expect(b.x, `${label}: "${b.name}" left edge`).toBeGreaterThanOrEqual(-1)
        expect(b.right, `${label}: "${b.name}" right edge`).toBeLessThanOrEqual(vp.width + 1)
    }
}

/**
 * Stand-in for a phone's on-screen keyboard. Real iOS shrinks `window.visualViewport` but not the layout
 * viewport, which is exactly what the app listens to; there is no way to raise a real keyboard in Playwright.
 * Call before `gotoFresh`.
 */
export async function installFakeVisualViewport(page: Page) {
    await page.addInitScript(() => {
        // live getters: innerHeight is not final when init scripts run under device emulation
        let keyboard = 0
        class FakeVisualViewport extends EventTarget {
            get height() {
                return window.innerHeight - keyboard
            }
            get width() {
                return window.innerWidth
            }
            offsetTop = 0
            offsetLeft = 0
            pageTop = 0
            pageLeft = 0
            scale = 1
        }
        const vv = new FakeVisualViewport()
        Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true })
        ;(window as any).__setKeyboardHeight = (k: number) => {
            keyboard = k
            vv.dispatchEvent(new Event('resize'))
        }
    })
}

export const setKeyboardHeight = (page: Page, keyboard: number) =>
    page.evaluate((k) => (window as any).__setKeyboardHeight(k), keyboard)

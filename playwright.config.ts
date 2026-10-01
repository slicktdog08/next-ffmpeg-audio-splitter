import { defineConfig, devices } from '@playwright/test'

/**
 * E2E for the splitter (served at /).
 *
 * Runs against `next dev` on its own port (3900) and its own build dir (.next-e2e), so it can run
 * side by side with `yarn dev` on 3000.
 * The dev server is started with:
 *   SPLIT_TRACK_STORAGE=local  – finished zips/tracks are written to generated/audio-split/_store, no AWS creds needed
 *   SKIP_CAPTCHA=true          – server-side reCAPTCHA check is bypassed
 *   NEXT_PUBLIC_SKIP_CAPTCHA   – client skips the reCAPTCHA modal
 *
 * Four viewports so we see the tool the way users do: a large desktop monitor, a 13" laptop
 * (the tightest vertical budget for this layout), a current phone and a small phone (the code's own
 * breakpoint is 600px). All Chromium: WebKit is a separate install (`npx playwright install webkit`).
 */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 3900)
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`
// Two runs at once (two terminals, an IDE agent…) must not share a server or wipe each other's results:
// `E2E_PORT=3901 yarn e2e` gets its own port, Next build dir and output dir.
const suffix = E2E_PORT === 3900 ? '' : `-${E2E_PORT}`

export default defineConfig({
    testDir: './e2e',
    outputDir: `./e2e/.results${suffix}`,
    snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    timeout: 90_000,
    expect: { timeout: 15_000 },
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
    use: {
        baseURL: E2E_BASE_URL,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Use an already-installed Chromium instead of the one Playwright pins (sandboxes, distro packages)
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE && {
            launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
        }),
    },
    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } } },
        { name: 'laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } },
        // the smallest phone still in wide use: 375×667 CSS px, the tightest budget for every card
        { name: 'mobile-small', use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium' } },
    ],
    webServer: {
        command: `yarn dev -p ${E2E_PORT}`,
        url: E2E_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
        env: {
            NEXT_DIST_DIR: `.next-e2e${suffix}`,
            // Next dev restarts itself when the heap passes 80% of the limit, which drops every
            // in-flight test for a few seconds. Give the E2E server plenty of headroom.
            NODE_OPTIONS: '--max-old-space-size=4096',
            SPLIT_TRACK_STORAGE: 'local',
            SKIP_CAPTCHA: 'true',
            NEXT_PUBLIC_SKIP_CAPTCHA: 'true',
        },
    },
})

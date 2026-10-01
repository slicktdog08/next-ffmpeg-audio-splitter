/** @type {import('next').NextConfig} */
module.exports = {
    // Playwright runs its own dev server (NEXT_DIST_DIR=.next-e2e) so it can coexist with `yarn dev`
    distDir: process.env.NEXT_DIST_DIR || '.next',
    output: 'standalone',
    reactStrictMode: false,
    turbopack: {
        root: __dirname,
    },
    // Node-only packages used by the split-track route; keep them out of the bundle
    // The split route builds paths from process.cwd(), so the tracer would otherwise copy whatever is in
    // generated/ (user uploads) and e2e/ (test fixtures) into the standalone output
    outputFileTracingExcludes: {
        '*': ['generated/**', 'e2e/**'],
    },
    serverExternalPackages: ['fluent-ffmpeg', 'aws-sdk', 'archiver', 'node-id3'],
}

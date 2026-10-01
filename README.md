# next-ffmpeg-audio-splitter

Split one long MP3 (a mixtape, a live set, a whole album in a single file) into individual tracks, each tagged
with artist, album, year, genre and cover art, and download them as a zip.

**Use it for free at [YOUR-DOMAIN](https://YOUR-DOMAIN)** — no install, no account.

We run the hosted version, and we also share all of its code here so others can learn from it, run it
themselves, and build on it. If you just want to split a file, use the hosted site. If you want to see how a
real-world Next.js + ffmpeg app fits together (streaming uploads, server-sent progress, ID3 tagging, a
waveform editor, end-to-end tests on four viewports), read on.

## Features

- Waveform editor ([wavesurfer.js](https://wavesurfer.xyz/)): tap along while it plays or drag regions to mark tracks
- Paste timestamps as text (`0:00 Intro`, `3:12 Song two`…) and export them again
- Album info and cover art written into every track (ID3 tags + attached picture)
- Output as the original MP3 stream (lossless copy), re-encoded MP3, AAC (`.m4a`) or Opus
- Live progress over server-sent events while ffmpeg cuts
- Work survives a reload: the audio and cover live in IndexedDB, the tracklist in `localStorage`
- Guided first-visit tour; works on phones down to 375px wide

## How it works

```
browser                                         Next.js server (app/audio-tools/split-track/route.ts)
───────                                         ─────────────────────────────────────────────────────
upload MP3 + cover + timestamps  ── POST ──▶    save to generated/audio-split/<id>
                                                validate cut points against ffprobe's duration
                                                ffmpeg: one cut per track, tags + cover attached
                    ◀── SSE progress ──         zip the tracks + timestamps.txt
                                                store (S3 or local disk), return keys
download zip / single tracks     ── GET ?key ─▶ stream from storage
```

| Path | What lives there |
| --- | --- |
| `app/page.tsx` | The tool, rendered at `/` |
| `app/audio-tools/split-track/` | API route: upload, ffmpeg cutting/tagging, zipping, storage, downloads |
| `src/components/AudioSplitTrack/` | UI: waveform, timestamp editor, album drawer, progress log, tour |
| `src/redux/` | Client state, persisted with redux-persist |
| `src/utils/` | S3 client, reCAPTCHA verification, IndexedDB helpers |
| `e2e/` | Playwright specs, fixtures and visual baselines |

## Running it yourself

Requirements: Node 22+, Yarn 1, and `ffmpeg` / `ffprobe` on your `PATH`
(`brew install ffmpeg`, `apt install ffmpeg`, or `choco install ffmpeg`).

```sh
yarn install
cp .env.example .env.local   # local defaults: disk storage, captcha skipped
yarn dev                     # http://localhost:3000
```

With the defaults in `.env.example` you need no AWS account and no reCAPTCHA keys.

### Configuration

All configuration is environment variables; see [`.env.example`](.env.example) for the full list.

| Variable | Purpose |
| --- | --- |
| `SPLIT_TRACK_STORAGE` | `local` stores results under `./generated`; anything else uses S3 |
| `AWS_BUCKET_NAME`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 storage |
| `NEXT_PUBLIC_REACT_CAPTCHA_SITE_KEY`, `CAPTCHA_SECRET_KEY` | reCAPTCHA v2 in front of the split endpoint |
| `SKIP_CAPTCHA`, `NEXT_PUBLIC_SKIP_CAPTCHA` | Skip the captcha in development (ignored in production) |
| `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SOURCE_URL` | Branding, canonical URL, and the "view the code" link |

### Docker

```sh
docker build -t audio-splitter \
  --build-arg NEXT_PUBLIC_SITE_NAME="My Splitter" \
  --build-arg NEXT_PUBLIC_REACT_CAPTCHA_SITE_KEY=... .
docker run -p 3000:3000 --env-file .env.production.local audio-splitter
```

The image includes ffmpeg. The tool needs a long-running Node server: splits stream progress for as long as
ffmpeg runs and uploads can be large, so serverless function limits are a poor fit.

## Tests

```sh
yarn typecheck
yarn test                    # Jest unit tests
npx playwright install chromium
yarn e2e                     # Playwright, 4 viewports: desktop, 13" laptop, Pixel 7, iPhone SE
yarn e2e:ui                  # watch it run
```

The E2E suite starts its own dev server on port 3900 with local storage and the captcha skipped, so it needs
no credentials. See [`e2e/README.md`](e2e/README.md) for what each spec covers.

## Secrets

Nothing secret is ever committed. `.env*` files are git-ignored (except `.env.example`, which holds names
only), CI runs [gitleaks](https://github.com/gitleaks/gitleaks) over the full history on every push, and
production values come from the host's secret store. To check before you push:

```sh
gitleaks git --redact .
```

Found a security issue? Please email the maintainer instead of opening a public issue.

## Contributing

Issues and pull requests are welcome. Please run `yarn typecheck`, `yarn test` and `yarn e2e` before opening a PR.
If you change the layout on purpose, refresh the visual baselines with `yarn e2e:update-snapshots`.

## License

[MIT](LICENSE)

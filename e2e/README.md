# E2E (Playwright)

End-to-end coverage for the splitter (served at `/`),
run against a local `next dev` on port **3900**
(so it never collides with `yarn dev` on 3000). No AWS credentials or reCAPTCHA keys
are needed: the config starts the dev server with

| env                        | effect                                                                  |
| -------------------------- | ----------------------------------------------------------------------- |
| `SPLIT_TRACK_STORAGE=local` | zips/tracks are written to `generated/audio-split/_store` and served from disk instead of S3 |
| `SKIP_CAPTCHA=true`         | server skips Google siteverify (ignored when `NODE_ENV=production`)     |
| `NEXT_PUBLIC_SKIP_CAPTCHA=true` | client skips the reCAPTCHA modal                                    |
| `NEXT_DIST_DIR=.next-e2e`   | separate Next build dir so the server can coexist with `yarn dev`       |

## Running

```sh
yarn e2e                 # everything, 4 viewports (desktop 1920×1080, laptop 1366×768, mobile Pixel 7, mobile-small iPhone SE)
E2E_PORT=3901 yarn e2e   # a second run alongside another (own port, Next build dir and results dir)
yarn e2e:ui              # Playwright UI mode – watch the browser, time-travel the trace
yarn e2e:headed          # headed browsers
yarn e2e --project=laptop audio-splitter.flow
yarn e2e:update-snapshots   # re-baseline the visual snapshots after an intentional design change
yarn e2e:report          # open the last HTML report (CI)
```

First time: `npx playwright install chromium` (or point `PLAYWRIGHT_CHROMIUM_EXECUTABLE` at a Chromium you already have). `ffmpeg`/`ffprobe` must be on `PATH` (the app needs them anyway).

## Specs

| file                                  | what it proves                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `audio-splitter.layout.spec.ts`       | usability geometry per viewport: nothing clipped/overflowing, drawer fields + Save reachable, list scrolls independently of the player, text-mode textarea readable. Plus visual snapshots (local by default; `E2E_VISUAL=1` on CI). |
| `audio-splitter.layout.spec.ts` (phone block) | mobile-only: the route locks page zoom and every field is ≥16px (so iOS never auto-zooms on focus); with a simulated on-screen keyboard (`installFakeVisualViewport` + `setKeyboardHeight`) the app shrinks to the visible area, the player collapses and the field being edited stays reachable; no control in the list card or drawer is clipped. |
| `audio-splitter.flow.spec.ts`         | upload → album drawer → cover art required → text-mode tracklist → regions on the waveform → transport controls → survives reload (IndexedDB + redux-persist) → reset. |
| `audio-splitter.tour.spec.ts`         | first-visit guide: welcome dialog → "Play & start" plays the audio and creates the first track → "name it" tip on the title field (advances when it loses focus) → download tip; "I'll paste timestamps" goes to text mode instead; shown once per browser. Every other spec runs with the guide pre-dismissed (`gotoFresh(page, { tour: true })` opts in). |
| `audio-splitter.split.spec.ts`        | the real pipeline (laptop project only) on a realistic source (stereo 48 kHz, ID3-tagged, **embedded cover as an attached-picture stream**): SSE progress, cuts of the right length, one audio + one cover stream per track, our tags replace the source's, `timestamps.txt`, zip download by key, per-track downloads, bad-file error path, key traversal rejected. **Encoding matrix**: every codec the UI offers (`copy`, `libmp3lame` 192k/320k, `aac` 128k/256k → `.m4a` with attached cover, `libopus` → `.opus`) verified with `ffprobe` for container, codec, bitrate, tags and cover. **API validation**: reversed/out-of-range/garbage timestamps produce an SSE error naming the track instead of an ffmpeg crash. |
| `audio-splitter.walkthrough.spec.ts`  | not assertions — screenshots every state into `e2e/.results/walkthrough/<project>/` so you can *look* at the layout while iterating. |

`helpers/audio-splitter.ts` holds the selectors (`ui.*`) and the steps/geometry
assertions (`expectNoHorizontalOverflow`, `expectDisjoint`, `expectTapTarget`…) every spec shares; add new selectors there rather than in specs. Components expose `data-testid`s (`top-section`,
`bottom-section`, `album-info-drawer`, `waveform`, `timestamp-row`, `progress-log`, `tracklist`…).

Two Playwright runs must not share `e2e/.results` (one clears it while the other writes traces → `ENOENT` on
context close). When another run is going, start yours with `E2E_PORT=3901 yarn e2e …` — it gets its own port,
Next build dir and output dir.

Fixtures in `fixtures/` are generated — regenerate with:

```sh
# plain 30 s mono MP3
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=30" -af "volume='0.2+0.8*abs(sin(2*PI*t/3))':eval=frame" -c:a libmp3lame -b:a 64k fixtures/sample-30s.mp3
# covers
ffmpeg -y -f lavfi -i "color=c=#FF4BA8:s=400x400:d=1" -vf "drawbox=x=100:y=100:w=200:h=200:color=#38B6FF:t=fill" -frames:v 1 -q:v 4 fixtures/cover.jpg
ffmpeg -y -f lavfi -i "color=c=#FF4BA8:s=400x400:d=1" -vf "drawbox=x=100:y=100:w=200:h=200:color=#38B6FF:t=fill" -frames:v 1 fixtures/cover.png
# realistic rip: stereo 48 kHz, ID3 tags, embedded PNG cover
ffmpeg -y -f lavfi -i "sine=frequency=440:duration=30" -f lavfi -i "sine=frequency=660:duration=30" \
  -filter_complex "[0:a][1:a]amerge=inputs=2,volume='0.2+0.8*abs(sin(2*PI*t/3))':eval=frame[a]" -map "[a]" -ar 48000 -ac 2 -c:a libmp3lame -b:a 128k /tmp/stereo.mp3
ffmpeg -y -i /tmp/stereo.mp3 -i fixtures/cover.png -map 0:a -map 1:v -c:a copy -c:v png -id3v2_version 3 \
  -metadata title=Reach -metadata artist="Test Artist" -metadata album=Unreleased -metadata genre=Hip-Hop -metadata date=2024 -metadata track=1 \
  -metadata:s:v title=Cover -metadata:s:v comment="Cover (front)" -disposition:v attached_pic fixtures/sample-30s-embedded-cover.mp3
```

Set `SPLIT_TRACK_FFMPEG_VERBOSE=true` on the server to log ffmpeg's full stderr; by default only the command line and failures are logged.

## CI

`.github/workflows/ci.yml` (parked at `.github/ci.yml` until it is moved there) runs the whole suite on every push and PR (Ubuntu, `ffmpeg` from apt, Playwright's
Chromium). Visual snapshots are opt-in on CI (`E2E_VISUAL=1`) because font rendering differs between machines.
Two Playwright runs must never share a port: the second one's exit kills the server the first is using
(that is what `E2E_PORT` is for).

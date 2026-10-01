# --- Stage 1: Build ---
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are inlined at build time, so pass them as build args (never secrets)
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SOURCE_URL
ARG NEXT_PUBLIC_REACT_CAPTCHA_SITE_KEY
RUN yarn build

# --- Stage 2: Runner ---
FROM node:22-alpine AS runner
WORKDIR /app

# fluent-ffmpeg resolves ffmpeg/ffprobe from PATH — the splitter needs them at runtime
RUN apk add --no-cache ffmpeg

RUN addgroup -S nodegroup && adduser -S nodeuser -G nodegroup

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --chown=nodeuser:nodegroup --from=builder /app/.next/standalone ./
COPY --chown=nodeuser:nodegroup --from=builder /app/.next/static ./.next/static
# generated/ is the splitter's scratch space (and the store when SPLIT_TRACK_STORAGE=local)
RUN mkdir -p generated && chown nodeuser:nodegroup /app generated

USER nodeuser
EXPOSE 3000

# Runtime secrets (AWS_*, CAPTCHA_SECRET_KEY) come from the host's environment, never the image
CMD ["node", "server.js"]

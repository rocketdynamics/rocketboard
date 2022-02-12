FROM golang:1.17 as backend-builder

WORKDIR /src
ADD go.mod go.sum ./
RUN go mod download

ADD cmd/ ./cmd/
RUN GOOS=linux go install -ldflags '-linkmode external -extldflags -static -w' -v ./cmd/...

FROM node:16 as frontend-builder
WORKDIR /frontend

# PUPPETEER DEPENDENCIES
# See https://crbug.com/795759
RUN apt-get update && apt-get install -yq libgconf-2-4

# Install latest chrome dev package and fonts to support major charsets (Chinese, Japanese, Arabic, Hebrew, Thai and a few others)
# Note: this installs the necessary libs to make the bundled version of Chromium that Puppeteer
# installs, work.
# Also install ffmpeg for video artifacts
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf fonts-dejavu-core fonts-noto-color-emoji \
      --no-install-recommends \
    && apt-get install -y ffmpeg \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get purge --auto-remove -y curl \
    && rm -rf /src/*.deb

ADD frontend/package.json ./package.json
ADD frontend/yarn.lock ./yarn.lock


# Add user so we don't need --no-sandbox for puppeteer
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /frontend

# Run everything after as non-privileged user.
USER pptruser

RUN yarn install --pure-lockfile --production=false

ADD /frontend/public ./public
ADD /frontend/src ./src

RUN yarn build

ADD /frontend/tests ./tests

FROM alpine

WORKDIR /app
RUN apk add -U ca-certificates curl
RUN mkdir -p /data

COPY --from=frontend-builder /frontend/build /app/public
COPY --from=backend-builder /go/bin/rocketboard /usr/bin/rocketboard

ENTRYPOINT ["rocketboard"]

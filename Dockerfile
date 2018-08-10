FROM node:10 as frontend-builder

WORKDIR /frontend
RUN npm install -g yarn && chmod +x /usr/local/bin/yarn

ADD frontend/package.json ./package.json
ADD frontend/yarn.lock ./yarn.lock

RUN yarn install

ADD /frontend/public ./public
ADD /frontend/src ./src

# Remove local dev placeholder endpoints
RUN rm -r ./public/api

RUN yarn build


FROM golang:1.10 as backend-builder

WORKDIR /go/src/github.com/arachnys/rocketboard
RUN go get -u github.com/golang/dep/cmd/dep

ADD Gopkg.lock Gopkg.toml ./
RUN dep ensure -v -vendor-only
RUN CGO_ENABLED=0 GOOS=linux go build -v ./vendor/...

ADD cmd/ ./cmd/
RUN CGO_ENABLED=0 GOOS=linux go install -v ./cmd/...

FROM alpine

WORKDIR /app
RUN apk add -U ca-certificates curl

COPY --from=frontend-builder /frontend/build /app/public
COPY --from=backend-builder /go/bin/rocketboard /usr/bin/rocketboard

ENTRYPOINT ["rocketboard"]

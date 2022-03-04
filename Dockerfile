FROM golang:1.17 as backend-builder

WORKDIR /src
ADD go.mod go.sum ./
RUN go mod download

ADD cmd/ ./cmd/
RUN GOOS=linux go install -ldflags '-linkmode external -extldflags -static -w' -v ./cmd/...

FROM alpine

WORKDIR /app
RUN apk add -U ca-certificates curl
RUN mkdir -p /data

COPY --from=backend-builder /go/bin/rocketboard /usr/bin/rocketboard

ENTRYPOINT ["rocketboard"]

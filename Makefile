APP_NAME ?= "rocketboard"

VERSION ?= `git rev-parse --short HEAD`
BRANCH ?= `git rev-parse --abbrev-ref HEAD`

IMAGE_NAME = "docker.arachnys.com/${APP_NAME}"

PRODUCTION_IMAGE_FILE ?= "./Dockerfile"
PRODUCTION_IMAGE_NAME ?= "docker.arachnys.com/${APP_NAME}"

build:
	docker build --rm \
			-f ${PRODUCTION_IMAGE_FILE} \
			-t ${PRODUCTION_IMAGE_NAME}:${VERSION} \
			.

publish:
	docker push ${PRODUCTION_IMAGE_NAME}:${VERSION}

deploy:
	helm upgrade --install --force ${APP_NAME} charts/${APP_NAME} \
		--set-string image.tag=${VERSION} \
		--wait

version:
	@echo "${VERSION}"

.PHONY: build publish deploy version

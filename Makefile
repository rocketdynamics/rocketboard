APP_NAME ?= "rocketboard"

VERSION ?= `git rev-parse --short HEAD`
BRANCH ?= `git rev-parse --abbrev-ref HEAD`

IMAGE_NAME = "docker.arachnys.com/${APP_NAME}"

PRODUCTION_IMAGE_FILE ?= "./Dockerfile"
PRODUCTION_IMAGE_NAME ?= "docker.arachnys.com/${APP_NAME}"

HELM = docker run --rm -w /tmpdir -v "$(shell pwd)":/tmpdir -e KUBECONFIG=${KUBECONFIG} devth/helm:v2.9.1 helm
HELM_RELEASE_QA = ${APP_NAME}-$(shell echo "${BRANCH}" | cut -c 1-20 | tr '[:upper:]' '[:lower:]')-qa
HELM_QA_DEPLOY_URL ?= ${HELM_RELEASE_QA}.k8s-dev.arachnys.com

build:
	docker build --rm \
			-f ${PRODUCTION_IMAGE_FILE} \
			-t ${PRODUCTION_IMAGE_NAME}:${VERSION} \
			.

publish:
	docker push ${PRODUCTION_IMAGE_NAME}:${VERSION}

deploy:
	${HELM} upgrade --install --force ${APP_NAME} charts/${APP_NAME} \
		--set-string image.tag=${VERSION} \
		--wait

deploy/qa:
	set -x
	${HELM} upgrade --install --force \
        ${HELM_RELEASE_QA} \
        charts/${APP_NAME} \
        --set oauth2-proxy.ingress.hosts[0]=${HELM_QA_DEPLOY_URL} \
        --set oauth2-proxy.ingress.tls[0].secretName=k8s-dev-wildcard-tls \
        --set-string image.tag=${VERSION} \
        --set oauth2-proxy.extraArgs.upstream="http://${HELM_RELEASE_QA}" \
        -f charts/${APP_NAME}/values.yaml \
        --wait

version:
	@echo "${VERSION}"

.PHONY: build publish deploy version

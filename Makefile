VERSION ?= `git rev-parse --short HEAD`
BRANCH ?= `git rev-parse --abbrev-ref HEAD`

IMAGE_NAME ?= "arachnysdocker/rocketboard"

HELM = docker run --rm -w /tmpdir -v "$(shell pwd)":/tmpdir -e KUBECONFIG=${KUBECONFIG} --entrypoint /helm gcr.io/kubernetes-helm/tiller:v2.11.0

build:
	docker build --rm \
			-t ${IMAGE_NAME}:${VERSION} \
			.

build/frontend:
	docker build --rm \
			-t ${IMAGE_NAME}-frontend:${VERSION} \
			--target=frontend-builder \
			.

test:
	docker build --rm \
			-t ${IMAGE_NAME}:${VERSION}-test \
			--target backend-builder \
			.

	docker run --rm  \
		${IMAGE_NAME}:${VERSION}-test \
		go test  -ldflags '-linkmode external -extldflags -static -w' ./... -cover

test/ci:
	CONTAINER=rocketboard-test-${CI_JOB_ID}
	docker run -d --name=$container ${IMAGE_NAME}:${VERSION} rocketboard

	mkdir ./traceshots && chown 999 ./traceshots

	docker run --rm --cap-add=SYS_ADMIN \
		-v `pwd`/traceshots:/frontend/traceshots \
		--init --link ${CONTAINER}:backend \
		-e TARGET_URL=http://backend:5000 \
		${IMAGE_NAME}-frontend:${VERSION} yarn test

	docker run --rm \
		-v `pwd`/traceshots:/frontend/traceshots \
		-w /frontend/traceshots \
		${IMAGE_NAME}-frontend:${VERSION} \
		avconv -f image2 -i basic/trace-screenshot-%05d.jpg testrun-basic.mp4

	docker run --rm \
		-v `pwd`/traceshots:/frontend/traceshots \
		-w /frontend/traceshots \
		${IMAGE_NAME}-frontend:${VERSION} \
		avconv -f image2 -i online-users/trace-screenshot-%05d.jpg testrun-online-users.mp4

publish:
	docker push ${IMAGE_NAME}:${VERSION}

deploy:
	${HELM} upgrade --install --force ${APP_NAME} charts/${APP_NAME} \
		--set-string image.tag=${VERSION} \
    -f charts/${APP_NAME}/values.yaml \
    -f charts/${APP_NAME}/values-production.yaml \
		--wait

deploy/qa:
	set -x
	${HELM} upgrade --install --force \
        ${HELM_RELEASE_QA} \
        charts/${APP_NAME} \
        --set ingress.hosts[0]=${HELM_QA_DEPLOY_URL} \
        --set ingress.tls[0].hosts[0]=${HELM_QA_DEPLOY_URL} \
        --set ingress.tls[0].secretName=k8s-dev-wildcard-tls \
        --set oauth2-proxy.ingress.hosts[0]=${HELM_QA_DEPLOY_URL} \
        --set oauth2-proxy.ingress.tls[0].hosts[0]=${HELM_QA_DEPLOY_URL} \
        --set oauth2-proxy.ingress.tls[0].secretName=k8s-dev-wildcard-tls \
        --set-string image.tag=${VERSION} \
        --set oauth2-proxy.extraArgs.upstream="http://${HELM_RELEASE_QA}" \
        -f charts/${APP_NAME}/values.yaml \
        --wait \
        --force

gqlgen:
	cd cmd/rocketboard && go run ../gqlgen/main.go

version:
	@echo "${VERSION}"

.PHONY: build publish deploy version

VERSION ?= `git rev-parse --short HEAD`
BRANCH ?= `git rev-parse --abbrev-ref HEAD`

IMAGE_NAME ?= "rocketdynamics/rocketboard"

HELM = docker run --rm -w /tmpdir -v "$(shell pwd)":/tmpdir -e KUBECONFIG=${KUBECONFIG} --entrypoint /helm gcr.io/kubernetes-helm/tiller:v2.11.0

.PHONY: build
build:
	docker build --rm \
			-t ${IMAGE_NAME}:${VERSION} \
			.

.PHONY: run
run: build
	docker run -p 5000:5000 --rm ${IMAGE_NAME}:${VERSION}

.PHONY: build/frontend
build/frontend:
	docker build --rm \
			-t ${IMAGE_NAME}-frontend:${VERSION} \
			--target=frontend-builder \
			.

.PHONY: test
test:
	docker-compose down
	docker-compose build backend-tests
	docker-compose run --rm backend-tests

.PHONY: test/e2e
test/e2e: build build/frontend
	docker-compose down
	docker-compose build
	mkdir -p ./traceshots && chmod 777 ./traceshots && rm -rf ./traceshots/*
	docker-compose run --rm frontend-tests

.PHONY: traceshots
traceshots:
	docker-compose run --rm --entrypoint "\
		ffmpeg -y -framerate 20 -pattern_type glob -i 'traceshots/basic/trace-screenshot-*.jpg' \
		-c:v libx264 -r 30 -pix_fmt yuv420p traceshots/testrun-basic.mp4 \
	" frontend-tests
	docker-compose run --rm --entrypoint "\
		ffmpeg -y -framerate 20 -pattern_type glob -i 'traceshots/online-users/trace-screenshot-*.jpg' \
		-c:v libx264 -r 30 -pix_fmt yuv420p traceshots/testrun-online-users.mp4 \
	" frontend-tests
	docker-compose run --rm --entrypoint "\
		ffmpeg -y -framerate 20 -pattern_type glob -i 'traceshots/merge/trace-screenshot-*.jpg' \
		-c:v libx264 -r 30 -pix_fmt yuv420p traceshots/testrun-merge.mp4 \
	" frontend-tests

.PHONY: publish
publish:
	docker push ${IMAGE_NAME}:${VERSION}

.PHONY: deploy
deploy:
	${HELM} upgrade --install --force ${APP_NAME} charts/${APP_NAME} \
		--set-string image.tag=${VERSION} \
	-f charts/${APP_NAME}/values.yaml \
	-f charts/${APP_NAME}/values-production.yaml \
		--wait

.PHONY: deploy/qa
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

.PHONY: gqlgen
gqlgen:
	cd cmd/rocketboard && go run ../gqlgen/main.go


.PHONY: version
version:
	@echo "${VERSION}"


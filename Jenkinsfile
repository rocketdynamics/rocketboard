node("docker") {
    properties([disableConcurrentBuilds()])

    stage('checkout') {
        deleteDir()
        checkout([
            $class: 'GitSCM',
            branches: scm.branches,
            userRemoteConfigs: scm.userRemoteConfigs,
            extensions: [[
                $class: 'PreBuildMerge',
                options: [
                    mergeRemote: 'origin',
                    mergeStrategy: 'default',
                    fastForwardMode: 'FF',
                    mergeTarget: 'master'
                ]
            ]]
        ])
    }

    sh "make version > .git/commit-id"
    def commit_id = readFile('.git/commit-id').trim()

    stage('build') {
        sh "VERSION=$commit_id make build"
        sh "VERSION=$commit_id make build/frontend"
    }

    stage('test') {
        def container = "rocketboard-test-$commit_id-$BUILD_NUMBER"
        try {
            parallel backend: {
                sh "VERSION=$commit_id make test"
            }, frontend: {
                sh "docker run -d --name=$container docker.arachnys.com/rocketboard:$commit_id rocketboard"
                sh "mkdir ./traceshots && chown 999 ./traceshots"
                sh "docker run --rm --cap-add=SYS_ADMIN -v `pwd`/traceshots:/frontend/traceshots --init --link $container:backend -e TARGET_URL=http://backend:5000 docker.arachnys.com/rocketboard-frontend:$commit_id yarn test"
            }
        } finally {
            sh "docker rm -f $container || true"
            sh "docker run --rm -v `pwd`/traceshots:/frontend/traceshots -w /frontend/traceshots docker.arachnys.com/rocketboard-frontend:$commit_id convert -delay 10 -loop 0 *.png animation.gif"
            archiveArtifacts artifacts: 'traceshots/animation.gif', fingerprint: true
        }
    }

    if (env.BRANCH_NAME ==~ /PR-\d+/) {
        return
    }

    stage('publish') {
        sh "VERSION=$commit_id make publish"
    }

    def secrets = [
        [$class: 'VaultSecret', path: 'secret/jenkins', secretValues: [
            [$class: 'VaultSecretValue', envVar: 'k8sdevKubeConfig', vaultKey: 'kubeconfig.k8s-dev'],
        ]],
    ]

    def configuration = [
        $class: 'VaultConfiguration',
        vaultUrl: 'https://vault.arachnys.com',
        vaultCredentialId: 'vault-jenkins-token']

    wrap([$class: 'VaultBuildWrapper', configuration: configuration, vaultSecrets: secrets]) {
        sh "set +x; echo \"$k8sdevKubeConfig\" > .kubeconfig.k8s-dev"
        if (env.BRANCH_NAME == 'master') {
            stage('deploy') {
              sh "VERSION=$commit_id KUBECONFIG=./.kubeconfig.k8s-dev make deploy"
            }
        } else {
            stage('deploy') {
                sh "VERSION=$commit_id KUBECONFIG=./.kubeconfig.k8s-dev make deploy/qa"
            }
        }
    }
}

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

    stage('test') {
        sh "VERSION=$commit_id make test"
    }

    stage('build') {
        sh "VERSION=$commit_id make build"
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

node("docker") {
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
    }

    stage('publish') {
        sh "VERSION=$commit_id make publish"
    }

    if (env.BRANCH_NAME == 'master') {
        stage('release') {
            sh "VERSION=$commit_id make release"
        }

        stage('deploy') {
            withCredentials([
                usernamePassword(
                  usernameVariable: 'RANCHER_ACCESS_KEY',
                  passwordVariable: 'RANCHER_SECRET_KEY',
                  credentialsId: 'rancher'
                )
            ]) {
                sh "VERSION=$commit_id make deploy"
            }
        }
    }
}

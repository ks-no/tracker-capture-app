pipeline {
    agent {
        label 'linux'
    }

    tools {
        nodejs "node-LTS"
    }

    stages {

        stage('Resolve version') {
            steps {
                script {
                    env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').substring(0, 7)
                    env.GIT_BRANCH = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD')
                }
            }
        }

        stage('Check tools') {
            steps {
                sh "node -v"
                sh "npm -v"
            }
        }

        stage('Build tracker capture app') {
            steps {
                script {
                    sh "npm install"
                    sh "npm run build"
                }
            }
        }

        stage('Build and deploy') {
            when {
                branch 'v34_ks_playground'
            }
            steps {
                build job: 'KS/dhis2-setup/openshift', parameters: [string(name: 'tag_tracker_capture', value: env.GIT_SHA), string(name: 'tracker_capture_branch', value: env.GIT_BRANCH)], wait: false, propagate: false
            }
       }
    }
}
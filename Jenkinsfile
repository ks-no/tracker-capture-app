pipeline {
    agent {
        label 'linux'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '40', artifactNumToKeepStr: '40'))
        timeout(time: 1, unit: 'HOURS')
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
                anyOf {
                    branch 'main_ks'
                    branch 'helge/kopier_tb_paavist_dataelement_til_tea'
                }
            }
            steps {
                build job: 'KS/dhis2-setup/master', parameters: [booleanParam(name: 'isTriggeredFromTrackerCapture', value: true), string(name: 'tag_tracker_capture', value: env.GIT_SHA), string(name: 'branch_tracker_capture', value: env.GIT_BRANCH)], wait: false, propagate: false
            }
       }
    }

    post {
        always {
            deleteDir()
        }
    }
}
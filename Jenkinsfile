pipeline {
    agent {
        label 'linux-large'
    }

//    environment {
//        DHIS2_CORE_GIT_REPO = 'https://github.com/dhis2/dhis2-core.git'
//        DHIS2_CORE_KS_BRANCH = '2.36_ks'
//
//        IMAGE_NAME = "fiks-dhis2-app"
//    }

//    tools {
//        maven 'maven'
//        jdk 'openjdk11'
//        nodejs "node-LTS"
//    }

    stages {

        stage('Resolve version') {
            steps {
                script {
                    env.GIT_SHA = sh(returnStdout: true, script: 'git rev-parse HEAD').substring(0, 7)
                    env.GIT_BRANCH = sh(returnStdout: true, script: 'git rev-parse --abbrev-ref HEAD')
                    env.WORKSPACE = pwd()
                    env.CURRENT_VERSION = readFile "${env.WORKSPACE}/version"
                    env.CURRENT_VERSION = env.CURRENT_VERSION.replace("SNAPSHOT", env.GIT_SHA)
//                    env.IMAGE_TAG = env.CURRENT_VERSION

                    sh "echo ${env.GIT_BRANCH}"
                }
            }
        }

//        stage('Check tools') {
//            steps {
//                sh "node -v"
//                sh "npm -v"
//            }
//        }
//
//        stage('Build tracker capture app') {
//            steps {
//                script {
//                    sh "npm install"
//                    sh "npm run build"
//                }
//            }
//        }
//        stage('Build dhis2') {
//            steps {
//                dir('dhis2-core') {
//                    git branch: "${DHIS2_CORE_KS_BRANCH}",
//                            url: "${DHIS2_CORE_GIT_REPO}"
//                    script {
//                        sh "mvn clean install -f dhis-2/pom.xml -DskipTests"
//                        sh "mvn clean install -U -f dhis-2/dhis-web/pom.xml -DskipTests"
//                    }
//                }
//            }
//        }
//        stage('Repackage war with KS tracker capture app') {
//            steps {
//                dir('war-content') {
//
//                    script {
//                        def tracker_capture_path = "dhis-web-tracker-capture"
//                        def war_file_name = "dhis.war"
//
//                        sh "jar -xvf ../dhis2-core/dhis-2/dhis-web/dhis-web-portal/target/${war_file_name}"
//                        sh "rm -rf ${tracker_capture_path}/*"
//                        sh "mv ../build/* ${tracker_capture_path}/"
//                        sh "jar -cvf ${war_file_name} *"
//                        sh "mv ${war_file_name} ../docker/${war_file_name}"
//                    }
//                }
//            }
//        }
//
//        stage('Push image') {
//            steps {
//                script {
//                    buildAndPushDockerImage(IMAGE_NAME, [env.CURRENT_VERSION, 'latest'], [], false, 'docker')
//                }
//            }
//        }

        stage('Build and deploy') {
//            when {
//                branch 'v34_ks_playground'
//            }
            steps {
                build job: 'KS/dhis2-setup/openshift', parameters: [string(name: 'tag_tracker_capture', value: env.GIT_SHA), string(name: 'tracker_capture_branch', value: env.GIT_BRANCH)], wait: false, propagate: false
            }
       }
    }
}